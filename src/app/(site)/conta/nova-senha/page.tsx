import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/forms";
import { BackLink, LoadingBlock } from "@/components/ui/primitives";
import { requireViewer } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: "Nova senha", robots: { index: false } };

export default function NovaSenhaPage() {
  return (
    <AuthShell title="Criar uma nova senha" description="Use pelo menos 8 caracteres.">
      <Suspense fallback={<LoadingBlock lines={1} />}>
        <Guarded />
      </Suspense>
      <BackLink href="/conta">Voltar para Minha conta</BackLink>
    </AuthShell>
  );
}

async function Guarded() {
  await requireViewer("/conta/nova-senha");
  return <NewPasswordForm />;
}
