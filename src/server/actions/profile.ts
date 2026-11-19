"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { refresh } from "next/cache";
import { z } from "zod";
import { asUser } from "@/lib/db";
import { getSession } from "@/lib/auth/session";
import type { FormState } from "@/components/ui/form";

const interestSchema = z.enum(["celular", "whatsapp", "resolver", "redes", "seguranca"]);

const interestDestination: Record<z.infer<typeof interestSchema>, string> = {
  celular: "/aprender/primeiros-passos",
  whatsapp: "/aprender/whatsapp",
  resolver: "/resolver",
  redes: "/aprender",
  seguranca: "/aprender/seguranca",
};

/** Orientação do primeiro acesso (opcional). */
export async function saveInterest(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/entrar");
  const skip = formData.get("skip") === "1";
  const parsed = interestSchema.safeParse(formData.get("interest"));

  await asUser(session.userId, (db) => db`
    update public.profiles
    set onboarding_done = true, learning_interest = ${skip || !parsed.success ? null : parsed.data}
    where id = auth.uid()`);

  if (!skip && parsed.success) redirect(interestDestination[parsed.data]);
  refresh();
}

const prefsSchema = z.object({
  displayName: z.string().trim().min(2, "Informe como prefere ser chamado(a), com pelo menos 2 letras.").max(80),
  textScale: z.enum(["100", "115", "130"]),
  reduceMotion: z.boolean(),
});

export async function savePreferences(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/entrar?voltar=/conta");
  const parsed = prefsSchema.safeParse({
    displayName: formData.get("displayName"),
    textScale: formData.get("textScale"),
    reduceMotion: formData.get("reduceMotion") === "on",
  });
  if (!parsed.success) {
    return { ok: false, message: "Confira os campos destacados.", errors: z.flattenError(parsed.error).fieldErrors };
  }
  const { displayName, textScale, reduceMotion } = parsed.data;
  await asUser(session.userId, (db) => db`
    update public.profiles
    set display_name = ${displayName}, text_scale = ${Number(textScale)}, reduce_motion = ${reduceMotion}
    where id = auth.uid()`);

  const jar = await cookies();
  const opts = { path: "/", maxAge: 31536000, sameSite: "lax" as const };
  jar.set("oz_text_scale", textScale, opts);
  jar.set("oz_reduce_motion", String(reduceMotion), opts);
  refresh();
  return { ok: true, message: "Preferências salvas." };
}

/** LGPD — pedido de exclusão da conta e dos dados. O administrador conclui o pedido no painel. */
export async function requestAccountDeletion(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/entrar?voltar=/conta");
  if (formData.get("confirm") !== "sim") return { ok: false, message: "Marque a caixa para confirmar o pedido." };
  await asUser(session.userId, (db) => db`
    insert into public.data_requests (user_id, kind) values (auth.uid(), 'deletion')
    on conflict (user_id, kind) where status = 'open' do nothing`);
  refresh();
  return {
    ok: true,
    message:
      "Pedido registrado. Vamos excluir sua conta e seus dados em até 15 dias e avisaremos por e-mail. Se tiver assinatura ativa, cancele-a antes para evitar novas cobranças.",
  };
}
