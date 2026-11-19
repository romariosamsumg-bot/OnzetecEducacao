import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { as, createUser, sql } from "../support/db";
import {
  __setBillingProviderForTests,
  applyPaymentToOrder,
  recordAndProcessEvent,
  reconcile,
} from "@/lib/billing/service";
import type { BillingProvider, ProviderSubscription } from "@/lib/billing/types";

/**
 * DUBLÊ DE TESTE: provedor falso em memória. Valida a NOSSA lógica (idempotência,
 * estados, concessão/revogação de acesso). NÃO substitui o teste no ambiente
 * oficial de testes do Mercado Pago.
 */
const remote = new Map<string, ProviderSubscription>();
const charges = new Map<string, { id: string; subscriptionId: string; paymentStatus: "approved" | "rejected" }>();
const fake: BillingProvider = {
  name: "mercadopago",
  createSubscriptionCheckout: async () => ({ checkoutUrl: "https://example.test", providerSubscriptionId: "pre_x" }),
  getSubscription: async (id) => {
    const r = remote.get(id);
    if (!r) throw new Error("not found");
    return r;
  },
  cancelSubscription: async (id) => {
    remote.set(id, { ...remote.get(id)!, status: "cancelled" });
  },
  getSubscriptionCharge: async (id) => charges.get(id)!,
  createOrderCheckout: async () => ({ checkoutUrl: "https://example.test", providerCheckoutId: "pref" }),
  getPayment: async () => {
    throw new Error("unused");
  },
  findPaymentsByReference: async () => [],
  verifyWebhook: () => null,
};

let user: string;
let subId: string;
let premiumGuide: string;

beforeAll(async () => {
  __setBillingProviderForTests(fake);
  user = await createUser("pagante@teste.local", "Pagante");
  const [plan] = await sql<{ id: string }[]>`select id from public.plans where slug = 'mensal'`;
  const [s] = await sql<{ id: string }[]>`insert into public.subscriptions (user_id, plan_id, status, provider, provider_subscription_id, price_cents)
    values (${user}, ${plan.id}, 'pending', 'mercadopago', 'pre_1', 2990) returning id`;
  subId = s.id;
  [{ id: premiumGuide }] = await sql<{ id: string }[]>`select id from public.content_items where slug = 'celular-lento'`;
});
afterAll(async () => {
  __setBillingProviderForTests(undefined);
  await sql.end();
});

const canRead = async () => (await as(user, (tx) => tx`select 1 from public.content_bodies where content_id = ${premiumGuide}`)).length === 1;
const next = new Date(Date.now() + 30 * 86400_000);

describe("fluxo comercial (provedor falso)", () => {
  it("pendente não dá acesso", async () => {
    expect(await canRead()).toBe(false);
  });

  it("evento de cobrança aprovada ativa a assinatura e libera o acesso", async () => {
    remote.set("pre_1", { id: "pre_1", status: "authorized", externalReference: subId, nextPaymentDate: next, lastChargedDate: new Date(), amount: 29.9 });
    charges.set("ch_1", { id: "ch_1", subscriptionId: "pre_1", paymentStatus: "approved" });
    const r = await recordAndProcessEvent({ topic: "subscription_authorized_payment", resourceId: "ch_1", eventKey: "k1", liveMode: false }, { id: 1 });
    expect(r).toBe("processed");
    const [s] = await sql<{ status: string }[]>`select status from public.subscriptions where id = ${subId}`;
    expect(s.status).toBe("active");
    expect(await canRead()).toBe(true);
  });

  it("o mesmo evento repetido é ignorado (idempotência)", async () => {
    const r = await recordAndProcessEvent({ topic: "subscription_authorized_payment", resourceId: "ch_1", eventKey: "k1", liveMode: false }, {});
    expect(r).toBe("duplicate");
    const [{ count }] = await sql<{ count: number }[]>`select count(*)::int from public.billing_events where event_key = 'k1'`;
    expect(count).toBe(1);
  });

  it("cobrança recusada => past_due, ainda com carência de acesso", async () => {
    charges.set("ch_2", { id: "ch_2", subscriptionId: "pre_1", paymentStatus: "rejected" });
    await recordAndProcessEvent({ topic: "subscription_authorized_payment", resourceId: "ch_2", eventKey: "k2", liveMode: false }, {});
    const [s] = await sql<{ status: string }[]>`select status from public.subscriptions where id = ${subId}`;
    expect(s.status).toBe("past_due");
    expect(await canRead()).toBe(true);
  });

  it("cancelamento mantém acesso até o fim do período; depois a reconciliação expira", async () => {
    remote.set("pre_1", { ...remote.get("pre_1")!, status: "cancelled" });
    await recordAndProcessEvent({ topic: "subscription_preapproval", resourceId: "pre_1", eventKey: "k3", liveMode: false }, {});
    const [s] = await sql<{ status: string }[]>`select status from public.subscriptions where id = ${subId}`;
    expect(s.status).toBe("canceled");
    expect(await canRead()).toBe(true);
    await sql`update public.subscriptions set current_period_end = now() - interval '1 hour' where id = ${subId}`;
    await reconcile();
    const [e] = await sql<{ status: string }[]>`select status from public.subscriptions where id = ${subId}`;
    expect(e.status).toBe("expired");
    expect(await canRead()).toBe(false);
  });

  it("erro do provedor marca o evento como falho para reprocessamento", async () => {
    const r = await recordAndProcessEvent({ topic: "subscription_preapproval", resourceId: "inexistente", eventKey: "k4", liveMode: false }, {});
    expect(r).toBe("failed");
    const [ev] = await sql<{ status: string }[]>`select status from public.billing_events where event_key = 'k4'`;
    expect(ev.status).toBe("failed");
  });

  it("compra de livro: valor errado não libera; valor certo libera; estorno revoga", async () => {
    const [book] = await sql<{ id: string }[]>`update public.books set price_cents = 2990 where slug = 'guia-de-bolso-do-whatsapp' returning id`;
    const [o] = await sql<{ id: string }[]>`insert into public.orders (user_id, status, total_cents, provider) values (${user}, 'pending', 2990, 'mercadopago') returning id`;
    await sql`insert into public.order_items (order_id, book_id, unit_price_cents) values (${o.id}, ${book.id}, 2990)`;
    const owns = async () => (await sql`select 1 from public.book_entitlements where user_id = ${user} and book_id = ${book.id} and revoked_at is null`).length === 1;

    await applyPaymentToOrder({ id: "p1", status: "approved", externalReference: o.id, amountCents: 100, currency: "BRL", approvedAt: new Date() });
    expect(await owns()).toBe(false);
    await applyPaymentToOrder({ id: "p2", status: "approved", externalReference: o.id, amountCents: 2990, currency: "BRL", approvedAt: new Date() });
    expect(await owns()).toBe(true);
    await applyPaymentToOrder({ id: "p2", status: "approved", externalReference: o.id, amountCents: 2990, currency: "BRL", approvedAt: new Date() });
    const [{ count }] = await sql<{ count: number }[]>`select count(*)::int from public.book_entitlements where user_id = ${user} and book_id = ${book.id}`;
    expect(count).toBe(1);
    await applyPaymentToOrder({ id: "p2", status: "refunded", externalReference: o.id, amountCents: 2990, currency: "BRL", approvedAt: null });
    expect(await owns()).toBe(false);
  });
});
