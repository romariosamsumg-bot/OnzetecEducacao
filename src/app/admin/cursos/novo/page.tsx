import type { Metadata } from "next";
import { CourseFields } from "@/components/admin/course-fields";
import { ActionForm } from "@/components/admin/forms";
import { Card, PageHeader } from "@/components/ui/primitives";
import { editorOptions } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth/viewer";
import { saveCourse } from "@/server/actions/admin/catalog";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Novo curso" };

export default async function NovoCurso() {
  const admin = await requireAdmin();
  const { categories } = await editorOptions(admin.id);
  return (
    <div className="space-y-4">
      <PageHeader title="Novo curso" back={{ href: "/admin/cursos", label: "Cursos" }} description="Depois de salvar, você poderá adicionar módulos e aulas." />
      <Card className="p-5">
        <ActionForm action={saveCourse} submitLabel="Salvar curso">
          <CourseFields
            categories={categories}
            v={{ id: null, title: "", slug: "", summary: "", description: "", categoryId: null, status: "draft", publishedAtInput: "", level: "iniciante", appName: "", osName: "Android", versionRange: "", lastReviewedAt: new Date().toISOString().slice(0, 10), editorialStatus: "current", coverImageUrl: null }}
          />
        </ActionForm>
      </Card>
    </div>
  );
}
