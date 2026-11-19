import "server-only";
import { asUser } from "@/lib/db";

export type BookCard = {
  id: string;
  slug: string;
  title: string;
  author: string;
  synopsis: string;
  coverImageUrl: string | null;
  format: string;
  pages: number | null;
  priceCents: number | null;
  currency: string;
  includedInSubscription: boolean;
  sampleUrl: string | null;
  tableOfContents: string[];
  isDemo: boolean;
  owned: boolean;
  canDownload: boolean;
};

const cols = `b.id, b.slug, b.title, b.author, b.synopsis, b.cover_image_url, b.format, b.pages, b.price_cents, b.currency,
  b.included_in_subscription, b.sample_url, b.table_of_contents, b.is_demo`;

export async function listBooks(userId: string | null): Promise<BookCard[]> {
  return asUser(userId, (db) => db<BookCard[]>`
    select ${db.unsafe(cols)},
      ${userId ? db`exists (select 1 from public.book_entitlements e where e.book_id = b.id and e.user_id = auth.uid() and e.revoked_at is null)` : db`false`} as owned,
      ${userId ? db`public.can_access_book_file(b.id)` : db`false`} as can_download
    from public.books b order by b.published_at desc nulls last`);
}

export async function getBook(userId: string | null, slug: string): Promise<BookCard | null> {
  const [b] = await asUser(userId, (db) => db<BookCard[]>`
    select ${db.unsafe(cols)},
      ${userId ? db`exists (select 1 from public.book_entitlements e where e.book_id = b.id and e.user_id = auth.uid() and e.revoked_at is null)` : db`false`} as owned,
      ${userId ? db`public.can_access_book_file(b.id)` : db`false`} as can_download
    from public.books b where b.slug = ${slug}`);
  return b ?? null;
}
