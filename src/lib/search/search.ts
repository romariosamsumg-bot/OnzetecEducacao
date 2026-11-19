import "server-only";
import { asSystem, asUser } from "@/lib/db";
import type { ContentCard, CourseCard } from "@/lib/content/types";
import { buildTsQuery, expandTerms, normalizeQuery, tokenize } from "./normalize";

export type SearchResult = {
  query: string;
  guides: ContentCard[];
  others: ContentCard[];
  courses: CourseCard[];
  total: number;
};

export async function searchContent(userId: string | null, rawQuery: string): Promise<SearchResult> {
  const norm = normalizeQuery(rawQuery);
  const empty: SearchResult = { query: norm, guides: [], others: [], courses: [], total: 0 };
  if (norm.length < 2) return empty;

  return asUser(userId, async (db) => {
    const synRows = await db<{ term: string; expansions: string[] }[]>`select term, expansions from public.search_synonyms`;
    const synonyms = new Map(synRows.map((r) => [r.term, r.expansions]));
    const terms = expandTerms(tokenize(norm), synonyms);
    const tsq = buildTsQuery(terms) ?? "";

    const items = await db<(ContentCard & { score: number })[]>`
      with q as (
        select case when ${tsq} = '' then null else to_tsquery('public.pt_unaccent', ${tsq}) end as tq
      )
      select ci.id, ci.type, ci.slug, ci.title, ci.summary, ci.cover_image_url, ci.access, ci.duration_seconds,
        cat.slug as category_slug, cat.name as category_name, cat.icon as category_icon, ci.app_name,
        ci.likes_count, ci.is_demo, ci.published_at, co.slug as course_slug, co.title as course_title,
        (coalesce(ts_rank(ci.search_vector, q.tq), 0) * 2
          + extensions.similarity(lower(extensions.unaccent(ci.title)), ${norm})) as score
      from public.content_items ci
      cross join q
      left join public.categories cat on cat.id = ci.category_id
      left join public.courses co on co.id = ci.course_id
      where (q.tq is not null and ci.search_vector @@ q.tq)
         or extensions.similarity(lower(extensions.unaccent(ci.title)), ${norm}) > 0.25
      order by score desc
      limit 30`;

    const courses = await db<CourseCard[]>`
      with q as (
        select case when ${tsq} = '' then null else to_tsquery('public.pt_unaccent', ${tsq}) end as tq
      )
      select c.id, c.slug, c.title, c.summary, c.cover_image_url, c.level, c.is_demo,
        cat.slug as category_slug, cat.name as category_name, cat.icon as category_icon,
        (select count(*)::int from public.content_items l where l.course_id = c.id) as lessons_count,
        (select count(*)::int from public.content_items l where l.course_id = c.id and l.access = 'free') as free_lessons_count,
        (select coalesce(sum(l.duration_seconds), 0)::int from public.content_items l where l.course_id = c.id) as total_seconds
      from public.courses c cross join q
      left join public.categories cat on cat.id = c.category_id
      where (q.tq is not null and c.search_vector @@ q.tq)
         or extensions.similarity(lower(extensions.unaccent(c.title)), ${norm}) > 0.3
      order by coalesce(ts_rank(c.search_vector, q.tq), 0) desc limit 4`;

    const guides = items.filter((i) => i.type === "guide");
    const others = items.filter((i) => i.type !== "guide");
    const total = items.length + courses.length;
    return { query: norm, guides, others, courses, total };
  }).then(async (result) => {
    if (result.total === 0) {
      // Registro anônimo de buscas sem resultado (orienta novos tutoriais).
      await asSystem((db) => db`select public.record_search_miss(${norm})`).catch(() => {});
    }
    return result;
  });
}
