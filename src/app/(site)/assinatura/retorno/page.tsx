import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Container, LoadingBlock, PageHeader } from "@/components/ui/primitives";
import { loadViewer, requireViewer } from "@/lib/auth/viewer";
import { reconcileUser } from "@/lib/billing/service";
import { describeSubscription } from "@/lib/billing/state";

export const metadata: Metadata = { title: "Confirmando sua assinatura", robots: { index: false } };

export default function RetornoAssinaturaPage() {
  return (
    <Container className="py-8">
      <PageHeader title="Confirmando sua assinatura" />
      <Suspense fallback={<LoadingBlock label="Consultando o Mercado Pago…" lines={1} />}>
        <Status />
      </Suspense>
    </Container>
  );
}

async function Status() {
  const viewer = await requireViewer("/assinatura/retorno");
  // O status vem do provedor (API), nunca dos parâmetros desta URL.
  await reconcileUser(viewer.id);
  const fresh = (await loadViewer()) ?? viewer;
  const d = describeSubscription(fresh.subscription);
  return (
    <div className="max-w-2xl space-y-5">
      <Alert tone={d.tone} title={d.title}>{d.text}</Alert>
      {d.tone === "info" && fresh.subscription?.status === "pending" ? (
        <p className="text-ink-soft">
          Pagamentos podem levar alguns minutos para serem confirmados. Você pode continuar navegando — avisaremos na sua conta.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/">Ir para o início</ButtonLink>
        <ButtonLink href="/conta" variant="outline">Ver minha conta</ButtonLink>
      </div>
    </div>
  );
}
