import "server-only";
import { asUser, type Db } from "@/lib/db";
import type {
  ArticleBlock,
  Category,
  ContentCard,
  ContentType,
  CourseCard,
  GuideBody,
  Material,
  VideoAsset,
} from "./types";

/**
 * Consultas de leitura de conteúdo. Todas executam como a pessoa atual
 * (ou visitante anônimo): o RLS do banco decide o que é visível e o que é
 * acessível. O código abaixo nunca "esconde" conteúdo pago sozinho.
 */

const cardColumns = (db: Db) => db`
  ci.id, ci.type, ci.slug, ci.title, ci.summary, ci.cover_image_url, ci.access, ci.duration_seconds,
  cat.slug as category_slug, cat.name as category_name, cat.icon as category_icon, ci.app_name,
  ci.likes_count, ci.is_demo, ci.published_at, co.slug as course_slug, co.title as course_title`;

const cardFrom = (db: Db) => db`
  public.content_items ci
  left join public.categories cat on cat.id = ci.category_id
  left join public.courses co on co.id = ci.course_id`;

export async function listCategories(userId: string | null): Promise<Category[]> {
  return asUser(userId, (db) => db<Category[]>`
    select id, slug, name, description, icon from public.categories
    where is_active order by sort_order, name`);
}

export async function getCategory(userId: string | null, slug: string) {
  return asUser(userId, async (db) => {
    const [category] = await db<Category[]>`
      select id, slug, name, description, icon from public.categories where slug = ${slug} and is_active`;
    if (!category) return null;
    const courses = await courseCards(db, db`c.category_id = ${category.id}`, 20);
    const items = await db<ContentCard[]>`
      select ${cardColumns(db)} from ${cardFrom(db)}
      where ci.category_id = ${category.id} and ci.module_id is null
      order by ci.type = 'guide' desc, ci.published_at desc limit 60`;
    return { category, courses, items };
  });
}

async function courseCards(db: Db, where: ReturnType<Db>, limit: number) {
  return db<CourseCard[]>`
    select c.id, c.slug, c.title, c.summary, c.cover_image_url, c.level, c.is_demo,
      cat.slug as category_slug, cat.name as category_name, cat.icon as category_icon,
      (select count(*)::int from public.content_items l where l.course_id = c.id) as lessons_count,
      (select count(*)::int from public.content_items l where l.course_id = c.id and l.access = 'free') as free_lessons_count,
      (select coalesce(sum(l.duration_seconds), 0)::int from public.content_items l where l.course_id = c.id) as total_seconds
    from public.courses c left join public.categories cat on cat.id = c.category_id
    where ${where}
    order by c.published_at desc nulls last limit ${limit}`;
}

export async function listCourses(userId: string | null, limit = 12): Promise<CourseCard[]> {
  return asUser(userId, (db) => courseCards(db, db`true`, limit));
}

export async function listContent(
  userId: string | null,
  opts: { type?: ContentType; categorySlug?: string; limit?: number; standaloneOnly?: boolean; orderBy?: "recent" | "popular" },
): Promise<ContentCard[]> {
  const { type, categorySlug, limit = 12, standaloneOnly = false, orderBy = "recent" } = opts;
  return asUser(userId, (db) => db<ContentCard[]>`
    select ${cardColumns(db)} from ${cardFrom(db)}
    where true
      ${type ? db`and ci.type = ${type}` : db``}
      ${categorySlug ? db`and cat.slug = ${categorySlug}` : db``}
      ${standaloneOnly ? db`and ci.module_id is null` : db``}
    order by ${orderBy === "popular" ? db`ci.likes_count desc, ci.published_at desc` : db`ci.published_at desc`}
    limit ${limit}`);
}

export type CourseDetail = {
  course: CourseCard & {
    description: string;
    appName: string | null;
    osName: string | null;
    versionRange: string | null;
    lastReviewedAt: Date | null;
    publishedAt: Date | null;
  };
  modules: {
    id: string;
    title: string;
    description: string;
    lessons: (ContentCard & { completed: boolean; positionSeconds: number })[];
  }[];
  completedCount: number;
  nextLessonSlug: string | null;
};

export async function getCourse(userId: string | null, slug: string): Promise<CourseDetail | null> {
  return asUser(userId, async (db) => {
    const [course] = await db<CourseDetail["course"][]>`
      select c.id, c.slug, c.title, c.summary, c.description, c.cover_image_url, c.level, c.is_demo,
        c.app_name, c.os_name, c.version_range, c.last_reviewed_at, c.published_at,
        cat.slug as category_slug, cat.name as category_name, cat.icon as category_icon,
        0 as lessons_count, 0 as free_lessons_count, 0 as total_seconds
      from public.courses c left join public.categories cat on cat.id = c.category_id
      where c.slug = ${slug}`;
    if (!course) return null;

    const modules = await db<{ id: string; title: string; description: string }[]>`
      select id, title, description from public.course_modules where course_id = ${course.id} order by position, created_at`;
    const lessons = await db<(ContentCard & { moduleId: string; completed: boolean; positionSeconds: number })[]>`
      select ${cardColumns(db)}, ci.module_id,
        (p.completed_at is not null) as completed, coalesce(p.position_seconds, 0) as position_seconds
      from ${cardFrom(db)}
      left join public.progress p on ${userId ? db`p.content_id = ci.id and p.user_id = auth.uid()` : db`false`}
      where ci.course_id = ${course.id} and ci.module_id is not null
      order by ci.position, ci.created_at`;

    const mods = modules.map((m) => ({ ...m, lessons: lessons.filter((l) => l.moduleId === m.id) }));
    const flat = mods.flatMap((m) => m.lessons);
    course.lessonsCount = flat.length;
    course.freeLessonsCount = flat.filter((l) => l.access === "free").length;
    course.totalSeconds = flat.reduce((s, l) => s + (l.durationSeconds ?? 0), 0);
    const next = flat.find((l) => !l.completed) ?? flat[0];
    return {
      course,
      modules: mods,
      completedCount: flat.filter((l) => l.completed).length,
      nextLessonSlug: next?.slug ?? null,
    };
  });
}

export type ContentDetail = {
  item: ContentCard & {
    commentsEnabled: boolean;
    osName: string | null;
    versionRange: string | null;
    lastReviewedAt: Date | null;
    editorialStatus: string;
    courseId: string | null;
    moduleId: string | null;
    position: number;
    updatedAt: Date;
    isLive: boolean;
  };
  /** null = sem acesso (conteúdo pago e a pessoa não é assinante) */
  body: {
    blocks: ArticleBlock[];
    guide: GuideBody | null;
    transcript: string | null;
    materials: Material[];
    video: VideoAsset | null;
  } | null;
  tags: { slug: string; name: string }[];
  viewer: { liked: boolean; saved: boolean; positionSeconds: number; completed: boolean; feedback: boolean | null };
  prev: { slug: string; title: string } | null;
  next: { slug: string; title: string; access: string } | null;
  related: ContentCard[];
};

export async function getContent(userId: string | null, slug: string, type?: ContentType): Promise<ContentDetail | null> {
  return asUser(userId, async (db) => {
    const [item] = await db<ContentDetail["item"][]>`
      select ${cardColumns(db)}, ci.comments_enabled, ci.os_name, ci.version_range, ci.last_reviewed_at,
        ci.editorial_status, ci.course_id, ci.module_id, ci.position, ci.updated_at,
        (public.is_live_now(ci.status, ci.published_at) and (ci.course_id is null or public.course_is_visible(ci.course_id))) as is_live
      from ${cardFrom(db)} where ci.slug = ${slug} ${type ? db`and ci.type = ${type}` : db``}`;
    if (!item) return null;

    const [rawBody] = await db<
      { blocks: ArticleBlock[]; guide: GuideBody | null; transcript: string | null; materials: Material[]; videoAssetId: string | null }[]
    >`select blocks, guide, transcript, materials, video_asset_id from public.content_bodies where content_id = ${item.id}`;

    let video: VideoAsset | null = null;
    if (rawBody?.videoAssetId) {
      [video] = await db<VideoAsset[]>`
        select id, provider, provider_asset_id, duration_seconds, poster_url, captions
        from public.video_assets where id = ${rawBody.videoAssetId} and status = 'ready'`;
    }

    const tags = await db<{ slug: string; name: string }[]>`
      select t.slug, t.name from public.content_tags ct join public.tags t on t.id = ct.tag_id
      where ct.content_id = ${item.id} order by t.name`;

    const anonState = { liked: false, saved: false, positionSeconds: 0, completed: false, feedback: null };
    const [state] = !userId ? [anonState] : await db<{ liked: boolean; saved: boolean; positionSeconds: number; completed: boolean; feedback: boolean | null }[]>`
      select
        exists (select 1 from public.likes where content_id = ${item.id} and user_id = auth.uid()) as liked,
        exists (select 1 from public.saves where content_id = ${item.id} and user_id = auth.uid()) as saved,
        coalesce((select position_seconds from public.progress where content_id = ${item.id} and user_id = auth.uid()), 0) as position_seconds,
        coalesce((select completed_at is not null from public.progress where content_id = ${item.id} and user_id = auth.uid()), false) as completed,
        (select helpful from public.guide_feedback where content_id = ${item.id} and user_id = auth.uid()) as feedback`;

    let prev: ContentDetail["prev"] = null;
    let next: ContentDetail["next"] = null;
    if (item.courseId) {
      const seq = await db<{ slug: string; title: string; access: string }[]>`
        select ci.slug, ci.title, ci.access from public.content_items ci
        left join public.course_modules m on m.id = ci.module_id
        where ci.course_id = ${item.courseId} and ci.module_id is not null
        order by m.position, m.created_at, ci.position, ci.created_at`;
      const idx = seq.findIndex((s) => s.slug === item.slug);
      prev = idx > 0 ? seq[idx - 1] : null;
      next = idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null;
    } else if (item.type === "short") {
      // Sequência finita de dicas (sem rolagem infinita)
      const seq = await db<{ slug: string; title: string; access: string }[]>`
        select slug, title, access from public.content_items where type = 'short'
        order by published_at desc, created_at desc limit 50`;
      const idx = seq.findIndex((s) => s.slug === item.slug);
      prev = idx > 0 ? seq[idx - 1] : null;
      next = idx >= 0 && idx < seq.length - 1 ? seq[idx + 1] : null;
    }

    const related = await db<ContentCard[]>`
      select ${cardColumns(db)} from ${cardFrom(db)}
      where ci.id <> ${item.id} and ci.module_id is null
        and (ci.category_id = (select category_id from public.content_items where id = ${item.id})
             or (${item.appName}::text is not null and ci.app_name = ${item.appName}))
      order by (ci.type = ${item.type}) desc, ci.likes_count desc limit 4`;

    return {
      item,
      body: rawBody
        ? {
            blocks: rawBody.blocks ?? [],
            guide: rawBody.guide,
            transcript: rawBody.transcript,
            materials: rawBody.materials ?? [],
            video: video ?? null,
          }
        : null,
      tags,
      viewer: state,
      prev,
      next,
      related,
    };
  });
}

/** Sequência de dicas rápidas para navegação vertical (sem rolagem infinita). */
export async function listShorts(userId: string | null, limit = 20) {
  return asUser(userId, (db) => db<(ContentCard & { posterUrl: string | null })[]>`
    select ${cardColumns(db)}, va.poster_url
    from ${cardFrom(db)}
    left join public.content_bodies b on b.content_id = ci.id
    left join public.video_assets va on va.id = b.video_asset_id
    where ci.type = 'short' order by ci.published_at desc limit ${limit}`);
}

export type ContinueItem = ContentCard & { positionSeconds: number; progressDuration: number | null; updatedAt: Date };

export async function continueLearning(userId: string, limit = 3): Promise<ContinueItem[]> {
  return asUser(userId, (db) => db<ContinueItem[]>`
    select ${cardColumns(db)}, p.position_seconds, p.duration_seconds as progress_duration, p.updated_at
    from public.progress p join ${cardFrom(db)} on ci.id = p.content_id
    where p.user_id = auth.uid() and p.completed_at is null and p.position_seconds > 0
    order by p.updated_at desc limit ${limit}`);
}

const interestToCategories: Record<string, string[]> = {
  celular: ["primeiros-passos", "configuracoes"],
  whatsapp: ["whatsapp"],
  resolver: ["configuracoes", "internet"],
  redes: ["instagram", "facebook", "youtube"],
  seguranca: ["seguranca"],
};

/** Recomendações por regras simples: interesse escolhido no primeiro acesso + popularidade. */
export async function recommendedCourses(userId: string | null, interest: string | null, limit = 4): Promise<CourseCard[]> {
  const cats = (interest && interestToCategories[interest]) || [];
  return asUser(userId, (db) => db<CourseCard[]>`
    select c.id, c.slug, c.title, c.summary, c.cover_image_url, c.level, c.is_demo,
      cat.slug as category_slug, cat.name as category_name, cat.icon as category_icon,
      (select count(*)::int from public.content_items l where l.course_id = c.id) as lessons_count,
      (select count(*)::int from public.content_items l where l.course_id = c.id and l.access = 'free') as free_lessons_count,
      (select coalesce(sum(l.duration_seconds), 0)::int from public.content_items l where l.course_id = c.id) as total_seconds
    from public.courses c left join public.categories cat on cat.id = c.category_id
    where ${userId ? db`not exists (
      select 1 from public.progress p join public.content_items l on l.id = p.content_id
      where l.course_id = c.id and p.user_id = auth.uid() and p.completed_at is not null
      group by l.course_id having count(*) = (select count(*) from public.content_items x where x.course_id = c.id)
    )` : db`true`}
    order by (cat.slug = any(${cats})) desc, c.published_at desc
    limit ${limit}`);
}

export async function listSaved(userId: string) {
  return asUser(userId, async (db) => {
    const saved = await db<(ContentCard & { savedAt: Date })[]>`
      select ${cardColumns(db)}, s.created_at as saved_at
      from public.saves s join ${cardFrom(db)} on ci.id = s.content_id
      where s.user_id = auth.uid() order by s.created_at desc limit 100`;
    const inProgress = await db<ContinueItem[]>`
      select ${cardColumns(db)}, p.position_seconds, p.duration_seconds as progress_duration, p.updated_at
      from public.progress p join ${cardFrom(db)} on ci.id = p.content_id
      where p.user_id = auth.uid() and p.completed_at is null
      order by p.updated_at desc limit 30`;
    const courses = await db<(CourseCard & { done: number; total: number })[]>`
      select c.id, c.slug, c.title, c.summary, c.cover_image_url, c.level, c.is_demo,
        cat.slug as category_slug, cat.name as category_name, cat.icon as category_icon,
        0 as lessons_count, 0 as free_lessons_count, 0 as total_seconds,
        count(p.completed_at)::int as done,
        (select count(*)::int from public.content_items x where x.course_id = c.id) as total
      from public.progress p
      join public.content_items l on l.id = p.content_id
      join public.courses c on c.id = l.course_id
      left join public.categories cat on cat.id = c.category_id
      where p.user_id = auth.uid()
      group by c.id, cat.slug, cat.name, cat.icon
      order by max(p.updated_at) desc limit 20`;
    return { saved, inProgress, courses };
  });
}

export type CommentView = {
  id: string;
  parentId: string | null;
  body: string;
  status: "published" | "pending" | "hidden" | "removed";
  isOfficial: boolean;
  authorName: string;
  isMine: boolean;
  createdAt: Date;
  editedAt: Date | null;
};

export async function listComments(userId: string | null, contentId: string): Promise<CommentView[]> {
  return asUser(userId, (db) => db<CommentView[]>`
    select c.id, c.parent_id, c.body, c.status, c.is_official, c.created_at, c.edited_at,
      (c.user_id = auth.uid()) as is_mine,
      case when c.is_official then 'Professor Onzetec'
           else coalesce(nullif(split_part(public.comment_author_name(c.user_id), ' ', 1), ''), 'Aluno') end as author_name
    from public.comments c
    where c.content_id = ${contentId} and c.deleted_at is null
    order by c.created_at asc limit 300`);
}
