import { BookOpen, Bookmark, Home, LifeBuoy, UserRound, type LucideIcon } from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean };

export const mainNav: NavItem[] = [
  { href: "/", label: "Início", icon: Home, match: (p) => p === "/" },
  {
    href: "/aprender",
    label: "Aprender",
    icon: BookOpen,
    match: (p) => ["/aprender", "/cursos", "/aulas", "/dicas", "/artigos", "/livraria"].some((s) => p.startsWith(s)),
  },
  { href: "/resolver", label: "Resolver", icon: LifeBuoy, match: (p) => p.startsWith("/resolver") },
  { href: "/salvos", label: "Salvos", icon: Bookmark, match: (p) => p.startsWith("/salvos") },
  { href: "/conta", label: "Conta", icon: UserRound, match: (p) => p.startsWith("/conta") || p.startsWith("/assinatura") },
];
