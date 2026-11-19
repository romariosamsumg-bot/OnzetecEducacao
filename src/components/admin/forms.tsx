"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import type { FormState } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { ImageUploader } from "./editors";

const fieldNames: Record<string, string> = {
  title: "Título", slug: "Endereço", name: "Nome", price: "Preço", email: "E-mail", days: "Dias",
  publishedAt: "Data de publicação", author: "Autor", file: "Arquivo", sampleUrl: "Amostra", description: "Descrição",
};

/** Formulário genérico do painel: mostra mensagens e um resumo dos erros por campo. */
export function ActionForm({
  action,
  children,
  submitLabel = "Salvar",
  className = "space-y-4",
  encType,
}: {
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  children: React.ReactNode;
  submitLabel?: string;
  className?: string;
  encType?: "multipart/form-data";
}) {
  const [state, formAction] = useActionState<FormState, FormData>(action, {});
  const errors = Object.entries(state.errors ?? {}).filter(([, v]) => v?.length);
  return (
    <form action={formAction} className={className} encType={encType}>
      {state.message ? <Alert tone={state.ok ? "success" : "error"} live>{state.message}</Alert> : null}
      {errors.length > 0 ? (
        <Alert tone="error" live title="Corrija os campos abaixo">
          <ul className="list-disc pl-5">
            {errors.map(([k, v]) => <li key={k}><strong>{fieldNames[k] ?? k}:</strong> {v![0]}</li>)}
          </ul>
        </Alert>
      ) : null}
      {children}
      <SubmitButton label={submitLabel} />
    </form>
  );
}

export function SubmitButton({ label, variant = "primary" }: { label: string; variant?: "primary" | "secondary" | "danger" | "outline" }) {
  const { pending } = useFormStatus();
  return <Button type="submit" loading={pending} variant={variant}>{label}</Button>;
}

/** Botão que pede confirmação antes de enviar (ações irreversíveis). */
export function ConfirmSubmit({ label, message, variant = "danger" }: { label: string; message: string; variant?: "danger" | "outline" | "secondary" }) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size="sm"
      loading={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {label}
    </Button>
  );
}

/** Campo de imagem que grava a URL num input oculto do formulário. */
export function CoverField({ name, initial, folder, label }: { name: string; initial: string | null; folder: "covers" | "books"; label: string }) {
  const [url, setUrl] = useState<string | null>(initial);
  return (
    <>
      <input type="hidden" name={name} value={url ?? ""} />
      <ImageUploader folder={folder} label={label} value={url} onChange={setUrl} />
    </>
  );
}
