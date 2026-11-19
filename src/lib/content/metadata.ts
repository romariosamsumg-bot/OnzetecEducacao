import "server-only";
import type { Metadata } from "next";
import { asUser } from "@/lib/db";
import { pageMetadata } from "@/lib/seo";
import { contentHref, type ContentType } from "./types";

/** Metadados públicos (título e resumo) — nunca o conteúdo exclusivo. */
export async function contentMetadata(slug: string, type: ContentType): Promise<Metadata> {
  const [row] = await asUser(null, (db) => db<{ title: string; summary: string; coverImageUrl: string | null }[]>`
    select title, summary, cover_image_url from public.content_items where slug = ${slug} and type = ${type}`);
  if (!row) return { title: "Conteúdo não encontrado", robots: { index: false } };
  return pageMetadata({
    title: row.title,
    description: row.summary,
    path: contentHref(type, slug),
    image: row.coverImageUrl,
    type: type === "article" ? "article" : "website",
  });
}
