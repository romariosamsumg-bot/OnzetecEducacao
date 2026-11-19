import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { EmailCodeForm, SignInForm } from "@/components/auth/forms";
import { Alert, LoadingBlock } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth/session";
import { safeReturnPath } from "@/lib/auth/viewer";
import { asSystem } from "@/lib/db";
import { devAuthEnabled } from "@/lib/env";

export const metadata: Metadata = { title: "Entrar", robots: { index: false } };

type Props = { searchParams: Promise<{ voltar?: string }> };

export default function EntrarPage({ searchParams }: Props) {
  return (
    <AuthShell title="Entrar na sua conta" description="Que bom ter você de volta.">
      <Suspense fallback={<LoadingBlock lines={1} />}>
        <View searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function View({ searchParams }: Props) {
  const returnTo = safeReturnPath((await searchParams).voltar);
  if (await getSession()) redirect(returnTo);
  const dev = devAuthEnabled();
  return (
    <div className="space-y-6">
      {dev ? <DevAccounts /> : null}
      <SignInForm returnTo={returnTo} devMode={dev} />
      {!dev ? (
        <div className="space-y-4 border-t border-line pt-6">
          <p className="font-semibold text-navy-900">Prefere entrar sem senha?</p>
          <EmailCodeForm returnTo={returnTo} />
        </div>
      ) : null}
      <p className="border-t border-line pt-6 text-center">
        Ainda não tem conta?{" "}
        <Link href={`/cadastro?voltar=${encodeURIComponent(returnTo)}`} className="inline-flex min-h-11 items-center font-bold text-orange-700 underline underline-offset-4">
          Criar conta grátis
        </Link>
      </p>
    </div>
  );
}

async function DevAccounts() {
  const users = await asSystem((db) => db<{ email: string }[]>`
    select email from auth.users where email like '%@onzetec.local' order by email limit 5`);
  return (
    <Alert tone="warning" title="Modo de desenvolvimento">
      Login simplificado, sem senha — nunca disponível em produção. Contas de teste:{" "}
      {users.map((u, i) => (
        <span key={u.email}>
          {i > 0 ? ", " : ""}
          <code>{u.email}</code>
        </span>
      ))}
    </Alert>
  );
}
