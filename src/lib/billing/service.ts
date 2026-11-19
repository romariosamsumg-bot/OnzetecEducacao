import "server-only";
import { asSystem, json, type Db } from "@/lib/db";
import { env, siteUrl } from "@/lib/env";
import { MercadoPagoProvider } from "./mercadopago";
import { nextStateFromProvider, orderStateFromPayment, type LocalSubscriptionStatus } from "./state";
import type { BillingProvider, ProviderPayment, ProviderPaymentStatus, WebhookEvent } from "./types";

/**
 * Serviço de cobrança. Usa conexão de sistema (sem RLS) porque age em nome da
 * plataforma — por isso TODA entrada de usuário é autorizada antes de chegar aqui.
 */

let providerOverride: BillingProvider | null | undefined;
/** Somente testes automatizados: injeta um provedor falso. */
export function __setBillingProviderForTests(p: BillingProvider | null | undefined) {
  providerOverride = p;
}

export function getBillingProvider(): BillingProvider | null {
  if (providerOverride !== undefined) return providerOverride;
  const e = env();
  if (e.BILLING_PROVIDER === "mercadopago" && e.MERCADOPAGO_ACCESS_TOKEN && e.MERCADOPAGO_WEBHOOK_SECRET) {
    return new MercadoPagoProvider(e.MERCADOPAGO_ACCESS_TOKEN, e.MERCADOPAGO_WEBHOOK_SECRET);
  }
  return null;
}

export class CheckoutError extends Error {}

/* --------------------------- Assinaturas --------------------------- */

export async function startSubscriptionCheckout(user: { id: string; email: string | null }, planSlug: string): Promise<string> {
  const provider = getBillingProvider();
  if (!provider) throw new CheckoutError("Os pagamentos ainda não estão disponíveis. Tente novamente em breve.");
  if (!user.email) throw new CheckoutError("Sua conta não tem e-mail cadastrado.");

  const sub = await asSystem(async (db) => {
    const [plan] = await db<{ id: string; name: string; priceCents: number; interval: "month" | "year"; intervalCount: number }[]>`
      select id, name, price_cents, interval, interval_count from public.plans
      where slug = ${planSlug} and is_active and price_cents is not null`;
    if (!plan) throw new CheckoutError("Este plano não está disponível.");

    const [live] = await db`select 1 from public.subscriptions
      where user_id = ${user.id} and status in ('active', 'past_due', 'paused')
        and public.subscription_grants_access(status, current_period_end)`;
    if (live) throw new CheckoutError("Você já tem uma assinatura ativa.");

    // Tentativas anteriores não concluídas deixam de valer.
    await db`update public.subscriptions set status = 'expired'
      where user_id = ${user.id} and status = 'pending' and created_at < now() - interval '1 minute'`;

    const [row] = await db<{ id: string }[]>`
      insert into public.subscriptions (user_id, plan_id, status, provider, price_cents)
      values (${user.id}, ${plan.id}, 'pending', ${provider.name}, ${plan.priceCents})
      returning id`;
    return { id: row.id, plan };
  });

  const testEmail = env().MERCADOPAGO_TEST_PAYER_EMAIL; // apenas ambiente de testes do Mercado Pago
  const { checkoutUrl, providerSubscriptionId } = await provider.createSubscriptionCheckout({
    subscriptionId: sub.id,
    reason: `Onzetec Educação — ${sub.plan.name}`,
    amountCents: sub.plan.priceCents,
    interval: sub.plan.interval,
    intervalCount: sub.plan.intervalCount,
    payerEmail: testEmail ?? user.email,
    backUrl: siteUrl("/assinatura/retorno"),
  });
  await asSystem((db) => db`
    update public.subscriptions set provider_subscription_id = ${providerSubscriptionId} where id = ${sub.id}`);
  return checkoutUrl;
}

/** Sincroniza uma assinatura consultando o provedor (fonte da verdade). */
export async function syncSubscriptionFromProvider(
  providerSubscriptionId: string,
  lastPayment: ProviderPaymentStatus | null = null,
): Promise<{ id: string; status: LocalSubscriptionStatus } | null> {
  const provider = getBillingProvider();
  if (!provider) return null;
  const remote = await provider.getSubscription(providerSubscriptionId);

  return asSystem(async (db) => {
    const [local] = await db<{ id: string; status: LocalSubscriptionStatus; currentPeriodEnd: Date | null; canceledAt: Date | null; lastPaymentStatus: string | null }[]>`
      select id, status, current_period_end, canceled_at, last_payment_status from public.subscriptions
      where (provider = ${provider.name} and provider_subscription_id = ${remote.id})
         or (${remote.externalReference}::text is not null and id::text = ${remote.externalReference})
      order by created_at desc limit 1 for update`;
    if (!local) return null;

    const patch = nextStateFromProvider(
      local,
      remote,
      lastPayment ?? (local.lastPaymentStatus as ProviderPaymentStatus | null),
    );
    // Uma assinatura vigente por pessoa: se outra já estiver ativa, esta não é reativada.
    await db`
      update public.subscriptions set
        status = ${patch.status},
        provider_subscription_id = ${remote.id},
        current_period_start = coalesce(${patch.currentPeriodStart}, current_period_start),
        current_period_end = ${patch.currentPeriodEnd},
        cancel_at_period_end = ${patch.cancelAtPeriodEnd},
        canceled_at = ${patch.canceledAt},
        last_payment_status = ${patch.lastPaymentStatus},
        last_synced_at = now()
      where id = ${local.id}`;
    return { id: local.id, status: patch.status };
  });
}

export async function cancelSubscription(userId: string): Promise<void> {
  const provider = getBillingProvider();
  const [sub] = await asSystem((db) => db<{ id: string; provider: string; providerSubscriptionId: string | null }[]>`
    select id, provider, provider_subscription_id from public.subscriptions
    where user_id = ${userId} and status in ('active', 'past_due', 'paused', 'pending')
    order by created_at desc limit 1`);
  if (!sub) throw new CheckoutError("Não encontramos uma assinatura ativa para cancelar.");
  if (sub.provider === "grant") throw new CheckoutError("Este é um acesso de cortesia. Fale com o suporte para encerrá-lo.");
  if (!provider || sub.provider !== provider.name || !sub.providerSubscriptionId) {
    throw new CheckoutError("Não foi possível cancelar agora. Tente novamente ou fale com o suporte.");
  }
  await provider.cancelSubscription(sub.providerSubscriptionId);
  await syncSubscriptionFromProvider(sub.providerSubscriptionId);
}

/* ------------------------------ Livros ------------------------------ */

export async function startBookCheckout(user: { id: string; email: string | null }, bookSlug: string): Promise<string> {
  const provider = getBillingProvider();
  if (!provider) throw new CheckoutError("Os pagamentos ainda não estão disponíveis. Tente novamente em breve.");
  if (!user.email) throw new CheckoutError("Sua conta não tem e-mail cadastrado.");

  const order = await asSystem(async (db) => {
    const [book] = await db<{ id: string; title: string; priceCents: number; currency: string }[]>`
      select id, title, price_cents, currency from public.books
      where slug = ${bookSlug} and public.is_live_now(status, published_at) and price_cents is not null`;
    if (!book) throw new CheckoutError("Este livro não está à venda no momento.");
    const [owned] = await db`select 1 from public.book_entitlements
      where user_id = ${user.id} and book_id = ${book.id} and revoked_at is null`;
    if (owned) throw new CheckoutError("Você já tem este livro. Ele está em Minha conta > Meus livros.");

    const [o] = await db<{ id: string }[]>`
      insert into public.orders (user_id, status, total_cents, currency, provider)
      values (${user.id}, 'pending', ${book.priceCents}, ${book.currency}, ${provider.name}) returning id`;
    await db`insert into public.order_items (order_id, book_id, unit_price_cents) values (${o.id}, ${book.id}, ${book.priceCents})`;
    return { id: o.id, book };
  });

  const { checkoutUrl, providerCheckoutId } = await provider.createOrderCheckout({
    orderId: order.id,
    items: [{ id: order.book.id, title: order.book.title, unitPriceCents: order.book.priceCents }],
    payerEmail: user.email,
    backUrl: siteUrl(`/livraria/retorno?pedido=${order.id}`),
    notificationUrl: siteUrl("/api/webhooks/mercadopago"),
  });
  await asSystem((db) => db`update public.orders set provider_checkout_id = ${providerCheckoutId} where id = ${order.id}`);
  return checkoutUrl;
}

export async function applyPaymentToOrder(payment: ProviderPayment): Promise<"updated" | "ignored"> {
  if (!payment.externalReference) return "ignored";
  return asSystem(async (db) => {
    const [order] = await db<{ id: string; userId: string; totalCents: number; currency: string; status: string }[]>`
      select id, user_id, total_cents, currency, status from public.orders
      where id::text = ${payment.externalReference} for update`;
    if (!order) return "ignored";
    const patch = orderStateFromPayment(payment, { totalCents: order.totalCents, currency: order.currency });
    // Pedido pago não volta a "pendente" por notificação fora de ordem.
    if (order.status === "paid" && patch.status === "pending") return "ignored";

    await db`update public.orders set status = ${patch.status}, provider_payment_id = ${payment.id},
      paid_at = case when ${patch.status} = 'paid' then coalesce(paid_at, now()) else paid_at end
      where id = ${order.id}`;
    if (patch.grant) {
      await db`insert into public.book_entitlements (user_id, book_id, source, order_id)
        select ${order.userId}, oi.book_id, 'purchase', ${order.id} from public.order_items oi
        where oi.order_id = ${order.id}
        on conflict (user_id, book_id) where revoked_at is null do nothing`;
    }
    if (patch.revoke) {
      await db`update public.book_entitlements set revoked_at = now()
        where order_id = ${order.id} and revoked_at is null`;
    }
    return "updated";
  });
}

/* ----------------------------- Webhooks ----------------------------- */

/** Registra o evento (idempotente) e processa. Retorna false se já processado antes. */
export async function recordAndProcessEvent(event: WebhookEvent, rawPayload: unknown): Promise<"processed" | "duplicate" | "failed"> {
  const provider = getBillingProvider();
  if (!provider) return "failed";
  const inserted = await asSystem((db) => db<{ id: string }[]>`
    insert into public.billing_events (provider, event_key, topic, resource_id, payload)
    values (${provider.name}, ${event.eventKey}, ${event.topic}, ${event.resourceId}, ${json(sanitizePayload(rawPayload))})
    on conflict (provider, event_key) do nothing returning id`);
  if (inserted.length === 0) {
    const [existing] = await asSystem((db) => db<{ id: string; status: string }[]>`
      select id, status from public.billing_events where provider = ${provider.name} and event_key = ${event.eventKey}`);
    if (existing?.status === "processed" || existing?.status === "ignored") return "duplicate";
    return processStoredEvent(existing!.id);
  }
  return processStoredEvent(inserted[0].id);
}

export async function processStoredEvent(eventId: string): Promise<"processed" | "failed"> {
  const provider = getBillingProvider();
  if (!provider) return "failed";
  const [ev] = await asSystem((db) => db<{ topic: string; resourceId: string }[]>`
    update public.billing_events set attempts = attempts + 1 where id = ${eventId} returning topic, resource_id`);
  try {
    let outcome: "processed" | "ignored" = "processed";
    switch (ev.topic) {
      case "subscription_preapproval":
        outcome = (await syncSubscriptionFromProvider(ev.resourceId)) ? "processed" : "ignored";
        break;
      case "subscription_authorized_payment": {
        const charge = await provider.getSubscriptionCharge(ev.resourceId);
        outcome = (await syncSubscriptionFromProvider(charge.subscriptionId, charge.paymentStatus)) ? "processed" : "ignored";
        break;
      }
      case "payment": {
        const payment = await provider.getPayment(ev.resourceId);
        outcome = (await applyPaymentToOrder(payment)) === "updated" ? "processed" : "ignored";
        break;
      }
      default:
        outcome = "ignored";
    }
    await asSystem((db) => db`update public.billing_events set status = ${outcome}, processed_at = now(), error = null where id = ${eventId}`);
    return "processed";
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 300) : "erro";
    await asSystem((db) => db`update public.billing_events set status = 'failed', error = ${message} where id = ${eventId}`);
    console.error("[billing] falha ao processar evento", eventId, message);
    return "failed";
  }
}

/** Mantém apenas campos técnicos da notificação (minimização de dados — LGPD). */
function sanitizePayload(p: unknown) {
  if (!p || typeof p !== "object") return {};
  const o = p as Record<string, unknown>;
  const pick = (k: string) => (k in o ? o[k] : undefined);
  return { id: pick("id"), type: pick("type"), action: pick("action"), live_mode: pick("live_mode"), date_created: pick("date_created"), data: pick("data") };
}

/* -------------------------- Reconciliação --------------------------- */

export async function reconcile(): Promise<Record<string, number>> {
  const stats = { synced: 0, expired: 0, retried: 0, orders: 0, errors: 0 };
  // Encerra assinaturas canceladas/cortesias cujo período terminou (não depende do provedor)
  const expired = await asSystem((db) => db`
    update public.subscriptions set status = 'expired'
    where (status = 'canceled' and current_period_end < now())
       or (provider = 'grant' and status = 'active' and current_period_end < now())
    returning id`);
  stats.expired = expired.length;

  const provider = getBillingProvider();
  if (!provider) return stats;

  const subs = await asSystem((db) => db<{ providerSubscriptionId: string }[]>`
    select provider_subscription_id from public.subscriptions
    where provider = ${provider.name} and provider_subscription_id is not null
      and status in ('pending', 'active', 'past_due', 'paused')
      and (last_synced_at is null or last_synced_at < now() - interval '6 hours')
    order by last_synced_at nulls first limit 100`);
  for (const s of subs) {
    try {
      await syncSubscriptionFromProvider(s.providerSubscriptionId);
      stats.synced++;
    } catch {
      stats.errors++;
    }
  }

  const failed = await asSystem((db) => db<{ id: string }[]>`
    select id from public.billing_events where status in ('failed', 'received') and attempts < 8
      and received_at < now() - interval '2 minutes' order by received_at limit 50`);
  for (const f of failed) {
    if ((await processStoredEvent(f.id)) === "processed") stats.retried++;
  }

  const orders = await asSystem((db) => db<{ id: string }[]>`
    select id from public.orders where provider = ${provider.name} and status = 'pending'
      and created_at between now() - interval '3 days' and now() - interval '10 minutes' limit 50`);
  for (const o of orders) {
    try {
      const payments = await provider.findPaymentsByReference(o.id);
      const best = payments.find((p) => p.status === "approved") ?? payments[0];
      if (best && (await applyPaymentToOrder(best)) === "updated") stats.orders++;
    } catch {
      stats.errors++;
    }
  }
  return stats;
}

/** Reconcilia só as pendências de uma pessoa (página de retorno do pagamento). */
export async function reconcileUser(userId: string): Promise<void> {
  const provider = getBillingProvider();
  if (!provider) return;
  const subs = await asSystem((db) => db<{ providerSubscriptionId: string }[]>`
    select provider_subscription_id from public.subscriptions
    where user_id = ${userId} and provider = ${provider.name} and provider_subscription_id is not null
      and status in ('pending', 'active', 'past_due') order by created_at desc limit 2`);
  for (const s of subs) await syncSubscriptionFromProvider(s.providerSubscriptionId).catch(() => null);
  const orders = await asSystem((db) => db<{ id: string }[]>`
    select id from public.orders where user_id = ${userId} and status = 'pending' order by created_at desc limit 3`);
  for (const o of orders) {
    const payments = await provider.findPaymentsByReference(o.id).catch(() => []);
    const best = payments.find((p) => p.status === "approved") ?? payments[0];
    if (best) await applyPaymentToOrder(best).catch(() => null);
  }
}

export type { Db };
