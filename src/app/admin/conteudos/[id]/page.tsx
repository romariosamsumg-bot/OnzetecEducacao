import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { ContentForm } from "@/components/admin/content-form";
import { ConfirmSubmit } from "@/components/admin/forms";
import { ButtonLink } from "@/components/ui/button";
import { Alert, Badge, PageHeader } from "@/components/ui/primitives";
import { editorOptions, loadContentForEdit } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/viewer";
import { contentTypeLabel } from "@/lib/content/types";
import { deleteContent } from "@/server/actions/admin/content";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Editar conteúdo" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> };

export default async function EditarConteudo({ params, searchParams }: Props) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const [data, opts, sp] = await Promise.all([loadContentForEdit(admin.id, id), editorOptions(admin.id), searchParams]);
  if (!data) notFound();
  return (
    <div className="space-y-4">
      <PageHeader
        back={{ href: "/admin/conteudos", label: "Conteúdos" }}
        eyebrow={<><Badge>{contentTypeLabel[data.type]}</Badge>{data.isDemo ? <Badge tone="demo">Demonstração</Badge> : null}</>}
        title={data.title}
        actions={
          <ButtonLink href={data.publicPath} variant="outline" size="sm" target="_blank" icon={<ExternalLink aria-hidden className="size-4" />}>
            {data.status === "published" ? "Ver na plataforma" : "Pré-visualizar"}
          </ButtonLink>
        }
      />
      {sp.salvo ? <Alert tone="success" live>Alterações salvas.</Alert> : null}
      <ContentForm data={data} categories={opts.categories} courses={opts.courses} />
      <form action={deleteContent} className="rounded-[var(--radius-card)] border border-[#f3c1bc] bg-white p-5">
        <input type="hidden" name="id" value={data.id!} />
        <h2 className="font-bold text-danger-700">Remover conteúdo</h2>
        <p className="mb-3 text-[0.95rem] text-ink-soft">Remove o conteúdo, comentários, curtidas e progresso ligados a ele. Prefira “Arquivado” se quiser apenas ocultar.</p>
        <ConfirmSubmit label="Remover definitivamente" message="Remover este conteúdo? Esta ação não pode ser desfeita." />
      </form>
    </div>
  );
}
