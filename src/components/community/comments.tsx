"use client";

import Link from "next/link";
import { useActionState, useRef, useState, useTransition } from "react";
import { BadgeCheck, Flag, MessageSquareReply, Pencil, ShieldAlert, Trash2 } from "lucide-react";
import { Button, cn } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import type { CommentView } from "@/lib/content/queries";
import {
  deleteComment,
  editComment,
  postComment,
  reportComment,
  type CommentFormState,
} from "@/server/actions/interactions";

const SENSITIVE_HINT = /(senha|c[oó]digo|cpf|cart[aã]o|pix|token|\d{6})/i;

type Mode = "member" | "guest" | "free-account" | "disabled";

export function CommentsSection({
  contentId,
  comments,
  mode,
  returnTo,
}: {
  contentId: string;
  comments: CommentView[];
  mode: Mode;
  returnTo: string;
}) {
  const roots = comments.filter((c) => !c.parentId);
  const replies = (id: string) => comments.filter((c) => c.parentId === id);
  const visibleCount = comments.filter((c) => c.status === "published").length;

  return (
    <section aria-labelledby="comentarios" className="space-y-5">
      <h2 id="comentarios" className="text-[1.35rem] font-bold text-navy-900">
        Comentários <span className="text-ink-muted">({visibleCount})</span>
      </h2>

      {mode === "disabled" ? (
        <Alert tone="info">Os comentários estão desativados para este conteúdo.</Alert>
      ) : mode === "guest" ? (
        <Alert tone="info" title="Quer comentar ou tirar uma dúvida?">
          <Link href={`/entrar?voltar=${encodeURIComponent(returnTo)}`} className="font-bold underline underline-offset-4">
            Entre na sua conta
          </Link>{" "}
          para participar.
        </Alert>
      ) : mode === "free-account" ? (
        <Alert tone="info" title="Comentários para assinantes">
          Assinantes podem comentar e tirar dúvidas com o professor.{" "}
          <Link href="/assinatura" className="font-bold underline underline-offset-4">
            Conhecer a assinatura
          </Link>
        </Alert>
      ) : (
        <CommentForm contentId={contentId} />
      )}

      {roots.length === 0 ? (
        <p className="text-ink-muted">Ainda não há comentários.</p>
      ) : (
        <ul className="space-y-4">
          {roots.map((c) => (
            <li key={c.id}>
              <CommentItem comment={c} canReply={mode === "member"} contentId={contentId} />
              {replies(c.id).length > 0 ? (
                <ul className="mt-3 space-y-3 border-l-4 border-navy-100 pl-4 sm:ml-6">
                  {replies(c.id).map((r) => (
                    <li key={r.id}>
                      <CommentItem comment={r} canReply={false} contentId={contentId} />
                    </li>
                  ))}
                </ul>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function CommentForm({ contentId, parentId, onDone }: { contentId: string; parentId?: string; onDone?: () => void }) {
  const [text, setText] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState<CommentFormState, FormData>(async (prev, fd) => {
    const r = await postComment(prev, fd);
    if (r.ok) {
      setText("");
      onDone?.();
    }
    return r;
  }, {});
  const id = parentId ? `resposta-${parentId}` : `novo-comentario-${contentId}`;

  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-[var(--radius-card)] border border-line bg-white p-4">
      <input type="hidden" name="contentId" value={contentId} />
      {parentId ? <input type="hidden" name="parentId" value={parentId} /> : null}
      <label htmlFor={id} className="block font-semibold text-navy-900">
        {parentId ? "Sua resposta" : "Escreva um comentário ou dúvida"}
      </label>
      <textarea
        id={id}
        name="body"
        required
        minLength={2}
        maxLength={2000}
        rows={3}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-describedby={`${id}-aviso`}
        className="block w-full rounded-[var(--radius-control)] border-2 border-line px-4 py-3 focus:border-navy-700 focus:outline-none"
      />
      <p id={`${id}-aviso`} className="flex items-start gap-2 text-[0.9rem] text-ink-muted">
        <ShieldAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        Nunca escreva senhas, códigos recebidos por SMS, CPF ou dados de cartão.
      </p>
      {SENSITIVE_HINT.test(text) ? (
        <Alert tone="warning">
          Seu texto parece conter uma senha, código ou dado pessoal. Revise antes de enviar — comentários são vistos por
          outras pessoas.
        </Alert>
      ) : null}
      {state.error ? <Alert tone="error" live>{state.error}</Alert> : null}
      {state.ok && state.message ? (
        <Alert tone={state.pending ? "warning" : "success"} live>
          {state.message}
        </Alert>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={pending} size="md">
          {parentId ? "Enviar resposta" : "Publicar comentário"}
        </Button>
        {onDone ? (
          <Button type="button" variant="ghost" onClick={onDone}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function CommentItem({ comment, canReply, contentId }: { comment: CommentView; canReply: boolean; contentId: string }) {
  const [editing, setEditing] = useState(false);
  const [replying, setReplying] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [text, setText] = useState(comment.body);
  const [msg, setMsg] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, start] = useTransition();
  const date = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(comment.createdAt),
  );

  return (
    <article
      className={cn(
        "rounded-[var(--radius-card)] border bg-white p-4",
        comment.isOfficial ? "border-navy-900 bg-navy-50" : "border-line",
      )}
    >
      <header className="mb-2 flex flex-wrap items-center gap-2">
        <span className="font-bold text-navy-900">{comment.authorName}</span>
        {comment.isOfficial ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-navy-900 px-2.5 py-0.5 text-[0.8rem] font-semibold text-white">
            <BadgeCheck aria-hidden className="size-4" /> Resposta oficial
          </span>
        ) : null}
        <span className="text-[0.85rem] text-ink-muted">
          {date}
          {comment.editedAt ? " · editado" : ""}
        </span>
        {comment.status === "pending" ? (
          <span className="rounded-full bg-warning-50 px-2.5 py-0.5 text-[0.8rem] font-semibold text-warning-800">
            Aguardando revisão — só você vê
          </span>
        ) : null}
        {comment.status === "hidden" ? (
          <span className="rounded-full bg-danger-50 px-2.5 py-0.5 text-[0.8rem] font-semibold text-danger-700">
            Oculto pela moderação
          </span>
        ) : null}
      </header>

      {editing ? (
        <div className="space-y-2">
          <label htmlFor={`editar-${comment.id}`} className="sr-only">
            Editar comentário
          </label>
          <textarea
            id={`editar-${comment.id}`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
            maxLength={2000}
            className="block w-full rounded-[var(--radius-control)] border-2 border-line px-4 py-3"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              loading={pending}
              onClick={() =>
                start(async () => {
                  const r = await editComment(comment.id, text);
                  setMsg({ tone: r.ok ? "success" : "error", text: r.message ?? "" });
                  if (r.ok) setEditing(false);
                })
              }
            >
              Salvar alteração
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        // Texto puro: nada de HTML nem links clicáveis em comentários.
        <p className="whitespace-pre-line break-words text-ink">{comment.body}</p>
      )}

      {!editing ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {canReply ? (
            <ActionLink onClick={() => setReplying((r) => !r)} icon={<MessageSquareReply aria-hidden className="size-4" />}>
              Responder
            </ActionLink>
          ) : null}
          {comment.isMine ? (
            <>
              <ActionLink onClick={() => setEditing(true)} icon={<Pencil aria-hidden className="size-4" />}>
                Editar
              </ActionLink>
              <ActionLink
                onClick={() => {
                  if (!window.confirm("Excluir este comentário? Esta ação não pode ser desfeita.")) return;
                  start(async () => {
                    const r = await deleteComment(comment.id);
                    setMsg({ tone: r.ok ? "success" : "error", text: r.message ?? "" });
                  });
                }}
                icon={<Trash2 aria-hidden className="size-4" />}
              >
                Excluir
              </ActionLink>
            </>
          ) : (
            <ActionLink onClick={() => setReporting((r) => !r)} icon={<Flag aria-hidden className="size-4" />}>
              Denunciar
            </ActionLink>
          )}
        </div>
      ) : null}

      {reporting ? (
        <form
          className="mt-3 space-y-2 rounded-[var(--radius-control)] border border-line p-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              const r = await reportComment({ commentId: comment.id, reason: String(fd.get("reason") ?? "") });
              setMsg({ tone: r.ok ? "success" : "error", text: r.message ?? "" });
              if (r.ok) setReporting(false);
            });
          }}
        >
          <label htmlFor={`motivo-${comment.id}`} className="block font-semibold text-navy-900">
            Por que você está denunciando?
          </label>
          <select id={`motivo-${comment.id}`} name="reason" required className="block min-h-12 w-full rounded-[var(--radius-control)] border-2 border-line px-3">
            <option value="">Escolha um motivo</option>
            <option value="golpe">Parece golpe</option>
            <option value="dados_pessoais">Expõe dados pessoais</option>
            <option value="ofensivo">Ofensivo ou desrespeitoso</option>
            <option value="spam">Propaganda ou spam</option>
            <option value="outro">Outro motivo</option>
          </select>
          <div className="flex gap-2">
            <Button type="submit" size="sm" variant="secondary" loading={pending}>
              Enviar denúncia
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setReporting(false)}>
              Cancelar
            </Button>
          </div>
        </form>
      ) : null}

      {msg?.text ? (
        <p role="status" className={cn("mt-2 text-[0.95rem] font-semibold", msg.tone === "error" ? "text-danger-700" : "text-success-700")}>
          {msg.text}
        </p>
      ) : null}

      {replying ? (
        <div className="mt-3">
          <CommentForm contentId={contentId} parentId={comment.id} onDone={() => setReplying(false)} />
        </div>
      ) : null}
    </article>
  );
}

function ActionLink({ onClick, icon, children }: { onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[0.95rem] font-semibold text-navy-700 hover:bg-navy-100"
    >
      {icon}
      {children}
    </button>
  );
}
