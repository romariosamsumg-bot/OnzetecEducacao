import type { Metadata } from "next";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { formatDate, formatPrice } from "@/lib/content/types";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Pagamentos" };

export default async function PagamentosAdmin() {
  const admin = await requireAdmin();
  const [events, orders] = await asUser(admin.id, async (db) => [
    await db<{ id: string; topic: string; resourceId: string | null; status: string; attempts: number; error: string | null; receivedAt: Date }[]>`
      select id, topic, resource_id, status, attempts, error, received_at from public.billing_events order by received_at desc limit 100`,
    await db<{ id: string; status: string; totalCents: number; createdAt: Date; title: string; userName: string }[]>`
      select o.id, o.status, o.total_cents, o.created_at, b.title, p.display_name as user_name
      from public.orders o join public.order_items oi on oi.order_id = o.id join public.books b on b.id = oi.book_id
      join public.profiles p on p.id = o.user_id order by o.created_at desc limit 100`,
  ] as const);
  return (
    <div className="space-y-8">
      <PageHeader title="Pagamentos" description="Pedidos de livros e notificações recebidas do Mercado Pago. Falhas são reprocessadas automaticamente pela reconciliação." />
      <Card className="overflow-x-auto p-0">
        <h2 className="p-4 text-[1.15rem] font-bold text-navy-900">Pedidos de livros</h2>
        <table className="w-full min-w-[560px] text-left">
          <thead className="border-y border-line bg-navy-50 text-[0.9rem]"><tr><th className="p-3">Data</th><th className="p-3">Pessoa</th><th className="p-3">Livro</th><th className="p-3">Valor</th><th className="p-3">Situação</th></tr></thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="border-b border-line-soft"><td className="p-3">{formatDate(o.createdAt)}</td><td className="p-3">{o.userName}</td><td className="p-3">{o.title}</td><td className="p-3">{formatPrice(o.totalCents)}</td><td className="p-3"><Badge tone={o.status === "paid" ? "success" : o.status === "pending" ? "info" : "warning"}>{o.status}</Badge></td></tr>
            ))}
            {orders.length === 0 ? <tr><td colSpan={5} className="p-4 text-ink-muted">Nenhum pedido.</td></tr> : null}
          </tbody>
        </table>
      </Card>
      <Card className="overflow-x-auto p-0">
        <h2 className="p-4 text-[1.15rem] font-bold text-navy-900">Notificações do provedor</h2>
        <table className="w-full min-w-[560px] text-left">
          <thead className="border-y border-line bg-navy-50 text-[0.9rem]"><tr><th className="p-3">Recebida</th><th className="p-3">Tipo</th><th className="p-3">Recurso</th><th className="p-3">Situação</th><th className="p-3">Tentativas</th></tr></thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id} className="border-b border-line-soft"><td className="p-3">{formatDate(e.receivedAt)}</td><td className="p-3">{e.topic}</td><td className="p-3 font-mono text-[0.85rem]">{e.resourceId}</td><td className="p-3"><Badge tone={e.status === "processed" ? "success" : e.status === "failed" ? "danger" : "neutral"}>{e.status}</Badge>{e.error ? <span className="block text-[0.8rem] text-danger-700">{e.error}</span> : null}</td><td className="p-3">{e.attempts}</td></tr>
            ))}
            {events.length === 0 ? <tr><td colSpan={5} className="p-4 text-ink-muted">Nenhuma notificação recebida ainda.</td></tr> : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
