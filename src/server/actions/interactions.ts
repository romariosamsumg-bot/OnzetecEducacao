"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { asUser, pgCode } from "@/lib/db";
import { getSession } from "@/lib/auth/session";

/**
 * Ações dos alunos. Cada ação relê a sessão no servidor e executa como a
 * própria pessoa: o RLS impede agir sobre conteúdo invisível ou de terceiros.
 */

export type ActionResult<T = undefined> =
  | { ok: true; data?: T; message?: string }
  | { ok: false; error: "auth" | "forbidden" | "invalid" | "rate_limited" | "unknown"; message: string };

const uuid = z.string().uuid();

async function requireUserId(): Promise<string | null> {
  const s = await getSession();
  return s?.userId ?? null;
}

function failure(err: unknown): ActionResult<never> {
  const code = pgCode(err);
  if (code === "42501") return { ok: false, error: "forbidden", message: "Você não tem permissão para fazer isso." };
  if (code === "OZ429")
    return { ok: false, error: "rate_limited", message: "Você enviou muitas mensagens seguidas. Aguarde alguns minutos." };
  console.error("[interactions]", code ?? "", err instanceof Error ? err.message : "erro");
  return { ok: false, error: "unknown", message: "Não foi possível concluir agora. Tente novamente." };
}

const needLogin: ActionResult<never> = { ok: false, error: "auth", message: "Entre na sua conta para continuar." };

export async function toggleLike(contentId: string): Promise<ActionResult<{ liked: boolean; count: number }>> {
  const userId = await requireUserId();
  if (!userId) return needLogin;
  if (!uuid.safeParse(contentId).success) return { ok: false, error: "invalid", message: "Conteúdo inválido." };
  try {
    return await asUser(userId, async (db) => {
      const removed = await db`delete from public.likes where user_id = auth.uid() and content_id = ${contentId} returning 1`;
      if (removed.length === 0) {
        await db`insert into public.likes (user_id, content_id) values (auth.uid(), ${contentId})`;
      }
      const [row] = await db<{ likesCount: number }[]>`select likes_count from public.content_items where id = ${contentId}`;
      return { ok: true as const, data: { liked: removed.length === 0, count: row?.likesCount ?? 0 } };
    });
  } catch (err) {
    return failure(err);
  }
}

export async function toggleSave(contentId: string): Promise<ActionResult<{ saved: boolean }>> {
  const userId = await requireUserId();
  if (!userId) return needLogin;
  if (!uuid.safeParse(contentId).success) return { ok: false, error: "invalid", message: "Conteúdo inválido." };
  try {
    return await asUser(userId, async (db) => {
      const removed = await db`delete from public.saves where user_id = auth.uid() and content_id = ${contentId} returning 1`;
      if (removed.length === 0) {
        await db`insert into public.saves (user_id, content_id) values (auth.uid(), ${contentId})`;
      }
      return { ok: true as const, data: { saved: removed.length === 0 } };
    });
  } catch (err) {
    return failure(err);
  }
}

const progressSchema = z.object({
  contentId: uuid,
  position: z.number().int().min(0).max(60 * 60 * 12),
  duration: z.number().int().min(0).max(60 * 60 * 12).nullable(),
});

/** Conclusão automática ao atingir 90% do vídeo efetivamente alcançado (não ao abrir). */
const COMPLETE_RATIO = 0.9;

export async function saveProgress(input: {
  contentId: string;
  position: number;
  duration: number | null;
}): Promise<ActionResult<{ completed: boolean }>> {
  const userId = await requireUserId();
  if (!userId) return needLogin;
  const parsed = progressSchema.safeParse({
    ...input,
    position: Math.floor(input.position),
    duration: input.duration ? Math.floor(input.duration) : null,
  });
  if (!parsed.success) return { ok: false, error: "invalid", message: "Dados de progresso inválidos." };
  const { contentId, position, duration } = parsed.data;
  try {
    return await asUser(userId, async (db) => {
      const [row] = await db<{ maxPositionSeconds: number; completedAt: Date | null }[]>`
        insert into public.progress (user_id, content_id, position_seconds, max_position_seconds, duration_seconds)
        values (auth.uid(), ${contentId}, ${position}, ${position}, ${duration})
        on conflict (user_id, content_id) do update
          set position_seconds = excluded.position_seconds,
              max_position_seconds = greatest(public.progress.max_position_seconds, excluded.position_seconds),
              duration_seconds = coalesce(excluded.duration_seconds, public.progress.duration_seconds)
        returning max_position_seconds, completed_at`;
      let completed = Boolean(row?.completedAt);
      if (!completed && duration && row && row.maxPositionSeconds >= duration * COMPLETE_RATIO) {
        await db`update public.progress set completed_at = now() where user_id = auth.uid() and content_id = ${contentId}`;
        completed = true;
      }
      return { ok: true as const, data: { completed } };
    });
  } catch (err) {
    return failure(err);
  }
}

/** "Marcar como concluída" — ação explícita da pessoa (artigos, guias ou aulas). */
export async function markCompleted(contentId: string, completed: boolean): Promise<ActionResult<{ completed: boolean }>> {
  const userId = await requireUserId();
  if (!userId) return needLogin;
  if (!uuid.safeParse(contentId).success) return { ok: false, error: "invalid", message: "Conteúdo inválido." };
  try {
    await asUser(userId, async (db) => {
      if (completed) {
        await db`insert into public.progress (user_id, content_id, completed_at)
          values (auth.uid(), ${contentId}, now())
          on conflict (user_id, content_id) do update set completed_at = coalesce(public.progress.completed_at, now())`;
      } else {
        // Desfazer explicitamente (o gatilho só impede desfazer por gravação de posição)
        await db`delete from public.progress where user_id = auth.uid() and content_id = ${contentId}`;
      }
    });
    refresh();
    return { ok: true, data: { completed } };
  } catch (err) {
    return failure(err);
  }
}

export async function sendGuideFeedback(contentId: string, helpful: boolean): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return needLogin;
  if (!uuid.safeParse(contentId).success) return { ok: false, error: "invalid", message: "Conteúdo inválido." };
  try {
    await asUser(userId, (db) => db`
      insert into public.guide_feedback (user_id, content_id, helpful) values (auth.uid(), ${contentId}, ${helpful})
      on conflict (user_id, content_id) do update set helpful = excluded.helpful, created_at = now()`);
    return { ok: true };
  } catch (err) {
    return failure(err);
  }
}

/* ---------------------------- Comentários ---------------------------- */

const commentSchema = z.object({
  contentId: uuid,
  parentId: uuid.nullable(),
  body: z
    .string()
    .trim()
    .min(2, "Escreva pelo menos 2 caracteres.")
    .max(2000, "O comentário pode ter no máximo 2.000 caracteres."),
});

export type CommentFormState = { ok?: boolean; message?: string; error?: string; pending?: boolean; nonce?: number };

export async function postComment(_prev: CommentFormState, formData: FormData): Promise<CommentFormState> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Entre na sua conta para comentar." };
  const parsed = commentSchema.safeParse({
    contentId: formData.get("contentId"),
    parentId: formData.get("parentId") || null,
    body: formData.get("body"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Comentário inválido." };
  try {
    const [row] = await asUser(userId, (db) => db<{ status: string }[]>`
      insert into public.comments (content_id, user_id, parent_id, body)
      values (${parsed.data.contentId}, auth.uid(), ${parsed.data.parentId}, ${parsed.data.body})
      returning status`);
    refresh();
    if (row?.status === "pending") {
      return {
        ok: true,
        pending: true,
        nonce: Date.now(),
        message:
          "Seu comentário foi recebido e será revisado antes de aparecer, porque contém um link ou números que parecem dados pessoais.",
      };
    }
    return { ok: true, nonce: Date.now(), message: "Comentário publicado." };
  } catch (err) {
    const f = failure(err);
    if (f.ok) return { ok: true };
    if (f.error === "forbidden") return { ok: false, error: "Os comentários estão disponíveis para assinantes." };
    return { ok: false, error: f.message };
  }
}

export async function editComment(commentId: string, body: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return needLogin;
  const parsed = z.object({ id: uuid, body: commentSchema.shape.body }).safeParse({ id: commentId, body });
  if (!parsed.success) return { ok: false, error: "invalid", message: parsed.error.issues[0]?.message ?? "Texto inválido." };
  try {
    const rows = await asUser(userId, (db) => db`
      update public.comments set body = ${parsed.data.body} where id = ${parsed.data.id} and user_id = auth.uid() returning id`);
    if (rows.length === 0) return { ok: false, error: "forbidden", message: "Você só pode editar os seus comentários." };
    refresh();
    return { ok: true, message: "Comentário atualizado." };
  } catch (err) {
    return failure(err);
  }
}

export async function deleteComment(commentId: string): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return needLogin;
  if (!uuid.safeParse(commentId).success) return { ok: false, error: "invalid", message: "Comentário inválido." };
  try {
    const rows = await asUser(userId, (db) => db`
      update public.comments set deleted_at = now() where id = ${commentId} and user_id = auth.uid() returning id`);
    if (rows.length === 0) return { ok: false, error: "forbidden", message: "Você só pode excluir os seus comentários." };
    refresh();
    return { ok: true, message: "Comentário excluído." };
  } catch (err) {
    return failure(err);
  }
}

const reportSchema = z.object({
  commentId: uuid,
  reason: z.enum(["golpe", "ofensivo", "spam", "dados_pessoais", "outro"]),
  details: z.string().trim().max(500).optional(),
});

export async function reportComment(input: { commentId: string; reason: string; details?: string }): Promise<ActionResult> {
  const userId = await requireUserId();
  if (!userId) return needLogin;
  const parsed = reportSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "invalid", message: "Escolha um motivo para a denúncia." };
  try {
    await asUser(userId, (db) => db`
      insert into public.comment_reports (comment_id, reporter_id, reason, details)
      values (${parsed.data.commentId}, auth.uid(), ${parsed.data.reason}, ${parsed.data.details ?? null})
      on conflict (comment_id, reporter_id) do nothing`);
    return { ok: true, message: "Obrigado. A moderação vai analisar este comentário." };
  } catch (err) {
    return failure(err);
  }
}
