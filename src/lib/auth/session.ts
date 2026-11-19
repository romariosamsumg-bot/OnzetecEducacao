import "server-only";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { cache } from "react";
import { devAuthEnabled, env } from "@/lib/env";
import { signPayload, verifyPayload } from "@/lib/security/signing";
import { supabaseServer } from "./supabase-server";

export type Session = { userId: string; email: string | null };

export const DEV_SESSION_COOKIE = "oz_dev_session";
const DEV_SESSION_TTL = 60 * 60 * 24 * 7;

/**
 * Sessão da requisição atual, validada no servidor.
 * - supabase: getClaims() verifica a assinatura do JWT.
 * - dev: cookie assinado com HMAC (somente desenvolvimento/testes locais).
 */
export const getSession = cache(async (): Promise<Session | null> => {
  await connection(); // sessão é sempre dado da requisição (validade depende do horário)
  if (env().AUTH_MODE === "dev") {
    if (!devAuthEnabled()) return null;
    const token = (await cookies()).get(DEV_SESSION_COOKIE)?.value;
    const data = verifyPayload<{ uid: string; email: string }>(token);
    return data ? { userId: data.uid, email: data.email } : null;
  }

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return { userId: data.claims.sub, email: (data.claims.email as string | undefined) ?? null };
});

export async function startDevSession(userId: string, email: string) {
  if (!devAuthEnabled()) throw new Error("Login de desenvolvimento desativado.");
  (await cookies()).set(DEV_SESSION_COOKIE, signPayload({ uid: userId, email }, DEV_SESSION_TTL), {
    httpOnly: true,
    sameSite: "lax",
    secure: env().NEXT_PUBLIC_SITE_URL.startsWith("https://"),
    path: "/",
    maxAge: DEV_SESSION_TTL,
  });
}

export async function endSession() {
  if (env().AUTH_MODE === "dev") {
    (await cookies()).delete(DEV_SESSION_COOKIE);
    return;
  }
  const supabase = await supabaseServer();
  await supabase.auth.signOut();
}
