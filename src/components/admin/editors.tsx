"use client";

import Image from "next/image";
import { useId, useRef, useState, useTransition } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2, Upload } from "lucide-react";
import { Button, cn } from "@/components/ui/button";
import { Alert } from "@/components/ui/primitives";
import { createVideoUpload, uploadImage } from "@/server/actions/admin/content";
import type { ArticleBlock, GuideStep } from "@/lib/content/types";

/* ----------------------------- Imagem ----------------------------- */

export function ImageUploader({
  value,
  onChange,
  folder,
  label = "Imagem",
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: "covers" | "steps" | "articles" | "books";
  label?: string;
}) {
  const inputId = useId();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="space-y-2">
      <span className="block font-semibold text-navy-900">{label}</span>
      {value ? (
        <div className="relative h-40 w-full max-w-xs overflow-hidden rounded-[var(--radius-control)] border border-line bg-navy-50">
          <Image src={value} alt="" fill sizes="320px" className="object-contain" unoptimized={value.startsWith("/api/")} />
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border-2 border-navy-900 px-4 font-semibold text-navy-900 hover:bg-navy-50"
        >
          <ImagePlus aria-hidden className="size-5" /> {pending ? "Enviando…" : value ? "Trocar imagem" : "Enviar imagem"}
        </label>
        <input
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setError(null);
            start(async () => {
              const fd = new FormData();
              fd.set("file", file);
              fd.set("folder", folder);
              const r = await uploadImage(fd);
              if (r.ok) onChange(r.url);
              else setError(r.message);
            });
            e.target.value = "";
          }}
        />
        {value ? (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remover imagem
          </Button>
        ) : null}
      </div>
      <p className="text-[0.85rem] text-ink-muted">PNG, JPG ou WebP, até 4 MB.</p>
      {error ? <p role="alert" className="font-semibold text-danger-700">{error}</p> : null}
    </div>
  );
}

/* ------------------------- Etapas do guia ------------------------- */

export function StepsEditor({ initial }: { initial: GuideStep[] }) {
  const [steps, setSteps] = useState<GuideStep[]>(initial.length ? initial : [{ text: "", image_url: null, image_alt: null }]);
  const update = (i: number, patch: Partial<GuideStep>) => setSteps((s) => s.map((st, j) => (j === i ? { ...st, ...patch } : st)));
  const move = (i: number, d: -1 | 1) =>
    setSteps((s) => {
      const n = [...s];
      const [x] = n.splice(i, 1);
      n.splice(i + d, 0, x);
      return n;
    });
  const clean = steps.filter((s) => s.text.trim());

  return (
    <fieldset className="space-y-4">
      <legend className="text-[1.15rem] font-bold text-navy-900">Etapas numeradas</legend>
      <input type="hidden" name="stepsJson" value={JSON.stringify(clean)} />
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="space-y-3 rounded-[var(--radius-card)] border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex size-9 items-center justify-center rounded-full bg-navy-900 font-bold text-white">{i + 1}</span>
              <div className="flex gap-1">
                <IconBtn label={`Subir etapa ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-5" /></IconBtn>
                <IconBtn label={`Descer etapa ${i + 1}`} disabled={i === steps.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-5" /></IconBtn>
                <IconBtn label={`Remover etapa ${i + 1}`} onClick={() => setSteps((st) => st.filter((_, j) => j !== i))}><Trash2 className="size-5" /></IconBtn>
              </div>
            </div>
            <label className="block">
              <span className="mb-1 block font-semibold text-navy-900">Texto da etapa {i + 1}</span>
              <textarea
                value={s.text}
                onChange={(e) => update(i, { text: e.target.value })}
                rows={3}
                maxLength={1500}
                className="block w-full rounded-[var(--radius-control)] border-2 border-line px-3 py-2"
                placeholder="Ex.: Abra as Configurações do celular (ícone de engrenagem)."
              />
            </label>
            <ImageUploader folder="steps" label="Captura de tela (opcional)" value={s.image_url} onChange={(url) => update(i, { image_url: url })} />
            {s.image_url ? (
              <label className="block">
                <span className="mb-1 block font-semibold text-navy-900">Descrição da imagem (para leitores de tela)</span>
                <input
                  value={s.image_alt ?? ""}
                  onChange={(e) => update(i, { image_alt: e.target.value })}
                  maxLength={300}
                  className="block min-h-12 w-full rounded-[var(--radius-control)] border-2 border-line px-3"
                  placeholder="Ex.: Tela de Configurações com a opção Notificações destacada"
                />
              </label>
            ) : null}
          </li>
        ))}
      </ol>
      <Button type="button" variant="outline" icon={<Plus aria-hidden className="size-5" />} onClick={() => setSteps((s) => [...s, { text: "", image_url: null, image_alt: null }])}>
        Adicionar etapa
      </Button>
    </fieldset>
  );
}

/* ------------------------- Blocos do artigo ------------------------- */

const blockLabels: Record<ArticleBlock["type"], string> = {
  paragraph: "Parágrafo",
  heading: "Subtítulo",
  tip: "Dica (destaque verde)",
  warning: "Atenção (destaque amarelo)",
  image: "Imagem",
};

export function BlocksEditor({ initial }: { initial: ArticleBlock[] }) {
  const [blocks, setBlocks] = useState<ArticleBlock[]>(initial.length ? initial : [{ type: "paragraph", text: "" }]);
  const update = (i: number, b: ArticleBlock) => setBlocks((s) => s.map((x, j) => (j === i ? b : x)));
  const move = (i: number, d: -1 | 1) =>
    setBlocks((s) => {
      const n = [...s];
      const [x] = n.splice(i, 1);
      n.splice(i + d, 0, x);
      return n;
    });
  const clean = blocks.filter((b) => (b.type === "image" ? !!b.url : b.text.trim()));
  return (
    <fieldset className="space-y-4">
      <legend className="text-[1.15rem] font-bold text-navy-900">Texto do artigo</legend>
      <input type="hidden" name="blocksJson" value={JSON.stringify(clean)} />
      <ol className="space-y-3">
        {blocks.map((b, i) => (
          <li key={i} className="space-y-2 rounded-[var(--radius-card)] border border-line bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-navy-700">{blockLabels[b.type]}</span>
              <div className="flex gap-1">
                <IconBtn label="Subir bloco" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp className="size-5" /></IconBtn>
                <IconBtn label="Descer bloco" disabled={i === blocks.length - 1} onClick={() => move(i, 1)}><ArrowDown className="size-5" /></IconBtn>
                <IconBtn label="Remover bloco" onClick={() => setBlocks((s) => s.filter((_, j) => j !== i))}><Trash2 className="size-5" /></IconBtn>
              </div>
            </div>
            {b.type === "image" ? (
              <>
                <ImageUploader folder="articles" value={b.url || null} onChange={(url) => update(i, { ...b, url: url ?? "" })} />
                <input
                  aria-label="Descrição da imagem"
                  value={b.alt}
                  onChange={(e) => update(i, { ...b, alt: e.target.value })}
                  placeholder="Descrição da imagem (obrigatória)"
                  className="block min-h-12 w-full rounded-[var(--radius-control)] border-2 border-line px-3"
                />
              </>
            ) : (
              <textarea
                aria-label={blockLabels[b.type]}
                value={b.text}
                rows={b.type === "heading" ? 1 : 4}
                onChange={(e) => update(i, { ...b, text: e.target.value })}
                className={cn("block w-full rounded-[var(--radius-control)] border-2 border-line px-3 py-2", b.type === "heading" && "font-bold")}
              />
            )}
          </li>
        ))}
      </ol>
      <div className="flex flex-wrap gap-2">
        {(["paragraph", "heading", "tip", "warning", "image"] as const).map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant="outline"
            icon={<Plus aria-hidden className="size-4" />}
            onClick={() => setBlocks((s) => [...s, t === "image" ? { type: "image", url: "", alt: "" } : { type: t, text: "" }])}
          >
            {blockLabels[t]}
          </Button>
        ))}
      </div>
    </fieldset>
  );
}

/* ------------------------ Envio de vídeo (Stream) ------------------------ */

export function StreamUploader({ premium, onUploaded }: { premium: boolean; onUploaded: (uid: string) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const fileId = useId();
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  return (
    <div className="space-y-2">
      <input ref={ref} type="file" accept="video/*" className="sr-only" id={fileId} onChange={async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setBusy(true);
        setError(null);
        setStatus("Preparando envio…");
        const r = await createVideoUpload(premium);
        if (!r.ok) {
          setError(r.message);
          setBusy(false);
          return;
        }
        setStatus("Enviando o vídeo para o Cloudflare Stream… não feche esta página.");
        const fd = new FormData();
        fd.set("file", file);
        const up = await fetch(r.uploadURL, { method: "POST", body: fd }).catch(() => null);
        if (!up?.ok) setError("O envio falhou. Verifique a conexão e tente novamente.");
        else {
          onUploaded(r.uid);
          setStatus("Vídeo enviado. O processamento leva alguns minutos; salve o conteúdo normalmente.");
        }
        setBusy(false);
      }} />
      <label htmlFor={fileId} className={cn("inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[var(--radius-control)] border-2 border-navy-900 px-4 font-semibold text-navy-900 hover:bg-navy-50", busy && "pointer-events-none opacity-60")}>
        <Upload aria-hidden className="size-5" /> Enviar arquivo de vídeo
      </label>
      {status ? <p role="status" className="text-[0.95rem] text-ink-soft">{status}</p> : null}
      {error ? <Alert tone="error" live>{error}</Alert> : null}
    </div>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-lg text-navy-900 hover:bg-navy-100 disabled:opacity-35"
    >
      {children}
    </button>
  );
}
