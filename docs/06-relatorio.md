# Relatório de entrega — versão 0.1 (19/11/2026)

Legenda: ✅ implementado **e** testado automaticamente · 🟡 implementado, **não** testado contra o serviço real (falta credencial) · ⬜ pendente

## Critérios de aceitação do MVP

| Critério | Situação | Evidência |
|---|---|---|
| **Administrativo:** criar curso, módulo, aula publicada e vê-la na plataforma | ✅ | `tests/e2e/admin.spec.ts` |
| **Visitante:** entende a proposta, acha conteúdo público, conhece a assinatura, inicia cadastro | ✅ | `tests/e2e/visitor.spec.ts` |
| **Assinante:** encontra aula, reproduz, continua de onde parou, favorita e comenta | ✅ | `tests/e2e/subscriber.spec.ts` |
| **Problemas:** dúvida cotidiana ("meu zap tá mudo") encontra o guia certo | ✅ | `visitor.spec.ts`, `tests/unit/search.test.ts` |
| **Comercial:** recebe e confirma eventos do provedor, atualiza assinatura e concede/revoga acesso | ✅ lógica / 🟡 Mercado Pago real | `tests/db/billing.test.ts` usa um **provedor falso** (dublê de teste). Assinatura HMAC testada com vetores próprios. **Falta o roteiro no ambiente de testes do Mercado Pago** (docs/05 § 3) |
| **Segurança:** visitante não acessa conteúdo pago por URL/API; usuário comum não vira admin | ✅ | `tests/db/rls.test.ts` (24 casos), `tests/e2e/security.spec.ts` |
| **Acessibilidade:** jornadas com texto ampliado, teclado e leitor de tela | ✅ automático / ⬜ humano | axe sem violações em 20 telas; texto 130% e largura de zoom 200%; teclado. **Falta teste com TalkBack e com pessoas reais** |

Resultado da última execução: **lint ✔ · tipos ✔ · 60 testes de unidade/banco ✔ · 33 testes E2E ✔ · build de produção ✔**.

## Bugs reais encontrados pelos testes e corrigidos

1. Assinante de plano retirado de venda deixava de ver a própria assinatura (política RLS de `plans`) — migração `…0400`.
2. Página de curso falhava para visitantes anônimos (consulta referenciava `progress`).
3. Salvar um conteúdo sem legenda apagava a legenda do mesmo vídeo usado por outras aulas.
4. IDs de campos repetidos entre a página atual e a anterior (mantida oculta pelo Next.js) faziam rótulos apontarem para o campo errado.
5. Rótulo acessível do logotipo diferente do texto visível (WCAG 2.5.3).

## Implementado

**Produto e telas (12 prioritárias):** apresentação pública · início do assinante (continuar, recomendados por regra, dicas, recentes, orientação de 1 pergunta) · Aprender (categorias, cursos, dicas, artigos, livraria) · curso (módulos, progresso, próxima aula) · reprodutor de aula · dicas rápidas (lista finita, sem rolagem infinita, navegação anterior/próxima) · Resolver (busca com sinônimos, problemas comuns, navegação por assunto, registro anônimo de buscas sem resultado) · página de solução (causas, passos numerados, cuidados, "funcionou?", "se não funcionou") · Meus salvos · Minha conta (assinatura, livros, preferências, senha, exportar dados, pedir exclusão, sair) · livraria e página do livro · painel administrativo. Também: cadastro, entrar (senha ou código por e-mail), recuperar senha, ajuda, termos e privacidade (minutas), 404, erro, offline.

**Painel administrativo:** visão geral com indicadores · conteúdos (videoaula, dica, artigo, guia) com editor de etapas e blocos sem HTML, envio de imagens, vídeo (Stream ou demonstração), agendamento, rascunho, pré-visualização, acesso gratuito/pago, tags, frases de busca, materiais, metadados editoriais · cursos com módulos e ordenação · categorias · livros (preço, incluído na assinatura, arquivo privado) · comentários (aprovar, ocultar, remover, denúncias, resposta oficial) · revisão editorial (desatualizados, sem revisão há 6 meses, "não funcionou") · assinantes e cortesias · planos e preços · pagamentos e eventos · pedidos de exclusão (LGPD) · registro de auditoria.

**Base técnica:** 4 migrações SQL com RLS em todas as tabelas · busca FTS em português sem acentos + trigramas · Server Actions validadas com Zod · PWA (manifesto, ícones, service worker que nunca guarda conteúdo pessoal/pago, página offline) · SEO (metadados, Open Graph, `sitemap.xml`, `robots.txt`, JSON-LD de Course/Article/HowTo/Book com marcação de conteúdo pago) · cabeçalhos de segurança e CSP.

## Implementado, aguardando credenciais (🟡)

| Integração | O que falta fazer (pelo proprietário) |
|---|---|
| Supabase Auth (cadastro, login, código, recuperação) | Criar projeto, configurar templates/SMTP e testar os quatro fluxos (o ambiente local usa login de desenvolvimento) |
| Supabase Storage | Criar buckets e enviar uma capa e um livro de teste |
| Cloudflare Stream (reprodução assinada, envio direto, leitura de duração) | Criar chaves e validar com um vídeo real |
| Mercado Pago (assinatura, cancelamento, livros, webhook, reconciliação) | Roteiro completo no ambiente de testes |
| Exclusão de conta no Supabase Auth (Admin API) | Testar com uma conta de teste |

## Pendente / próximos passos recomendados

1. ⬜ Executar os roteiros com credenciais reais (acima) — **pré-requisito para vender**.
2. ⬜ Revisão jurídica (docs/02 § Jurídico) e dados do fornecedor no rodapé.
3. ⬜ Arquivos oficiais da marca (o símbolo atual é **provisório**).
4. ⬜ Substituir o conteúdo de demonstração por conteúdo real revisado (os passos atuais são genéricos de propósito).
5. ⬜ Envio de livros grandes direto ao Storage (hoje passa pelo servidor; limite ~4,5 MB na Vercel).
6. ⬜ Monitoramento de erros (Sentry) e alertas de falha de pagamento por e-mail para o proprietário.
7. ⬜ Plano anual pago à vista por Pix (sem renovação automática), se a recorrência por cartão afastar parte do público — validar com o Mercado Pago.
8. ⬜ Métricas de Core Web Vitals em produção (`useReportWebVitals`) e teste em Android de entrada real.
9. ⬜ Teste de usabilidade com 5–8 pessoas 50+ (tarefas: resolver um problema, retomar uma aula, cancelar a assinatura).

## Premissas registradas

- Fuso horário de Brasília (UTC−3, sem horário de verão) para datas digitadas no painel.
- Carências de acesso: 2 dias após o vencimento (atraso de renovação) e 5 dias em pagamento recusado — ajustáveis em `subscription_grants_access()`.
- Conclusão automática da aula ao alcançar 90% do vídeo.
- Comentários só para assinantes (contas gratuitas leem).
- Respostas encadeadas em um nível (pergunta → respostas), para manter a simplicidade.
- Preços: nenhum foi inventado; planos nascem sem preço e inativos.
