"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Bookmark, BookmarkCheck, Check, CheckCircle2, Heart, Share2, ThumbsDown, ThumbsUp } from "lucide-react";
import { cn } from "@/components/ui/button";
import { markCompleted, sendGuideFeedback, toggleLike, toggleSave } from "@/server/actions/interactions";

const pill =
  "inline-flex min-h-12 items-center gap-2 rounded-full border-2 px-4 font-semibold transition-colors disabled:opacity-60";

/** Curtir, salvar e compartilhar — sempre com texto, nunca só ícone. */
export function InteractionBar({
  contentId,
  title,
  path,
  initialLiked,
  initialSaved,
  initialLikes,
  signedIn,
}: {
  contentId: string;
  title: string;
  path: string;
  initialLiked: boolean;
  initialSaved: boolean;
  initialLikes: number;
  signedIn: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [likes, setLikes] = useState(initialLikes);
  const [saved, setSaved] = useState(initialSaved);
  const [status, setStatus] = useState("");
  const [pending, start] = useTransition();

  if (!signedIn) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <ShareButton title={title} path={path} onStatus={setStatus} />
        <Link href={`/entrar?voltar=${encodeURIComponent(path)}`} className={cn(pill, "border-line text-navy-900 hover:bg-navy-50")}>
          <Bookmark aria-hidden className="size-5" /> Entrar para salvar
        </Link>
        <p role="status" className="sr-only">{status}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        aria-pressed={liked}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const prev = { liked, likes };
            setLiked(!liked);
            setLikes(likes + (liked ? -1 : 1));
            const r = await toggleLike(contentId);
            if (r.ok && r.data) {
              setLiked(r.data.liked);
              setLikes(r.data.count);
              setStatus(r.data.liked ? "Você curtiu este conteúdo." : "Curtida removida.");
            } else {
              setLiked(prev.liked);
              setLikes(prev.likes);
              setStatus(r.ok ? "" : r.message);
            }
          })
        }
        className={cn(pill, liked ? "border-orange-500 bg-orange-50 text-orange-700" : "border-line text-navy-900 hover:bg-navy-50")}
      >
        <Heart aria-hidden className={cn("size-5", liked && "fill-current")} />
        {liked ? "Curtido" : "Curtir"}
        <span className="text-ink-muted">
          · {likes} <span className="sr-only">curtidas</span>
        </span>
      </button>

      <button
        type="button"
        aria-pressed={saved}
        disabled={pending}
        onClick={() =>
          start(async () => {
            setSaved(!saved);
            const r = await toggleSave(contentId);
            if (r.ok && r.data) {
              setSaved(r.data.saved);
              setStatus(r.data.saved ? "Salvo em Meus salvos." : "Removido de Meus salvos.");
            } else {
              setSaved(saved);
              setStatus(r.ok ? "" : r.message);
            }
          })
        }
        className={cn(pill, saved ? "border-navy-900 bg-navy-900 text-white" : "border-line text-navy-900 hover:bg-navy-50")}
      >
        {saved ? <BookmarkCheck aria-hidden className="size-5" /> : <Bookmark aria-hidden className="size-5" />}
        {saved ? "Salvo" : "Salvar"}
      </button>

      <ShareButton title={title} path={path} onStatus={setStatus} />
      <p role="status" aria-live="polite" className="w-full text-[0.95rem] font-semibold text-success-700 empty:hidden">
        {status}
      </p>
    </div>
  );
}

function ShareButton({ title, path, onStatus }: { title: string; path: string; onStatus: (s: string) => void }) {
  return (
    <button
      type="button"
      onClick={async () => {
        const url = new URL(path, window.location.origin).toString();
        if (navigator.share) {
          try {
            await navigator.share({ title, url });
            return;
          } catch {
            /* cancelado */
          }
        }
        try {
          await navigator.clipboard.writeText(url);
          onStatus("Link copiado. Agora é só colar no WhatsApp.");
        } catch {
          window.open(`https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`, "_blank", "noopener");
        }
      }}
      className={cn(pill, "border-line text-navy-900 hover:bg-navy-50")}
    >
      <Share2 aria-hidden className="size-5" /> Compartilhar
    </button>
  );
}

export function CompleteButton({ contentId, initialCompleted }: { contentId: string; initialCompleted: boolean }) {
  const [done, setDone] = useState(initialCompleted);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-pressed={done}
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await markCompleted(contentId, !done);
            if (r.ok) {
              setDone(!done);
              setMsg(!done ? "Marcado como concluído. Parabéns!" : "Conclusão desfeita.");
            } else setMsg(r.message);
          })
        }
        className={cn(
          pill,
          done ? "border-success-700 bg-success-50 text-success-700" : "border-navy-900 bg-white text-navy-900 hover:bg-navy-50",
        )}
      >
        {done ? <CheckCircle2 aria-hidden className="size-5" /> : <Check aria-hidden className="size-5" />}
        {done ? "Concluído" : "Marcar como concluído"}
      </button>
      <p role="status" aria-live="polite" className="text-[0.95rem] text-ink-soft empty:hidden">
        {msg}
      </p>
    </div>
  );
}

export function GuideFeedback({
  contentId,
  initial,
  signedIn,
}: {
  contentId: string;
  initial: boolean | null;
  signedIn: boolean;
}) {
  const [value, setValue] = useState<boolean | null>(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState("");
  const send = (helpful: boolean) =>
    start(async () => {
      if (!signedIn) {
        setMsg("Entre na sua conta para responder.");
        return;
      }
      const r = await sendGuideFeedback(contentId, helpful);
      if (r.ok) {
        setValue(helpful);
        setMsg(helpful ? "Que bom! Obrigado por avisar." : "Obrigado. Veja abaixo o que fazer se não funcionou.");
      } else setMsg(r.message);
    });
  return (
    <section aria-labelledby="funcionou" className="rounded-[var(--radius-card)] border border-line bg-white p-5">
      <h2 id="funcionou" className="mb-3 text-[1.2rem] font-bold text-navy-900">
        Esta solução funcionou?
      </h2>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          aria-pressed={value === true}
          disabled={pending}
          onClick={() => send(true)}
          className={cn(pill, value === true ? "border-success-700 bg-success-50 text-success-700" : "border-line text-navy-900 hover:bg-navy-50")}
        >
          <ThumbsUp aria-hidden className="size-5" /> Sim, funcionou
        </button>
        <button
          type="button"
          aria-pressed={value === false}
          disabled={pending}
          onClick={() => send(false)}
          className={cn(pill, value === false ? "border-navy-900 bg-navy-50 text-navy-900" : "border-line text-navy-900 hover:bg-navy-50")}
        >
          <ThumbsDown aria-hidden className="size-5" /> Não funcionou
        </button>
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-[0.95rem] text-ink-soft empty:hidden">
        {msg}
      </p>
    </section>
  );
}
