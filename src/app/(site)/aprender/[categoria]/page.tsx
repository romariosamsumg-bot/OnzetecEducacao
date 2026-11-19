import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CardGrid, ContentRow, CourseCard } from "@/components/content/cards";
import { Container, EmptyState, LoadingBlock, PageHeader, SectionHeader } from "@/components/ui/primitives";
import { getViewer } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { getCategory } from "@/lib/content/queries";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ categoria: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { categoria } = await params;
  const [c] = await asUser(null, (db) => db<{ name: string; description: string }[]>`
    select name, description from public.categories where slug = ${categoria} and is_active`);
  if (!c) return { title: "Assunto não encontrado", robots: { index: false } };
  return pageMetadata({ title: c.name, description: c.description, path: `/aprender/${categoria}` });
}

export default function CategoriaPage({ params }: Props) {
  return (
    <Container className="py-8">
      <Suspense fallback={<LoadingBlock label="Carregando assunto…" />}>
        <View params={params} />
      </Suspense>
    </Container>
  );
}

async function View({ params }: Props) {
  const { categoria } = await params;
  const viewer = await getViewer();
  const data = await getCategory(viewer?.id ?? null, categoria);
  if (!data) notFound();
  const guides = data.items.filter((i) => i.type === "guide");
  const others = data.items.filter((i) => i.type !== "guide");
  return (
    <>
      <PageHeader title={data.category.name} description={data.category.description} back={{ href: "/aprender", label: "Todos os assuntos" }} />
      <div className="space-y-12">
        {data.courses.length > 0 ? (
          <section aria-labelledby="cursos">
            <SectionHeader id="cursos" title="Cursos" />
            <CardGrid>
              {data.courses.map((c) => (
                <li key={c.id}><CourseCard course={c} /></li>
              ))}
            </CardGrid>
          </section>
        ) : null}
        {guides.length > 0 ? (
          <section aria-labelledby="guias">
            <SectionHeader id="guias" title="Resolver problemas" />
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {guides.map((g) => <ContentRow key={g.id} item={g} />)}
            </ul>
          </section>
        ) : null}
        {others.length > 0 ? (
          <section aria-labelledby="outros">
            <SectionHeader id="outros" title="Vídeos, dicas e artigos" />
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {others.map((g) => <ContentRow key={g.id} item={g} />)}
            </ul>
          </section>
        ) : null}
        {data.courses.length + data.items.length === 0 ? (
          <EmptyState title="Ainda não há conteúdos neste assunto">
            Novas aulas são publicadas com frequência. Enquanto isso, veja os outros assuntos.
          </EmptyState>
        ) : null}
      </div>
    </>
  );
}
