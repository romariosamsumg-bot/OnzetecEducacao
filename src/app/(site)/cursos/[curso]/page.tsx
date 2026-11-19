import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { CheckCircle2, Circle, Clock, Lock, PlayCircle } from "lucide-react";
import { EditorialInfo } from "@/components/content/blocks";
import { ButtonLink, cn } from "@/components/ui/button";
import { AccessBadge, Container, DemoBadge, LoadingBlock, PageHeader, ProgressBar } from "@/components/ui/primitives";
import { getViewer } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { getCourse } from "@/lib/content/queries";
import { formatDuration } from "@/lib/content/types";
import { absoluteUrl, jsonLd, organizationLd, pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ curso: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { curso } = await params;
  const [c] = await asUser(null, (db) => db<{ title: string; summary: string; coverImageUrl: string | null }[]>`
    select title, summary, cover_image_url from public.courses where slug = ${curso}`);
  if (!c) return { title: "Curso não encontrado", robots: { index: false } };
  return pageMetadata({ title: c.title, description: c.summary, path: `/cursos/${curso}`, image: c.coverImageUrl });
}

export default function CursoPage({ params }: Props) {
  return (
    <Container className="py-8">
      <Suspense fallback={<LoadingBlock label="Carregando curso…" />}>
        <View params={params} />
      </Suspense>
    </Container>
  );
}

async function View({ params }: Props) {
  const { curso } = await params;
  const viewer = await getViewer();
  const data = await getCourse(viewer?.id ?? null, curso);
  if (!data) notFound();
  const { course, modules, completedCount, nextLessonSlug } = data;
  const total = course.lessonsCount;
  const started = completedCount > 0 || modules.some((m) => m.lessons.some((l) => l.positionSeconds > 0));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLd({
          "@context": "https://schema.org",
          "@type": "Course",
          name: course.title,
          description: course.summary,
          url: absoluteUrl(`/cursos/${course.slug}`),
          inLanguage: "pt-BR",
          provider: organizationLd,
          hasCourseInstance: { "@type": "CourseInstance", courseMode: "online" },
        })}
      />
      <PageHeader
        back={{ href: course.categorySlug ? `/aprender/${course.categorySlug}` : "/aprender", label: course.categoryName ?? "Aprender" }}
        eyebrow={
          <>
            <span className="font-semibold text-navy-700">Curso</span>
            {course.isDemo ? <DemoBadge /> : null}
          </>
        }
        title={course.title}
        description={course.summary}
      />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          {course.description ? <p className="max-w-[65ch] text-[1.05rem] leading-relaxed">{course.description}</p> : null}
          <EditorialInfo
            appName={course.appName}
            osName={course.osName}
            versionRange={course.versionRange}
            lastReviewedAt={course.lastReviewedAt}
            editorialStatus="current"
          />

          <section aria-labelledby="conteudo-curso" className="space-y-5">
            <h2 id="conteudo-curso" className="text-[1.35rem] font-bold text-navy-900">
              Conteúdo do curso
            </h2>
            {modules.map((m, mi) => (
              <section key={m.id} aria-labelledby={`modulo-${m.id}`} className="overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
                <h3 id={`modulo-${m.id}`} className="border-b border-line bg-navy-50 px-4 py-3 font-bold text-navy-900">
                  Módulo {mi + 1}: {m.title}
                </h3>
                <ol>
                  {m.lessons.map((l, li) => {
                    const locked = l.access === "premium" && !viewer?.hasAccess;
                    return (
                      <li key={l.id} className="border-b border-line-soft last:border-0">
                        <Link href={`/aulas/${l.slug}`} className="flex min-h-16 items-center gap-3 px-4 py-3 hover:bg-navy-50">
                          {l.completed ? (
                            <CheckCircle2 aria-hidden className="size-6 shrink-0 text-success-700" />
                          ) : locked ? (
                            <Lock aria-hidden className="size-6 shrink-0 text-ink-muted" />
                          ) : l.positionSeconds > 0 ? (
                            <PlayCircle aria-hidden className="size-6 shrink-0 text-orange-700" />
                          ) : (
                            <Circle aria-hidden className="size-6 shrink-0 text-navy-200" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="block font-semibold text-navy-900">
                              {li + 1}. {l.title}
                            </span>
                            <span className="flex flex-wrap items-center gap-2 text-[0.85rem] text-ink-muted">
                              {formatDuration(l.durationSeconds) ? (
                                <span className="inline-flex items-center gap-1">
                                  <Clock aria-hidden className="size-3.5" /> {formatDuration(l.durationSeconds)}
                                </span>
                              ) : null}
                              {l.completed ? <span className="font-semibold text-success-700">Concluída</span> : null}
                            </span>
                          </span>
                          {l.access === "free" ? <AccessBadge access="free" /> : null}
                          {locked ? <span className="sr-only">Exclusiva para assinantes</span> : null}
                        </Link>
                      </li>
                    );
                  })}
                </ol>
              </section>
            ))}
          </section>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-4 rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[var(--shadow-card)]">
            <p className="flex items-center gap-2 text-ink-soft">
              <Clock aria-hidden className="size-5" /> {total} aulas{formatDuration(course.totalSeconds) ? ` · ${formatDuration(course.totalSeconds)}` : ""}
            </p>
            {viewer && total > 0 ? (
              <div className="space-y-1">
                <ProgressBar value={(completedCount / total) * 100} label="Seu progresso no curso" />
                <p className="text-[0.9rem] text-ink-muted">
                  {completedCount} de {total} aulas concluídas
                </p>
              </div>
            ) : null}
            {nextLessonSlug ? (
              <ButtonLink href={`/aulas/${nextLessonSlug}`} full size="lg">
                {started ? "Continuar de onde parei" : "Começar o curso"}
              </ButtonLink>
            ) : null}
            {!viewer?.hasAccess ? (
              <p className={cn("text-[0.95rem] text-ink-soft")}>
                {course.freeLessonsCount > 0 ? `${course.freeLessonsCount} aula(s) gratuita(s). ` : ""}
                As demais aulas são para assinantes.{" "}
                <Link href="/assinatura" className="font-bold text-orange-700 underline underline-offset-4">
                  Ver assinatura
                </Link>
              </p>
            ) : null}
          </div>
        </aside>
      </div>
    </>
  );
}
