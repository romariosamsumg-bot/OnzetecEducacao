import type { Metadata } from "next";
import { LogoMark } from "@/components/brand/logo";

export const metadata: Metadata = { title: "Sem conexão", robots: { index: false } };

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-4 text-center">
      <LogoMark className="size-14" />
      <h1 className="text-[1.6rem] font-bold text-navy-900">Você está sem internet</h1>
      <p className="text-[1.05rem] text-ink-soft">
        Confira se o Wi-Fi ou os dados móveis estão ligados. Quando a conexão voltar, toque no botão abaixo.
      </p>
      {/* Recarregamento completo de propósito: sem conexão, a navegação do cliente não funciona. */}
      {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
      <a href="/" className="inline-flex min-h-12 items-center rounded-[var(--radius-control)] bg-orange-500 px-6 font-bold text-navy-950">
        Tentar novamente
      </a>
    </main>
  );
}
