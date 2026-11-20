import type { Metadata } from "next";
import { BookFields } from "@/components/admin/book-fields";
import { ActionForm } from "@/components/admin/forms";
import { Card, PageHeader } from "@/components/ui/primitives";
import { requireAdmin } from "@/lib/auth/viewer";
import { saveBook } from "@/server/actions/admin/catalog";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Novo livro" };

export default async function NovoLivro() {
  await requireAdmin();
  return (
    <div className="space-y-4">
      <PageHeader title="Novo livro" back={{ href: "/admin/livros", label: "Livros" }} />
      <Card className="p-5">
        <ActionForm scope="livro-novo" action={saveBook} submitLabel="Salvar livro">
          <BookFields v={{ id: null, title: "", slug: "", author: "Onzetec Educação", synopsis: "", toc: [], format: "pdf", pages: null, price: "", status: "draft", publishedAtInput: "", includedInSubscription: false, coverImageUrl: null, sampleUrl: "", hasFile: false, storagePath: "" }} />
        </ActionForm>
      </Card>
    </div>
  );
}
