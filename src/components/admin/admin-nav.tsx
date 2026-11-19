"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/button";

export const adminLinks = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/conteudos", label: "Conteúdos" },
  { href: "/admin/cursos", label: "Cursos" },
  { href: "/admin/categorias", label: "Categorias" },
  { href: "/admin/livros", label: "Livros" },
  { href: "/admin/comentarios", label: "Comentários" },
  { href: "/admin/revisao", label: "Revisão editorial" },
  { href: "/admin/assinantes", label: "Assinantes" },
  { href: "/admin/planos", label: "Planos" },
  { href: "/admin/pagamentos", label: "Pagamentos" },
  { href: "/admin/privacidade", label: "Privacidade" },
];

export function AdminNav() {
  return <AdminNavView path={usePathname() ?? ""} />;
}
export function AdminNavFallback() {
  return <AdminNavView path="" />;
}

function AdminNavView({ path }: { path: string }) {
  return (
    <nav aria-label="Painel administrativo">
      <ul className="flex gap-1 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible">
        {adminLinks.map((l) => {
          const active = l.href === "/admin" ? path === "/admin" : path.startsWith(l.href);
          return (
            <li key={l.href} className="shrink-0">
              <Link
                href={l.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-[var(--radius-control)] px-3 font-semibold whitespace-nowrap",
                  active ? "bg-navy-900 text-white" : "text-navy-900 hover:bg-navy-100",
                )}
              >
                {l.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
