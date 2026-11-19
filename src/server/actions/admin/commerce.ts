"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import type { FormState } from "@/components/ui/form";
import { audit } from "@/lib/admin/audit";
import { parsePriceToCents } from "@/lib/admin/util";
import { requireAdmin } from "@/lib/auth/viewer";
import { asSystem, asUser } from "@/lib/db";
import { env } from "@/lib/env";

const uuid = z.string().uuid();

export async function savePlan(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const id = uuid.parse(fd.get("id"));
  const name = z.string().trim().min(2).max(60).safeParse(fd.get("name"));
  const description = String(fd.get("description") ?? "").trim().slice(0, 400);
  const priceRaw = String(fd.get("price") ?? "").trim();
  const priceCents = parsePriceToCents(priceRaw);
  const isActive = fd.get("isActive") === "on";
  if (!name.success) return { ok: false, errors: { name: ["Informe o nome do plano."] } };
  if (priceRaw && priceCents == null) return { ok: false, errors: { price: ["Preço inválido. Exemplo: 29,90"] } };
  if (isActive && priceCents == null) return { ok: false, errors: { price: ["Defina o preço antes de ativar o plano."] } };
  await asUser(admin.id, async (db) => {
    await db`update public.plans set name = ${name.data}, description = ${description}, price_cents = ${priceCents},
      is_active = ${isActive} where id = ${id}`;
    await audit(db, "plan.update", "plan", id, { priceCents, isActive });
  });
  refresh();
  return {
    ok: true,
    message: "Plano salvo. Assinaturas existentes mantêm o valor contratado; o novo preço vale para novas assinaturas.",
  };
}

/** Acesso de cortesia (ex.: familiar, parceiro, teste). Não gera cobrança. */
export async function grantCourtesy(_prev: FormState, fd: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const email = z.string().trim().toLowerCase().email().safeParse(fd.get("email"));
  const days = z.coerce.number().int().min(1).max(730).safeParse(fd.get("days"));
  if (!email.success) return { ok: false, errors: { email: ["E-mail inválido."] } };
  if (!days.success) return { ok: false, errors: { days: ["Informe de 1 a 730 dias."] } };
  // auth.users só é acessível pela conexão de sistema; a autorização foi feita acima.
  const [user] = await asSystem((db) => db<{ id: string }[]>`select id from auth.users where lower(email) = ${email.data}`);
  if (!user) return { ok: false, errors: { email: ["Nenhuma conta com este e-mail. Peça para a pessoa se cadastrar primeiro."] } };
  try {
    await asSystem(async (db) => {
      const [plan] = await db<{ id: string }[]>`select id from public.plans order by sort_order limit 1`;
      const [live] = await db`select 1 from public.subscriptions where user_id = ${user.id} and status in ('active', 'past_due', 'paused')`;
      if (live) throw new Error("Esta pessoa já tem uma assinatura ou cortesia ativa.");
      await db`insert into public.subscriptions (user_id, plan_id, status, provider, current_period_start, current_period_end)
        values (${user.id}, ${plan.id}, 'active', 'grant', now(), now() + make_interval(days => ${days.data}))`;
    });
    await asUser(admin.id, (db) => audit(db, "subscription.grant", "profile", user.id, { days: days.data }));
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Falha ao conceder acesso." };
  }
  refresh();
  return { ok: true, message: `Acesso de cortesia concedido por ${days.data} dias.` };
}

export async function revokeCourtesy(fd: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(fd.get("id"));
  await asSystem((db) => db`update public.subscriptions set status = 'expired', current_period_end = now()
    where id = ${id} and provider = 'grant'`);
  await asUser(admin.id, (db) => audit(db, "subscription.revoke_grant", "subscription", id));
  refresh();
}

/**
 * LGPD — conclui um pedido de exclusão: remove a conta de autenticação, o que apaga
 * em cascata perfil, progresso, salvos, curtidas e comentários.
 */
export async function completeDeletion(fd: FormData) {
  const admin = await requireAdmin();
  const requestId = uuid.parse(fd.get("id"));
  const [req] = await asUser(admin.id, (db) => db<{ userId: string }[]>`
    select user_id from public.data_requests where id = ${requestId} and status = 'open'`);
  if (!req) return;
  if (req.userId === admin.id) throw new Error("O administrador não pode excluir a própria conta por aqui.");
  const e = env();
  if (e.AUTH_MODE === "supabase") {
    const res = await fetch(`${e.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/admin/users/${req.userId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${e.SUPABASE_SERVICE_ROLE_KEY}`, apikey: e.SUPABASE_SERVICE_ROLE_KEY ?? "" },
    });
    if (!res.ok) throw new Error(`Falha ao excluir a conta no Supabase Auth (HTTP ${res.status}).`);
  } else {
    await asSystem((db) => db`delete from auth.users where id = ${req.userId}`);
  }
  await asUser(admin.id, (db) => audit(db, "privacy.deletion_completed", "data_request", requestId));
  refresh();
}
