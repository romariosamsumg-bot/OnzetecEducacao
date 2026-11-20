"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/form";
import { audit } from "@/lib/admin/audit";
import { isSafeUrl, lines, parseBrasiliaDateTime, parsePriceToCents, slugify } from "@/lib/admin/util";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser, pgCode } from "@/lib/db";
import { categoryIcons } from "@/components/ui/icon";
import { uploadPrivateFile } from "@/lib/storage";

const uuid = z.string().uuid();
const optUuid = z.union([uuid, z.literal("")]).transform((v) => v || null);

function dupError(err: unknown, field = "slug"): FormState | null {
  return pgCode(err) === "23505" ? { ok: false, errors: { [field]: ["Já existe um item com este endereço. Escolha outro."] } } : null;
}

/* ------------------------------ Cursos ------------------------------ */

const courseSchema = z.object({
  id: optUuid,
  title: z.string().trim().min(3, "O título precisa ter pelo menos 3 letras.").max(140),
  slug: z.string().trim().max(80),
  summary: z.string().trim().max(400),
  description: z.string().trim().max(5000),
  categoryId: optUuid,
  status: z.enum(["draft", "scheduled", "published", "archived"]),
  level: z.enum(["iniciante", "intermediario"]),
  appName: z.string().trim().max(60),
  osName: z.string().trim().max(60),
  versionRange: z.string().trim().max(60),
  lastReviewedAt: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/),
  editorialStatus: z.enum(["current", "review_soon", "outdated"]),
  coverImageUrl: z.string().trim().refine((u) => !u || isSafeUrl(u)),
});

export async function saveCourse(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = courseSchema.safeParse(Object.fromEntries(["id", "title", "slug", "summary", "description", "categoryId", "status", "level", "appName", "osName", "versionRange", "lastReviewedAt", "editorialStatus", "coverImageUrl"].map((k) => [k, fd.get(k) ?? ""])));
  if (!p.success) return { ok: false, message: "Confira os campos destacados.", errors: z.flattenError(p.error).fieldErrors };
  const v = p.data;
  const slug = slugify(v.slug || v.title);
  let publishedAt = parseBrasiliaDateTime(fd.get("publishedAt"));
  if (v.status === "published" && !publishedAt) publishedAt = new Date();
  if (v.status === "scheduled" && (!publishedAt || publishedAt <= new Date())) {
    return { ok: false, errors: { publishedAt: ["Para agendar, escolha uma data e hora no futuro."] } };
  }
  let id: string;
  try {
    id = await asUser(admin.id, async (db) => {
      const vals = {
        slug, title: v.title, summary: v.summary, description: v.description, categoryId: v.categoryId, status: v.status,
        publishedAt, level: v.level, appName: v.appName || null, osName: v.osName || null, versionRange: v.versionRange || null,
        lastReviewedAt: v.lastReviewedAt || null, editorialStatus: v.editorialStatus, coverImageUrl: v.coverImageUrl || null,
      };
      let courseId: string;
      if (v.id) {
        await db`update public.courses set slug = ${vals.slug}, title = ${vals.title}, summary = ${vals.summary},
          description = ${vals.description}, category_id = ${vals.categoryId}, status = ${vals.status}, published_at = ${vals.publishedAt},
          level = ${vals.level}, app_name = ${vals.appName}, os_name = ${vals.osName}, version_range = ${vals.versionRange},
          last_reviewed_at = ${vals.lastReviewedAt}, editorial_status = ${vals.editorialStatus}, cover_image_url = ${vals.coverImageUrl}
          where id = ${v.id}`;
        courseId = v.id;
      } else {
        const [c] = await db<{ id: string }[]>`insert into public.courses (slug, title, summary, description, category_id, status,
          published_at, level, app_name, os_name, version_range, last_reviewed_at, editorial_status, cover_image_url, created_by)
          values (${vals.slug}, ${vals.title}, ${vals.summary}, ${vals.description}, ${vals.categoryId}, ${vals.status}, ${vals.publishedAt},
            ${vals.level}, ${vals.appName}, ${vals.osName}, ${vals.versionRange}, ${vals.lastReviewedAt}, ${vals.editorialStatus},
            ${vals.coverImageUrl}, auth.uid()) returning id`;
        courseId = c.id;
      }
      await audit(db, v.id ? "course.update" : "course.create", "course", courseId, { status: v.status });
      return courseId;
    });
  } catch (err) {
    return dupError(err) ?? { ok: false, message: "Não foi possível salvar o curso." };
  }
  redirect(`/admin/cursos/${id}?salvo=1`);
}

export async function addModule(fd: FormData) {
  const admin = await requireAdmin();
  const courseId = uuid.parse(fd.get("courseId"));
  const title = z.string().trim().min(2).max(140).parse(fd.get("title"));
  await asUser(admin.id, async (db) => {
    const [m] = await db<{ id: string }[]>`insert into public.course_modules (course_id, title, position)
      values (${courseId}, ${title}, coalesce((select max(position) + 1 from public.course_modules where course_id = ${courseId}), 0))
      returning id`;
    await audit(db, "module.create", "module", m.id, { courseId });
  });
  refresh();
}

export async function renameModule(fd: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(fd.get("id"));
  const title = z.string().trim().min(2).max(140).parse(fd.get("title"));
  await asUser(admin.id, (db) => db`update public.course_modules set title = ${title} where id = ${id}`);
  refresh();
}

export async function deleteModule(fd: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(fd.get("id"));
  await asUser(admin.id, async (db) => {
    // As aulas do módulo não são apagadas: passam a ser videoaulas avulsas (fora do curso).
    await db`update public.content_items set module_id = null, course_id = null where module_id = ${id}`;
    await db`delete from public.course_modules where id = ${id}`;
    await audit(db, "module.delete", "module", id);
  });
  refresh();
}

/** Reordena módulos ou aulas trocando a posição com o vizinho. */
export async function moveItem(fd: FormData) {
  const admin = await requireAdmin();
  const kind = z.enum(["module", "lesson"]).parse(fd.get("kind"));
  const id = uuid.parse(fd.get("id"));
  const dir = z.enum(["up", "down"]).parse(fd.get("dir"));
  await asUser(admin.id, async (db) => {
    if (kind === "module") {
      const [me] = await db<{ courseId: string }[]>`select course_id from public.course_modules where id = ${id}`;
      const list = await db<{ id: string }[]>`select id from public.course_modules where course_id = ${me.courseId} order by position, created_at`;
      const ids = swap(list.map((r) => r.id), id, dir);
      for (const [i, mid] of ids.entries()) await db`update public.course_modules set position = ${i} where id = ${mid}`;
    } else {
      const [me] = await db<{ moduleId: string }[]>`select module_id from public.content_items where id = ${id}`;
      const list = await db<{ id: string }[]>`select id from public.content_items where module_id = ${me.moduleId} order by position, created_at`;
      const ids = swap(list.map((r) => r.id), id, dir);
      for (const [i, lid] of ids.entries()) await db`update public.content_items set position = ${i} where id = ${lid}`;
    }
  });
  refresh();
}

function swap(ids: string[], id: string, dir: "up" | "down") {
  const i = ids.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  return ids;
}

export async function deleteCourse(fd: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(fd.get("id"));
  await asUser(admin.id, async (db) => {
    await db`delete from public.courses where id = ${id}`;
    await audit(db, "course.delete", "course", id);
  });
  redirect("/admin/cursos");
}

/* ---------------------------- Categorias ---------------------------- */

export async function saveCategory(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = z
    .object({
      id: optUuid,
      name: z.string().trim().min(2, "Informe o nome.").max(60),
      description: z.string().trim().max(300),
      icon: z.string().refine((i) => i in categoryIcons, "Ícone inválido."),
      sortOrder: z.coerce.number().int().min(0).max(999),
      isActive: z.boolean(),
    })
    .safeParse({
      id: fd.get("id") ?? "", name: fd.get("name"), description: fd.get("description") ?? "", icon: fd.get("icon"),
      sortOrder: fd.get("sortOrder") || 0, isActive: fd.get("isActive") === "on",
    });
  if (!p.success) return { ok: false, errors: z.flattenError(p.error).fieldErrors, message: "Confira os campos." };
  const v = p.data;
  const slug = slugify(String(fd.get("slug") || v.name));
  try {
    await asUser(admin.id, async (db) => {
      if (v.id) {
        await db`update public.categories set name = ${v.name}, slug = ${slug}, description = ${v.description}, icon = ${v.icon},
          sort_order = ${v.sortOrder}, is_active = ${v.isActive} where id = ${v.id}`;
      } else {
        await db`insert into public.categories (name, slug, description, icon, sort_order, is_active)
          values (${v.name}, ${slug}, ${v.description}, ${v.icon}, ${v.sortOrder}, ${v.isActive})`;
      }
      await audit(db, v.id ? "category.update" : "category.create", "category", v.id, { slug });
    });
  } catch (err) {
    return dupError(err) ?? { ok: false, message: "Não foi possível salvar." };
  }
  refresh();
  return { ok: true, message: "Categoria salva." };
}

/* ------------------------------ Livros ------------------------------ */

export async function saveBook(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const p = z
    .object({
      id: optUuid,
      title: z.string().trim().min(2, "Informe o título.").max(160),
      author: z.string().trim().min(2, "Informe o autor.").max(120),
      synopsis: z.string().trim().max(4000),
      format: z.enum(["pdf", "epub"]),
      pages: z.union([z.coerce.number().int().min(1).max(5000), z.literal("")]).transform((v) => (v === "" ? null : v)),
      status: z.enum(["draft", "scheduled", "published", "archived"]),
      includedInSubscription: z.boolean(),
      coverImageUrl: z.string().trim().refine((u) => !u || isSafeUrl(u)),
      sampleUrl: z.string().trim().refine((u) => !u || isSafeUrl(u), "Endereço inválido."),
    })
    .safeParse({
      id: fd.get("id") ?? "", title: fd.get("title"), author: fd.get("author"), synopsis: fd.get("synopsis") ?? "",
      format: fd.get("format"), pages: fd.get("pages") ?? "", status: fd.get("status"),
      includedInSubscription: fd.get("includedInSubscription") === "on", coverImageUrl: fd.get("coverImageUrl") ?? "",
      sampleUrl: fd.get("sampleUrl") ?? "",
    });
  if (!p.success) return { ok: false, errors: z.flattenError(p.error).fieldErrors, message: "Confira os campos." };
  const v = p.data;
  const priceRaw = String(fd.get("price") ?? "").trim();
  const priceCents = parsePriceToCents(priceRaw);
  if (priceRaw && priceCents == null) return { ok: false, errors: { price: ["Preço inválido. Exemplo: 29,90"] } };
  const slug = slugify(String(fd.get("slug") || v.title));
  const toc = lines(fd.get("toc"), 60);
  const file = fd.get("file");
  let storagePath: string | null = null;
  try {
    if (file instanceof File && file.size > 0) storagePath = await uploadPrivateFile(new Uint8Array(await file.arrayBuffer()), "books");
  } catch (err) {
    return { ok: false, errors: { file: [err instanceof Error ? err.message : "Arquivo inválido."] } };
  }
  // Arquivos grandes: enviados direto ao bucket privado (painel do Supabase) e registrados pelo caminho.
  const manualPath = String(fd.get("storagePath") ?? "").trim();
  if (!storagePath && manualPath) {
    if (!/^books\/[A-Za-z0-9/_.-]+\.(pdf|epub)$/.test(manualPath) || manualPath.includes("..")) {
      return { ok: false, errors: { storagePath: ["Use um caminho como books/meu-livro.pdf (somente letras, números, -, _ e /)."] } };
    }
    storagePath = manualPath;
  }
  const publishedAt = v.status === "published" ? (parseBrasiliaDateTime(fd.get("publishedAt")) ?? new Date()) : parseBrasiliaDateTime(fd.get("publishedAt"));
  let id: string;
  try {
    id = await asUser(admin.id, async (db) => {
      let bookId: string;
      if (v.id) {
        await db`update public.books set slug = ${slug}, title = ${v.title}, author = ${v.author}, synopsis = ${v.synopsis},
          table_of_contents = ${toc}, format = ${v.format}, pages = ${v.pages}, price_cents = ${priceCents}, status = ${v.status},
          published_at = ${publishedAt}, included_in_subscription = ${v.includedInSubscription},
          cover_image_url = ${v.coverImageUrl || null}, sample_url = ${v.sampleUrl || null} where id = ${v.id}`;
        bookId = v.id;
      } else {
        const [b] = await db<{ id: string }[]>`insert into public.books (slug, title, author, synopsis, table_of_contents, format, pages,
          price_cents, status, published_at, included_in_subscription, cover_image_url, sample_url)
          values (${slug}, ${v.title}, ${v.author}, ${v.synopsis}, ${toc}, ${v.format}, ${v.pages}, ${priceCents}, ${v.status},
            ${publishedAt}, ${v.includedInSubscription}, ${v.coverImageUrl || null}, ${v.sampleUrl || null}) returning id`;
        bookId = b.id;
      }
      if (storagePath) {
        await db`insert into public.book_files (book_id, storage_path) values (${bookId}, ${storagePath})
          on conflict (book_id) do update set storage_path = excluded.storage_path, updated_at = now()`;
      }
      await audit(db, v.id ? "book.update" : "book.create", "book", bookId, { priceCents, fileUpdated: !!storagePath });
      return bookId;
    });
  } catch (err) {
    return dupError(err) ?? { ok: false, message: "Não foi possível salvar o livro." };
  }
  redirect(`/admin/livros/${id}?salvo=1`);
}
