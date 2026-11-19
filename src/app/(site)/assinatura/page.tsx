import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Check, CreditCard, RefreshCw, XCircle } from "lucide-react";
import { SubscribeButton } from "@/components/billing/forms";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Card, Container, LoadingBlock, PageHeader } from "@/components/ui/primitives";
import { getViewer } from "@/lib/auth/viewer";
import { getBillingProvider } from "@/lib/billing/service";
import { describeSubscription } from "@/lib/billing/state";
import { asUser } from "@/lib/db";
import { formatPrice } from "@/lib/content/types";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Assinatura",
  description: "Veja o que está incluído na assinatura da Onzetec Educação, como funciona a renovação e como cancelar.",
  path: "/assinatura",
});

const included = [
  "Todos os cursos e videoaulas",
  "Todos os guias de solução “Resolver”",
  "Dicas rápidas e artigos exclusivos",
  "Comentários com respostas do professor",
  "Livros marcados como “incluídos na assinatura”",
];

export default function AssinaturaPage() {
  return (
    <Container className="py-8">
      <PageHeader
        title="Assinatura Onzetec"
        description="Acesso completo para aprender no seu ritmo. Sem letras miúdas: veja abaixo como funciona a cobrança e o cancelamento."
      />
      <Suspense fallback={<LoadingBlock label="Carregando planos…" />}>
        <Plans />
      </Suspense>
      <section aria-labelledby="como-funciona" className="mt-12 grid gap-4 md:grid-cols-3 grid-cols-1">
        <h2 id="como-funciona" className="sr-only">Como funciona</h2>
        <Card className="space-y-2 p-5">
          <CreditCard aria-hidden className="size-8 text-navy-700" />
          <h3 className="text-[1.1rem] font-bold text-navy-900">Pagamento</h3>
          <p className="text-ink-soft">
            Feito no ambiente seguro do Mercado Pago. A renovação automática usa cartão de crédito. Nós não vemos nem guardamos os dados do seu cartão.
          </p>
        </Card>
        <Card className="space-y-2 p-5">
          <RefreshCw aria-hidden className="size-8 text-navy-700" />
          <h3 className="text-[1.1rem] font-bold text-navy-900">Renovação</h3>
          <p className="text-ink-soft">
            A assinatura se renova automaticamente ao fim de cada período, pelo mesmo valor contratado. A data da próxima cobrança fica sempre visível em “Minha conta”.
          </p>
        </Card>
        <Card className="space-y-2 p-5">
          <XCircle aria-hidden className="size-8 text-navy-700" />
          <h3 className="text-[1.1rem] font-bold text-navy-900">Cancelamento</h3>
          <p className="text-ink-soft">
            Cancele quando quiser, em “Minha conta”, com dois toques. Não há multa. Você mantém o acesso até o fim do período já pago.{" "}
            <Link href="/ajuda#cancelamento" className="font-semibold text-orange-700 underline underline-offset-4">Saiba mais</Link>
          </p>
        </Card>
      </section>
    </Container>
  );
}

async function Plans() {
  const viewer = await getViewer();
  const plans = await asUser(viewer?.id ?? null, (db) => db<
    { slug: string; name: string; description: string; interval: "month" | "year"; intervalCount: number; priceCents: number | null; currency: string }[]
  >`select slug, name, description, interval, interval_count, price_cents, currency from public.plans
    where is_active and price_cents is not null order by sort_order`);
  const billingReady = getBillingProvider() !== null;

  if (viewer?.hasAccess) {
    const d = describeSubscription(viewer.subscription ? { ...viewer.subscription } : null);
    return (
      <Alert tone="success" title={viewer.isAdmin ? "Você é administrador e tem acesso completo." : d.title}>
        {!viewer.isAdmin ? <p>{d.text}</p> : null}
        <Link href="/conta" className="mt-2 inline-flex min-h-11 items-center font-bold underline underline-offset-4">
          Ver detalhes em Minha conta
        </Link>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {plans.length === 0 ? (
        <Alert tone="info" title="Os planos de assinatura serão lançados em breve">
          Enquanto isso, crie sua conta gratuita e aproveite as aulas e guias abertos.
          <div className="mt-3">
            <ButtonLink href="/cadastro">Criar conta grátis</ButtonLink>
          </div>
        </Alert>
      ) : (
        <ul className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {plans.map((p) => {
            const price = formatPrice(p.priceCents, p.currency);
            const per = p.interval === "year" ? "por ano" : "por mês";
            return (
              <li key={p.slug}>
                <Card className="flex h-full flex-col gap-4 p-6">
                  <h2 className="text-[1.35rem] font-bold text-navy-900">{p.name}</h2>
                  <p>
                    <span className="text-[2.2rem] font-bold text-navy-900">{price}</span>{" "}
                    <span className="text-ink-soft">{per}</span>
                  </p>
                  {p.description ? <p className="text-ink-soft">{p.description}</p> : null}
                  <ul className="space-y-2">
                    {included.map((i) => (
                      <li key={i} className="flex gap-2">
                        <Check aria-hidden className="mt-0.5 size-5 shrink-0 text-success-700" /> {i}
                      </li>
                    ))}
                  </ul>
                  <p className="text-[0.95rem] text-ink-muted">
                    Cobrança de {price} {per}, renovada automaticamente no cartão de crédito até você cancelar.
                  </p>
                  <div className="mt-auto">
                    {billingReady ? (
                      <SubscribeButton plan={p.slug} label={viewer ? `Assinar o ${p.name.toLowerCase()}` : "Criar conta e assinar"} />
                    ) : (
                      <Alert tone="warning">Pagamentos ainda não configurados nesta instalação.</Alert>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      {!viewer ? (
        <p className="text-ink-soft">
          Já é assinante?{" "}
          <Link href="/entrar?voltar=/assinatura" className="font-bold text-orange-700 underline underline-offset-4">
            Entrar
          </Link>
        </p>
      ) : null}
    </div>
  );
}
