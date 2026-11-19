import type { Metadata } from "next";
import { LegalDraftNotice, LegalSection } from "@/components/content/legal-draft";
import { Container, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Política de privacidade", alternates: { canonical: "/privacidade" } };

export default function PrivacidadePage() {
  return (
    <Container className="max-w-3xl space-y-8 py-8">
      <PageHeader title="Política de privacidade" />
      <LegalDraftNotice />
      <LegalSection title="Quais dados coletamos">
        <ul className="list-disc space-y-1 pl-6">
          <li>Cadastro: nome (ou apelido) e e-mail.</li>
          <li>Uso: aulas assistidas, progresso, curtidas, salvos e comentários.</li>
          <li>Pagamento: situação da assinatura e dos pedidos. Os dados do cartão ficam somente com o Mercado Pago.</li>
          <li>Preferências de leitura (tamanho do texto, animações).</li>
        </ul>
      </LegalSection>
      <LegalSection title="Para que usamos">
        <p>Para oferecer o serviço, lembrar onde você parou, recomendar conteúdos, processar pagamentos, moderar comentários e cumprir obrigações legais. Não vendemos seus dados.</p>
      </LegalSection>
      <LegalSection title="Com quem compartilhamos">
        <p>Somente com fornecedores necessários ao funcionamento: hospedagem e banco de dados, envio de e-mails, vídeo e pagamento. [Lista de operadores e países de armazenamento — a preencher.]</p>
      </LegalSection>
      <LegalSection title="Seus direitos (LGPD)">
        <p>Você pode acessar e baixar seus dados e pedir a exclusão da conta diretamente em “Minha conta &gt; Privacidade”. [Contato do encarregado (DPO) — a preencher.]</p>
      </LegalSection>
      <LegalSection title="Retenção">
        <p>Mantemos os dados enquanto a conta existir. Registros de pagamento podem ser mantidos pelo prazo exigido pela legislação fiscal. [Prazos — a definir com assessoria jurídica e contábil.]</p>
      </LegalSection>
      <LegalSection title="Cookies">
        <p>Usamos apenas cookies essenciais: sessão de login e preferências de leitura. Não usamos cookies de publicidade.</p>
      </LegalSection>
    </Container>
  );
}
