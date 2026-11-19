import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { BookOpen, CreditCard, Download, HelpCircle, KeyRound, LogOut, Settings, ShieldCheck, UserRound } from "lucide-react";
import { DeletionRequestForm, PreferencesForm } from "@/components/account/forms";
import { Button, ButtonLink } from "@/components/ui/button";
import { Alert, Card, Container, LoadingBlock, PageHeader } from "@/components/ui/primitives";
import { requireViewer } from "@/lib/auth/viewer";
import { describeSubscription } from "@/lib/billing/state";
import { asUser } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/content/types";
import { devAuthEnabled } from "@/lib/env";
import { signOut } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Minha conta", robots: { index: false } };

export default function ContaPage() {
  return (
    <Container className="py-8">
      <PageHeader title="Minha conta" />
      <Suspense fallback={<LoadingBlock label="Carregando sua conta…" />}>
        <View />
      </Suspense>
    </Container>
  );
}

function Section({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="p-5 sm:p-6">
      <section aria-labelledby={id} className="space-y-4">
        <h2 id={id} className="flex items-center gap-2 text-[1.3rem] font-bold text-navy-900 [&_svg]:size-6 [&_svg]:text-navy-700">
          {icon}
          {title}
        </h2>
        {children}
      </section>
    </Card>
  );
}

async function View() {
  const viewer = await requireViewer("/conta");
  const sub = viewer.subscription;
  const d = describeSubscription(sub);
  const [books, deletion] = await asUser(viewer.id, async (db) => [
    await db<{ slug: string; title: string; source: string }[]>`
      select b.slug, b.title, 'compra' as source from public.book_entitlements e join public.books b on b.id = e.book_id
      where e.user_id = auth.uid() and e.revoked_at is null
      union
      select b.slug, b.title, 'assinatura' from public.books b
      where b.included_in_subscription and public.has_active_subscription()
      order by title`,
    (await db<{ createdAt: Date }[]>`select created_at from public.data_requests where user_id = auth.uid() and status = 'open' limit 1`)[0] ?? null,
  ] as const);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      {/* Navegação rápida — tudo visível, nada escondido em menus */}
      <nav aria-label="Seções da conta" className="lg:col-span-2">
        <ul className="flex flex-wrap gap-2">
          {[
            ["#assinatura", "Assinatura"],
            ["#livros", "Meus livros"],
            ["#preferencias", "Preferências"],
            ["#seguranca", "Senha"],
            ["#privacidade", "Privacidade"],
            ["#sair", "Sair"],
          ].map(([href, label]) => (
            <li key={href}>
              <a href={href} className="inline-flex min-h-11 items-center rounded-full border-2 border-navy-100 bg-white px-4 font-semibold text-navy-900 hover:border-navy-900">
                {label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <Section id="dados" title="Seus dados" icon={<UserRound aria-hidden />}>
        <dl className="space-y-2">
          <div>
            <dt className="text-[0.9rem] text-ink-muted">Nome</dt>
            <dd className="font-semibold">{viewer.displayName || "—"}</dd>
          </div>
          <div>
            <dt className="text-[0.9rem] text-ink-muted">E-mail</dt>
            <dd className="font-semibold break-all">{viewer.email ?? "—"}</dd>
          </div>
        </dl>
        {viewer.isAdmin ? <ButtonLink href="/admin" variant="secondary">Abrir painel administrativo</ButtonLink> : null}
      </Section>

      <div id="assinatura" className="scroll-mt-24">
        <Section id="assinatura-titulo" title="Sua assinatura" icon={<CreditCard aria-hidden />}>
          <Alert tone={d.tone} title={d.title}>{d.text}</Alert>
          {sub ? (
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-[0.9rem] text-ink-muted">Plano</dt>
                <dd className="font-semibold">{sub.planName}</dd>
              </div>
              {sub.priceCents ? (
                <div>
                  <dt className="text-[0.9rem] text-ink-muted">Valor</dt>
                  <dd className="font-semibold">
                    {formatPrice(sub.priceCents)} {sub.interval === "year" ? "por ano" : "por mês"}
                  </dd>
                </div>
              ) : null}
              {sub.currentPeriodEnd ? (
                <div className="col-span-2">
                  <dt className="text-[0.9rem] text-ink-muted">
                    {sub.status === "active" && sub.provider !== "grant" ? "Próxima renovação" : "Acesso até"}
                  </dt>
                  <dd className="font-semibold">{formatDate(sub.currentPeriodEnd)}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          <div className="flex flex-wrap gap-3">
            {!viewer.hasAccess ? <ButtonLink href="/assinatura">Ver planos</ButtonLink> : null}
            {sub && ["active", "past_due", "paused", "pending"].includes(sub.status) && sub.provider !== "grant" ? (
              <ButtonLink href="/conta/assinatura" variant="outline">Cancelar assinatura</ButtonLink>
            ) : null}
          </div>
        </Section>
      </div>

      <div id="livros" className="scroll-mt-24">
        <Section id="livros-titulo" title="Meus livros" icon={<BookOpen aria-hidden />}>
          {books.length === 0 ? (
            <p className="text-ink-soft">
              Você ainda não tem livros.{" "}
              <Link href="/livraria" className="font-semibold text-orange-700 underline underline-offset-4">Conhecer a livraria</Link>
            </p>
          ) : (
            <ul className="space-y-2">
              {books.map((b) => (
                <li key={b.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-[var(--radius-control)] border border-line p-3">
                  <span>
                    <span className="block font-semibold text-navy-900">{b.title}</span>
                    <span className="text-[0.85rem] text-ink-muted">{b.source === "compra" ? "Comprado" : "Incluído na assinatura"}</span>
                  </span>
                  <a href={`/api/livros/${b.slug}/download`} className="inline-flex min-h-11 items-center gap-2 font-semibold text-orange-700 underline underline-offset-4">
                    <Download aria-hidden className="size-5" /> Baixar
                  </a>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <div id="preferencias" className="scroll-mt-24">
        <Section id="preferencias-titulo" title="Preferências de leitura" icon={<Settings aria-hidden />}>
          <PreferencesForm displayName={viewer.displayName} textScale={viewer.textScale} reduceMotion={viewer.reduceMotion} />
        </Section>
      </div>

      <div id="seguranca" className="scroll-mt-24">
        <Section id="seguranca-titulo" title="Senha e acesso" icon={<KeyRound aria-hidden />}>
          {devAuthEnabled() ? (
            <p className="text-ink-muted">Modo de desenvolvimento: sem senha.</p>
          ) : (
            <ButtonLink href="/conta/nova-senha" variant="outline">Alterar minha senha</ButtonLink>
          )}
          <p className="flex items-start gap-2 text-[0.95rem] text-ink-soft">
            <ShieldCheck aria-hidden className="mt-0.5 size-5 shrink-0 text-success-700" />
            A Onzetec nunca pede sua senha ou códigos por telefone, e-mail ou WhatsApp.
          </p>
        </Section>
      </div>

      <div id="privacidade" className="scroll-mt-24">
        <Section id="privacidade-titulo" title="Privacidade e seus dados" icon={<ShieldCheck aria-hidden />}>
          <p className="text-ink-soft">
            Você pode baixar uma cópia dos seus dados ou pedir a exclusão da sua conta a qualquer momento.{" "}
            <Link href="/privacidade" className="font-semibold text-orange-700 underline underline-offset-4">Política de privacidade</Link>
          </p>
          <a href="/api/conta/exportar" className="inline-flex min-h-12 items-center gap-2 rounded-[var(--radius-control)] border-2 border-navy-900 px-5 font-semibold text-navy-900 hover:bg-navy-50">
            <Download aria-hidden className="size-5" /> Baixar meus dados
          </a>
          <div className="border-t border-line pt-4">
            {deletion ? (
              <Alert tone="info" title="Pedido de exclusão em andamento">
                Recebemos seu pedido em {formatDate(deletion.createdAt)}. Ele será concluído em até 15 dias.
              </Alert>
            ) : (
              <DeletionRequestForm />
            )}
          </div>
        </Section>
      </div>

      <Section id="ajuda" title="Ajuda" icon={<HelpCircle aria-hidden />}>
        <p className="text-ink-soft">Dúvidas sobre a plataforma, pagamentos ou cancelamento?</p>
        <ButtonLink href="/ajuda" variant="outline">Abrir a central de ajuda</ButtonLink>
      </Section>

      <div id="sair" className="scroll-mt-24">
        <Section id="sair-titulo" title="Sair da conta" icon={<LogOut aria-hidden />}>
          <p className="text-ink-soft">Use esta opção em celulares ou computadores compartilhados.</p>
          <form action={signOut}>
            <Button type="submit" variant="secondary" icon={<LogOut aria-hidden className="size-5" />}>
              Sair da conta
            </Button>
          </form>
        </Section>
      </div>
    </div>
  );
}
