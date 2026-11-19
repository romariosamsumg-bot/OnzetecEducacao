# Onzetec Educação — Avaliação de produto (Etapa 1)

> Documento vivo. Objetivo: decisões claras, não volume de texto.
> Premissas registradas em **[Premissa]**; pontos que exigem validação externa em **[Validar]**.

## A. Visão do produto

**Proposta de valor:** "Aprenda a usar o seu celular com calma, no seu ritmo, e resolva problemas do dia a dia sem depender de ninguém."

O que diferencia a Onzetec de um site de cursos convencional:

1. **Começa pelo problema, não pelo curso.** A área **Resolver** aceita a linguagem de quem está com dificuldade ("meu zap não toca", "celular sem espaço") e devolve um guia com passos numerados. Cursos existem, mas a porta de entrada mais forte é a dúvida do momento.
2. **Feita para quem tem pouca familiaridade digital — sem infantilizar.** Letra grande por padrão (18 px), controle de tamanho de texto, botões com texto, navegação previsível de 5 itens, nenhuma reprodução automática com som.
3. **Conteúdo que envelhece com responsabilidade.** Cada tutorial registra aplicativo, sistema, versão e data da última revisão; o painel aponta o que pode estar desatualizado. Em tecnologia, isso é confiança.
4. **Comunidade a serviço do aprendizado.** Curtidas, comentários e respostas oficiais do professor, com moderação, filtro de links e alerta para nunca compartilhar senhas ou códigos. Não é uma rede social aberta.
5. **Compra pensada para famílias.** Linguagem transparente de cobrança e cancelamento; arquitetura pronta para o "filho que assina para a mãe" (plano familiar fica no roadmap).

## Personas (resumidas)

| Persona | Familiaridade | Necessidade principal | Implicação de design |
|---|---|---|---|
| **Dona Lúcia, 67**, aposentada | Baixa: usa WhatsApp para áudio, tem medo de "apertar errado" | Resolver problemas pontuais, evitar golpes | Resolver em destaque, passos com imagens, linguagem de conversa |
| **Seu Antônio, 58**, comerciante | Média: usa apps, mas sem domínio de configurações | Usar o celular no trabalho (fotos, PIX, WhatsApp Business) | Cursos curtos por módulo, retomada fácil |
| **Márcia, 41**, filha | Alta | Ajudar os pais sem ter que explicar tudo pessoalmente | Compartilhar link de uma aula pelo WhatsApp; contratar para os pais (roadmap) |
| **Rafael, 29**, iniciante digital | Baixa-média | Independência digital, segurança | Dicas rápidas, segurança digital |

Não presumimos que "50+" é um bloco homogêneo: o produto oferece **três ritmos** — dica rápida (1 min), guia de solução (5 min) e curso (várias aulas).

## B. Experiência principal (jornadas)

Pergunta-guia: *"Uma pessoa com dificuldade no próprio celular entende esta plataforma sem pedir ajuda?"*

**Navegação principal (barra inferior no celular, cabeçalho no computador):**

```
Início | Aprender | Resolver | Salvos | Conta
```

- 5 destinos, sempre com **ícone + texto**, sempre visíveis, mesma posição em todas as telas.
- "Dicas rápidas" e "Livraria" ficam dentro de **Aprender** (evita um sexto item).
- Toda tela interna tem botão **"Voltar"** com texto, além do gesto do sistema.

**Jornadas críticas:**

1. **Visitante → assinante:** página inicial pública → aula/guia gratuito → "Assinar" → página de assinatura com preço, renovação e cancelamento explicados → cadastro curto (nome, e-mail, senha) → pagamento no ambiente do Mercado Pago → volta para a plataforma com status visível.
2. **Assinante retomando:** Início → "Continuar de onde parei" (1 toque) → vídeo retoma no segundo exato.
3. **Problema urgente:** Início → campo "Qual é a sua dúvida?" ou botão "Resolver um problema" → digita com as próprias palavras → guia com passos numerados → "Funcionou?" (feedback) → se não, "O que fazer se não funcionar".
4. **Administrador:** /admin → Novo curso → módulo → aula com vídeo → publicar → ver na plataforma.

## Mapa de navegação

```
/                      Início (visitante: apresentação | assinante: painel pessoal)
/aprender              Categorias, cursos, dicas rápidas, livraria
  /aprender/[categoria]
/cursos/[curso]        Página do curso (módulos e aulas)
/aulas/[aula]          Reprodutor de aula
/dicas                 Dicas rápidas (vídeos verticais)
/artigos/[artigo]
/resolver              Busca por problema + navegação por app/assunto
  /resolver/[guia]     Página de solução
/livraria, /livraria/[livro]
/assinatura            Planos e condições
/salvos                Meus salvos + em andamento
/conta                 Dados, assinatura, acessibilidade, privacidade, sair
/entrar, /cadastro
/admin/...             Painel administrativo (somente administradores)
```

## C. Direção visual

**Conceito: "Editorial calmo".** Uma revista de tecnologia bem diagramada, não um app de entretenimento. Muito espaço em branco quente, tipografia grande e firme, azul-marinho institucional, laranja reservado para **a ação mais importante da tela**.

- **Cores:** marinho `#0B2545` (texto de destaque, cabeçalho, fundos institucionais); laranja `#F47B20` como **fundo de botão primário com texto marinho** (contraste 5,6:1 — o laranja com texto branco teria 2,7:1 e reprovaria na WCAG); laranja escuro `#A84300` para texto/links de destaque (6,1:1); papel `#FAF8F4` como fundo de leitura.
- **Tipografia:** Atkinson Hyperlegible Next (Braille Institute) — projetada para leitores com baixa visão, distingue `Il1`, `0O`; uma única família em pesos 400/600/700 para manter peso de página baixo. Base 18 px; títulos de 24 a 40 px.
- **Marca:** não recebemos arquivos oficiais. Foi criado um **símbolo provisório** (anel "O" com arco laranja de 360°) apenas como espaço reservado, isolado em um único componente (`src/components/brand/logo.tsx`) para troca direta pelos arquivos oficiais. **[Validar]** com o material da marca.
- **Componentes:** cartões com raio 16 px e borda sutil (sem sombras pesadas), botões com altura mínima de 48 px e texto sempre visível, foco visível em laranja grosso (3 px), ícones lineares (Lucide) sempre acompanhados de texto em ações.
- **Movimento:** transições ≤ 200 ms, desativadas com `prefers-reduced-motion` ou pela preferência da conta.

## D. Arquitetura recomendada (resumo — detalhes em `02-arquitetura.md`)

| Camada | Escolha | Por quê |
|---|---|---|
| App | **Next.js 16 (App Router) + React 19 + TypeScript** | SSR para SEO, Server Actions para formulários sem API extra, PWA, uma base para web e Android instalável |
| Estilo | **Tailwind CSS 4** com tokens em CSS | Design system em variáveis, sem runtime |
| Banco | **PostgreSQL (Supabase)** com **RLS** | Integridade, busca em português (FTS + unaccent + trigram), políticas no banco como segunda barreira |
| Autenticação | **Supabase Auth** (e-mail + senha; código por e-mail como alternativa) | Serviço gerenciado: hashing, limites, recuperação de senha — menos risco para uma operação de uma pessoa |
| Arquivos | **Supabase Storage** (imagens públicas; livros em bucket privado com URL assinada) | Mesmo provedor, menos contratos |
| Vídeo | **Cloudflare Stream** (HLS adaptativo, URLs assinadas) atrás de um adaptador | Preço por minuto, sem cobrança de banda separada, tokens assinados para conteúdo pago |
| Pagamentos | **Mercado Pago** (Assinaturas `/preapproval` para recorrência por cartão; Checkout Pro para livros e Pix) atrás de um adaptador | Marca conhecida pelo público, recorrência documentada, Pix para compras avulsas |
| Hospedagem | **Vercel** (ou qualquer host Node.js) | Deploy simples; nada no código prende ao provedor |

**Trocas de provedor:** vídeo, pagamento, armazenamento e autenticação ficam atrás de interfaces (`src/lib/video`, `src/lib/billing`, `src/lib/storage`, `src/lib/auth`). O acesso a dados usa SQL direto via driver `postgres` (sem PostgREST), portanto o banco pode migrar para qualquer PostgreSQL 15+.

## E. MVP realista

**Entra no MVP:**

- Páginas públicas indexáveis (apresentação, categorias, cursos, aulas gratuitas, guias gratuitos, livraria, assinatura).
- Cadastro/login, onboarding opcional de 1 pergunta.
- Cursos → módulos → aulas; dicas rápidas; artigos; guias de solução com passos e imagens.
- Busca "Resolver" com sinônimos e termos populares (sem IA).
- Reprodutor acessível com progresso persistido, retomada, velocidade, legendas, transcrição.
- Curtidas, salvos, comentários com resposta oficial, denúncia, moderação, filtro de links.
- Assinatura mensal/anual configurável, webhook autenticado, idempotência, reconciliação, acesso no servidor.
- Livraria digital com compra avulsa e entrega por link assinado.
- Painel administrativo: conteúdos, cursos/módulos/aulas, guias, livros, categorias, planos, moderação, assinantes, revisão editorial.
- Preferências de acessibilidade, exportação e pedido de exclusão de dados.

**Fica para o roadmap** (arquitetura preparada, não implementado): planos familiares/presente, notificações push, certificados, aulas ao vivo, assistente com IA, pedidos de tutorial, apps nativos, múltiplos professores, recomendações personalizadas, conteúdo offline, livros físicos.

## F. Sustentabilidade comercial

- **Assinatura:** planos com preço, intervalo e status configuráveis pelo painel; **nenhum preço foi inventado** — o plano fica indisponível para venda até o administrador definir o valor.
- **Livros:** cada livro define se está **incluso na assinatura** ou é **vendido separadamente**; compra gera um direito de acesso permanente, independente da assinatura.
- **Operação individual:** tudo administrável pelo painel; reconciliação automática de status; indicadores básicos (assinantes ativos, cancelamentos, pendências de moderação, conteúdos a revisar).
- **Custos:** ver `04-servicos-e-custos.md` (fixos vs variáveis).
- **Escalabilidade:** PostgreSQL gerenciado + CDN de vídeo aguentam dezenas de milhares de assinantes sem mudança de arquitetura; o primeiro gargalo esperado é operacional (produção de conteúdo e atendimento), não técnico.

## Principais riscos

| Risco | Mitigação |
|---|---|
| Recorrência do Mercado Pago só por cartão; parte do público não usa cartão | Plano anual pago via Pix/boleto como compra avulsa de período (sem renovação automática) — **[Validar]** com o Mercado Pago; adaptador permite outro provedor |
| Tutoriais desatualizados após atualizações de apps | Metadados de versão + data de revisão + painel de revisão editorial |
| Golpes e exposição de dados em comentários | Aviso antes de publicar, retenção para moderação de mensagens com links/CPF/números de cartão, texto puro |
| Dependência de uma única pessoa para conteúdo e suporte | Painel simples, reconciliação automática, documentação de operação |
| Requisitos legais (CDC, direito de arrependimento, LGPD) | Pontos listados em `02-arquitetura.md` § Jurídico — **[Validar]** com advogado antes do lançamento |

## Critérios de lançamento

1. Todos os critérios de aceitação do MVP (seção 22 do briefing) verificados com testes automatizados **e** inspeção humana.
2. Pagamentos testados ponta a ponta no **ambiente de testes oficial** do Mercado Pago, incluindo recusa e cancelamento.
3. Vídeos pagos servidos apenas por URL assinada; verificação manual de que a URL expira.
4. Auditoria de acessibilidade (axe + leitor de screen reader TalkBack + texto a 200%) sem falhas bloqueantes.
5. Revisão jurídica de Termos de Uso, Política de Privacidade e política de cancelamento.
6. Backups automáticos ativos e restauração testada uma vez.
7. Domínio próprio com HTTPS e e-mail transacional (SMTP próprio) configurados.
