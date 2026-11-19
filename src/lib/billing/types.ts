/**
 * Contrato do provedor de pagamentos. As telas e regras de acesso só
 * conhecem este contrato — trocar de provedor não exige refazer a plataforma.
 */

export type ProviderSubscriptionStatus = "pending" | "authorized" | "paused" | "cancelled";
export type ProviderPaymentStatus =
  | "approved"
  | "pending"
  | "in_process"
  | "authorized"
  | "rejected"
  | "cancelled"
  | "refunded"
  | "charged_back"
  | "unknown";

export type ProviderSubscription = {
  id: string;
  status: ProviderSubscriptionStatus;
  externalReference: string | null; // nosso subscriptions.id
  nextPaymentDate: Date | null;
  lastChargedDate: Date | null;
  amount: number | null; // em reais
};

export type ProviderPayment = {
  id: string;
  status: ProviderPaymentStatus;
  externalReference: string | null; // nosso orders.id
  amountCents: number | null;
  currency: string | null;
  approvedAt: Date | null;
};

export type ProviderSubscriptionCharge = {
  id: string;
  subscriptionId: string; // preapproval id
  paymentStatus: ProviderPaymentStatus;
};

export type WebhookEvent = {
  topic: string;
  resourceId: string;
  eventKey: string;
  liveMode: boolean | null;
};

export interface BillingProvider {
  readonly name: string;
  createSubscriptionCheckout(input: {
    subscriptionId: string;
    reason: string;
    amountCents: number;
    interval: "month" | "year";
    intervalCount: number;
    payerEmail: string;
    backUrl: string;
  }): Promise<{ checkoutUrl: string; providerSubscriptionId: string }>;
  getSubscription(providerSubscriptionId: string): Promise<ProviderSubscription>;
  cancelSubscription(providerSubscriptionId: string): Promise<void>;
  getSubscriptionCharge(chargeId: string): Promise<ProviderSubscriptionCharge>;
  createOrderCheckout(input: {
    orderId: string;
    items: { id: string; title: string; unitPriceCents: number }[];
    payerEmail: string;
    backUrl: string;
    notificationUrl: string;
  }): Promise<{ checkoutUrl: string; providerCheckoutId: string }>;
  getPayment(paymentId: string): Promise<ProviderPayment>;
  findPaymentsByReference(externalReference: string): Promise<ProviderPayment[]>;
  /** Verifica a autenticidade da notificação; retorna o evento ou null se inválida. */
  verifyWebhook(input: { headers: Headers; url: URL; body: unknown }): WebhookEvent | null;
}

export class BillingNotConfiguredError extends Error {
  constructor() {
    super("Pagamentos ainda não configurados.");
  }
}
