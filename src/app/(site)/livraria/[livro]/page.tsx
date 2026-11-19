import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Download, FileText } from "lucide-react";
import { BuyBookButton } from "@/components/billing/forms";
import { BookCover } from "@/components/content/book-cover";
import { ButtonLink } from "@/components/ui/button";
import { Alert, BackLink, Badge, Container, DemoBadge, LoadingBlock } from "@/components/ui/primitives";
import { getViewer } from "@/lib/auth/viewer";
import { getBillingProvider } from "@/lib/billing/service";
import { getBook } from "@/lib/content/books";
import { formatPrice } from "@/lib/content/types";
import { absoluteUrl, jsonLd, pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ livro: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { livro } = await params;
  const b = await getBook(null, livro);
  if (!b) return { title: "Livro não encontrado", robots: { index: false } };
  return pageMetadata({ title: b.title, description: b.synopsis, path: `/livraria/${livro}`, image: b.coverImageUrl, type: "book" });
}

export default function LivroPage({ params }: Props) {
  return (
    <Container className="py-8">
      <Suspense fallback={<LoadingBlock label="Carregando livro…" />}>
        <View params={params} />
      </Suspense>
    </Container>
  );
}

async function View({ params }: Props) {
  const { livro } = await params;
  const viewer = await getViewer();
  const b = await getBook(viewer?.id ?? null, livro);
  if (!b) notFound();
  const price = formatPrice(b.priceCents, b.currency);
  const billingReady = getBillingProvider() !== null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "Book",
          name: b.title,
          author: { "@type": "Organization", name: b.author },
          bookFormat: "https://schema.org/EBook",
          inLanguage: "pt-BR",
          numberOfPages: b.pages ?? undefined,
          url: absoluteUrl(`/livraria/${b.slug}`),
          ...(b.priceCents
            ? { offers: { "@type": "Offer", price: (b.priceCents / 100).toFixed(2), priceCurrency: b.currency, availability: "https://schema.org/InStock" } }
            : {}),
        })}
      />
      <BackLink href="/livraria">Voltar para a Livraria</BackLink>
      <div className="mt-4 grid gap-8 md:grid-cols-[280px_minmax(0,1fr)] grid-cols-1">
        <BookCover src={b.coverImageUrl} title={b.title} className="mx-auto w-56 md:w-full" />
        <div className="space-y-5">
          <div className="flex flex-wrap gap-2">
            {b.includedInSubscription ? <Badge tone="premium">Incluído na assinatura</Badge> : <Badge>Vendido separadamente</Badge>}
            {b.isDemo ? <DemoBadge /> : null}
          </div>
          <h1 className="text-[1.9rem] leading-tight font-bold text-navy-900">{b.title}</h1>
          <p className="text-ink-soft">por {b.author}</p>
          <p className="max-w-[65ch] text-[1.05rem] leading-relaxed whitespace-pre-line">{b.synopsis}</p>
          <dl className="flex flex-wrap gap-6 text-[0.95rem]">
            <div><dt className="text-ink-muted">Formato</dt><dd className="font-semibold uppercase">{b.format}</dd></div>
            {b.pages ? <div><dt className="text-ink-muted">Páginas</dt><dd className="font-semibold">{b.pages}</dd></div> : null}
            {!b.includedInSubscription ? <div><dt className="text-ink-muted">Preço</dt><dd className="font-semibold">{price ?? "A definir"}</dd></div> : null}
          </dl>

          <div className="max-w-md space-y-3 rounded-[var(--radius-card)] border border-line bg-white p-5">
            {b.canDownload ? (
              <>
                <p className="font-semibold text-success-700">{b.owned ? "Você já tem este livro." : "Disponível para você pela assinatura."}</p>
                <a href={`/api/livros/${b.slug}/download`} className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[var(--radius-control)] bg-orange-500 px-6 font-bold text-navy-950 hover:bg-orange-400">
                  <Download aria-hidden className="size-5" /> Baixar o livro
                </a>
              </>
            ) : b.includedInSubscription ? (
              <>
                <p>Este livro faz parte da assinatura. Assinantes baixam sem custo adicional.</p>
                <ButtonLink href="/assinatura" full size="lg">Ver assinatura</ButtonLink>
              </>
            ) : price && billingReady ? (
              <>
                <p>
                  Compra única de <strong>{price}</strong>. O livro fica disponível em “Minha conta” depois que o pagamento for confirmado — inclusive se você não for assinante.
                </p>
                <BuyBookButton book={b.slug} label={viewer ? `Comprar por ${price}` : "Entrar para comprar"} />
                <p className="text-[0.85rem] text-ink-muted">Pagamento pelo Mercado Pago: Pix, cartão ou boleto, conforme disponibilidade.</p>
              </>
            ) : (
              <Alert tone="info">Este livro ainda não está à venda.</Alert>
            )}
            {b.sampleUrl ? (
              <Link href={b.sampleUrl} className="inline-flex min-h-11 items-center gap-2 font-semibold text-orange-700 underline underline-offset-4">
                <FileText aria-hidden className="size-5" /> Ler uma amostra grátis
              </Link>
            ) : null}
          </div>

          {b.tableOfContents.length > 0 ? (
            <section aria-labelledby="sumario" className="space-y-2">
              <h2 id="sumario" className="text-[1.2rem] font-bold text-navy-900">O que você vai encontrar</h2>
              <ol className="list-decimal space-y-1 pl-6">
                {b.tableOfContents.map((t, i) => <li key={i}>{t}</li>)}
              </ol>
            </section>
          ) : null}
        </div>
      </div>
    </>
  );
}
