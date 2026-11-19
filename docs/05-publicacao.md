# Publicação — passo a passo

> Cada etapa que envolve contratação, credenciais ou cobrança real exige decisão do proprietário. Nada disso foi feito automaticamente.

## 1. Supabase (banco, autenticação, arquivos)

1. Crie uma organização no plano **Pro** e um projeto na região **São Paulo (sa-east-1)**.
2. Aplique as migrações: `npx supabase link --project-ref <ref>` e `npx supabase db push`
   (ou `DATABASE_URL=<conexão direta> npm run db:migrate` — **sem** `--local`).
3. Conteúdo inicial: `DATABASE_URL=... npm run db:seed` cria categorias, sinônimos e planos **sem preço**. Os conteúdos de demonstração também são criados (marcados como "Demonstração") — remova-os ou substitua-os antes do lançamento.
4. **Authentication › Providers:** habilite e-mail com confirmação obrigatória. **Authentication › Email Templates:** traduza para português; no modelo "Magic Link/OTP" inclua `{{ .Token }}` (código de 6 dígitos); nos modelos de confirmação e recuperação use o link
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` (recuperação: `type=recovery&next=/conta/nova-senha`).
5. **Authentication › URL Configuration:** Site URL = domínio final; Redirect URLs = `https://SEU_DOMINIO/auth/confirm`.
6. **Authentication › SMTP:** configure um provedor de e-mail transacional com domínio próprio (SPF/DKIM).
7. **Storage:** crie o bucket `public-media` (público) e o bucket `private-files` (**privado**).
8. **API settings:** retire `public` dos esquemas expostos (o app não usa a Data API).
9. Crie sua conta pelo site e torne-a administradora: `DATABASE_URL=... npm run admin:grant -- seu@email.com`.
10. **Database › Backups:** confira os backups diários; faça um teste de restauração antes do lançamento.

## 2. Cloudflare Stream (vídeos)

1. Ative o Stream na conta Cloudflare e compre o primeiro bloco de minutos.
2. Crie um token de API com permissão **Stream: Edit** → `CLOUDFLARE_STREAM_API_TOKEN`; anote o Account ID.
3. Crie uma chave de assinatura: `POST /accounts/{id}/stream/keys` → `id` em `CLOUDFLARE_STREAM_SIGNING_KEY_ID` e o campo `jwk` (já em base64) em `CLOUDFLARE_STREAM_SIGNING_KEY_JWK`.
4. `CLOUDFLARE_STREAM_CUSTOMER_CODE` = parte `XXXX` de `customer-XXXX.cloudflarestream.com`.
5. Envie um vídeo de teste pelo painel (Conteúdos › Videoaula › Enviar arquivo de vídeo), marque como pago e confirme: (a) assinante assiste; (b) visitante não recebe o vídeo; (c) a URL copiada para outro navegador expira.

## 3. Mercado Pago (pagamentos)

1. Em **Suas integrações**, crie uma aplicação. Use primeiro as **credenciais de teste** e **usuários de teste** (vendedor e comprador).
2. Configure o webhook em `https://SEU_DOMINIO/api/webhooks/mercadopago` com os eventos: *Pagamentos*, *Planos e assinaturas* (`subscription_preapproval`, `subscription_authorized_payment`). Copie a **assinatura secreta** → `MERCADOPAGO_WEBHOOK_SECRET`.
3. Variáveis: `BILLING_PROVIDER=mercadopago`, `MERCADOPAGO_ACCESS_TOKEN` (de teste), `MERCADOPAGO_TEST_PAYER_EMAIL` (comprador de teste).
4. No painel da Onzetec, defina o preço dos planos e marque "Disponível para venda".
5. **Roteiro de teste obrigatório (ambiente de testes):** assinatura aprovada → acesso liberado; cartão recusado → "Pagamento não aprovado"; cancelamento → acesso até o fim do período; compra de livro por Pix → download liberado; reembolso → acesso revogado; reenvio da mesma notificação → sem duplicidade.
6. Só depois troque para as credenciais de produção e remova `MERCADOPAGO_TEST_PAYER_EMAIL`.

## 4. Vercel (hospedagem)

1. Importe o repositório; framework Next.js; Node 20+.
2. Variáveis de ambiente de produção (ver `.env.example`):
   `DATABASE_URL` (pooler do Supabase, porta 6543), `NEXT_PUBLIC_SITE_URL`, `SESSION_SECRET`, `AUTH_MODE=supabase`,
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `STORAGE_PROVIDER=supabase`,
   `DEMO_MEDIA_ENABLED=false`, variáveis do Cloudflare e do Mercado Pago, `CRON_SECRET`, `SUPPORT_EMAIL`.
   **Nunca** defina `DEV_AUTH_ALLOW_PRODUCTION_BUILD` em produção.
3. O `vercel.json` agenda a reconciliação de pagamentos a cada hora (`/api/cron/reconcile`); a Vercel envia o `CRON_SECRET` automaticamente.
4. Limite de corpo de requisição das funções da Vercel (~4,5 MB): imagens até 4 MB funcionam pelo painel; **arquivos de livro maiores** devem ser enviados direto ao bucket privado do Supabase e o caminho registrado — melhoria listada no relatório.
5. Domínio próprio com HTTPS (automático na Vercel).

## 5. Antes de abrir as vendas

- [ ] Revisão jurídica de termos, privacidade, cancelamento e reembolso (ver docs/02 § Jurídico).
- [ ] Razão social, CNPJ e canal de atendimento publicados.
- [ ] Conteúdos de demonstração removidos ou substituídos.
- [ ] Logotipo oficial aplicado em `src/components/brand/logo.tsx` e ícones em `public/icons`.
- [ ] Roteiro de testes do Mercado Pago concluído no ambiente de testes.
- [ ] Teste com TalkBack e com pessoas do público-alvo.
- [ ] `npm run test:all` verde.
