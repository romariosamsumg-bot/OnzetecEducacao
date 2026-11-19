import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BookFields } from "@/components/admin/book-fields";
import { ActionForm } from "@/components/admin/forms";
import { Alert, Card, PageHeader } from "@/components/ui/primitives";
import { centsToInput, toBrasiliaInput } from "@/lib/admin/util";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";
import { saveBook } from "@/server/actions/admin/catalog";

/** Painel privado: sempre renderizado na requisição (sem pré-render instantâneo). */
export const instant = false;

export const metadata: Metadata = { title: "Editar livro" };

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ salvo?: string }> };

export default async function EditarLivro({ params, searchParams }: Props) {
  const admin = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const sp = await searchParams;
  const [b] = await asUser(admin.id, (db) => db<Record<string, never>[]>`
    select b.*, exists (select 1 from public.book_files f where f.book_id = b.id) as has_file from public.books b where b.id = ${id}`);
  if (!b) notFound();
  const r = b as unknown as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  return (
    <div className="space-y-4">
      <PageHeader title={r.title} back={{ href: "/admin/livros", label: "Livros" }} />
      {sp.salvo ? <Alert tone="success" live>Livro salvo.</Alert> : null}
      <Card className="p-5">
        <ActionForm scope={`livro-${r.id}`} action={saveBook} submitLabel="Salvar livro">
          <BookFields v={{
            id: r.id, title: r.title, slug: r.slug, author: r.author, synopsis: r.synopsis, toc: r.tableOfContents ?? [], format: r.format,
            pages: r.pages, price: centsToInput(r.priceCents), status: r.status, publishedAtInput: toBrasiliaInput(r.publishedAt),
            includedInSubscription: r.includedInSubscription, coverImageUrl: r.coverImageUrl, sampleUrl: r.sampleUrl ?? "", hasFile: r.hasFile,
          }} />
        </ActionForm>
      </Card>
    </div>
  );
}
