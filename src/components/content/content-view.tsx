import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock, FileText, Paperclip } from "lucide-react";
import { ArticleBlocks, EditorialInfo, GuideSteps, Paywall } from "@/components/content/blocks";
import { ContentRow } from "@/components/content/cards";
import { CommentsSection } from "@/components/community/comments";
import { CompleteButton, GuideFeedback, InteractionBar } from "@/components/community/interaction-bar";
import { VideoPlayer } from "@/components/player/video-player";
import { AccessBadge, Alert, BackLink, Container, DemoBadge } from "@/components/ui/primitives";
import { getViewer } from "@/lib/auth/viewer";
import { getContent, listComments } from "@/lib/content/queries";
import { contentHref, contentTypeLabel, formatDuration, type ContentType } from "@/lib/content/types";
import { absoluteUrl, jsonLd, organizationLd } from "@/lib/seo";
import { getPlayback } from "@/lib/video";

const backFor: Record<ContentType, { href: string; label: string }> = {
  video: { href: "/aprender", label: "Voltar para Aprender" },
  short: { href: "/dicas", label: "Voltar para Dicas rápidas" },
  article: { href: "/aprender", label: "Voltar para Aprender" },
  guide: { href: "/resolver", label: "Voltar para Resolver" },
};

export async function ContentView({ slug, type }: { slug: string; type: ContentType }) {
  const viewer = await getViewer();
  const detail = await getContent(viewer?.id ?? null, slug, type);
  if (!detail) notFound();
  const { item, body, viewer: state } = detail;
  const path = contentHref(item.type, item.slug);
  const comments = await listComments(viewer?.id ?? null, item.id);
  const playback = body ? getPlayback(body.video, viewer?.id ?? null) : null;
  const back = item.courseSlug
    ? { href: `/cursos/${item.courseSlug}`, label: `Voltar para o curso` }
    : backFor[item.type];
  const commentMode = !item.commentsEnabled
    ? "disabled"
    : !viewer
      ? "guest"
      : viewer.hasAccess
        ? "member"
        : "free-account";
  const duration = formatDuration(item.durationSeconds);

  const ld: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": item.type === "article" ? "Article" : item.type === "guide" ? "HowTo" : "LearningResource",
    name: item.title,
    headline: item.title,
    description: item.summary,
    url: absoluteUrl(path),
    inLanguage: "pt-BR",
    datePublished: item.publishedAt ? new Date(item.publishedAt).toISOString() : undefined,
    dateModified: new Date(item.updatedAt).toISOString(),
    publisher: organizationLd,
    isAccessibleForFree: item.access === "free",
    ...(item.access === "premium"
      ? { hasPart: { "@type": "WebPageElement", isAccessibleForFree: false, cssSelector: ".conteudo-exclusivo" } }
      : {}),
    ...(item.type === "guide" && body?.guide && item.access === "free"
      ? { step: body.guide.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s.text })) }
      : {}),
  };

  return (
    <Container className="py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(ld)} />
      <BackLink href={back.href}>{back.label}</BackLink>
      {!item.isLive ? (
        <Alert tone="warning" title="Pré-visualização" className="mt-3">
          Este conteúdo ainda não está publicado (ou o curso dele não está). Só administradores conseguem vê-lo.
        </Alert>
      ) : null}

      <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] grid-cols-1">
        <article className="min-w-0 space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[0.95rem] font-semibold text-navy-700">{contentTypeLabel[item.type]}</span>
              {item.courseTitle ? <span className="text-[0.95rem] text-ink-muted">· {item.courseTitle}</span> : null}
              <AccessBadge access={item.access} />
              {item.isDemo ? <DemoBadge /> : null}
            </div>
            <h1 className="text-[1.8rem] leading-tight font-bold tracking-tight text-navy-900 sm:text-[2.2rem]">{item.title}</h1>
            {item.summary ? <p className="max-w-[65ch] text-[1.1rem] text-ink-soft">{item.summary}</p> : null}
            <div className="flex flex-wrap items-center gap-3 text-[0.9rem] text-ink-muted">
              {duration ? (
                <span className="inline-flex items-center gap-1">
                  <Clock aria-hidden className="size-4" /> {duration}
                </span>
              ) : null}
              <EditorialInfo
                appName={item.appName}
                osName={item.osName}
                versionRange={item.versionRange}
                lastReviewedAt={item.lastReviewedAt}
                editorialStatus={item.editorialStatus}
              />
            </div>
          </header>

          {!body ? (
            <div className="conteudo-exclusivo">
              <Paywall signedIn={!!viewer} returnTo={path} kind={item.type === "guide" ? "guia" : item.type === "article" ? "artigo" : "conteúdo"} />
            </div>
          ) : (
            <div className="space-y-8">
              {playback ? (
                <VideoPlayer
                  contentId={item.id}
                  src={playback.src}
                  type={playback.type}
                  poster={playback.poster}
                  captions={playback.captions}
                  title={item.title}
                  initialPosition={state.completed ? 0 : state.positionSeconds}
                  trackProgress={!!viewer}
                  vertical={item.type === "short"}
                  next={detail.next && item.type === "video" ? { href: `/aulas/${detail.next.slug}`, title: detail.next.title } : null}
                />
              ) : body.video ? (
                <Alert tone="warning" title="Vídeo indisponível no momento">
                  O vídeo desta aula ainda está sendo preparado. Tente novamente mais tarde.
                </Alert>
              ) : null}

              <InteractionBar
                contentId={item.id}
                title={item.title}
                path={path}
                initialLiked={state.liked}
                initialSaved={state.saved}
                initialLikes={item.likesCount}
                signedIn={!!viewer}
              />

              {item.type === "guide" && body.guide ? (
                <>
                  <GuideSteps guide={body.guide} />
                  <GuideFeedback contentId={item.id} initial={state.feedback} signedIn={!!viewer} />
                </>
              ) : null}

              {item.type === "article" ? <ArticleBlocks blocks={body.blocks} /> : null}

              {body.materials.length > 0 ? (
                <section aria-labelledby="materiais" className="space-y-2">
                  <h2 id="materiais" className="text-[1.2rem] font-bold text-navy-900">
                    Materiais complementares
                  </h2>
                  <ul className="space-y-1">
                    {body.materials.map((m) => (
                      <li key={m.url}>
                        <Link href={m.url} className="inline-flex min-h-11 items-center gap-2 font-semibold text-orange-700 underline underline-offset-4">
                          <Paperclip aria-hidden className="size-5" /> {m.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              {body.transcript ? (
                <details className="rounded-[var(--radius-card)] border border-line bg-white p-4">
                  <summary className="flex min-h-11 cursor-pointer items-center gap-2 font-bold text-navy-900">
                    <FileText aria-hidden className="size-5" /> Ler a transcrição da aula
                  </summary>
                  <p className="mt-3 max-w-[68ch] whitespace-pre-line leading-relaxed">{body.transcript}</p>
                </details>
              ) : null}

              {viewer && item.type !== "short" ? <CompleteButton contentId={item.id} initialCompleted={state.completed} /> : null}

              {detail.prev || detail.next ? (
                <nav aria-label={item.type === "short" ? "Navegação entre dicas" : "Navegação entre aulas"} className="flex flex-wrap justify-between gap-3 border-t border-line pt-6">
                  {detail.prev ? (
                    <Link href={contentHref(item.type, detail.prev.slug)} className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] border-2 border-line px-4 font-semibold text-navy-900 hover:bg-navy-50">
                      <ArrowLeft aria-hidden className="size-5" />
                      <span>
                        <span className="block text-[0.8rem] text-ink-muted">{item.type === "short" ? "Dica anterior" : "Aula anterior"}</span>
                        {detail.prev.title}
                      </span>
                    </Link>
                  ) : (
                    <span />
                  )}
                  {detail.next ? (
                    <Link href={contentHref(item.type, detail.next.slug)} className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] bg-navy-900 px-4 font-semibold text-white hover:bg-navy-800">
                      <span className="text-right">
                        <span className="block text-[0.8rem] text-navy-200">{item.type === "short" ? "Próxima dica" : "Próxima aula"}</span>
                        {detail.next.title}
                      </span>
                      <ArrowRight aria-hidden className="size-5" />
                    </Link>
                  ) : null}
                </nav>
              ) : null}
            </div>
          )}

          <div className="border-t border-line pt-8">
            <CommentsSection contentId={item.id} comments={comments} mode={commentMode} returnTo={path} />
          </div>
        </article>

        {detail.related.length > 0 ? (
          <aside aria-labelledby="relacionados" className="space-y-4">
            <h2 id="relacionados" className="text-[1.2rem] font-bold text-navy-900">
              Conteúdos relacionados
            </h2>
            <ul className="space-y-3">
              {detail.related.map((r) => (
                <ContentRow key={r.id} item={r} />
              ))}
            </ul>
          </aside>
        ) : null}
      </div>
    </Container>
  );
}
