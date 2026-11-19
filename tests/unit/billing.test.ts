import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyMercadoPagoSignature } from "@/lib/billing/mercadopago";
import { describeSubscription, nextStateFromProvider, orderStateFromPayment } from "@/lib/billing/state";

const secret = "segredo-de-teste";
function sign(manifest: string) {
  return createHmac("sha256", secret).update(manifest).digest("hex");
}

describe("assinatura do webhook do Mercado Pago", () => {
  it("aceita assinatura válida", () => {
    const v1 = sign("id:123456;request-id:req-1;ts:1704908010;");
    expect(verifyMercadoPagoSignature({ signature: `ts=1704908010,v1=${v1}`, requestId: "req-1", dataId: "123456", secret })).toBe(true);
  });
  it("usa o id em minúsculas quando alfanumérico", () => {
    const v1 = sign("id:abc123;request-id:r;ts:1;");
    expect(verifyMercadoPagoSignature({ signature: `ts=1,v1=${v1}`, requestId: "r", dataId: "ABC123", secret })).toBe(true);
  });
  it("omite segmentos ausentes do manifesto", () => {
    const v1 = sign("id:9;ts:5;");
    expect(verifyMercadoPagoSignature({ signature: `ts=5,v1=${v1}`, requestId: null, dataId: "9", secret })).toBe(true);
  });
  it("recusa assinatura adulterada, de outro recurso ou mal formada", () => {
    const v1 = sign("id:123;request-id:r;ts:1;");
    expect(verifyMercadoPagoSignature({ signature: `ts=1,v1=${v1}`, requestId: "r", dataId: "124", secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ signature: `ts=2,v1=${v1}`, requestId: "r", dataId: "123", secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ signature: `ts=1,v1=${v1}`, requestId: "r", dataId: "123", secret: "outro" })).toBe(false);
    expect(verifyMercadoPagoSignature({ signature: "v1=abc", requestId: "r", dataId: "123", secret })).toBe(false);
    expect(verifyMercadoPagoSignature({ signature: "lixo", requestId: null, dataId: null, secret })).toBe(false);
  });
});

describe("máquina de estados da assinatura", () => {
  const now = new Date("2026-11-19T12:00:00Z");
  const future = new Date("2026-12-19T12:00:00Z");
  const past = new Date("2026-10-01T12:00:00Z");
  const base = { status: "pending" as const, currentPeriodEnd: null, canceledAt: null };
  const remote = (status: "pending" | "authorized" | "paused" | "cancelled", extra = {}) => ({
    id: "pre_1", status, externalReference: "x", nextPaymentDate: future, lastChargedDate: null as Date | null, amount: 29.9, ...extra,
  });

  it("autorizada sem cobrança aprovada continua pendente", () => {
    expect(nextStateFromProvider(base, remote("authorized"), null, now).status).toBe("pending");
  });
  it("autorizada com cobrança aprovada fica ativa até a próxima cobrança", () => {
    const p = nextStateFromProvider(base, remote("authorized", { lastChargedDate: now }), "approved", now);
    expect(p.status).toBe("active");
    expect(p.currentPeriodEnd).toEqual(future);
  });
  it("cobrança recusada => pagamento em atraso (past_due)", () => {
    const active = { status: "active" as const, currentPeriodEnd: future, canceledAt: null };
    expect(nextStateFromProvider(active, remote("authorized", { lastChargedDate: past }), "rejected", now).status).toBe("past_due");
  });
  it("cancelada mantém acesso até o fim do período pago", () => {
    const active = { status: "active" as const, currentPeriodEnd: future, canceledAt: null };
    const p = nextStateFromProvider(active, remote("cancelled"), null, now);
    expect(p.status).toBe("canceled");
    expect(p.cancelAtPeriodEnd).toBe(true);
    expect(p.currentPeriodEnd).toEqual(future);
  });
  it("cancelada com período encerrado => expirada", () => {
    const old = { status: "active" as const, currentPeriodEnd: past, canceledAt: null };
    expect(nextStateFromProvider(old, remote("cancelled"), null, now).status).toBe("expired");
  });
  it("pausada => sem acesso", () => {
    expect(nextStateFromProvider(base, remote("paused"), null, now).status).toBe("paused");
  });
  it("descreve a situação em linguagem simples", () => {
    expect(describeSubscription(null).title).toMatch(/ainda não é assinante/);
    expect(describeSubscription({ status: "past_due", currentPeriodEnd: future, provider: "mercadopago" }).tone).toBe("error");
    expect(describeSubscription({ status: "canceled", currentPeriodEnd: future, provider: "mercadopago" }).text).toMatch(/acesso continua/);
  });
});

describe("pedido de livro", () => {
  const expected = { totalCents: 2990, currency: "BRL" };
  it("libera somente com valor e moeda corretos", () => {
    expect(orderStateFromPayment({ status: "approved", amountCents: 2990, currency: "BRL" }, expected)).toEqual({ status: "paid", grant: true, revoke: false });
    expect(orderStateFromPayment({ status: "approved", amountCents: 100, currency: "BRL" }, expected).grant).toBe(false);
    expect(orderStateFromPayment({ status: "approved", amountCents: 2990, currency: "USD" }, expected).grant).toBe(false);
  });
  it("estorno revoga o acesso", () => {
    expect(orderStateFromPayment({ status: "refunded", amountCents: 2990, currency: "BRL" }, expected).revoke).toBe(true);
    expect(orderStateFromPayment({ status: "charged_back", amountCents: 2990, currency: "BRL" }, expected).revoke).toBe(true);
  });
  it("pendente/recusado não libera", () => {
    expect(orderStateFromPayment({ status: "pending", amountCents: 2990, currency: "BRL" }, expected).grant).toBe(false);
    expect(orderStateFromPayment({ status: "rejected", amountCents: 2990, currency: "BRL" }, expected).status).toBe("failed");
  });
});
