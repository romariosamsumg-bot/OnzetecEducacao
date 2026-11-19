import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Container, LoadingBlock, PageHeader } from "@/components/ui/primitives";
import { requireViewer } from "@/lib/auth/viewer";
import { reconcileUser } from "@/lib/billing/service";
import { asUser } from "@/lib/db";

export const metadata: Metadata = { title: "Confirmando sua compra", robots: { index: false } };

type Props = { searchParams: Promise<{ pedido?: string }> };

export default function RetornoLivroPage({ searchParams }: Props) {
  return (
    <Container className="py-8">
      <PageHeader title="Confirmando sua compra" />
      <Suspense fallback={<LoadingBlock label="Consultando o Mercado Pago…" lines={1} />}>
        <Status searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

async function Status({ searchParams }: Props) {
  const viewer = await requireViewer("/conta#livros");
  await reconcileUser(viewer.id); // status vem da API do provedor
  const pedido = (await searchParams).pedido ?? "";
  const [order] = /^[0-9a-f-]{36}$/.test(pedido)
    ? await asUser(viewer.id, (db) => db<{ status: string }[]>`select status from public.orders where id = ${pedido}`)
    : [];
  const status = order?.status;
  return (
    <div className="max-w-2xl space-y-5">
      {status === "paid" ? (
        <Alert tone="success" title="Compra confirmada!">O livro já está disponível em Minha conta.</Alert>
      ) : status === "failed" || status === "canceled" ? (
        <Alert tone="error" title="Pagamento não aprovado">Nenhum valor foi cobrado. Você pode tentar novamente.</Alert>
      ) : (
        <Alert tone="info" title="Pagamento em confirmação">
          Pix e boleto podem levar alguns minutos (boleto, até 3 dias úteis). Assim que confirmado, o livro aparece em Minha conta.
        </Alert>
      )}
      <div className="flex flex-wrap gap-3">
        <ButtonLink href="/conta#livros">Ver meus livros</ButtonLink>
        <ButtonLink href="/livraria" variant="outline">Voltar para a livraria</ButtonLink>
      </div>
    </div>
  );
}
