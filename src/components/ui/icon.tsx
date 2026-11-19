import {
  BookOpen,
  Camera,
  Image as ImageIcon,
  LayoutGrid,
  MessageCircle,
  PlayCircle,
  Settings,
  ShieldCheck,
  Smartphone,
  Users,
  Wifi,
  type LucideIcon,
} from "lucide-react";

/** Ícones permitidos para categorias (o admin escolhe por nome). */
export const categoryIcons: Record<string, LucideIcon> = {
  smartphone: Smartphone,
  "message-circle": MessageCircle,
  camera: Camera,
  users: Users,
  "play-circle": PlayCircle,
  "shield-check": ShieldCheck,
  image: ImageIcon,
  settings: Settings,
  wifi: Wifi,
  "layout-grid": LayoutGrid,
  "book-open": BookOpen,
};

export function CategoryIcon({ name, className = "size-6" }: { name: string | null | undefined; className?: string }) {
  const Icon = (name && categoryIcons[name]) || BookOpen;
  return <Icon aria-hidden className={className} />;
}

/** Cor de fundo estável por categoria para capas sem imagem. */
const tints = [
  "bg-navy-100 text-navy-800",
  "bg-orange-100 text-orange-700",
  "bg-[#e6f2ec] text-[#1e6a40]",
  "bg-[#ece8f6] text-[#4a3a8a]",
  "bg-[#e5f0f6] text-[#1b5878]",
];
export function tintFor(key: string | null | undefined) {
  if (!key) return tints[0];
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return tints[h % tints.length];
}
