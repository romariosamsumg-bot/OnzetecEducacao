import type { Metadata } from "next";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { contentTypeLabel, formatDate, type ContentType } from "@/lib/content/types";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Revisão editorial" };

export default async function RevisaoAdmin() {
  const admin = await requireAdmin();
  const rows = await asUser(admin.id, (db) => db<{ id: string; type: ContentType; title: string; appName: string | null; osName: string | null; versionRange: string | null; lastReviewedAt: Date | null; editorialStatus: string; negative: number }[]>`
    select ci.id, ci.type, ci.title, ci.app_name, ci.os_name, ci.version_range, ci.last_reviewed_at, ci.editorial_status,
      (select count(*)::int from public.guide_feedback f where f.content_id = ci.id and not f.helpful) as negative
    from public.content_items ci
    where ci.editorial_status <> 'current' or ci.last_reviewed_at is null or ci.last_reviewed_at < now() - interval '180 days'
       or exists (select 1 from public.guide_feedback f where f.content_id = ci.id and not f.helpful)
    order by (ci.editorial_status = 'outdated') desc, ci.last_reviewed_at nulls first limit 200`);
  return (
    <div className="space-y-6">
      <PageHeader title="Revisão editorial" description="Conteúdos possivelmente desatualizados: marcados para revisão, sem revisão há mais de 6 meses ou com avaliações “não funcionou”." />
      {rows.length === 0 ? <EmptyState title="Tudo revisado" /> : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Card className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <Link href={`/admin/conteudos/${r.id}`} className="font-semibold text-navy-900 underline-offset-4 hover:underline">{r.title}</Link>
                  <p className="text-[0.9rem] text-ink-muted">
                    {contentTypeLabel[r.type]} · {[r.appName, r.osName, r.versionRange].filter(Boolean).join(" · ") || "sem contexto técnico"} · revisado: {formatDate(r.lastReviewedAt) ?? "nunca"}
                  </p>
                </div>
                {r.editorialStatus === "outdated" ? <Badge tone="danger">Desatualizado</Badge> : r.editorialStatus === "review_soon" ? <Badge tone="warning">Revisar em breve</Badge> : <Badge>Revisão antiga</Badge>}
                {r.negative > 0 ? <Badge tone="warning">{r.negative}× “não funcionou”</Badge> : null}
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
