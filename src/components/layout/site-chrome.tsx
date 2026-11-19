import Link from "next/link";
import { Suspense } from "react";
import { Search, UserRound } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { buttonClasses } from "@/components/ui/button";
import { getViewer } from "@/lib/auth/viewer";
import { DesktopNav, DesktopNavFallback } from "./main-nav";
import { TextSizeControl } from "./text-size-control";

export function SkipLink() {
  return (
    <a
      href="#conteudo"
      className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:rounded-lg focus:bg-navy-900 focus:px-4 focus:py-3 focus:font-bold focus:text-white"
    >
      Pular para o conteúdo
    </a>
  );
}

export function EnvironmentBanner() {
  const demo = process.env.DEMO_MEDIA_ENABLED === "true" || process.env.AUTH_MODE === "dev";
  if (!demo) return null;
  return (
    <div className="bg-warning-50 px-4 py-2 text-center text-[0.85rem] font-semibold text-warning-800">
      Ambiente de demonstração · conteúdos de exemplo
    </div>
  );
}

async function AccountButton() {
  const viewer = await getViewer();
  if (!viewer) {
    return (
      <Link href="/entrar" className={buttonClasses("outline", "sm")}>
        Entrar
      </Link>
    );
  }
  const first = viewer.displayName.split(" ")[0] || "Minha conta";
  return (
    <div className="flex items-center gap-2">
      {viewer.isAdmin ? (
        <Link href="/admin" className={buttonClasses("ghost", "sm") + " hidden md:inline-flex"}>
          Painel
        </Link>
      ) : null}
      <Link
        href="/conta"
        className="hidden min-h-11 items-center gap-2 rounded-full border-2 border-navy-100 px-3 font-semibold text-navy-900 hover:bg-navy-50 lg:flex"
      >
        <UserRound aria-hidden className="size-5" />
        <span className="max-w-32 truncate">{first}</span>
      </Link>
    </div>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/97 backdrop-blur-sm">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" className="flex min-h-11 items-center rounded-lg">
          <Logo />
          <span className="sr-only">, página inicial</span>
        </Link>
        <Suspense fallback={<DesktopNavFallback />}>
          <DesktopNav />
        </Suspense>
        <div className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/resolver"
            className="hidden min-h-11 items-center gap-2 rounded-full px-3 font-semibold text-navy-900 hover:bg-navy-100 md:flex lg:hidden xl:flex"
          >
            <Search aria-hidden className="size-5" />
            Buscar
          </Link>
          <TextSizeControl />
          <Suspense fallback={<span className="inline-block h-11 w-20" aria-hidden />}>
            <AccountButton />
          </Suspense>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 bg-navy-900 text-navy-100 on-dark">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4 grid-cols-1">
        <div className="space-y-3">
          <Logo onDark />
          <p className="text-[0.95rem] text-navy-200">
            Aprenda a usar o celular com calma, no seu ritmo, e resolva os problemas do dia a dia.
          </p>
        </div>
        <FooterCol
          title="Aprender"
          links={[
            ["/aprender", "Cursos e categorias"],
            ["/dicas", "Dicas rápidas"],
            ["/resolver", "Resolver um problema"],
            ["/livraria", "Livraria"],
          ]}
        />
        <FooterCol
          title="Sua conta"
          links={[
            ["/assinatura", "Assinatura"],
            ["/conta", "Minha conta"],
            ["/ajuda", "Ajuda"],
          ]}
        />
        <FooterCol
          title="Transparência"
          links={[
            ["/termos", "Termos de uso"],
            ["/privacidade", "Privacidade"],
            ["/ajuda#cancelamento", "Como cancelar"],
          ]}
        />
      </div>
      <p className="border-t border-navy-800 px-4 py-5 text-center text-[0.85rem] text-navy-200">
        © Onzetec Educação. Nunca pedimos senhas ou códigos por mensagem.
      </p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <h2 className="mb-3 font-bold text-white">{title}</h2>
      <ul className="space-y-1">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="inline-flex min-h-11 items-center text-navy-100 underline-offset-4 hover:text-white hover:underline">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
