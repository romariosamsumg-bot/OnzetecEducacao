import type { Metadata } from "next";
import Link from "next/link";
import { ConfirmSubmit, SubmitButton } from "@/components/admin/forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { contentHref, formatDate, type ContentType } from "@/lib/content/types";
import { dismissReports, moderateComment, replyAsTeacher } from "@/server/actions/admin/community";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Comentários" };

type Row = {
  id: string; body: string; status: string; moderationReason: string | null; createdAt: Date; authorName: string;
  contentTitle: string; contentType: ContentType; contentSlug: string; reports: number; reasons: string[] | null; isOfficial: boolean;
};

const reasonLabel: Record<string, string> = { link: "Contém link", possivel_cpf: "Parece CPF", possivel_cartao: "Parece cartão", possivel_codigo: "Parece código" };

type Props = { searchParams: Promise<{ fila?: string }> };

export default async function ComentariosAdmin({ searchParams }: Props) {
  const admin = await requireAdmin();
  const fila = (await searchParams).fila === "todos" ? "todos" : "pendentes";
  const rows = await asUser(admin.id, (db) => db<Row[]>`
    select c.id, c.body, c.status, c.moderation_reason, c.created_at, c.is_official, p.display_name as author_name,
      ci.title as content_title, ci.type as content_type, ci.slug as content_slug,
      (select count(*)::int from public.comment_reports r where r.comment_id = c.id and r.status = 'open') as reports,
      (select array_agg(distinct r.reason) from public.comment_reports r where r.comment_id = c.id and r.status = 'open') as reasons
    from public.comments c join public.profiles p on p.id = c.user_id join public.content_items ci on ci.id = c.content_id
    where c.deleted_at is null and c.status <> 'removed'
      ${fila === "pendentes" ? db`and (c.status = 'pending' or exists (select 1 from public.comment_reports r where r.comment_id = c.id and r.status = 'open')
          or (c.parent_id is null and not c.is_official and not exists (select 1 from public.comments x where x.parent_id = c.id and x.is_official)))` : db``}
    order by (c.status = 'pending') desc, c.created_at desc limit 100`);

  return (
    <div className="space-y-6">
      <PageHeader title="Comentários" description="Aprove, oculte ou responda. Respostas aparecem com o selo “Resposta oficial”." />
      <nav className="flex gap-2" aria-label="Filas">
        <Link href="/admin/comentarios" aria-current={fila === "pendentes" ? "page" : undefined} className="min-h-11 rounded-full border-2 px-4 py-2 font-semibold aria-[current=page]:border-navy-900 aria-[current=page]:bg-navy-900 aria-[current=page]:text-white">Precisam de atenção</Link>
        <Link href="/admin/comentarios?fila=todos" aria-current={fila === "todos" ? "page" : undefined} className="min-h-11 rounded-full border-2 px-4 py-2 font-semibold aria-[current=page]:border-navy-900 aria-[current=page]:bg-navy-900 aria-[current=page]:text-white">Todos</Link>
      </nav>
      {rows.length === 0 ? <EmptyState title="Nada pendente. Tudo em ordem!" /> : null}
      <ul className="space-y-4">
        {rows.map((c) => (
          <li key={c.id}>
            <Card className="space-y-3 p-4">
              <div className="flex flex-wrap items-center gap-2 text-[0.9rem]">
                <strong className="text-navy-900">{c.authorName}</strong>
                <span className="text-ink-muted">em</span>
                <Link href={contentHref(c.contentType, c.contentSlug)} target="_blank" className="font-semibold text-navy-700 underline">{c.contentTitle}</Link>
                <span className="text-ink-muted">· {formatDate(c.createdAt)}</span>
                {c.status === "pending" ? <Badge tone="warning">Aguardando aprovação{c.moderationReason ? ` · ${reasonLabel[c.moderationReason] ?? c.moderationReason}` : ""}</Badge> : null}
                {c.status === "hidden" ? <Badge tone="danger">Oculto</Badge> : null}
                {c.reports > 0 ? <Badge tone="danger">{c.reports} denúncia(s): {(c.reasons ?? []).join(", ")}</Badge> : null}
                {c.isOfficial ? <Badge tone="premium">Oficial</Badge> : null}
              </div>
              <p className="whitespace-pre-line break-words">{c.body}</p>
              <div className="flex flex-wrap gap-2">
                {c.status !== "published" ? (
                  <form action={moderateComment}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="published" /><SubmitButton label="Aprovar" variant="secondary" /></form>
                ) : null}
                {c.status !== "hidden" ? (
                  <form action={moderateComment}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="hidden" /><SubmitButton label="Ocultar" variant="outline" /></form>
                ) : null}
                <form action={moderateComment}><input type="hidden" name="id" value={c.id} /><input type="hidden" name="status" value="removed" /><ConfirmSubmit label="Remover" message="Remover este comentário?" /></form>
                {c.reports > 0 ? (
                  <form action={dismissReports}><input type="hidden" name="commentId" value={c.id} /><SubmitButton label="Descartar denúncias" variant="outline" /></form>
                ) : null}
              </div>
              {!c.isOfficial ? (
                <form action={replyAsTeacher} className="space-y-2 border-t border-line pt-3">
                  <input type="hidden" name="parentId" value={c.id} />
                  <label htmlFor={`r-${c.id}`} className="block font-semibold text-navy-900">Responder como professor</label>
                  <textarea id={`r-${c.id}`} name="body" required minLength={2} maxLength={2000} rows={2} className="block w-full rounded-[var(--radius-control)] border-2 border-line px-3 py-2" />
                  <SubmitButton label="Enviar resposta oficial" />
                </form>
              ) : null}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
