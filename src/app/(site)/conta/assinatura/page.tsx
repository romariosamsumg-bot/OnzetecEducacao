import type { Metadata } from "next";
import { Suspense } from "react";
import { CancelSubscriptionForm } from "@/components/billing/forms";
import { Alert, Card, Container, LoadingBlock, PageHeader } from "@/components/ui/primitives";
import { requireViewer } from "@/lib/auth/viewer";
import { formatDate } from "@/lib/content/types";

export const metadata: Metadata = { title: "Cancelar assinatura", robots: { index: false } };

export default function CancelarPage() {
  return (
    <Container className="py-8">
      <PageHeader title="Cancelar assinatura" back={{ href: "/conta#assinatura", label: "Voltar para Minha conta" }} />
      <Suspense fallback={<LoadingBlock lines={1} />}>
        <View />
      </Suspense>
    </Container>
  );
}

async function View() {
  const viewer = await requireViewer("/conta/assinatura");
  const sub = viewer.subscription;
  if (!sub || !["active", "past_due", "paused", "pending"].includes(sub.status) || sub.provider === "grant") {
    return <Alert tone="info">Você não tem uma assinatura ativa para cancelar.</Alert>;
  }
  return (
    <Card className="max-w-2xl p-6">
      <CancelSubscriptionForm accessUntil={formatDate(sub.currentPeriodEnd)} />
    </Card>
  );
}
