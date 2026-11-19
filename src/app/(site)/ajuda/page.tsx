import type { Metadata } from "next";
import Link from "next/link";
import { Container, PageHeader } from "@/components/ui/primitives";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Ajuda",
  description: "Respostas para as dúvidas mais comuns sobre a Onzetec Educação: conta, assinatura, pagamento e cancelamento.",
  path: "/ajuda",
});

const faq: { id?: string; q: string; a: React.ReactNode }[] = [
  { q: "Preciso pagar para usar?", a: <>Não. Com uma conta gratuita você assiste às aulas e guias marcados como “Gratuito”. A assinatura libera todo o conteúdo.</> },
  { q: "Como funciona a cobrança?", a: <>O pagamento é feito no Mercado Pago. A assinatura se renova automaticamente no cartão de crédito, pelo valor contratado. A data da próxima renovação aparece em <Link className="font-semibold underline" href="/conta#assinatura">Minha conta</Link>.</> },
  { id: "cancelamento", q: "Como cancelo a assinatura?", a: <>Vá em <Link className="font-semibold underline" href="/conta#assinatura">Minha conta &gt; Sua assinatura</Link> e toque em “Cancelar assinatura”. Não há multa. Você continua com acesso até o fim do período já pago e não haverá novas cobranças.</> },
  { q: "O pagamento foi recusado. E agora?", a: <>O Mercado Pago tenta cobrar novamente nos dias seguintes. Confira se o cartão está válido e com limite. Durante alguns dias você mantém o acesso enquanto a cobrança é refeita.</> },
  { q: "Comprei um livro. Onde ele está?", a: <>Em <Link className="font-semibold underline" href="/conta#livros">Minha conta &gt; Meus livros</Link>, depois que o pagamento for confirmado. Livros comprados continuam seus mesmo sem assinatura.</> },
  { q: "Posso aumentar as letras?", a: <>Sim. Toque em “Tamanho do texto” no topo da tela, ou ajuste em Minha conta &gt; Preferências.</> },
  { q: "Alguém da Onzetec vai pedir minha senha?", a: <>Nunca. Não pedimos senhas, códigos recebidos por SMS ou dados de cartão por mensagem, telefone ou comentário. Se alguém pedir, é golpe.</> },
  { q: "Posso assinar para meus pais?", a: <>Hoje cada assinatura é individual: crie a conta com o e-mail da pessoa que vai usar. Planos familiares estão nos nossos planos futuros.</> },
];

export default function AjudaPage() {
  return (
    <Container className="max-w-3xl py-8">
      <PageHeader title="Central de ajuda" description="Respostas curtas para as dúvidas mais comuns." />
      <div className="space-y-3">
        {faq.map((f) => (
          <details key={f.q} id={f.id} className="scroll-mt-24 rounded-[var(--radius-card)] border border-line bg-white p-4 open:shadow-[var(--shadow-card)]">
            <summary className="flex min-h-11 cursor-pointer items-center text-[1.08rem] font-bold text-navy-900">{f.q}</summary>
            <p className="mt-2 leading-relaxed text-ink-soft">{f.a}</p>
          </details>
        ))}
      </div>
      <p className="mt-8 text-ink-soft">
        Não encontrou o que procurava? Use o{" "}
        <Link href="/resolver" className="font-semibold text-orange-700 underline underline-offset-4">Resolver um problema</Link>
        {process.env.SUPPORT_EMAIL ? (
          <> ou escreva para <a className="font-semibold underline" href={`mailto:${process.env.SUPPORT_EMAIL}`}>{process.env.SUPPORT_EMAIL}</a></>
        ) : null}
        .
      </p>
    </Container>
  );
}
