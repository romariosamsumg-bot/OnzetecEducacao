import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { SelectField, TextField } from "@/components/ui/form";
import { Alert, Badge, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { contentTypeLabel, formatDate, type ContentType } from "@/lib/content/types";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Conteúdos" };

type Props = { searchParams: Promise<{ tipo?: string; situacao?: string; q?: string; removido?: string }> };

const statusLabel: Record<string, { label: string; tone: "success" | "warning" | "neutral" | "info" }> = {
  published: { label: "Publicado", tone: "success" },
  scheduled: { label: "Agendado", tone: "info" },
  draft: { label: "Rascunho", tone: "neutral" },
  archived: { label: "Arquivado", tone: "warning" },
};

export default async function ConteudosAdmin({ searchParams }: Props) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const tipo = ["video", "short", "article", "guide"].includes(sp.tipo ?? "") ? (sp.tipo as ContentType) : null;
  const situacao = ["draft", "scheduled", "published", "archived"].includes(sp.situacao ?? "") ? sp.situacao! : null;
  const q = (sp.q ?? "").slice(0, 80);
  const rows = await asUser(admin.id, (db) => db<
    { id: string; type: ContentType; title: string; status: string; access: string; publishedAt: Date | null; updatedAt: Date; courseTitle: string | null; isDemo: boolean; editorialStatus: string }[]
  >`select ci.id, ci.type, ci.title, ci.status, ci.access, ci.published_at, ci.updated_at, ci.is_demo, ci.editorial_status, co.title as course_title
    from public.content_items ci left join public.courses co on co.id = ci.course_id
    where true ${tipo ? db`and ci.type = ${tipo}` : db``} ${situacao ? db`and ci.status = ${situacao}` : db``}
      ${q ? db`and ci.title ilike ${"%" + q.replace(/[%_]/g, "") + "%"}` : db``}
    order by ci.updated_at desc limit 200`);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conteúdos"
        description="Videoaulas, dicas rápidas, artigos e guias de solução."
        actions={
          <div className="flex flex-wrap gap-2">
            {(["video", "short", "article", "guide"] as const).map((t) => (
              <ButtonLink key={t} href={`/admin/conteudos/novo?tipo=${t}`} size="sm" variant={t === "guide" ? "primary" : "outline"} icon={<Plus aria-hidden className="size-4" />}>
                {contentTypeLabel[t]}
              </ButtonLink>
            ))}
          </div>
        }
      />
      {sp.removido ? <Alert tone="success">Conteúdo removido.</Alert> : null}
      <form className="grid grid-cols-1 gap-3 rounded-[var(--radius-card)] border border-line bg-white p-4 sm:grid-cols-4 sm:items-end">
        <TextField label="Buscar pelo título" name="q" defaultValue={q} />
        <SelectField label="Tipo" name="tipo" defaultValue={tipo ?? ""}>
          <option value="">Todos</option>
          {(["video", "short", "article", "guide"] as const).map((t) => <option key={t} value={t}>{contentTypeLabel[t]}</option>)}
        </SelectField>
        <SelectField label="Situação" name="situacao" defaultValue={situacao ?? ""}>
          <option value="">Todas</option>
          {Object.entries(statusLabel).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </SelectField>
        <button className="min-h-12 rounded-[var(--radius-control)] bg-navy-900 px-4 font-semibold text-white">Filtrar</button>
      </form>
      <div className="overflow-x-auto rounded-[var(--radius-card)] border border-line bg-white">
        <table className="w-full min-w-[640px] text-left">
          <caption className="sr-only">Lista de conteúdos</caption>
          <thead className="border-b border-line bg-navy-50 text-[0.9rem] text-navy-900">
            <tr><th className="p-3">Título</th><th className="p-3">Tipo</th><th className="p-3">Situação</th><th className="p-3">Acesso</th><th className="p-3">Atualizado</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-line-soft last:border-0">
                <td className="p-3">
                  <Link href={`/admin/conteudos/${r.id}`} className="font-semibold text-navy-900 underline-offset-4 hover:underline">{r.title}</Link>
                  {r.courseTitle ? <span className="block text-[0.85rem] text-ink-muted">{r.courseTitle}</span> : null}
                  <span className="mt-1 flex gap-1">
                    {r.isDemo ? <Badge tone="demo">Demonstração</Badge> : null}
                    {r.editorialStatus !== "current" ? <Badge tone="warning">{r.editorialStatus === "outdated" ? "Desatualizado" : "Revisar"}</Badge> : null}
                  </span>
                </td>
                <td className="p-3 text-[0.95rem]">{contentTypeLabel[r.type]}</td>
                <td className="p-3"><Badge tone={statusLabel[r.status]?.tone}>{statusLabel[r.status]?.label}</Badge></td>
                <td className="p-3 text-[0.95rem]">{r.access === "free" ? "Gratuito" : "Assinantes"}</td>
                <td className="p-3 text-[0.9rem] text-ink-muted">{formatDate(r.updatedAt)}</td>
              </tr>
            ))}
            {rows.length === 0 ? <tr><td colSpan={5} className="p-6 text-center text-ink-muted">Nenhum conteúdo encontrado.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
