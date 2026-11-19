import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  BookOpen,
  HeartHandshake,
  LifeBuoy,
  PlayCircle,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Type,
} from "lucide-react";
import { CardGrid, ContentCard, CourseCard } from "@/components/content/cards";
import { ProblemSearch } from "@/components/content/problem-search";
import { OnboardingCard } from "@/components/content/onboarding-card";
import { ButtonLink } from "@/components/ui/button";
import { Container, LoadingBlock, ProgressBar, SectionHeader } from "@/components/ui/primitives";
import { getViewer, type Viewer } from "@/lib/auth/viewer";
import { continueLearning, listContent, listCourses, recommendedCourses } from "@/lib/content/queries";
import { contentHref } from "@/lib/content/types";

export const metadata: Metadata = {
  title: { absolute: "Onzetec Educação — aprenda a usar o celular com calma" },
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <Suspense fallback={<Container className="py-8"><LoadingBlock label="Carregando a página inicial…" /></Container>}>
      <Home />
    </Suspense>
  );
}

async function Home() {
  const viewer = await getViewer();
  return viewer ? <MemberHome viewer={viewer} /> : <PublicHome />;
}

/* ------------------------------------------------------------------ */
/* Assinante / pessoa cadastrada                                       */
/* ------------------------------------------------------------------ */
async function MemberHome({ viewer }: { viewer: Viewer }) {
  const [cont, recommended, shorts, recent] = await Promise.all([
    continueLearning(viewer.id, 3),
    recommendedCourses(viewer.id, viewer.learningInterest, 3),
    listContent(viewer.id, { type: "short", limit: 4 }),
    listContent(viewer.id, { standaloneOnly: true, limit: 6 }),
  ]);
  const first = viewer.displayName.split(" ")[0];

  return (
    <Container className="space-y-12 py-8">
      <section aria-labelledby="saudacao" className="space-y-5">
        <h1 id="saudacao" className="text-[1.9rem] leading-tight font-bold text-navy-900">
          Olá{first ? `, ${first}` : ""}! O que você quer aprender hoje?
        </h1>
        <ProblemSearch label="Digite a sua dúvida com as suas palavras" />
        <div className="flex flex-wrap gap-3">
          <ButtonLink href="/resolver" variant="secondary" size="lg" icon={<LifeBuoy aria-hidden className="size-6" />}>
            Resolver um problema
          </ButtonLink>
          <ButtonLink href="/aprender" variant="outline" size="lg" icon={<BookOpen aria-hidden className="size-6" />}>
            Ver cursos
          </ButtonLink>
        </div>
        {!viewer.hasAccess ? (
          <div className="rounded-[var(--radius-card)] border border-orange-100 bg-orange-50 p-5">
            <p className="font-bold text-navy-900">Você está usando a versão gratuita.</p>
            <p className="text-ink-soft">Assine para liberar todos os cursos, guias e dicas.</p>
            <Link href="/assinatura" className="mt-2 inline-flex min-h-11 items-center font-bold text-orange-700 underline underline-offset-4">
              Conhecer a assinatura
            </Link>
          </div>
        ) : null}
      </section>

      {!viewer.onboardingDone ? <OnboardingCard /> : null}

      {cont.length > 0 ? (
        <section aria-labelledby="continuar">
          <SectionHeader id="continuar" title="Continuar de onde parei" href="/salvos" linkLabel="Ver todos" />
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {cont.map((c) => {
              const pct = c.progressDuration ? (c.positionSeconds / c.progressDuration) * 100 : 0;
              return (
                <li key={c.id}>
                  <Link
                    href={contentHref(c.type, c.slug)}
                    className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] border-2 border-navy-900 bg-white p-4 hover:bg-navy-50"
                  >
                    <span className="inline-flex items-center gap-2 font-semibold text-orange-700">
                      <PlayCircle aria-hidden className="size-6" /> Continuar
                    </span>
                    <span className="text-[1.1rem] font-bold text-navy-900">{c.title}</span>
                    {c.courseTitle ? <span className="text-[0.9rem] text-ink-muted">{c.courseTitle}</span> : null}
                    <ProgressBar value={pct} label={`Progresso em ${c.title}`} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {recommended.length > 0 ? (
        <section aria-labelledby="recomendados">
          <SectionHeader id="recomendados" title="Cursos recomendados para você" href="/aprender" />
          <CardGrid>
            {recommended.map((c) => (
              <li key={c.id}>
                <CourseCard course={c} />
              </li>
            ))}
          </CardGrid>
        </section>
      ) : null}

      {shorts.length > 0 ? (
        <section aria-labelledby="dicas">
          <SectionHeader id="dicas" title="Dicas rápidas" description="Vídeos curtos de até 1 minuto." href="/dicas" />
          <CardGrid cols={4}>
            {shorts.map((s) => (
              <li key={s.id}>
                <ContentCard item={s} />
              </li>
            ))}
          </CardGrid>
        </section>
      ) : null}

      {recent.length > 0 ? (
        <section aria-labelledby="recentes">
          <SectionHeader id="recentes" title="Publicados recentemente" />
          <CardGrid>
            {recent.map((s) => (
              <li key={s.id}>
                <ContentCard item={s} />
              </li>
            ))}
          </CardGrid>
        </section>
      ) : null}
    </Container>
  );
}

/* ------------------------------------------------------------------ */
/* Visitante                                                           */
/* ------------------------------------------------------------------ */
async function PublicHome() {
  const [courses, freeGuides] = await Promise.all([
    listCourses(null, 3),
    listContent(null, { type: "guide", limit: 4, orderBy: "popular" }),
  ]);

  return (
    <>
      <section className="bg-navy-900 text-white on-dark">
        <Container className="grid grid-cols-1 gap-10 py-12 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:items-center">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full bg-navy-800 px-3 py-1 text-[0.9rem] font-semibold text-orange-400">
              <Sparkles aria-hidden className="size-4" /> Aprender tecnologia sem pressa
            </p>
            <h1 className="text-[2.1rem] leading-[1.15] font-bold tracking-tight sm:text-[2.75rem]">
              Use o seu celular com confiança — e sem depender de ninguém.
            </h1>
            <p className="max-w-xl text-[1.1rem] text-navy-100">
              Aulas em vídeo, guias passo a passo e dicas rápidas sobre Android, WhatsApp, internet e segurança. Em
              linguagem simples, com letras grandes e no seu ritmo.
            </p>
            <div className="flex flex-wrap gap-3">
              <ButtonLink href="/assinatura" size="lg" icon={<ArrowRight aria-hidden className="size-5" />}>
                Conhecer a assinatura
              </ButtonLink>
              <ButtonLink href="/aprender" variant="inverse" size="lg">
                Ver aulas gratuitas
              </ButtonLink>
            </div>
          </div>
          <div className="rounded-[var(--radius-card)] bg-white p-5 text-ink shadow-[var(--shadow-raised)] sm:p-6">
            <ProblemSearch label="Está com um problema agora? Conte com as suas palavras:" />
            <p className="mt-3 text-[0.9rem] text-ink-muted">
              Exemplos: “meu zap não toca”, “celular sem espaço”, “como aumentar as letras”.
            </p>
          </div>
        </Container>
      </section>

      <Container className="space-y-16 py-12">
        <section aria-labelledby="como-funciona">
          <h2 id="como-funciona" className="mb-6 text-[1.6rem] font-bold text-navy-900">
            Três jeitos de aprender
          </h2>
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { Icon: LifeBuoy, title: "Resolver um problema", text: "Guias com passos numerados para resolver o que está acontecendo agora.", href: "/resolver" },
              { Icon: BookOpen, title: "Fazer um curso", text: "Aulas curtas, em sequência, para aprender de verdade e sem pressa.", href: "/aprender" },
              { Icon: Smartphone, title: "Dicas rápidas", text: "Vídeos de até 1 minuto com truques úteis para o dia a dia.", href: "/dicas" },
            ].map(({ Icon, title, text, href }) => (
              <li key={href}>
                <Link href={href} className="flex h-full flex-col gap-3 rounded-[var(--radius-card)] border border-line bg-white p-6 shadow-[var(--shadow-card)] hover:border-navy-200">
                  <Icon aria-hidden className="size-9 text-orange-700" />
                  <span className="text-[1.2rem] font-bold text-navy-900">{title}</span>
                  <span className="text-ink-soft">{text}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {freeGuides.length > 0 ? (
          <section aria-labelledby="guias">
            <SectionHeader id="guias" title="Problemas mais procurados" href="/resolver" />
            <CardGrid cols={4}>
              {freeGuides.map((g) => (
                <li key={g.id}>
                  <ContentCard item={g} />
                </li>
              ))}
            </CardGrid>
          </section>
        ) : null}

        {courses.length > 0 ? (
          <section aria-labelledby="cursos">
            <SectionHeader id="cursos" title="Cursos para começar" description="Cada curso tem aulas gratuitas para você experimentar." href="/aprender" />
            <CardGrid>
              {courses.map((c) => (
                <li key={c.id}>
                  <CourseCard course={c} />
                </li>
              ))}
            </CardGrid>
          </section>
        ) : null}

        <section aria-labelledby="feito-para-voce" className="grid grid-cols-1 gap-6 rounded-[var(--radius-card)] bg-navy-50 p-6 sm:p-10 lg:grid-cols-3">
          <h2 id="feito-para-voce" className="text-[1.6rem] font-bold text-navy-900 lg:col-span-3">
            Feito para quem quer aprender com calma
          </h2>
          {[
            { Icon: Type, title: "Letras grandes", text: "Ajuste o tamanho do texto a qualquer momento no botão “Tamanho do texto”." },
            { Icon: ShieldCheck, title: "Segurança em primeiro lugar", text: "Nunca pedimos senhas ou códigos. Ensinamos a reconhecer golpes." },
            { Icon: HeartHandshake, title: "Para toda a família", text: "Filhos e netos podem compartilhar aulas pelo WhatsApp com quem precisa." },
          ].map(({ Icon, title, text }) => (
            <div key={title} className="space-y-2">
              <Icon aria-hidden className="size-8 text-navy-700" />
              <h3 className="text-[1.15rem] font-bold text-navy-900">{title}</h3>
              <p className="text-ink-soft">{text}</p>
            </div>
          ))}
        </section>

        <section className="flex flex-col items-start gap-4 rounded-[var(--radius-card)] border-2 border-orange-500 bg-white p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div>
            <h2 className="text-[1.4rem] font-bold text-navy-900">Pronto para começar?</h2>
            <p className="text-ink-soft">Crie sua conta gratuita e experimente as aulas abertas.</p>
          </div>
          <ButtonLink href="/cadastro" size="lg">
            Criar conta grátis
          </ButtonLink>
        </section>
      </Container>
    </>
  );
}
