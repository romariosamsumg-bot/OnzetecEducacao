"use server";

import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/auth/viewer";
import { cancelSubscription, CheckoutError, startBookCheckout, startSubscriptionCheckout } from "@/lib/billing/service";
import type { FormState } from "@/components/ui/form";

const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/).max(80);

export async function subscribe(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  const plan = slug.safeParse(formData.get("plan"));
  if (!plan.success) return { ok: false, message: "Escolha um plano." };
  if (!viewer) redirect(`/cadastro?voltar=${encodeURIComponent(`/assinatura?plano=${plan.data}`)}`);
  let url: string;
  try {
    url = await startSubscriptionCheckout({ id: viewer.id, email: viewer.email }, plan.data);
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, message: err.message };
    console.error("[billing] checkout de assinatura", err instanceof Error ? err.message : err);
    return { ok: false, message: "Não foi possível abrir o pagamento agora. Tente novamente em alguns minutos." };
  }
  redirect(url);
}

export async function buyBook(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  const book = slug.safeParse(formData.get("book"));
  if (!book.success) return { ok: false, message: "Livro inválido." };
  if (!viewer) redirect(`/entrar?voltar=${encodeURIComponent(`/livraria/${book.data}`)}`);
  let url: string;
  try {
    url = await startBookCheckout({ id: viewer.id, email: viewer.email }, book.data);
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, message: err.message };
    console.error("[billing] checkout de livro", err instanceof Error ? err.message : err);
    return { ok: false, message: "Não foi possível abrir o pagamento agora. Tente novamente em alguns minutos." };
  }
  redirect(url);
}

export async function cancelMySubscription(_prev: FormState, formData: FormData): Promise<FormState> {
  const viewer = await getViewer();
  if (!viewer) redirect("/entrar?voltar=/conta/assinatura");
  if (formData.get("confirm") !== "sim") return { ok: false, message: "Confirme o cancelamento marcando a caixa." };
  try {
    await cancelSubscription(viewer.id);
  } catch (err) {
    if (err instanceof CheckoutError) return { ok: false, message: err.message };
    console.error("[billing] cancelamento", err instanceof Error ? err.message : err);
    return { ok: false, message: "Não foi possível cancelar agora. Tente novamente ou fale com o suporte." };
  }
  refresh();
  return { ok: true, message: "Assinatura cancelada. Não haverá novas cobranças." };
}
