import "server-only";
import { asUser } from "@/lib/db";
import type { ContentFormData } from "@/components/admin/content-form";
import { toBrasiliaInput } from "./util";
import type { ContentType } from "@/lib/content/types";

export async function editorOptions(adminId: string) {
  return asUser(adminId, async (db) => {
    const categories = await db<{ id: string; name: string }[]>`select id, name from public.categories order by sort_order, name`;
    const courses = await db<{ id: string; title: string }[]>`select id, title from public.courses order by title`;
    const modules = await db<{ id: string; title: string; courseId: string }[]>`
      select id, title, course_id from public.course_modules order by position, created_at`;
    return {
      categories,
      courses: courses.map((c) => ({ ...c, modules: modules.filter((m) => m.courseId === c.id) })),
    };
  });
}

export function emptyContent(type: ContentType, defaults: { courseId?: string | null; moduleId?: string | null } = {}): ContentFormData {
  return {
    id: null, type, title: "", slug: "", summary: "", coverImageUrl: null, categoryId: null,
    courseId: defaults.courseId ?? null, moduleId: defaults.moduleId ?? null, position: 0,
    access: "premium", status: "draft", publishedAtInput: "", commentsEnabled: true, durationSeconds: null,
    level: "iniciante", appName: "", osName: "Android", versionRange: "", lastReviewedAt: new Date().toISOString().slice(0, 10),
    editorialStatus: "current", searchPhrases: [], tags: [], transcript: "", materials: [], blocks: [],
    guide: type === "guide" ? { causes: [], steps: [], cautions: [], if_not_working: "" } : null, video: null,
  };
}

export async function loadContentForEdit(adminId: string, id: string): Promise<(ContentFormData & { publicPath: string; isDemo: boolean }) | null> {
  return asUser(adminId, async (db) => {
    const [c] = await db<Record<string, never>[]>`
      select ci.*, b.blocks, b.guide, b.transcript, b.materials,
        va.provider as video_provider, va.provider_asset_id as video_asset_id, va.poster_url as video_poster, va.captions as video_captions,
        coalesce((select array_agg(t.name order by t.name) from public.content_tags ct join public.tags t on t.id = ct.tag_id where ct.content_id = ci.id), '{}') as tag_names
      from public.content_items ci
      left join public.content_bodies b on b.content_id = ci.id
      left join public.video_assets va on va.id = b.video_asset_id
      where ci.id = ${id}`;
    if (!c) return null;
    const r = c as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
    const type = r.type as ContentType;
    const pathPrefix = { video: "/aulas/", short: "/dicas/", article: "/artigos/", guide: "/resolver/" }[type];
    return {
      id: r.id, type, title: r.title, slug: r.slug, summary: r.summary, coverImageUrl: r.coverImageUrl,
      categoryId: r.categoryId, courseId: r.courseId, moduleId: r.moduleId, position: r.position,
      access: r.access, status: r.status, publishedAtInput: toBrasiliaInput(r.publishedAt),
      commentsEnabled: r.commentsEnabled, durationSeconds: r.durationSeconds, level: r.level,
      appName: r.appName ?? "", osName: r.osName ?? "", versionRange: r.versionRange ?? "",
      lastReviewedAt: r.lastReviewedAt ? new Date(r.lastReviewedAt).toISOString().slice(0, 10) : "",
      editorialStatus: r.editorialStatus, searchPhrases: r.searchPhrases ?? [], tags: r.tagNames ?? [],
      transcript: r.transcript ?? "", materials: r.materials ?? [], blocks: r.blocks ?? [],
      guide: type === "guide" ? (r.guide ?? { causes: [], steps: [], cautions: [], if_not_working: "" }) : null,
      video: r.videoProvider
        ? { provider: r.videoProvider, providerAssetId: r.videoAssetId, posterUrl: r.videoPoster, captionUrl: r.videoCaptions?.[0]?.url ?? "" }
        : null,
      publicPath: `${pathPrefix}${r.slug}`,
      isDemo: r.isDemo,
    };
  });
}
