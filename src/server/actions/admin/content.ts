"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/form";
import { audit } from "@/lib/admin/audit";
import { lines, parseBrasiliaDateTime, parseMaterials, slugify, isSafeUrl } from "@/lib/admin/util";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser, json, pgCode } from "@/lib/db";
import { uploadPublicImage } from "@/lib/storage";
import { createStreamDirectUpload, fetchStreamVideo } from "@/lib/video/cloudflare-admin";

const uuidOrEmpty = z.union([z.string().uuid(), z.literal("")]).transform((v) => v || null);

const baseSchema = z.object({
  id: uuidOrEmpty,
  type: z.enum(["video", "short", "article", "guide"]),
  title: z.string().trim().min(3, "O título precisa ter pelo menos 3 letras.").max(140),
  slug: z.string().trim().max(80),
  summary: z.string().trim().max(600),
  categoryId: uuidOrEmpty,
  courseId: uuidOrEmpty,
  moduleId: uuidOrEmpty,
  position: z.coerce.number().int().min(0).max(999).default(0),
  access: z.enum(["free", "premium"]),
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  commentsEnabled: z.boolean(),
  durationSeconds: z.coerce.number().int().min(0).max(43200).nullable(),
  level: z.enum(["iniciante", "intermediario"]),
  appName: z.string().trim().max(60),
  osName: z.string().trim().max(60),
  versionRange: z.string().trim().max(60),
  lastReviewedAt: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  editorialStatus: z.enum(["current", "review_soon", "outdated"]),
});

const stepSchema = z.object({
  text: z.string().trim().min(1).max(1500),
  image_url: z.string().nullable().refine((u) => !u || isSafeUrl(u), "Imagem inválida"),
  image_alt: z.string().max(300).nullable(),
});
const blockSchema = z.union([
  z.object({ type: z.enum(["paragraph", "heading", "tip", "warning"]), text: z.string().trim().min(1).max(5000) }),
  z.object({
    type: z.literal("image"),
    url: z.string().refine(isSafeUrl, "Imagem inválida"),
    alt: z.string().trim().min(1, "Descreva a imagem para quem usa leitor de tela.").max(300),
    text: z.string().max(300).optional(),
  }),
]);

function parseJson<T>(raw: FormDataEntryValue | null, schema: z.ZodType<T>, fallback: T): T {
  if (!raw) return fallback;
  try {
    return schema.parse(JSON.parse(String(raw)));
  } catch {
    throw new Error("Conteúdo do editor inválido. Revise os blocos/etapas.");
  }
}

export async function saveContent(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = baseSchema.safeParse({
    id: fd.get("id") ?? "",
    type: fd.get("type"),
    title: fd.get("title"),
    slug: fd.get("slug") ?? "",
    summary: fd.get("summary") ?? "",
    categoryId: fd.get("categoryId") ?? "",
    courseId: fd.get("courseId") ?? "",
    moduleId: fd.get("moduleId") ?? "",
    position: fd.get("position") || 0,
    access: fd.get("access"),
    status: fd.get("status"),
    commentsEnabled: fd.get("commentsEnabled") === "on",
    durationSeconds: fd.get("durationSeconds") ? fd.get("durationSeconds") : null,
    level: fd.get("level") ?? "iniciante",
    appName: fd.get("appName") ?? "",
    osName: fd.get("osName") ?? "",
    versionRange: fd.get("versionRange") ?? "",
    lastReviewedAt: fd.get("lastReviewedAt") ?? "",
    editorialStatus: fd.get("editorialStatus") ?? "current",
  });
  if (!parsed.success) {
    return { ok: false, message: "Confira os campos destacados.", errors: z.flattenError(parsed.error).fieldErrors };
  }
  const v = parsed.data;
  const slug = slugify(v.slug || v.title);
  if (!slug) return { ok: false, errors: { slug: ["Informe um endereço (slug) válido."] } };

  let publishedAt = parseBrasiliaDateTime(fd.get("publishedAt"));
  if (v.status === "published" && !publishedAt) publishedAt = new Date();
  if (v.status === "scheduled" && (!publishedAt || publishedAt <= new Date())) {
    return { ok: false, errors: { publishedAt: ["Para agendar, escolha uma data e hora no futuro."] } };
  }
  if (v.type === "video" && v.moduleId && !v.courseId) {
    return { ok: false, errors: { moduleId: ["Escolha o curso do módulo."] } };
  }

  let guide = null;
  let blocks: unknown[] = [];
  try {
    if (v.type === "guide") {
      guide = {
        causes: lines(fd.get("causes"), 15),
        steps: parseJson(fd.get("stepsJson"), z.array(stepSchema).max(40), []),
        cautions: lines(fd.get("cautions"), 10),
        if_not_working: String(fd.get("ifNotWorking") ?? "").trim().slice(0, 2000),
      };
      if (guide.steps.length === 0 && v.status !== "draft") {
        return { ok: false, message: "Adicione pelo menos uma etapa antes de publicar o guia." };
      }
    }
    if (v.type === "article") blocks = parseJson(fd.get("blocksJson"), z.array(blockSchema).max(200), []);
  } catch (err) {
    return { ok: false, message: (err as Error).message };
  }

  const searchPhrases = lines(fd.get("searchPhrases"), 30).map((p) => p.slice(0, 120));
  const tags = String(fd.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 15);
  const materials = parseMaterials(fd.get("materials"));
  const transcript = String(fd.get("transcript") ?? "").trim().slice(0, 100000) || null;
  const coverImageUrl = String(fd.get("coverImageUrl") ?? "").trim() || null;
  if (coverImageUrl && !isSafeUrl(coverImageUrl)) return { ok: false, errors: { coverImageUrl: ["Endereço de imagem inválido."] } };

  // Vídeo
  const videoProvider = String(fd.get("videoProvider") ?? "");
  const videoAssetId = String(fd.get("videoAssetId") ?? "").trim();
  const posterUrl = String(fd.get("posterUrl") ?? "").trim() || null;
  const captionUrl = String(fd.get("captionUrl") ?? "").trim();

  let id: string;
  try {
    id = await asUser(admin.id, async (db) => {
      let durationSeconds = v.durationSeconds;
      let videoId: string | null = null;
      if ((v.type === "video" || v.type === "short") && videoProvider && videoAssetId) {
        if (!["cloudflare_stream", "file"].includes(videoProvider)) throw new Error("Provedor de vídeo inválido.");
        if (videoProvider === "file" && !videoAssetId.startsWith("/demo/")) {
          throw new Error("Arquivos locais só são aceitos para demonstração (/demo/...). Use o Cloudflare Stream.");
        }
        let status = "ready";
        if (videoProvider === "cloudflare_stream") {
          const info = await fetchStreamVideo(videoAssetId).catch(() => null);
          if (info) {
            status = info.readyToStream ? "ready" : "processing";
            durationSeconds = durationSeconds ?? (info.duration ? Math.round(info.duration) : null);
          }
        }
        const captions = captionUrl && isSafeUrl(captionUrl) ? [{ lang: "pt-BR", label: "Português", url: captionUrl }] : [];
        const [va] = await db<{ id: string }[]>`
          insert into public.video_assets (provider, provider_asset_id, status, duration_seconds, poster_url, captions)
          values (${videoProvider}, ${videoAssetId}, ${status}, ${durationSeconds}, ${posterUrl}, ${json(captions)})
          on conflict (provider, provider_asset_id) do update set status = excluded.status,
            duration_seconds = coalesce(excluded.duration_seconds, public.video_assets.duration_seconds),
            -- O mesmo vídeo pode estar em mais de um conteúdo: não apagar legenda/miniatura já cadastradas
            poster_url = coalesce(excluded.poster_url, public.video_assets.poster_url),
            captions = case when jsonb_array_length(excluded.captions) > 0 then excluded.captions else public.video_assets.captions end
          returning id`;
        videoId = va.id;
      }

      const row = {
        type: v.type,
        slug,
        title: v.title,
        summary: v.summary,
        coverImageUrl,
        categoryId: v.categoryId,
        courseId: v.type === "video" ? v.courseId : null,
        moduleId: v.type === "video" ? v.moduleId : null,
        position: v.position,
        access: v.access,
        status: v.status,
        publishedAt,
        commentsEnabled: v.commentsEnabled,
        durationSeconds,
        level: v.level,
        appName: v.appName || null,
        osName: v.osName || null,
        versionRange: v.versionRange || null,
        lastReviewedAt: v.lastReviewedAt || null,
        editorialStatus: v.editorialStatus,
        searchPhrases,
      };

      let contentId: string;
      if (v.id) {
        await db`update public.content_items set
          slug = ${row.slug}, title = ${row.title}, summary = ${row.summary}, cover_image_url = ${row.coverImageUrl},
          category_id = ${row.categoryId}, course_id = ${row.courseId}, module_id = ${row.moduleId}, position = ${row.position},
          access = ${row.access}, status = ${row.status}, published_at = ${row.publishedAt}, comments_enabled = ${row.commentsEnabled},
          duration_seconds = ${row.durationSeconds}, level = ${row.level}, app_name = ${row.appName}, os_name = ${row.osName},
          version_range = ${row.versionRange}, last_reviewed_at = ${row.lastReviewedAt}, editorial_status = ${row.editorialStatus},
          search_phrases = ${row.searchPhrases}
          where id = ${v.id}`;
        contentId = v.id;
      } else {
        const [created] = await db<{ id: string }[]>`
          insert into public.content_items (type, slug, title, summary, cover_image_url, category_id, course_id, module_id,
            position, access, status, published_at, comments_enabled, duration_seconds, level, app_name, os_name,
            version_range, last_reviewed_at, editorial_status, search_phrases, created_by)
          values (${row.type}, ${row.slug}, ${row.title}, ${row.summary}, ${row.coverImageUrl}, ${row.categoryId},
            ${row.courseId}, ${row.moduleId}, ${row.position}, ${row.access}, ${row.status}, ${row.publishedAt},
            ${row.commentsEnabled}, ${row.durationSeconds}, ${row.level}, ${row.appName}, ${row.osName}, ${row.versionRange},
            ${row.lastReviewedAt}, ${row.editorialStatus}, ${row.searchPhrases}, auth.uid())
          returning id`;
        contentId = created.id;
      }

      await db`insert into public.content_bodies (content_id, blocks, guide, transcript, materials, video_asset_id)
        values (${contentId}, ${json(blocks)}, ${guide ? json(guide) : null}, ${transcript}, ${json(materials)}, ${videoId})
        on conflict (content_id) do update set blocks = excluded.blocks, guide = excluded.guide,
          transcript = excluded.transcript, materials = excluded.materials,
          video_asset_id = coalesce(excluded.video_asset_id, case when ${videoProvider} = '' then null else public.content_bodies.video_asset_id end)`;

      await db`delete from public.content_tags where content_id = ${contentId}`;
      for (const name of tags) {
        const tagSlug = slugify(name);
        if (!tagSlug) continue;
        const [t] = await db<{ id: string }[]>`
          insert into public.tags (slug, name) values (${tagSlug}, ${name.slice(0, 40)})
          on conflict (slug) do update set name = public.tags.name returning id`;
        await db`insert into public.content_tags (content_id, tag_id) values (${contentId}, ${t.id}) on conflict do nothing`;
      }

      await audit(db, v.id ? "content.update" : "content.create", "content", contentId, { status: v.status, type: v.type });
      return contentId;
    });
  } catch (err) {
    if (pgCode(err) === "23505") return { ok: false, errors: { slug: ["Já existe um conteúdo com este endereço. Escolha outro."] } };
    return { ok: false, message: err instanceof Error ? err.message : "Não foi possível salvar." };
  }
  redirect(`/admin/conteudos/${id}?salvo=1`);
}

export async function deleteContent(fd: FormData) {
  const admin = await requireAdmin();
  const id = z.string().uuid().parse(fd.get("id"));
  await asUser(admin.id, async (db) => {
    await db`delete from public.content_items where id = ${id}`;
    await audit(db, "content.delete", "content", id);
  });
  redirect("/admin/conteudos?removido=1");
}

/** Envio de imagem pelo editor (capas, imagens de etapas e de artigos). */
export async function uploadImage(fd: FormData): Promise<{ ok: true; url: string } | { ok: false; message: string }> {
  await requireAdmin();
  const file = fd.get("file");
  const folder = z.enum(["covers", "steps", "articles", "books"]).catch("covers").parse(fd.get("folder"));
  if (!(file instanceof File)) return { ok: false, message: "Escolha uma imagem." };
  try {
    const url = await uploadPublicImage(new Uint8Array(await file.arrayBuffer()), folder);
    return { ok: true, url };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Falha no envio." };
  }
}

/** Link de envio direto do navegador para o Cloudflare Stream (o vídeo não passa pelo nosso servidor). */
export async function createVideoUpload(premium: boolean) {
  await requireAdmin();
  try {
    return { ok: true as const, ...(await createStreamDirectUpload({ requireSignedURLs: premium })) };
  } catch (err) {
    return { ok: false as const, message: err instanceof Error ? err.message : "Falha ao preparar envio." };
  }
}

export async function setContentStatus(fd: FormData) {
  const admin = await requireAdmin();
  const id = z.string().uuid().parse(fd.get("id"));
  const status = z.enum(["draft", "published", "archived"]).parse(fd.get("status"));
  await asUser(admin.id, async (db) => {
    await db`update public.content_items set status = ${status},
      published_at = case when ${status} = 'published' then coalesce(published_at, now()) else published_at end
      where id = ${id}`;
    await audit(db, "content.status", "content", id, { status });
  });
  refresh();
}
