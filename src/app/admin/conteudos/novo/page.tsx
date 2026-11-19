import type { Metadata } from "next";
import { ContentForm } from "@/components/admin/content-form";
import { PageHeader } from "@/components/ui/primitives";
import { editorOptions, emptyContent } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/viewer";
import { contentTypeLabel, type ContentType } from "@/lib/content/types";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Novo conteúdo" };

type Props = { searchParams: Promise<{ tipo?: string; curso?: string; modulo?: string }> };

export default async function NovoConteudo({ searchParams }: Props) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const type = (["video", "short", "article", "guide"].includes(sp.tipo ?? "") ? sp.tipo : "guide") as ContentType;
  const uuid = /^[0-9a-f-]{36}$/;
  const opts = await editorOptions(admin.id);
  const data = emptyContent(type, {
    courseId: sp.curso && uuid.test(sp.curso) ? sp.curso : null,
    moduleId: sp.modulo && uuid.test(sp.modulo) ? sp.modulo : null,
  });
  return (
    <div className="space-y-4">
      <PageHeader title={`Novo: ${contentTypeLabel[type]}`} back={{ href: "/admin/conteudos", label: "Conteúdos" }} />
      <ContentForm data={data} categories={opts.categories} courses={opts.courses} />
    </div>
  );
}
