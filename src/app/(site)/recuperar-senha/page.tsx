import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetRequestForm } from "@/components/auth/forms";
import { BackLink } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Recuperar senha", robots: { index: false } };

export default function RecuperarSenhaPage() {
  return (
    <AuthShell
      title="Esqueci minha senha"
      description="Digite o e-mail da sua conta. Vamos enviar um link para você criar uma nova senha."
    >
      <ResetRequestForm />
      <BackLink href="/entrar">Voltar para Entrar</BackLink>
    </AuthShell>
  );
}
