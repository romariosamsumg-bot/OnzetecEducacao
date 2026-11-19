import type { ProviderPaymentStatus, ProviderSubscription } from "./types";

/**
 * Regras de transição da assinatura (funções puras, testadas em tests/unit/billing.test.ts).
 * A fonte da verdade é sempre o provedor consultado pela API — nunca o
 * conteúdo da notificação nem parâmetros de retorno na URL.
 */
export type LocalSubscriptionStatus = "pending" | "active" | "past_due" | "paused" | "canceled" | "expired";

export type SubscriptionPatch = {
  status: LocalSubscriptionStatus;
  currentPeriodEnd: Date | null;
  currentPeriodStart: Date | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: Date | null;
  lastPaymentStatus: string | null;
};

export function nextStateFromProvider(
  current: { status: LocalSubscriptionStatus; currentPeriodEnd: Date | null; canceledAt: Date | null },
  provider: ProviderSubscription,
  lastPayment: ProviderPaymentStatus | null,
  now: Date = new Date(),
): SubscriptionPatch {
  const base = {
    currentPeriodStart: provider.lastChargedDate,
    lastPaymentStatus: lastPayment,
  };

  switch (provider.status) {
    case "pending":
      return { ...base, status: "pending", currentPeriodEnd: current.currentPeriodEnd, cancelAtPeriodEnd: false, canceledAt: null };

    case "paused":
      return { ...base, status: "paused", currentPeriodEnd: current.currentPeriodEnd, cancelAtPeriodEnd: false, canceledAt: null };

    case "cancelled": {
      // Acesso continua até o fim do período já pago; depois, "expired".
      const end = current.currentPeriodEnd;
      const status: LocalSubscriptionStatus = end && end > now ? "canceled" : "expired";
      return { ...base, status, currentPeriodEnd: end, cancelAtPeriodEnd: true, canceledAt: current.canceledAt ?? now };
    }

    case "authorized": {
      if (lastPayment === "rejected" || lastPayment === "cancelled") {
        return { ...base, status: "past_due", currentPeriodEnd: current.currentPeriodEnd, cancelAtPeriodEnd: false, canceledAt: null };
      }
      // Sem cobrança aprovada ainda (ex.: primeira cobrança em processamento): continua pendente.
      if (!provider.lastChargedDate && lastPayment !== "approved") {
        return { ...base, status: "pending", currentPeriodEnd: current.currentPeriodEnd, cancelAtPeriodEnd: false, canceledAt: null };
      }
      return {
        ...base,
        status: "active",
        currentPeriodEnd: provider.nextPaymentDate ?? current.currentPeriodEnd,
        cancelAtPeriodEnd: false,
        canceledAt: null,
      };
    }
  }
}

export type OrderPatch = { status: "pending" | "paid" | "failed" | "refunded" | "canceled"; grant: boolean; revoke: boolean };

export function orderStateFromPayment(
  payment: { status: ProviderPaymentStatus; amountCents: number | null; currency: string | null },
  expected: { totalCents: number; currency: string },
): OrderPatch {
  switch (payment.status) {
    case "approved":
      // Confere valor e moeda antes de liberar (defesa contra adulteração da preferência)
      if (payment.amountCents !== expected.totalCents || (payment.currency ?? "BRL") !== expected.currency) {
        return { status: "failed", grant: false, revoke: false };
      }
      return { status: "paid", grant: true, revoke: false };
    case "refunded":
    case "charged_back":
      return { status: "refunded", grant: false, revoke: true };
    case "rejected":
      return { status: "failed", grant: false, revoke: false };
    case "cancelled":
      return { status: "canceled", grant: false, revoke: false };
    default:
      return { status: "pending", grant: false, revoke: false };
  }
}

/** Texto claro sobre a situação da assinatura, para a pessoa entender sem ajuda. */
export function describeSubscription(sub: {
  status: LocalSubscriptionStatus;
  currentPeriodEnd: Date | null;
  provider: string;
} | null): { title: string; text: string; tone: "success" | "warning" | "error" | "info" } {
  const fmt = (d: Date | null) =>
    d ? new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "America/Sao_Paulo" }).format(new Date(d)) : null;
  if (!sub) return { title: "Você ainda não é assinante", text: "Assine para liberar todos os cursos, guias e dicas.", tone: "info" };
  const end = fmt(sub.currentPeriodEnd);
  switch (sub.status) {
    case "active":
      return sub.provider === "grant"
        ? { title: "Acesso de cortesia ativo", text: end ? `Seu acesso vale até ${end}.` : "Seu acesso está liberado.", tone: "success" }
        : { title: "Assinatura ativa", text: end ? `A próxima renovação está prevista para ${end}.` : "Sua assinatura está em dia.", tone: "success" };
    case "pending":
      return { title: "Pagamento em confirmação", text: "Assim que o Mercado Pago confirmar o pagamento, o acesso é liberado automaticamente.", tone: "info" };
    case "past_due":
      return {
        title: "Pagamento não aprovado",
        text: "A última cobrança foi recusada. O Mercado Pago tentará novamente. Confira o cartão cadastrado para não perder o acesso.",
        tone: "error",
      };
    case "paused":
      return { title: "Assinatura pausada", text: "Não há cobranças enquanto a assinatura estiver pausada. O acesso fica suspenso.", tone: "warning" };
    case "canceled":
      return { title: "Assinatura cancelada", text: end ? `Não haverá novas cobranças. Seu acesso continua até ${end}.` : "Não haverá novas cobranças.", tone: "warning" };
    case "expired":
      return { title: "Assinatura encerrada", text: "Seu período de acesso terminou. Você pode assinar novamente quando quiser.", tone: "info" };
  }
}
