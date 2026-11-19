import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowUp, ExternalLink, Plus } from "lucide-react";
import { CourseFields } from "@/components/admin/course-fields";
import { ActionForm, ConfirmSubmit, SubmitButton } from "@/components/admin/forms";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge, Card, PageHeader } from "@/components/ui/primitives";
import { editorOptions } from "@/lib/admin/queries";
import { toBrasiliaInput } from "@/lib/admin/util";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { addModule, deleteCourse, deleteModule, moveItem, renameModule, saveCourse } from "@/server/actions/admin/catalog";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Editar curso" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> };

function MoveButtons({ kind, id, first, last }: { kind: "module" | "lesson"; id: string; first: boolean; last: boolean }) {
  return (
    <div className="flex gap-1">
      {(["up", "down"] as const).map((dir) => (
        <form key={dir} action={moveItem}>
          <input type="hidden" name="kind" value={kind} />
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="dir" value={dir} />
          <button
            disabled={dir === "up" ? first : last}
            aria-label={dir === "up" ? "Mover para cima" : "Mover para baixo"}
            title={dir === "up" ? "Mover para cima" : "Mover para baixo"}
            className="inline-flex size-11 items-center justify-center rounded-lg hover:bg-navy-100 disabled:opacity-30"
          >
            {dir === "up" ? <ArrowUp aria-hidden className="size-5" /> : <ArrowDown aria-hidden className="size-5" />}
          </button>
        </form>
      ))}
    </div>
  );
}

export default async function EditarCurso({ params, searchParams }: Props) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sp = await searchParams;
  const { categories } = await editorOptions(admin.id);
  const data = await asUser(admin.id, async (db) => {
    const [c] = await db<Record<string, never>[]>`select * from public.courses where id = ${id}`;
    if (!c) return null;
    const modules = await db<{ id: string; title: string }[]>`select id, title from public.course_modules where course_id = ${id} order by position, created_at`;
    const lessons = await db<{ id: string; title: string; moduleId: string; status: string; access: string }[]>`
      select id, title, module_id, status, access from public.content_items where course_id = ${id} order by position, created_at`;
    return { c: c as unknown as Record<string, any>, modules, lessons }; // eslint-disable-line @typescript-eslint/no-explicit-any
  });
  if (!data) notFound();
  const { c, modules, lessons } = data;

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/admin/cursos", label: "Cursos" }}
        title={c.title}
        actions={<ButtonLink href={`/cursos/${c.slug}`} target="_blank" variant="outline" size="sm" icon={<ExternalLink aria-hidden className="size-4" />}>Ver na plataforma</ButtonLink>}
      />
      {sp.salvo ? <Alert tone="success" live>Curso salvo.</Alert> : null}

      <Card className="space-y-4 p-5">
        <h2 className="text-[1.2rem] font-bold text-navy-900">Módulos e aulas</h2>
        {modules.length === 0 ? <p className="text-ink-muted">Nenhum módulo ainda. Comece criando o primeiro módulo.</p> : null}
        <ol className="space-y-4">
          {modules.map((m, mi) => {
            const ls = lessons.filter((l) => l.moduleId === m.id);
            return (
              <li key={m.id} className="rounded-[var(--radius-card)] border border-line">
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-navy-50 p-3">
                  <span className="font-bold text-navy-900">Módulo {mi + 1}</span>
                  <form action={renameModule} className="flex min-w-0 flex-1 gap-2">
                    <input type="hidden" name="id" value={m.id} />
                    <label className="sr-only" htmlFor={`mod-${m.id}`}>Nome do módulo {mi + 1}</label>
                    <input id={`mod-${m.id}`} name="title" defaultValue={m.title} className="min-h-11 min-w-0 flex-1 rounded-lg border-2 border-line bg-white px-3" />
                    <SubmitButton label="Renomear" variant="outline" />
                  </form>
                  <MoveButtons kind="module" id={m.id} first={mi === 0} last={mi === modules.length - 1} />
                  <form action={deleteModule}>
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmSubmit label="Excluir módulo" message="Excluir este módulo? As aulas viram videoaulas avulsas (não são apagadas)." />
                  </form>
                </div>
                <ol className="divide-y divide-line-soft">
                  {ls.map((l, li) => (
                    <li key={l.id} className="flex flex-wrap items-center gap-2 p-3">
                      <span className="text-ink-muted">{li + 1}.</span>
                      <Link href={`/admin/conteudos/${l.id}`} className="min-w-0 flex-1 font-semibold text-navy-900 underline-offset-4 hover:underline">{l.title}</Link>
                      <Badge tone={l.status === "published" ? "success" : "neutral"}>{l.status === "published" ? "Publicada" : "Rascunho"}</Badge>
                      <Badge tone={l.access === "free" ? "free" : "premium"}>{l.access === "free" ? "Gratuita" : "Assinantes"}</Badge>
                      <MoveButtons kind="lesson" id={l.id} first={li === 0} last={li === ls.length - 1} />
                    </li>
                  ))}
                </ol>
                <div className="p-3">
                  <ButtonLink href={`/admin/conteudos/novo?tipo=video&curso=${c.id}&modulo=${m.id}`} size="sm" variant="outline" icon={<Plus aria-hidden className="size-4" />}>
                    Nova aula neste módulo
                  </ButtonLink>
                </div>
              </li>
            );
          })}
        </ol>
        <form action={addModule} className="flex flex-wrap items-end gap-2 border-t border-line pt-4">
          <input type="hidden" name="courseId" value={c.id} />
          <label className="min-w-0 flex-1">
            <span className="mb-1 block font-semibold text-navy-900">Novo módulo</span>
            <input name="title" required minLength={2} placeholder="Ex.: Conhecendo o seu celular" className="block min-h-12 w-full rounded-[var(--radius-control)] border-2 border-line px-3" />
          </label>
          <SubmitButton label="Adicionar módulo" />
        </form>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 text-[1.2rem] font-bold text-navy-900">Informações do curso</h2>
        <ActionForm scope={`curso-${c.id}`} action={saveCourse} submitLabel="Salvar curso">
          <CourseFields
            categories={categories}
            v={{
              id: c.id, title: c.title, slug: c.slug, summary: c.summary, description: c.description, categoryId: c.categoryId,
              status: c.status, publishedAtInput: toBrasiliaInput(c.publishedAt), level: c.level, appName: c.appName ?? "",
              osName: c.osName ?? "", versionRange: c.versionRange ?? "",
              lastReviewedAt: c.lastReviewedAt ? new Date(c.lastReviewedAt).toISOString().slice(0, 10) : "",
              editorialStatus: c.editorialStatus, coverImageUrl: c.coverImageUrl,
            }}
          />
        </ActionForm>
      </Card>

      <form action={deleteCourse} className="rounded-[var(--radius-card)] border border-[#f3c1bc] bg-white p-5">
        <input type="hidden" name="id" value={c.id} />
        <h2 className="font-bold text-danger-700">Excluir curso</h2>
        <p className="mb-3 text-[0.95rem] text-ink-soft">Apaga o curso, seus módulos e todas as aulas dele.</p>
        <ConfirmSubmit label="Excluir curso definitivamente" message="Excluir o curso e TODAS as aulas? Esta ação não pode ser desfeita." />
      </form>
    </div>
  );
}
