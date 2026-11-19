import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { asUser } from "@/lib/db";

/** LGPD — acesso aos dados: a pessoa baixa os próprios dados em JSON. */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await asUser(session.userId, async (db) => ({
    exportado_em: new Date().toISOString(),
    conta: { email: session.email },
    perfil: (await db`select display_name, text_scale, reduce_motion, learning_interest, created_at from public.profiles where id = auth.uid()`)[0],
    assinaturas: await db`select s.status, p.name as plano, s.price_cents, s.current_period_start, s.current_period_end, s.canceled_at, s.created_at
      from public.subscriptions s join public.plans p on p.id = s.plan_id where s.user_id = auth.uid()`,
    pedidos: await db`select status, total_cents, currency, created_at, paid_at from public.orders where user_id = auth.uid()`,
    livros: await db`select b.title, e.source, e.granted_at from public.book_entitlements e join public.books b on b.id = e.book_id where e.user_id = auth.uid()`,
    comentarios: await db`select c.body, c.status, c.created_at, ci.title as conteudo from public.comments c join public.content_items ci on ci.id = c.content_id where c.user_id = auth.uid()`,
    curtidas: await db`select ci.title, l.created_at from public.likes l join public.content_items ci on ci.id = l.content_id where l.user_id = auth.uid()`,
    salvos: await db`select ci.title, s.created_at from public.saves s join public.content_items ci on ci.id = s.content_id where s.user_id = auth.uid()`,
    progresso: await db`select ci.title, p.position_seconds, p.completed_at, p.updated_at from public.progress p join public.content_items ci on ci.id = p.content_id where p.user_id = auth.uid()`,
  }));
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": 'attachment; filename="meus-dados-onzetec.json"',
      "Cache-Control": "no-store",
    },
  });
}
