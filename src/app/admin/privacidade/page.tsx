import type { Metadata } from "next";
import { ConfirmSubmit } from "@/components/admin/forms";
import { Alert, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { formatDate } from "@/lib/content/types";
import { completeDeletion } from "@/server/actions/admin/commerce";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Privacidade" };

export default async function PrivacidadeAdmin() {
  const admin = await requireAdmin();
  const rows = await asUser(admin.id, (db) => db<{ id: string; userName: string; createdAt: Date; hasLiveSub: boolean }[]>`
    select r.id, p.display_name as user_name, r.created_at,
      exists (select 1 from public.subscriptions s where s.user_id = r.user_id and s.status in ('active', 'past_due') and s.provider <> 'grant') as has_live_sub
    from public.data_requests r join public.profiles p on p.id = r.user_id where r.status = 'open' order by r.created_at`);
  return (
    <div className="space-y-6">
      <PageHeader title="Pedidos de exclusão (LGPD)" description="Conclua em até 15 dias. A exclusão apaga a conta e os dados ligados a ela." />
      <Alert tone="warning">Antes de concluir, cancele no Mercado Pago qualquer assinatura ativa da pessoa para evitar novas cobranças. Prazos de retenção de registros fiscais: validar com contador/advogado.</Alert>
      {rows.length === 0 ? <EmptyState title="Nenhum pedido aberto" /> : rows.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="font-semibold text-navy-900">{r.userName}</p>
            <p className="text-[0.9rem] text-ink-muted">Pedido em {formatDate(r.createdAt)}{r.hasLiveSub ? " · possui assinatura ativa" : ""}</p>
          </div>
          <form action={completeDeletion}>
            <input type="hidden" name="id" value={r.id} />
            <ConfirmSubmit label="Concluir exclusão" message="Excluir definitivamente a conta e os dados desta pessoa?" />
          </form>
        </Card>
      ))}
    </div>
  );
}
