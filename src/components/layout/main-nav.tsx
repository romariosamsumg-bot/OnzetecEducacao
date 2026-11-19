"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/button";
import { mainNav } from "./nav-items";

/** Barra inferior fixa (celular): 5 destinos, sempre com ícone + texto. */
export function BottomNav() {
  return <BottomNavView path={usePathname() ?? "/"} />;
}

/** Versão sem estado ativo, usada enquanto a URL ainda não está disponível. */
export function BottomNavFallback() {
  return <BottomNavView path="" />;
}

function BottomNavView({ path }: { path: string }) {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/98 pb-[env(safe-area-inset-bottom)] shadow-[0_-2px_12px_rgb(11_37_69/0.08)] lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5">
        {mainNav.map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-16 flex-col items-center justify-center gap-0.5 px-1 text-[0.78rem] font-semibold",
                  active ? "text-navy-900" : "text-ink-muted hover:text-navy-900",
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-14 items-center justify-center rounded-full transition-colors",
                    active && "bg-orange-100",
                  )}
                >
                  <Icon aria-hidden className={cn("size-6", active && "text-orange-700")} strokeWidth={active ? 2.4 : 2} />
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Navegação do cabeçalho (computador e tablet). */
export function DesktopNav() {
  return <DesktopNavView path={usePathname() ?? "/"} />;
}

export function DesktopNavFallback() {
  return <DesktopNavView path="" />;
}

function DesktopNavView({ path }: { path: string }) {
  return (
    <nav aria-label="Navegação principal" className="hidden lg:block">
      <ul className="flex items-center gap-1">
        {mainNav.slice(0, 4).map(({ href, label, icon: Icon, match }) => {
          const active = match(path);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-2 rounded-full px-4 font-semibold",
                  active ? "bg-navy-900 text-white" : "text-navy-900 hover:bg-navy-100",
                )}
              >
                <Icon aria-hidden className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
