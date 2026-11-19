import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookMarked, Smartphone } from "lucide-react";
import { CardGrid, ContentCard, CourseCard } from "@/components/content/cards";
import { CategoryIcon, tintFor } from "@/components/ui/icon";
import { Container, LoadingBlock, PageHeader, SectionHeader } from "@/components/ui/primitives";
import { cn } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/viewer";
import { listCategories, listContent, listCourses } from "@/lib/content/queries";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Aprender",
  description: "Cursos, videoaulas, artigos e dicas rápidas sobre Android, WhatsApp, redes sociais, internet e segurança digital.",
  path: "/aprender",
});

export default function AprenderPage() {
  return (
    <Container className="py-8">
      <PageHeader title="O que você quer aprender?" description="Escolha um assunto. Cada um tem cursos, guias e dicas." />
      <Suspense fallback={<LoadingBlock label="Carregando assuntos…" />}>
        <Catalog />
      </Suspense>
    </Container>
  );
}

async function Catalog() {
  const viewer = await getViewer();
  const uid = viewer?.id ?? null;
  const [categories, courses, shorts, articles] = await Promise.all([
    listCategories(uid),
    listCourses(uid, 12),
    listContent(uid, { type: "short", limit: 4 }),
    listContent(uid, { type: "article", limit: 3 }),
  ]);
  return (
    <div className="space-y-12">
      <section aria-labelledby="assuntos">
        <h2 id="assuntos" className="sr-only">Assuntos</h2>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/aprender/${c.slug}`}
                className="flex min-h-20 items-center gap-4 rounded-[var(--radius-card)] border border-line bg-white p-4 shadow-[var(--shadow-card)] hover:border-navy-200"
              >
                <span aria-hidden className={cn("flex size-12 shrink-0 items-center justify-center rounded-xl", tintFor(c.slug))}>
                  <CategoryIcon name={c.icon} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[1.08rem] font-bold text-navy-900">{c.name}</span>
                  <span className="line-clamp-2 block text-[0.9rem] text-ink-muted">{c.description}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {courses.length > 0 ? (
        <section aria-labelledby="cursos">
          <SectionHeader id="cursos" title="Cursos" description="Aulas em sequência, do básico ao essencial." />
          <CardGrid>
            {courses.map((c) => (
              <li key={c.id}><CourseCard course={c} /></li>
            ))}
          </CardGrid>
        </section>
      ) : null}

      {shorts.length > 0 ? (
        <section aria-labelledby="dicas">
          <SectionHeader id="dicas" title="Dicas rápidas" href="/dicas" linkLabel="Ver dicas" />
          <CardGrid cols={4}>
            {shorts.map((s) => (
              <li key={s.id}><ContentCard item={s} /></li>
            ))}
          </CardGrid>
        </section>
      ) : null}

      {articles.length > 0 ? (
        <section aria-labelledby="artigos">
          <SectionHeader id="artigos" title="Artigos" />
          <CardGrid>
            {articles.map((s) => (
              <li key={s.id}><ContentCard item={s} /></li>
            ))}
          </CardGrid>
        </section>
      ) : null}

      <section aria-labelledby="mais" className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <h2 id="mais" className="sr-only">Mais formas de aprender</h2>
        <Link href="/dicas" className="flex items-center gap-4 rounded-[var(--radius-card)] bg-navy-900 p-6 text-white hover:bg-navy-800">
          <Smartphone aria-hidden className="size-10 text-orange-400" />
          <span>
            <span className="block text-[1.2rem] font-bold">Dicas rápidas</span>
            <span className="text-navy-100">Vídeos curtos para assistir no celular.</span>
          </span>
        </Link>
        <Link href="/livraria" className="flex items-center gap-4 rounded-[var(--radius-card)] border-2 border-navy-900 bg-white p-6 hover:bg-navy-50">
          <BookMarked aria-hidden className="size-10 text-orange-700" />
          <span>
            <span className="block text-[1.2rem] font-bold text-navy-900">Livraria Onzetec</span>
            <span className="text-ink-soft">Livros digitais para consultar quando quiser.</span>
          </span>
        </Link>
      </section>
    </div>
  );
}
