"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { audit } from "@/lib/admin/audit";
import { requireAdmin } from "@/lib/auth/viewer";
import { asUser } from "@/lib/db";

const uuid = z.string().uuid();

export async function moderateComment(fd: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(fd.get("id"));
  const status = z.enum(["published", "hidden", "removed"]).parse(fd.get("status"));
  const reason = z.string().trim().max(200).optional().parse(fd.get("reason") || undefined);
  await asUser(admin.id, async (db) => {
    await db`update public.comments set status = ${status}, moderation_reason = coalesce(${reason ?? null}, moderation_reason) where id = ${id}`;
    if (status !== "published") {
      await db`update public.comment_reports set status = 'resolved', resolved_by = auth.uid(), resolved_at = now()
        where comment_id = ${id} and status = 'open'`;
    }
    await audit(db, "comment.moderate", "comment", id, { status });
  });
  refresh();
}

export async function dismissReports(fd: FormData) {
  const admin = await requireAdmin();
  const id = uuid.parse(fd.get("commentId"));
  await asUser(admin.id, async (db) => {
    await db`update public.comment_reports set status = 'dismissed', resolved_by = auth.uid(), resolved_at = now()
      where comment_id = ${id} and status = 'open'`;
    await audit(db, "report.dismiss", "comment", id);
  });
  refresh();
}

/** Resposta oficial do professor (identificada automaticamente pelo gatilho do banco). */
export async function replyAsTeacher(fd: FormData) {
  const admin = await requireAdmin();
  const parentId = uuid.parse(fd.get("parentId"));
  const body = z.string().trim().min(2).max(2000).parse(fd.get("body"));
  await asUser(admin.id, async (db) => {
    const [parent] = await db<{ contentId: string; parentId: string | null }[]>`select content_id, parent_id from public.comments where id = ${parentId}`;
    const root = parent.parentId ?? parentId;
    await db`insert into public.comments (content_id, user_id, parent_id, body) values (${parent.contentId}, auth.uid(), ${root}, ${body})`;
    // Responder implica aprovar a pergunta original, se estava pendente
    await db`update public.comments set status = 'published' where id = ${parentId} and status = 'pending'`;
    await audit(db, "comment.reply", "comment", parentId);
  });
  refresh();
}
