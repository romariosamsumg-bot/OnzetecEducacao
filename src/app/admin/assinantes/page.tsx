import type { Metadata } from "next";
import { ActionForm, ConfirmSubmit } from "@/components/admin/forms";
import { SelectField, TextField } from "@/components/ui/form";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/content/types";
import { grantCourtesy, revokeCourtesy } from "@/server/actions/admin/commerce";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Assinantes" };

const statusTone: Record<string, "success" | "warning" | "danger" | "neutral" | "info"> = {
  active: "success", pending: "info", past_due: "danger", paused: "warning", canceled: "warning", expired: "neutral",
};
const statusLabel: Record<string, string> = {
  active: "Ativa", pending: "Pendente", past_due: "Pagamento recusado", paused: "Pausada", canceled: "Cancelada", expired: "Encerrada",
};

type Props = { searchParams: Promise<{ situacao?: string }> };

export default async function AssinantesAdmin({ searchParams }: Props) {
  const admin = await requireAdmin();
  const situacao = Object.keys(statusLabel).includes((await searchParams).situacao ?? "") ? (await searchParams).situacao! : null;
  const rows = await asUser(admin.id, (db) => db<{ id: string; userName: string; planName: string; status: string; provider: string; priceCents: number | null; currentPeriodEnd: Date | null; createdAt: Date }[]>`
    select s.id, p.display_name as user_name, pl.name as plan_name, s.status, s.provider, s.price_cents, s.current_period_end, s.created_at
    from public.subscriptions s join public.profiles p on p.id = s.user_id join public.plans pl on pl.id = s.plan_id
    where true ${situacao ? db`and s.status = ${situacao}` : db``}
    order by s.created_at desc limit 300`);
  return (
    <div className="space-y-6">
      <PageHeader title="Assinantes" description="Dados mínimos: nome, plano e situação. Dados de cartão ficam somente no Mercado Pago." />
      <Card className="p-5">
        <h2 className="mb-3 text-[1.15rem] font-bold text-navy-900">Conceder acesso de cortesia</h2>
        <ActionForm action={grantCourtesy} submitLabel="Conceder acesso" className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_10rem_auto] sm:items-end">
          <TextField label="E-mail da conta" name="email" type="email" required />
          <TextField label="Dias de acesso" name="days" type="number" min={1} max={730} defaultValue={30} required />
        </ActionForm>
      </Card>
      <form className="flex flex-wrap items-end gap-3">
        <SelectField label="Filtrar por situação" name="situacao" defaultValue={situacao ?? ""}>
          <option value="">Todas</option>
          {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </SelectField>
        <button className="min-h-12 rounded-[var(--radius-control)] bg-navy-900 px-4 font-semibold text-white">Filtrar</button>
      </form>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
        <table className="w-full min-w-[640px] text-left">
          <caption className="sr-only">Assinaturas</caption>
          <thead className="border-b border-line bg-navy-50 text-[0.9rem]"><tr><th className="p-3">Pessoa</th><th className="p-3">Plano</th><th className="p-3">Situação</th><th className="p-3">Valor</th><th className="p-3">Acesso até</th><th className="p-3"><span className="sr-only">Ações</span></th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line-soft last:border-0">
                <td className="p-3 font-semibold">{r.userName || "—"}</td>
                <td className="p-3">{r.planName}{r.provider === "grant" ? <span className="block text-[0.85rem] text-ink-muted">Cortesia</span> : null}</td>
                <td className="p-3"><Badge tone={statusTone[r.status]}>{statusLabel[r.status]}</Badge></td>
                <td className="p-3">{formatPrice(r.priceCents) ?? "—"}</td>
                <td className="p-3 text-[0.95rem]">{formatDate(r.currentPeriodEnd) ?? "—"}</td>
                <td className="p-3">
                  {r.provider === "grant" && r.status === "active" ? (
                    <form action={revokeCourtesy}><input type="hidden" name="id" value={r.id} /><ConfirmSubmit label="Encerrar cortesia" message="Encerrar este acesso de cortesia agora?" /></form>
                  ) : null}
                </td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={6} className="p-6 text-center text-ink-muted">Nenhuma assinatura.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
