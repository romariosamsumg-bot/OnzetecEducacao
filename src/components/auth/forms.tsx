"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, TextField, type FormState } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import {
  requestEmailCode,
  requestPasswordReset,
  signIn,
  signUp,
  updatePassword,
  verifyEmailCode,
} from "@/server/actions/auth";

function PasswordField({
  name = "password",
  label = "Senha",
  error,
  autoComplete,
  hint,
}: {
  name?: string;
  label?: string;
  error?: string[];
  autoComplete: string;
  hint?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-2">
      <TextField
        label={label}
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required
        error={error}
        hint={hint}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-pressed={show}
        className="inline-flex min-h-11 items-center gap-2 rounded-lg px-1 font-semibold text-navy-700"
      >
        {show ? <EyeOff aria-hidden className="size-5" /> : <Eye aria-hidden className="size-5" />}
        {show ? "Esconder senha" : "Mostrar senha"}
      </button>
    </div>
  );
}

function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <Alert tone={state.ok ? "success" : "error"} live>
      {state.message}
    </Alert>
  );
}

export function SignInForm({ returnTo, devMode }: { returnTo: string; devMode: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signIn, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="voltar" value={returnTo} />
      <FormMessage state={state} />
      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      {!devMode ? <PasswordField autoComplete="current-password" error={state.errors?.password} /> : null}
      <Button type="submit" size="lg" full loading={pending}>
        Entrar
      </Button>
      {!devMode ? (
        <p className="text-center">
          <Link href="/recuperar-senha" className="inline-flex min-h-11 items-center font-semibold text-orange-700 underline underline-offset-4">
            Esqueci minha senha
          </Link>
        </p>
      ) : null}
    </form>
  );
}

export function EmailCodeForm({ returnTo }: { returnTo: string }) {
  const [reqState, requestAction, requesting] = useActionState<FormState, FormData>(requestEmailCode, {});
  const [verState, verifyAction, verifying] = useActionState<FormState, FormData>(verifyEmailCode, {});
  const onCodeStep = reqState.values?.step === "code" || verState.values?.step === "code";
  const emailValue = verState.values?.email ?? reqState.values?.email ?? "";

  if (!onCodeStep) {
    return (
      <form action={requestAction} className="space-y-4" noValidate>
        <FormMessage state={reqState} />
        <TextField
          label="E-mail"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          id="f-email-codigo"
          defaultValue={reqState.values?.email}
          error={reqState.errors?.email}
          hint="Enviaremos um código de 6 números para você entrar sem senha."
        />
        <Button type="submit" variant="outline" full loading={requesting}>
          Receber código por e-mail
        </Button>
      </form>
    );
  }
  return (
    <form action={verifyAction} className="space-y-4" noValidate>
      <FormMessage state={verState.message ? verState : reqState} />
      <input type="hidden" name="email" value={emailValue} />
      <input type="hidden" name="voltar" value={returnTo} />
      <TextField
        label={`Código enviado para ${emailValue}`}
        name="token"
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="\d{6}"
        maxLength={7}
        required
        error={verState.errors?.token}
        hint="Digite os 6 números que chegaram no seu e-mail. Não compartilhe este código com ninguém."
      />
      <Button type="submit" full size="lg" loading={verifying}>
        Confirmar código
      </Button>
    </form>
  );
}

export function SignUpForm({ returnTo, devMode }: { returnTo: string; devMode: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(signUp, {});
  if (state.ok && state.message) {
    return (
      <Alert tone="success" title="Confira o seu e-mail" live>
        {state.message}
      </Alert>
    );
  }
  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="voltar" value={returnTo} />
      <FormMessage state={state} />
      <TextField
        label="Como você gostaria de ser chamado(a)?"
        name="displayName"
        autoComplete="given-name"
        required
        defaultValue={state.values?.displayName}
        error={state.errors?.displayName}
      />
      <TextField
        label="E-mail"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        defaultValue={state.values?.email}
        error={state.errors?.email}
      />
      {!devMode ? (
        <PasswordField
          autoComplete="new-password"
          error={state.errors?.password}
          hint="Pelo menos 8 caracteres. Dica: uma frase curta que só você sabe."
        />
      ) : null}
      <Checkbox
        name="terms"
        required
        label={
          <>
            Li e aceito os{" "}
            <Link href="/termos" className="underline underline-offset-4" target="_blank">
              Termos de uso
            </Link>{" "}
            e a{" "}
            <Link href="/privacidade" className="underline underline-offset-4" target="_blank">
              Política de privacidade
            </Link>
          </>
        }
      />
      {state.errors?.terms ? <p className="font-semibold text-danger-700">⚠ {state.errors.terms[0]}</p> : null}
      <Button type="submit" size="lg" full loading={pending}>
        Criar minha conta
      </Button>
    </form>
  );
}

export function ResetRequestForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(requestPasswordReset, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <TextField label="E-mail da sua conta" name="email" type="email" autoComplete="email" required error={state.errors?.email} />
      <Button type="submit" size="lg" full loading={pending}>
        Enviar link para nova senha
      </Button>
    </form>
  );
}

export function NewPasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(updatePassword, {});
  return (
    <form action={action} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <PasswordField label="Nova senha" autoComplete="new-password" error={state.errors?.password} />
      <PasswordField name="confirm" label="Repita a nova senha" autoComplete="new-password" error={state.errors?.confirm} />
      <Button type="submit" size="lg" full loading={pending}>
        Salvar nova senha
      </Button>
    </form>
  );
}
