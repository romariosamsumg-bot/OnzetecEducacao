import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { asUser } from "@/lib/db";
import { contentHref, type ContentType } from "@/lib/content/types";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Somente páginas públicas e publicadas (consulta como visitante anônimo, via RLS). */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const fixed = ["/", "/aprender", "/resolver", "/dicas", "/livraria", "/assinatura", "/ajuda", "/cadastro"].map((p) => ({
    url: `${SITE}${p}`,
    changeFrequency: "weekly" as const,
  }));
  const { items, courses, categories, books } = await asUser(null, async (db) => ({
    items: await db<{ type: ContentType; slug: string; updatedAt: Date }[]>`select type, slug, updated_at from public.content_items`,
    courses: await db<{ slug: string; updatedAt: Date }[]>`select slug, updated_at from public.courses`,
    categories: await db<{ slug: string }[]>`select slug from public.categories where is_active`,
    books: await db<{ slug: string; updatedAt: Date }[]>`select slug, updated_at from public.books`,
  }));
  return [
    ...fixed,
    ...categories.map((c) => ({ url: `${SITE}/aprender/${c.slug}` })),
    ...courses.map((c) => ({ url: `${SITE}/cursos/${c.slug}`, lastModified: c.updatedAt })),
    ...items.map((i) => ({ url: `${SITE}${contentHref(i.type, i.slug)}`, lastModified: i.updatedAt })),
    ...books.map((b) => ({ url: `${SITE}/livraria/${b.slug}`, lastModified: b.updatedAt })),
  ];
}
