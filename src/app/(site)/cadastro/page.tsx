import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignUpForm } from "@/components/auth/forms";
import { LoadingBlock } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth/session";
import { safeReturnPath } from "@/lib/auth/viewer";
import { devAuthEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Criar conta",
  description: "Crie sua conta gratuita na Onzetec Educação e experimente as aulas abertas.",
  alternates: { canonical: "/cadastro" },
};

type Props = { searchParams: Promise<{ voltar?: string }> };

export default function CadastroPage({ searchParams }: Props) {
  return (
    <AuthShell
      title="Criar sua conta"
      description="É grátis e leva menos de um minuto. Pedimos só o necessário: seu nome, e-mail e uma senha."
    >
      <Suspense fallback={<LoadingBlock lines={2} />}>
        <View searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function View({ searchParams }: Props) {
  const returnTo = safeReturnPath((await searchParams).voltar);
  if (await getSession()) redirect(returnTo);
  return (
    <div className="space-y-6">
      <SignUpForm returnTo={returnTo} devMode={devAuthEnabled()} />
      <p className="border-t border-line pt-6 text-center">
        Já tem conta?{" "}
        <Link href={`/entrar?voltar=${encodeURIComponent(returnTo)}`} className="inline-flex min-h-11 items-center font-bold text-orange-700 underline underline-offset-4">
          Entrar
        </Link>
      </p>
    </div>
  );
}
