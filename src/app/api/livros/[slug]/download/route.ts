import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/session";
import { asUser } from "@/lib/db";
import { signedPrivateUrl } from "@/lib/storage";

/**
 * Download de livro digital: o banco (RLS + can_access_book_file) decide se a pessoa
 * pode ler o caminho do arquivo. Só então geramos um link temporário (5 minutos).
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const session = await getSession();
  const { slug } = await params;
  if (!session) return NextResponse.redirect(new URL(`/entrar?voltar=/livraria/${encodeURIComponent(slug)}`, req.url));

  const [file] = await asUser(session.userId, (db) => db<{ storagePath: string; title: string; format: string }[]>`
    select f.storage_path, b.title, b.format
    from public.book_files f join public.books b on b.id = f.book_id
    where b.slug = ${slug}`);
  if (!file) return new NextResponse("Você ainda não tem acesso a este livro.", { status: 403 });

  const url = await signedPrivateUrl(file.storagePath, 300, `${slug}.${file.format}`);
  return NextResponse.redirect(new URL(url, req.url), { headers: { "Cache-Control": "no-store" } });
}
