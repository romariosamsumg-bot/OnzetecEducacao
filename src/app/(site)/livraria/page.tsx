import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookCover } from "@/components/content/book-cover";
import { Badge, Container, DemoBadge, EmptyState, LoadingBlock, PageHeader } from "@/components/ui/primitives";
import { getViewer } from "@/lib/auth/viewer";
import { listBooks } from "@/lib/content/books";
import { formatPrice } from "@/lib/content/types";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Livraria Onzetec",
  description: "Livros digitais para consultar sempre que precisar: WhatsApp, segurança digital e uso do celular.",
  path: "/livraria",
});

export default function LivrariaPage() {
  return (
    <Container className="py-8">
      <PageHeader
        back={{ href: "/aprender", label: "Aprender" }}
        title="Livraria Onzetec"
        description="Livros digitais para ler no celular, no computador ou imprimir. Alguns estão incluídos na assinatura; outros são vendidos separadamente."
      />
      <Suspense fallback={<LoadingBlock label="Carregando livros…" />}>
        <List />
      </Suspense>
    </Container>
  );
}

async function List() {
  const viewer = await getViewer();
  const books = await listBooks(viewer?.id ?? null);
  if (books.length === 0) return <EmptyState title="Em breve, novos livros" />;
  return (
    <ul className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-4">
      {books.map((b) => (
        <li key={b.id}>
          <Link href={`/livraria/${b.slug}`} className="group block space-y-3">
            <BookCover src={b.coverImageUrl} title={b.title} />
            <span className="block leading-snug font-bold text-navy-900 group-hover:underline">{b.title}</span>
            <span className="block text-[0.9rem] text-ink-muted">{b.author}</span>
            <span className="flex flex-wrap gap-1.5">
              {b.owned ? <Badge tone="success">Você já tem</Badge> : null}
              {b.includedInSubscription ? <Badge tone="premium">Incluído na assinatura</Badge> : null}
              {!b.includedInSubscription && b.priceCents ? <Badge>{formatPrice(b.priceCents, b.currency)}</Badge> : null}
              {b.isDemo ? <DemoBadge /> : null}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
