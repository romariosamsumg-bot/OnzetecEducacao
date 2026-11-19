import Link from "next/link";
import { LogoMark } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main id="conteudo" className="mx-auto flex min-h-[70dvh] max-w-xl flex-col items-center justify-center gap-5 px-4 py-16 text-center">
      <LogoMark className="size-14" />
      <h1 className="text-[1.8rem] font-bold text-navy-900">Não encontramos esta página</h1>
      <p className="text-[1.05rem] text-ink-soft">O endereço pode ter mudado ou o conteúdo não está mais disponível.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/" className="inline-flex min-h-12 items-center rounded-[var(--radius-control)] bg-orange-500 px-5 font-semibold text-navy-950">Ir para o início</Link>
        <Link href="/resolver" className="inline-flex min-h-12 items-center rounded-[var(--radius-control)] border-2 border-navy-900 px-5 font-semibold text-navy-900">Resolver um problema</Link>
      </div>
    </main>
  );
}
