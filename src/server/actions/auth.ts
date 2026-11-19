"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { FormState } from "@/components/ui/form";
import { endSession, getSession, startDevSession } from "@/lib/auth/session";
import { supabaseServer } from "@/lib/auth/supabase-server";
import { safeReturnPath } from "@/lib/auth/viewer";
import { asSystem } from "@/lib/db";
import { devAuthEnabled, env, siteUrl } from "@/lib/env";

const email = z.string().trim().toLowerCase().email("Digite um e-mail válido, por exemplo: maria@gmail.com").max(200);
const password = z
  .string()
  .min(8, "A senha precisa ter pelo menos 8 caracteres.")
  .max(72, "A senha pode ter no máximo 72 caracteres.");

/** Mensagens claras para os erros do Supabase Auth (sem detalhes técnicos). */
function friendlyAuthError(code: string | undefined, fallback = "Não foi possível concluir. Tente novamente."): string {
  switch (code) {
    case "invalid_credentials":
      return "E-mail ou senha incorretos. Confira e tente de novo.";
    case "email_not_confirmed":
      return "Você ainda não confirmou o seu e-mail. Abra a mensagem que enviamos e toque no link de confirmação.";
    case "user_already_exists":
    case "email_exists":
      return "Já existe uma conta com este e-mail. Tente entrar ou recuperar a senha.";
    case "weak_password":
      return "Essa senha é fácil de adivinhar. Use pelo menos 8 caracteres, misturando letras e números.";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.";
    case "otp_expired":
      return "O código expirou ou está incorreto. Peça um novo código.";
    case "same_password":
      return "A nova senha precisa ser diferente da anterior.";
    default:
      return fallback;
  }
}

async function rateLimited(key: string, max: number, windowSeconds: number) {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const [row] = await asSystem((db) => db<{ allowed: boolean }[]>`
    select public.hit_rate_limit(${`${key}:${ip}`}, ${max}, ${windowSeconds}) as allowed`);
  return !row?.allowed;
}

/* ------------------------------ Entrar ------------------------------ */

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const returnTo = safeReturnPath(String(formData.get("voltar") ?? "/"));
  const values = { email: String(formData.get("email") ?? "") };

  if (env().AUTH_MODE === "dev") {
    if (!devAuthEnabled()) return { ok: false, message: "Login de desenvolvimento desativado.", values };
    const parsed = email.safeParse(formData.get("email"));
    if (!parsed.success) return { ok: false, errors: { email: [parsed.error.issues[0].message] }, values };
    const [user] = await asSystem((db) => db<{ id: string; email: string }[]>`
      select id, email from auth.users where email = ${parsed.data}`);
    if (!user) return { ok: false, message: "Conta de desenvolvimento não encontrada. Crie uma em “Criar conta”.", values };
    await startDevSession(user.id, user.email);
    redirect(returnTo);
  }

  const parsed = z.object({ email, password: z.string().min(1, "Digite a sua senha.") }).safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { ok: false, errors: z.flattenError(parsed.error).fieldErrors, values };
  if (await rateLimited("login", 10, 600)) {
    return { ok: false, message: friendlyAuthError("over_request_rate_limit"), values };
  }

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, message: friendlyAuthError(error.code), values };
  redirect(returnTo);
}

/* ------------------------------ Cadastro ------------------------------ */

const signUpSchema = z.object({
  displayName: z.string().trim().min(2, "Digite seu nome ou apelido.").max(80),
  email,
  password,
  terms: z.literal("on", { error: "Para criar a conta, é preciso aceitar os Termos de uso e a Política de privacidade." }),
});

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = { displayName: String(formData.get("displayName") ?? ""), email: String(formData.get("email") ?? "") };
  const raw = {
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: env().AUTH_MODE === "dev" ? "dev-mode-no-password" : formData.get("password"),
    terms: formData.get("terms"),
  };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, message: "Confira os campos destacados.", errors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const returnTo = safeReturnPath(String(formData.get("voltar") ?? "/"));

  if (await rateLimited("signup", 5, 3600)) {
    return { ok: false, message: friendlyAuthError("over_request_rate_limit"), values };
  }

  if (env().AUTH_MODE === "dev") {
    if (!devAuthEnabled()) return { ok: false, message: "Cadastro de desenvolvimento desativado.", values };
    const [user] = await asSystem((db) => db<{ id: string; email: string }[]>`
      insert into auth.users (email, raw_user_meta_data)
      values (${parsed.data.email}, ${db.json({ display_name: parsed.data.displayName })})
      on conflict (email) do nothing returning id, email`);
    if (!user) return { ok: false, message: friendlyAuthError("user_already_exists"), values };
    await startDevSession(user.id, user.email);
    redirect(returnTo === "/" ? "/?bem-vindo=1" : returnTo);
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { display_name: parsed.data.displayName },
      emailRedirectTo: siteUrl(`/auth/confirm?next=${encodeURIComponent(returnTo)}`),
    },
  });
  if (error) return { ok: false, message: friendlyAuthError(error.code), values };
  if (data.session) redirect(returnTo);
  return {
    ok: true,
    message: `Quase pronto! Enviamos um e-mail para ${parsed.data.email}. Abra a mensagem e toque em “Confirmar e-mail” para ativar a sua conta.`,
  };
}

/* ------------------------- Código por e-mail ------------------------- */

export async function requestEmailCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = email.safeParse(formData.get("email"));
  const values = { email: String(formData.get("email") ?? "") };
  if (!parsed.success) return { ok: false, errors: { email: [parsed.error.issues[0].message] }, values };
  if (env().AUTH_MODE === "dev") return { ok: false, message: "No modo de desenvolvimento, use o login simplificado.", values };
  if (await rateLimited("otp", 5, 900)) return { ok: false, message: friendlyAuthError("over_request_rate_limit"), values };

  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithOtp({ email: parsed.data, options: { shouldCreateUser: false } });
  // Mesma resposta exista ou não a conta (não revela quem é cadastrado).
  if (error && error.code !== "otp_disabled" && error.code !== "user_not_found") {
    return { ok: false, message: friendlyAuthError(error.code), values };
  }
  return {
    ok: true,
    message: "Se houver uma conta com este e-mail, enviamos um código de 6 números. Ele vale por alguns minutos.",
    values: { ...values, step: "code" },
  };
}

export async function verifyEmailCode(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = z
    .object({ email, token: z.string().trim().regex(/^\d{6}$/, "O código tem 6 números.") })
    .safeParse({ email: formData.get("email"), token: String(formData.get("token") ?? "").replace(/\s/g, "") });
  const values = { email: String(formData.get("email") ?? "") };
  const codeValues = { ...values, step: "code" };
  if (!parsed.success) return { ok: false, errors: z.flattenError(parsed.error).fieldErrors, values: codeValues };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.verifyOtp({ email: parsed.data.email, token: parsed.data.token, type: "email" });
  if (error) return { ok: false, message: friendlyAuthError(error.code, "Código incorreto ou expirado."), values: codeValues };
  redirect(safeReturnPath(String(formData.get("voltar") ?? "/")));
}

/* -------------------------- Recuperar senha -------------------------- */

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = email.safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, errors: { email: [parsed.error.issues[0].message] } };
  if (env().AUTH_MODE === "dev") return { ok: false, message: "Recuperação de senha indisponível no modo de desenvolvimento." };
  if (await rateLimited("reset", 5, 3600)) return { ok: false, message: friendlyAuthError("over_request_rate_limit") };
  const supabase = await supabaseServer();
  await supabase.auth.resetPasswordForEmail(parsed.data, {
    redirectTo: siteUrl(`/auth/confirm?next=${encodeURIComponent("/conta/nova-senha")}`),
  });
  return {
    ok: true,
    message: "Se houver uma conta com este e-mail, enviamos um link para criar uma nova senha. Confira também a caixa de spam.",
  };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await getSession();
  if (!session) redirect("/entrar?voltar=/conta/nova-senha");
  const parsed = z
    .object({ password, confirm: z.string() })
    .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "As duas senhas precisam ser iguais." })
    .safeParse({ password: formData.get("password"), confirm: formData.get("confirm") });
  if (!parsed.success) return { ok: false, errors: z.flattenError(parsed.error).fieldErrors };
  if (env().AUTH_MODE === "dev") return { ok: false, message: "Indisponível no modo de desenvolvimento." };
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: friendlyAuthError(error.code) };
  return { ok: true, message: "Senha alterada com sucesso." };
}

export async function signOut() {
  await endSession();
  redirect("/");
}
