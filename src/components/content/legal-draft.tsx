import { Alert } from "@/components/ui/primitives";

export function LegalDraftNotice() {
  return (
    <Alert tone="warning" title="Minuta — requer revisão jurídica antes do lançamento">
      Este texto é um rascunho de estrutura preparado pela equipe de produto. Ele precisa ser revisado e aprovado por um advogado
      (CDC, LGPD e Marco Civil da Internet) antes de a plataforma receber assinantes.
    </Alert>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-[1.3rem] font-bold text-navy-900">{title}</h2>
      <div className="space-y-2 leading-relaxed text-ink">{children}</div>
    </section>
  );
}
