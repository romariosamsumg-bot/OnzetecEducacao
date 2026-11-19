import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNav, AdminNavFallback } from "@/components/admin/admin-nav";
import { Logo } from "@/components/brand/logo";
import { LoadingBlock } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";

export const metadata: Metadata = { title: { default: "Painel", template: "%s | Painel Onzetec" }, robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-[#f3f5f8]">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4">
          <Link href="/admin" className="flex min-h-11 items-center gap-3">
            <Logo compact />
            <span className="rounded-full bg-navy-900 px-2.5 py-0.5 text-[0.8rem] font-semibold text-white">Painel</span>
          </Link>
          <Link href="/" className="inline-flex min-h-11 items-center font-semibold text-navy-700 underline underline-offset-4">
            Ver a plataforma
          </Link>
        </div>
      </header>
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[14rem_minmax(0,1fr)]">
        <aside>
          <Suspense fallback={<AdminNavFallback />}>
            <AdminNav />
          </Suspense>
        </aside>
        <main id="conteudo" className="min-w-0">
          <Suspense fallback={<LoadingBlock label="Carregando painel…" />}>
            <Guard>{children}</Guard>
          </Suspense>
        </main>
      </div>
    </div>
  );
}

/** Toda a área administrativa exige administrador (404 para os demais). */
async function Guard({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  return <>{children}</>;
}
