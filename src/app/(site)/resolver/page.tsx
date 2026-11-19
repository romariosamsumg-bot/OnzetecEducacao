import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { LifeBuoy } from "lucide-react";
import { ContentRow, CourseCard } from "@/components/content/cards";
import { ProblemSearch } from "@/components/content/problem-search";
import { CategoryIcon } from "@/components/ui/icon";
import { Alert, Container, LoadingBlock, SectionHeader } from "@/components/ui/primitives";
import { getViewer } from "@/lib/auth/viewer";
import { listCategories, listContent } from "@/lib/content/queries";
import { searchContent } from "@/lib/search/search";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Resolver um problema",
  description:
    "Conte o que está acontecendo com o seu celular, com as suas palavras, e encontre um guia passo a passo para resolver.",
  path: "/resolver",
});

type Props = { searchParams: Promise<{ q?: string | string[] }> };

const commonProblems = [
  "Meu WhatsApp não toca",
  "Celular está lento",
  "Celular sem espaço",
  "Como aumentar as letras",
  "Internet não funciona",
  "Mensagem é golpe?",
  "Esqueci minha senha",
  "Não consigo mandar foto",
];

export default function ResolverPage({ searchParams }: Props) {
  return (
    <>
      <section className="bg-navy-900 text-white on-dark">
        <Container className="space-y-4 py-10">
          <p className="inline-flex items-center gap-2 font-semibold text-orange-400">
            <LifeBuoy aria-hidden className="size-5" /> Resolver um problema
          </p>
          <h1 className="text-[1.9rem] leading-tight font-bold sm:text-[2.3rem]">O que está acontecendo com o seu celular?</h1>
          <p className="max-w-2xl text-navy-100">
            Escreva do seu jeito, como se estivesse contando para alguém. Não precisa saber o nome técnico.
          </p>
          <Suspense fallback={<ProblemSearch label="Descreva o problema" onDark />}>
            <SearchBox searchParams={searchParams} />
          </Suspense>
        </Container>
      </section>
      <Container className="py-8">
        <Suspense fallback={<LoadingBlock label="Procurando soluções…" />}>
          <Results searchParams={searchParams} />
        </Suspense>
      </Container>
    </>
  );
}

async function SearchBox({ searchParams }: Props) {
  const q = firstParam((await searchParams).q);
  return <ProblemSearch label="Descreva o problema" defaultValue={q} onDark />;
}

function firstParam(v: string | string[] | undefined) {
  return (Array.isArray(v) ? v[0] : v)?.slice(0, 120) ?? "";
}

async function Results({ searchParams }: Props) {
  const q = firstParam((await searchParams).q).trim();
  const viewer = await getViewer();
  const uid = viewer?.id ?? null;

  if (!q) return <Browse userId={uid} />;

  const result = await searchContent(uid, q);
  return (
    <div className="space-y-10">
      <p role="status" className="text-[1.1rem] text-ink-soft">
        {result.total > 0 ? (
          <>
            Encontramos <strong className="text-navy-900">{result.total}</strong> resultado{result.total > 1 ? "s" : ""} para “{q}”.
          </>
        ) : (
          <>Não encontramos resultados para “{q}”.</>
        )}
      </p>

      {result.total === 0 ? (
        <div className="space-y-6">
          <Alert tone="info" title="Tente de outro jeito">
            <ul className="list-disc space-y-1 pl-5">
              <li>Use poucas palavras, por exemplo: “WhatsApp sem som”.</li>
              <li>Diga o nome do aplicativo: WhatsApp, Instagram, YouTube…</li>
              <li>Ou escolha um dos problemas comuns abaixo.</li>
            </ul>
          </Alert>
          <Browse userId={uid} />
        </div>
      ) : null}

      {result.guides.length > 0 ? (
        <section aria-labelledby="guias">
          <SectionHeader id="guias" title="Guias de solução" />
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {result.guides.map((g) => <ContentRow key={g.id} item={g} />)}
          </ul>
        </section>
      ) : null}
      {result.others.length > 0 ? (
        <section aria-labelledby="outros">
          <SectionHeader id="outros" title="Aulas, dicas e artigos" />
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {result.others.map((g) => <ContentRow key={g.id} item={g} />)}
          </ul>
        </section>
      ) : null}
      {result.courses.length > 0 ? (
        <section aria-labelledby="cursos">
          <SectionHeader id="cursos" title="Cursos sobre o assunto" />
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.courses.map((c) => <li key={c.id}><CourseCard course={c} /></li>)}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

async function Browse({ userId }: { userId: string | null }) {
  const [guides, categories] = await Promise.all([
    listContent(userId, { type: "guide", limit: 12, orderBy: "popular" }),
    listCategories(userId),
  ]);
  return (
    <div className="space-y-10">
      <section aria-labelledby="comuns">
        <SectionHeader id="comuns" title="Problemas comuns" />
        <ul className="flex flex-wrap gap-2">
          {commonProblems.map((p) => (
            <li key={p}>
              <Link
                href={`/resolver?q=${encodeURIComponent(p)}`}
                className="inline-flex min-h-12 items-center rounded-full border-2 border-navy-100 bg-white px-4 font-semibold text-navy-900 hover:border-navy-900"
              >
                {p}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {guides.length > 0 ? (
        <section aria-labelledby="todos-guias">
          <SectionHeader id="todos-guias" title="Guias de solução" />
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {guides.map((g) => <ContentRow key={g.id} item={g} />)}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="por-assunto">
        <SectionHeader id="por-assunto" title="Procurar por assunto ou aplicativo" />
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link href={`/aprender/${c.slug}`} className="flex min-h-14 items-center gap-3 rounded-[var(--radius-control)] border border-line bg-white px-4 font-semibold text-navy-900 hover:border-navy-200">
                <CategoryIcon name={c.icon} className="size-5 text-navy-700" />
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
