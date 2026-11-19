import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { Badge, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Cursos" };

export default async function CursosAdmin() {
  const admin = await requireAdmin();
  const rows = await asUser(admin.id, (db) => db<{ id: string; title: string; status: string; modules: number; lessons: number; isDemo: boolean }[]>`
    select c.id, c.title, c.status, c.is_demo,
      (select count(*)::int from public.course_modules m where m.course_id = c.id) as modules,
      (select count(*)::int from public.content_items l where l.course_id = c.id) as lessons
    from public.courses c order by c.updated_at desc`);
  return (
    <div className="space-y-6">
      <PageHeader title="Cursos" actions={<ButtonLink href="/admin/cursos/novo" icon={<Plus aria-hidden className="size-5" />}>Novo curso</ButtonLink>} />
      <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map((c) => (
          <li key={c.id}>
            <Link href={`/admin/cursos/${c.id}`} className="block rounded-[var(--radius-card)] border border-line bg-white p-4 hover:border-navy-200">
              <span className="block font-bold text-navy-900">{c.title}</span>
              <span className="text-[0.9rem] text-ink-muted">{c.modules} módulos · {c.lessons} aulas</span>
              <span className="mt-2 flex gap-1">
                <Badge tone={c.status === "published" ? "success" : "neutral"}>{c.status === "published" ? "Publicado" : c.status === "draft" ? "Rascunho" : c.status === "scheduled" ? "Agendado" : "Arquivado"}</Badge>
                {c.isDemo ? <Badge tone="demo">Demonstração</Badge> : null}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
