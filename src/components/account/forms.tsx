"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, RadioCard, TextField, type FormState } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { applyTextScale } from "@/components/layout/text-size-control";
import { requestAccountDeletion, savePreferences } from "@/server/actions/profile";

export function PreferencesForm({
  displayName,
  textScale,
  reduceMotion,
}: {
  displayName: string;
  textScale: number;
  reduceMotion: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(async (prev, fd) => {
    const r = await savePreferences(prev, fd);
    if (r.ok) {
      applyTextScale(String(fd.get("textScale")));
      document.documentElement.setAttribute("data-reduce-motion", fd.get("reduceMotion") === "on" ? "true" : "false");
    }
    return r;
  }, {});
  return (
    <form action={action} className="space-y-5">
      {state.message ? <Alert tone={state.ok ? "success" : "error"} live>{state.message}</Alert> : null}
      <TextField label="Seu nome" name="displayName" defaultValue={displayName} required error={state.errors?.displayName} autoComplete="given-name" />
      <fieldset className="space-y-2">
        <legend className="mb-1 font-semibold text-navy-900">Tamanho do texto</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <RadioCard name="textScale" value="100" label="Normal" defaultChecked={textScale === 100} />
          <RadioCard name="textScale" value="115" label={<span className="text-[1.15rem]">Grande</span>} defaultChecked={textScale === 115} />
          <RadioCard name="textScale" value="130" label={<span className="text-[1.3rem]">Muito grande</span>} defaultChecked={textScale === 130} />
        </div>
      </fieldset>
      <Checkbox
        name="reduceMotion"
        defaultChecked={reduceMotion}
        label="Reduzir animações"
        hint="Desliga movimentos e transições da tela."
      />
      <Button type="submit" loading={pending}>Salvar preferências</Button>
    </form>
  );
}

export function DeletionRequestForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestAccountDeletion, {});
  if (state.ok) return <Alert tone="success" live>{state.message}</Alert>;
  return (
    <form action={action} className="space-y-3">
      <Checkbox name="confirm" value="sim" label="Quero excluir minha conta e meus dados" hint="Seu progresso, salvos e comentários serão apagados. Registros de pagamento podem ser mantidos pelo prazo exigido por lei." />
      {state.message ? <Alert tone="error" live>{state.message}</Alert> : null}
      <Button type="submit" variant="danger" loading={pending}>Solicitar exclusão</Button>
    </form>
  );
}
