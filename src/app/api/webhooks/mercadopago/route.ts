import { NextResponse, type NextRequest } from "next/server";
import { getBillingProvider, recordAndProcessEvent } from "@/lib/billing/service";

/**
 * Notificações do Mercado Pago.
 * 1) valida a assinatura HMAC (x-signature) — inválida => 401;
 * 2) registra o evento de forma idempotente (provider + event_key únicos);
 * 3) consulta o recurso na API do provedor (fonte da verdade) e atualiza o acesso.
 * Falha de processamento => 500 para o provedor reenviar; a reconciliação também reprocessa.
 */
const MAX_BODY = 64 * 1024;

export async function POST(request: NextRequest) {
  const provider = getBillingProvider();
  if (!provider) return NextResponse.json({ error: "billing_disabled" }, { status: 503 });

  const raw = await request.text();
  if (raw.length > MAX_BODY) return NextResponse.json({ error: "too_large" }, { status: 413 });
  let body: unknown = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const event = provider.verifyWebhook({ headers: request.headers, url: request.nextUrl, body });
  if (!event) return NextResponse.json({ error: "invalid_signature" }, { status: 401 });

  const result = await recordAndProcessEvent(event, body);
  if (result === "failed") return NextResponse.json({ received: true, processed: false }, { status: 500 });
  return NextResponse.json({ received: true, duplicate: result === "duplicate" });
}
