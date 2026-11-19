import type { Metadata } from "next";
import { LegalDraftNotice, LegalSection } from "@/components/content/legal-draft";
import { Container, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Termos de uso", alternates: { canonical: "/termos" } };

export default function TermosPage() {
  return (
    <Container className="max-w-3xl space-y-8 py-8">
      <PageHeader title="Termos de uso" />
      <LegalDraftNotice />
      <LegalSection title="1. O serviço">
        <p>A Onzetec Educação oferece conteúdos educacionais sobre o uso de celulares, aplicativos e internet, em formato de vídeos, guias, artigos e livros digitais. [Identificação completa do fornecedor: razão social, CNPJ, endereço e canal de atendimento — a preencher.]</p>
      </LegalSection>
      <LegalSection title="2. Conta">
        <p>A conta é pessoal. Você é responsável por manter sua senha em segurança. Nunca pedimos sua senha.</p>
      </LegalSection>
      <LegalSection title="3. Assinatura, renovação e cancelamento">
        <p>A assinatura é renovada automaticamente ao fim de cada período, pelo valor contratado, até ser cancelada. O cancelamento pode ser feito a qualquer momento em “Minha conta”, sem multa, mantendo o acesso até o fim do período pago. [Política de arrependimento (art. 49 do CDC) e reembolso — a definir com assessoria jurídica.]</p>
      </LegalSection>
      <LegalSection title="4. Compras avulsas">
        <p>Livros digitais comprados ficam disponíveis na conta do comprador, independentemente da assinatura, para uso pessoal. [Regras de licença de uso e reembolso — a definir.]</p>
      </LegalSection>
      <LegalSection title="5. Comentários">
        <p>Comentários devem respeitar as pessoas e o tema da aula. Mensagens com links, dados pessoais, propaganda ou ofensas podem ser retidas ou removidas pela moderação.</p>
      </LegalSection>
      <LegalSection title="6. Limitações">
        <p>Os tutoriais são orientações gerais. Menus e funções variam conforme marca, modelo e versão do aparelho e dos aplicativos.</p>
      </LegalSection>
    </Container>
  );
}
