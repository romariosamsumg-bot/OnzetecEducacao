"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, type FormState } from "@/components/ui/form";
import { Alert } from "@/components/ui/primitives";
import { buyBook, cancelMySubscription, subscribe } from "@/server/actions/billing";

export function SubscribeButton({ plan, label }: { plan: string; label: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(subscribe, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="plan" value={plan} />
      {state.message ? <Alert tone="error" live>{state.message}</Alert> : null}
      <Button type="submit" size="lg" full loading={pending}>
        {label}
      </Button>
    </form>
  );
}

export function BuyBookButton({ book, label }: { book: string; label: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(buyBook, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="book" value={book} />
      {state.message ? <Alert tone="error" live>{state.message}</Alert> : null}
      <Button type="submit" size="lg" full loading={pending}>
        {label}
      </Button>
    </form>
  );
}

export function CancelSubscriptionForm({ accessUntil }: { accessUntil: string | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(cancelMySubscription, {});
  if (state.ok) return <Alert tone="success" live>{state.message}</Alert>;
  return (
    <form action={action} className="space-y-4">
      <Alert tone="info" title="O que acontece ao cancelar">
        <ul className="list-disc space-y-1 pl-5">
          <li>Não haverá novas cobranças.</li>
          <li>{accessUntil ? `Você continua com acesso até ${accessUntil}.` : "Você mantém o acesso até o fim do período já pago."}</li>
          <li>Seus salvos e seu progresso ficam guardados, caso queira voltar.</li>
        </ul>
      </Alert>
      <Checkbox name="confirm" value="sim" required label="Sim, quero cancelar a renovação da minha assinatura" />
      {state.message ? <Alert tone="error" live>{state.message}</Alert> : null}
      <Button type="submit" variant="danger" loading={pending}>
        Cancelar assinatura
      </Button>
    </form>
  );
}
