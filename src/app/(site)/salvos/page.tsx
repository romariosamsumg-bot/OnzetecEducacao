import type { Metadata } from "next";
import { Suspense } from "react";
import { Bookmark, PlayCircle } from "lucide-react";
import { ContentRow, CourseCard } from "@/components/content/cards";
import { ButtonLink } from "@/components/ui/button";
import { Container, EmptyState, LoadingBlock, PageHeader, SectionHeader } from "@/components/ui/primitives";
import { requireViewer } from "@/lib/auth/viewer";
import { listSaved } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Meus salvos", robots: { index: false } };

export default function SalvosPage() {
  return (
    <Container className="py-8">
      <PageHeader title="Meus salvos" description="Conteúdos que você salvou e aulas que você começou." />
      <Suspense fallback={<LoadingBlock label="Carregando seus salvos…" />}>
        <View />
      </Suspense>
    </Container>
  );
}

async function View() {
  const viewer = await requireViewer("/salvos");
  const { saved, inProgress, courses } = await listSaved(viewer.id);
  return (
    <div className="space-y-12">
      <section aria-labelledby="em-andamento">
        <SectionHeader id="em-andamento" title="Continuar de onde parei" />
        {inProgress.length === 0 && courses.length === 0 ? (
          <EmptyState icon={<PlayCircle />} title="Você ainda não começou nenhuma aula" action={<ButtonLink href="/aprender">Ver cursos</ButtonLink>} />
        ) : (
          <div className="space-y-6">
            {courses.length > 0 ? (
              <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {courses.map((c) => (
                  <li key={c.id}><CourseCard course={c} progress={{ done: c.done, total: c.total }} /></li>
                ))}
              </ul>
            ) : null}
            {inProgress.length > 0 ? (
              <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {inProgress.map((i) => <ContentRow key={i.id} item={i} />)}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      <section aria-labelledby="salvos">
        <SectionHeader id="salvos" title="Salvos" />
        {saved.length === 0 ? (
          <EmptyState icon={<Bookmark />} title="Nada salvo ainda">
            Toque em <strong>“Salvar”</strong> em qualquer aula, dica, artigo ou guia para encontrá-lo aqui depois.
          </EmptyState>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {saved.map((i) => <ContentRow key={i.id} item={i} />)}
          </ul>
        )}
      </section>
    </div>
  );
}
