import Image from "next/image";
import { AlertTriangle, CalendarCheck, Lightbulb, Lock } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge } from "@/components/ui/primitives";
import type { ArticleBlock, EditorialStatus, GuideBody } from "@/lib/content/types";
import { formatDate } from "@/lib/content/types";

/** Renderização segura: somente texto; nada de HTML vindo do banco. */
export function ArticleBlocks({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <div className="prose-oz max-w-[68ch] space-y-4 text-[1.05rem] leading-relaxed">
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading":
            return (
              <h2 key={i} className="pt-4 text-[1.35rem] font-bold text-navy-900">
                {b.text}
              </h2>
            );
          case "paragraph":
            return (
              <p key={i} className="whitespace-pre-line">
                {b.text}
              </p>
            );
          case "tip":
            return (
              <div key={i} className="flex gap-3 rounded-[var(--radius-control)] bg-success-50 p-4 text-[#14532d]">
                <Lightbulb aria-hidden className="mt-0.5 size-6 shrink-0" />
                <p>
                  <strong>Dica: </strong>
                  {b.text}
                </p>
              </div>
            );
          case "warning":
            return (
              <div key={i} className="flex gap-3 rounded-[var(--radius-control)] bg-warning-50 p-4 text-[#5c3800]">
                <AlertTriangle aria-hidden className="mt-0.5 size-6 shrink-0" />
                <p>
                  <strong>Atenção: </strong>
                  {b.text}
                </p>
              </div>
            );
          case "image":
            return (
              <figure key={i} className="space-y-2">
                <Image src={b.url} alt={b.alt} width={720} height={480} className="h-auto w-full rounded-[var(--radius-control)] border border-line" />
                {b.text ? <figcaption className="text-[0.9rem] text-ink-muted">{b.text}</figcaption> : null}
              </figure>
            );
          default:
            return null;
        }
      })}
    </div>
  );
}

export function GuideSteps({ guide }: { guide: GuideBody }) {
  return (
    <div className="space-y-8">
      {guide.causes.length > 0 ? (
        <section aria-labelledby="causas" className="space-y-3">
          <h2 id="causas" className="text-[1.35rem] font-bold text-navy-900">
            Possíveis causas
          </h2>
          <p className="text-ink-muted">Não dá para saber com certeza sem ver o seu aparelho. As mais comuns são:</p>
          <ul className="list-disc space-y-1.5 pl-6 text-[1.05rem]">
            {guide.causes.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section aria-labelledby="passos" className="space-y-4">
        <h2 id="passos" className="text-[1.35rem] font-bold text-navy-900">
          Passo a passo
        </h2>
        <ol className="space-y-4">
          {guide.steps.map((s, i) => (
            <li key={i} className="flex gap-4 rounded-[var(--radius-card)] border border-line bg-white p-4 sm:p-5">
              <span
                aria-hidden
                className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-900 text-[1.1rem] font-bold text-white"
              >
                {i + 1}
              </span>
              <div className="min-w-0 flex-1 space-y-3">
                <p className="text-[1.08rem] leading-relaxed">
                  <span className="sr-only">Passo {i + 1}: </span>
                  {s.text}
                </p>
                {s.image_url ? (
                  <Image
                    src={s.image_url}
                    alt={s.image_alt ?? `Imagem do passo ${i + 1}`}
                    width={480}
                    height={960}
                    className="h-auto max-h-[28rem] w-auto rounded-[var(--radius-control)] border border-line"
                  />
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {guide.cautions.length > 0 ? (
        <Alert tone="warning" title="Cuidados importantes">
          <ul className="list-disc space-y-1 pl-5">
            {guide.cautions.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {guide.if_not_working ? (
        <section aria-labelledby="nao-funcionou" className="rounded-[var(--radius-card)] bg-navy-50 p-5">
          <h2 id="nao-funcionou" className="mb-2 text-[1.2rem] font-bold text-navy-900">
            Não funcionou?
          </h2>
          <p className="text-[1.05rem]">{guide.if_not_working}</p>
        </section>
      ) : null}
    </div>
  );
}

export function EditorialInfo({
  appName,
  osName,
  versionRange,
  lastReviewedAt,
  editorialStatus,
}: {
  appName: string | null;
  osName: string | null;
  versionRange: string | null;
  lastReviewedAt: Date | null;
  editorialStatus: EditorialStatus | string;
}) {
  const reviewed = formatDate(lastReviewedAt);
  if (!reviewed && !appName && !osName) return null;
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.9rem] text-ink-muted">
      <CalendarCheck aria-hidden className="size-4" />
      {reviewed ? <span>Revisado em {reviewed}</span> : null}
      {appName ? <span>· {appName}</span> : null}
      {osName ? (
        <span>
          · {osName}
          {versionRange ? ` ${versionRange}` : ""}
        </span>
      ) : null}
      {editorialStatus === "outdated" ? <Badge tone="warning">Pode estar desatualizado</Badge> : null}
    </p>
  );
}

export function Paywall({ signedIn, returnTo, kind = "conteúdo" }: { signedIn: boolean; returnTo: string; kind?: string }) {
  return (
    <section aria-labelledby="exclusivo" className="rounded-[var(--radius-card)] border-2 border-navy-900 bg-white p-6 text-center sm:p-8">
      <Lock aria-hidden className="mx-auto mb-3 size-10 text-navy-700" />
      <h2 id="exclusivo" className="text-[1.4rem] font-bold text-navy-900">
        Este {kind} é exclusivo para assinantes
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-ink-soft">
        Com a assinatura você libera todas as aulas, guias de solução e dicas, e pode tirar dúvidas nos comentários.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/assinatura" size="lg">
          Ver planos de assinatura
        </ButtonLink>
        {!signedIn ? (
          <ButtonLink href={`/entrar?voltar=${encodeURIComponent(returnTo)}`} variant="outline" size="lg">
            Já sou assinante — entrar
          </ButtonLink>
        ) : null}
      </div>
    </section>
  );
}
