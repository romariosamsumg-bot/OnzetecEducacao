import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { formatPrice } from "@/lib/content/types";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Livros" };

export default async function LivrosAdmin() {
  const admin = await requireAdmin();
  const rows = await asUser(admin.id, (db) => db<{ id: string; title: string; status: string; priceCents: number | null; includedInSubscription: boolean; hasFile: boolean; sold: number }[]>`
    select b.id, b.title, b.status, b.price_cents, b.included_in_subscription,
      exists (select 1 from public.book_files f where f.book_id = b.id) as has_file,
      (select count(*)::int from public.book_entitlements e where e.book_id = b.id and e.source = 'purchase' and e.revoked_at is null) as sold
    from public.books b order by b.updated_at desc`);
  return (
    <div className="space-y-6">
      <PageHeader title="Livros" actions={<ButtonLink href="/admin/livros/novo" icon={<Plus aria-hidden className="size-5" />}>Novo livro</ButtonLink>} />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map((b) => (
          <li key={b.id}>
            <Link href={`/admin/livros/${b.id}`} className="block space-y-2 rounded-[var(--radius-card)] border border-line bg-white p-4 hover:border-navy-200">
              <span className="block font-bold text-navy-900">{b.title}</span>
              <span className="flex flex-wrap gap-1">
                <Badge tone={b.status === "published" ? "success" : "neutral"}>{b.status === "published" ? "Publicado" : "Rascunho"}</Badge>
                {b.includedInSubscription ? <Badge tone="premium">Na assinatura</Badge> : null}
                <Badge>{formatPrice(b.priceCents) ?? "Sem preço"}</Badge>
                {!b.hasFile ? <Badge tone="warning">Sem arquivo</Badge> : null}
                <Badge>{b.sold} vendido(s)</Badge>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
