"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function SiteError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error.digest ?? "erro");
  }, [error]);
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-5 px-4 py-16 text-center">
      <h1 className="text-[1.6rem] font-bold text-navy-900">Algo não funcionou como deveria</h1>
      <p className="text-ink-soft">Não foi culpa sua. Verifique sua internet e tente novamente.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" onClick={reset} className="inline-flex min-h-12 items-center rounded-[var(--radius-control)] bg-orange-500 px-5 font-semibold text-navy-950">
          Tentar novamente
        </button>
        <Link href="/" className="inline-flex min-h-12 items-center rounded-[var(--radius-control)] border-2 border-navy-900 px-5 font-semibold text-navy-900">
          Ir para o início
        </Link>
      </div>
    </div>
  );
}
