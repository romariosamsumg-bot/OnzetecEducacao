import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  BillingProvider,
  ProviderPayment,
  ProviderPaymentStatus,
  ProviderSubscription,
  ProviderSubscriptionCharge,
  ProviderSubscriptionStatus,
  WebhookEvent,
} from "./types";

/**
 * Integração com a API do Mercado Pago (sem SDK, apenas HTTPS).
 * Documentação consultada em nov/2026:
 *  - Assinaturas: POST/GET/PUT /preapproval, GET /authorized_payments/{id}
 *  - Checkout Pro: POST /checkout/preferences, GET /v1/payments/{id}
 *  - Webhooks: cabeçalho x-signature "ts=...,v1=..." com HMAC-SHA256 de
 *    "id:{data.id};request-id:{x-request-id};ts:{ts};"
 *
 * ATENÇÃO: integração escrita conforme a documentação, mas NÃO validada contra o
 * ambiente de testes do Mercado Pago nesta etapa (credenciais não fornecidas).
 */
const API = "https://api.mercadopago.com";

export class MercadoPagoProvider implements BillingProvider {
  readonly name = "mercadopago";

  constructor(
    private readonly accessToken: string,
    private readonly webhookSecret: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private async request<T>(method: string, path: string, body?: unknown, idempotencyKey?: string): Promise<T> {
    const res = await this.fetchImpl(`${API}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        "Content-Type": "application/json",
        ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      // Não registra o corpo completo (pode conter dados pessoais)
      throw new Error(`Mercado Pago ${method} ${path.split("?")[0]} falhou: HTTP ${res.status}`);
    }
    return (await res.json()) as T;
  }

  async createSubscriptionCheckout(input: Parameters<BillingProvider["createSubscriptionCheckout"]>[0]) {
    const months = input.interval === "year" ? 12 * input.intervalCount : input.intervalCount;
    const data = await this.request<{ id: string; init_point: string }>(
      "POST",
      "/preapproval",
      {
        reason: input.reason.slice(0, 120),
        external_reference: input.subscriptionId,
        payer_email: input.payerEmail,
        back_url: input.backUrl,
        status: "pending",
        auto_recurring: {
          frequency: months,
          frequency_type: "months",
          transaction_amount: input.amountCents / 100,
          currency_id: "BRL",
        },
      },
      `sub-${input.subscriptionId}`,
    );
    return { checkoutUrl: data.init_point, providerSubscriptionId: data.id };
  }

  async getSubscription(id: string): Promise<ProviderSubscription> {
    const d = await this.request<{
      id: string;
      status: string;
      external_reference?: string | null;
      next_payment_date?: string | null;
      summarized?: { last_charged_date?: string | null } | null;
      auto_recurring?: { transaction_amount?: number } | null;
    }>("GET", `/preapproval/${encodeURIComponent(id)}`);
    return {
      id: d.id,
      status: normalizeSubscriptionStatus(d.status),
      externalReference: d.external_reference ?? null,
      nextPaymentDate: d.next_payment_date ? new Date(d.next_payment_date) : null,
      lastChargedDate: d.summarized?.last_charged_date ? new Date(d.summarized.last_charged_date) : null,
      amount: d.auto_recurring?.transaction_amount ?? null,
    };
  }

  async cancelSubscription(id: string): Promise<void> {
    await this.request("PUT", `/preapproval/${encodeURIComponent(id)}`, { status: "cancelled" });
  }

  async getSubscriptionCharge(chargeId: string): Promise<ProviderSubscriptionCharge> {
    const d = await this.request<{ id: number | string; preapproval_id: string; payment?: { status?: string } | null }>(
      "GET",
      `/authorized_payments/${encodeURIComponent(chargeId)}`,
    );
    return {
      id: String(d.id),
      subscriptionId: d.preapproval_id,
      paymentStatus: normalizePaymentStatus(d.payment?.status),
    };
  }

  async createOrderCheckout(input: Parameters<BillingProvider["createOrderCheckout"]>[0]) {
    const d = await this.request<{ id: string; init_point: string }>(
      "POST",
      "/checkout/preferences",
      {
        items: input.items.map((i) => ({
          id: i.id,
          title: i.title.slice(0, 120),
          quantity: 1,
          unit_price: i.unitPriceCents / 100,
          currency_id: "BRL",
        })),
        payer: { email: input.payerEmail },
        external_reference: input.orderId,
        back_urls: { success: input.backUrl, pending: input.backUrl, failure: input.backUrl },
        auto_return: "approved",
        notification_url: input.notificationUrl,
        statement_descriptor: "ONZETEC",
      },
      `order-${input.orderId}`,
    );
    return { checkoutUrl: d.init_point, providerCheckoutId: d.id };
  }

  async getPayment(id: string): Promise<ProviderPayment> {
    const d = await this.request<RawPayment>("GET", `/v1/payments/${encodeURIComponent(id)}`);
    return mapPayment(d);
  }

  async findPaymentsByReference(ref: string): Promise<ProviderPayment[]> {
    const d = await this.request<{ results: RawPayment[] }>(
      "GET",
      `/v1/payments/search?external_reference=${encodeURIComponent(ref)}&sort=date_created&criteria=desc`,
    );
    return (d.results ?? []).map(mapPayment);
  }

  verifyWebhook({ headers, url, body }: { headers: Headers; url: URL; body: unknown }): WebhookEvent | null {
    const signature = headers.get("x-signature");
    const requestId = headers.get("x-request-id");
    const b = (body ?? {}) as { id?: string | number; type?: string; topic?: string; data?: { id?: string | number }; live_mode?: boolean };
    const dataId = url.searchParams.get("data.id") ?? (b.data?.id != null ? String(b.data.id) : null);
    const topic = url.searchParams.get("type") ?? b.type ?? url.searchParams.get("topic") ?? b.topic ?? null;
    if (!signature || !dataId || !topic) return null;
    if (!verifyMercadoPagoSignature({ signature, requestId, dataId, secret: this.webhookSecret })) return null;
    return {
      topic,
      resourceId: dataId,
      eventKey: `${topic}:${dataId}:${b.id ?? requestId ?? "sem-id"}`,
      liveMode: typeof b.live_mode === "boolean" ? b.live_mode : null,
    };
  }
}

type RawPayment = {
  id: number | string;
  status?: string;
  external_reference?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
  date_approved?: string | null;
};

function mapPayment(d: RawPayment): ProviderPayment {
  return {
    id: String(d.id),
    status: normalizePaymentStatus(d.status),
    externalReference: d.external_reference ?? null,
    amountCents: d.transaction_amount != null ? Math.round(d.transaction_amount * 100) : null,
    currency: d.currency_id ?? null,
    approvedAt: d.date_approved ? new Date(d.date_approved) : null,
  };
}

export function normalizeSubscriptionStatus(s: string | undefined): ProviderSubscriptionStatus {
  switch (s) {
    case "authorized":
    case "paused":
    case "cancelled":
    case "pending":
      return s;
    default:
      return "pending";
  }
}

export function normalizePaymentStatus(s: string | undefined | null): ProviderPaymentStatus {
  const known: ProviderPaymentStatus[] = [
    "approved", "pending", "in_process", "authorized", "rejected", "cancelled", "refunded", "charged_back",
  ];
  return known.includes(s as ProviderPaymentStatus) ? (s as ProviderPaymentStatus) : "unknown";
}

/**
 * Validação da assinatura do webhook (função pura, testada em tests/unit/billing.test.ts).
 * Manifesto: "id:{data.id};request-id:{x-request-id};ts:{ts};" — segmentos ausentes são omitidos.
 * IDs alfanuméricos devem estar em minúsculas.
 */
export function verifyMercadoPagoSignature(opts: {
  signature: string;
  requestId: string | null;
  dataId: string | null;
  secret: string;
}): boolean {
  const parts = Object.fromEntries(
    opts.signature.split(",").map((p) => {
      const [k, ...v] = p.trim().split("=");
      return [k, v.join("=")];
    }),
  ) as Record<string, string | undefined>;
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1 || !/^[0-9a-f]{64}$/i.test(v1)) return false;

  let manifest = "";
  if (opts.dataId) manifest += `id:${/^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId};`;
  if (opts.requestId) manifest += `request-id:${opts.requestId};`;
  manifest += `ts:${ts};`;

  const expected = createHmac("sha256", opts.secret).update(manifest).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(v1.toLowerCase(), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}
