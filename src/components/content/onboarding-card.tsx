import { saveInterest } from "@/server/actions/profile";
import { RadioCard } from "@/components/ui/form";
import { Button } from "@/components/ui/button";

const options = [
  { value: "celular", label: "Aprender a usar meu celular" },
  { value: "whatsapp", label: "Aprender WhatsApp" },
  { value: "resolver", label: "Resolver um problema" },
  { value: "redes", label: "Aprender a usar redes sociais" },
  { value: "seguranca", label: "Conhecer dicas de segurança" },
];

/** Orientação curta e opcional do primeiro acesso. */
export function OnboardingCard() {
  return (
    <section aria-labelledby="primeiro-acesso" className="rounded-[var(--radius-card)] border border-navy-100 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
      <form action={saveInterest} className="space-y-4">
        <fieldset className="space-y-3">
          <legend id="primeiro-acesso" className="mb-1 text-[1.3rem] font-bold text-navy-900">
            O que você gostaria de aprender primeiro?
          </legend>
          <p className="text-ink-muted">Escolha uma opção. Você pode mudar isso depois.</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {options.map((o) => (
              <RadioCard key={o.value} name="interest" value={o.value} label={o.label} required />
            ))}
          </div>
        </fieldset>
        <div className="flex flex-wrap gap-3">
          <Button type="submit">Continuar</Button>
          <Button type="submit" name="skip" value="1" variant="ghost" formNoValidate>
            Agora não
          </Button>
        </div>
      </form>
    </section>
  );
}
