import type { Metadata } from "next";
import { ActionForm } from "@/components/admin/forms";
import { Checkbox, TextArea, TextField } from "@/components/ui/form";
import { Alert, Card, PageHeader } from "@/components/ui/primitives";
import { centsToInput } from "@/lib/admin/util";
import { requireAdmin } from "@/lib/auth/viewer";
import { getBillingProvider } from "@/lib/billing/service";
import { asUser } from "@/lib/db";
import { savePlan } from "@/server/actions/admin/commerce";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Planos" };

export default async function PlanosAdmin() {
  const admin = await requireAdmin();
  const plans = await asUser(admin.id, (db) => db<{ id: string; name: string; description: string; interval: string; priceCents: number | null; isActive: boolean; subscribers: number }[]>`
    select p.id, p.name, p.description, p.interval, p.price_cents, p.is_active,
      (select count(*)::int from public.subscriptions s where s.plan_id = p.id and public.subscription_grants_access(s.status, s.current_period_end)) as subscribers
    from public.plans p order by p.sort_order`);
  return (
    <div className="space-y-6">
      <PageHeader title="Planos de assinatura" description="Defina os preços. Um plano só aparece para venda quando estiver ativo e com preço." />
      {!getBillingProvider() ? <Alert tone="warning" title="Pagamentos não configurados">Configure o Mercado Pago (variáveis de ambiente) para que os planos possam ser contratados. Ver docs/05-publicacao.md.</Alert> : null}
      {plans.map((p) => (
        <Card key={p.id} className="p-5">
          <h2 className="mb-1 text-[1.2rem] font-bold text-navy-900">{p.name} <span className="font-normal text-ink-muted">({p.interval === "year" ? "anual" : "mensal"})</span></h2>
          <p className="mb-4 text-[0.95rem] text-ink-muted">{p.subscribers} pessoa(s) com acesso por este plano.</p>
          <ActionForm scope={`plano-${p.id}`} action={savePlan} submitLabel="Salvar plano">
            <input type="hidden" name="id" value={p.id} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField label="Nome" name="name" id={`n-${p.id}`} defaultValue={p.name} required />
              <TextField label={`Preço (R$ por ${p.interval === "year" ? "ano" : "mês"})`} name="price" id={`p-${p.id}`} inputMode="decimal" defaultValue={centsToInput(p.priceCents)} hint="Ex.: 29,90" />
            </div>
            <TextArea label="Descrição" name="description" id={`d-${p.id}`} defaultValue={p.description} rows={2} />
            <Checkbox name="isActive" defaultChecked={p.isActive} label="Disponível para venda" />
          </ActionForm>
        </Card>
      ))}
    </div>
  );
}
