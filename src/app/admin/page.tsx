import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Visão geral" };

export default async function AdminHome() {
  const admin = await requireAdmin();
  const [m, misses] = await asUser(admin.id, async (db) => [
    (await db<Record<string, number>[]>`select
      (select count(*)::int from public.subscriptions where public.subscription_grants_access(status, current_period_end) and provider <> 'grant') as assinantes_ativos,
      (select count(*)::int from public.subscriptions where provider = 'grant' and public.subscription_grants_access(status, current_period_end)) as cortesias,
      (select count(*)::int from public.subscriptions where status = 'active' and provider <> 'grant' and created_at > now() - interval '30 days') as novos_30d,
      (select count(*)::int from public.subscriptions where canceled_at > now() - interval '30 days') as cancelamentos_30d,
      (select count(*)::int from public.subscriptions where status = 'past_due') as pagamentos_recusados,
      (select count(*)::int from public.profiles) as contas,
      (select count(*)::int from public.comments where status = 'pending' and deleted_at is null) as comentarios_pendentes,
      (select count(*)::int from public.comment_reports where status = 'open') as denuncias,
      (select count(*)::int from public.content_items where editorial_status <> 'current' or last_reviewed_at < now() - interval '180 days') as revisar,
      (select count(*)::int from public.data_requests where status = 'open') as exclusoes,
      (select count(*)::int from public.billing_events where status = 'failed') as eventos_falhos,
      (select count(*)::int from public.orders where status = 'paid' and paid_at > now() - interval '30 days') as livros_30d`)[0],
    await db<{ query: string; hits: number }[]>`select query, hits from public.search_misses order by hits desc, last_seen_at desc limit 8`,
  ] as const);

  const cards: { label: string; value: number; href: string; alert?: boolean }[] = [
    { label: "Assinantes ativos", value: m.assinantes_ativos, href: "/admin/assinantes" },
    { label: "Novos (30 dias)", value: m.novos_30d, href: "/admin/assinantes" },
    { label: "Cancelamentos (30 dias)", value: m.cancelamentos_30d, href: "/admin/assinantes" },
    { label: "Pagamentos recusados", value: m.pagamentos_recusados, href: "/admin/assinantes?situacao=past_due", alert: m.pagamentos_recusados > 0 },
    { label: "Livros vendidos (30 dias)", value: m.livros_30d, href: "/admin/pagamentos" },
    { label: "Contas cadastradas", value: m.contas, href: "/admin/assinantes" },
    { label: "Comentários aguardando", value: m.comentarios_pendentes, href: "/admin/comentarios", alert: m.comentarios_pendentes > 0 },
    { label: "Denúncias abertas", value: m.denuncias, href: "/admin/comentarios", alert: m.denuncias > 0 },
    { label: "Conteúdos para revisar", value: m.revisar, href: "/admin/revisao", alert: m.revisar > 0 },
    { label: "Pedidos de exclusão", value: m.exclusoes, href: "/admin/privacidade", alert: m.exclusoes > 0 },
    { label: "Eventos de pagamento com falha", value: m.eventos_falhos, href: "/admin/pagamentos", alert: m.eventos_falhos > 0 },
    { label: "Acessos de cortesia", value: m.cortesias, href: "/admin/assinantes" },
  ];
  return (
    <div className="space-y-8">
      <PageHeader title={`Olá, ${admin.displayName.split(" ")[0]}`} description="Resumo da plataforma. Toque em um número para ver os detalhes." />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <li key={c.label}>
            <Link href={c.href} className={`block h-full rounded-[var(--radius-card)] border bg-white p-4 hover:border-navy-200 ${c.alert ? "border-orange-500" : "border-line"}`}>
              <span className="block text-[2rem] font-bold text-navy-900 tabular-nums">{c.value}</span>
              <span className="text-[0.95rem] text-ink-soft">{c.label}</span>
            </Link>
          </li>
        ))}
      </ul>
      <Card className="p-5">
        <h2 className="mb-2 text-[1.2rem] font-bold text-navy-900">Buscas sem resultado</h2>
        <p className="mb-3 text-[0.95rem] text-ink-muted">O que as pessoas procuraram e não encontraram — boas ideias para novos guias.</p>
        {misses.length === 0 ? <p className="text-ink-muted">Nenhuma ainda.</p> : (
          <ul className="flex flex-wrap gap-2">
            {misses.map((s) => <li key={s.query} className="rounded-full bg-navy-50 px-3 py-1">“{s.query}” <span className="text-ink-muted">× {s.hits}</span></li>)}
          </ul>
        )}
      </Card>
    </div>
  );
}
