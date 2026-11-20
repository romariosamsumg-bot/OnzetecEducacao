# Publicação — passo a passo (configuração de custo mínimo)

**Serviços:** Supabase Free + Netlify Free + Bunny Stream + Resend Free + GitHub Actions + Mercado Pago.
Cada etapa que envolve conta, credencial ou cobrança é feita **pelo proprietário**. Tempo estimado: uma tarde.

> Guarde todas as chaves num gerenciador de senhas (ex.: Bitwarden). Nunca as envie por e-mail, WhatsApp ou chat.

## 1. Supabase (banco, login e arquivos) — plano Free

1. Crie um projeto na região **South America (São Paulo)**. Anote a senha do banco.
2. Prepare o banco **sem instalar nada**: abra **SQL Editor › New query**, cole todo o conteúdo do arquivo [`db/supabase-setup.sql`](../db/supabase-setup.sql) e clique em **Run**. Ele cria tabelas, regras de segurança, categorias, sinônimos de busca e os planos (sem preço). Não cria conteúdos de demonstração.
   *(Alternativa para desenvolvedores: `DATABASE_URL="<Session pooler>" npm run db:migrate`.)*
3. Os conteúdos reais você cria pelo painel da Onzetec depois de publicado.
4. **Authentication › Sign In / Providers › Email:** confirmação de e-mail obrigatória.
5. **Authentication › Email Templates** (traduza para português):
   - Confirmação de cadastro — link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
   - Recuperação de senha — link: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/conta/nova-senha`
   - Magic Link / OTP — inclua o código: `{{ .Token }}`
6. **Authentication › URL Configuration:** Site URL = seu domínio; Redirect URLs = `https://SEU_DOMINIO/auth/confirm`.
7. **Storage:** crie o bucket `public-media` (**público**) e o bucket `private-files` (**privado**).
8. **Project Settings › API / Data API:** retire `public` dos esquemas expostos (o site não usa essa API).
9. Depois de publicar o site (etapa 5), crie sua conta em `/cadastro`, confirme o e-mail e, no **SQL Editor**, rode (com o seu e-mail):
   ```sql
   update public.profiles set role = 'admin'
   where id = (select id from auth.users where email = 'seu@email.com');
   ```

## 2. Resend (e-mails) — plano Free

1. Crie a conta e **verifique seu domínio** (registros DNS SPF e DKIM no Registro.br).
2. Crie uma API key.
3. No Supabase: **Authentication › SMTP Settings** → ativar SMTP personalizado:
   host `smtp.resend.com`, porta `465`, usuário `resend`, senha = API key, remetente `nao-responda@seudominio.com.br`, nome "Onzetec Educação".
   *(O SMTP padrão do Supabase envia poucos e-mails por hora e não serve para produção.)*

## 3. Bunny Stream (vídeos)

1. Crie a conta (pago por uso, mínimo US$ 1/mês) e uma **Video Library** chamada "Onzetec".
2. Na biblioteca, aba **API**, anote:
   - **Library ID** → `BUNNY_STREAM_LIBRARY_ID`
   - **API Key** → `BUNNY_STREAM_API_KEY` (só no servidor; nunca no navegador)
   - **CDN Hostname** (ex.: `vz-abc123.b-cdn.net`) → `BUNNY_STREAM_CDN_HOSTNAME`
3. Proteção dos links: abra a **Pull Zone** da biblioteca (na aba API, "Pull Zone › Manage") → **Security › Token Authentication** → ativar. Copie a **URL Token Authentication Key** → `BUNNY_STREAM_TOKEN_KEY`.
   A partir daí, nenhum vídeo, segmento ou miniatura abre sem um link assinado pelo site.
4. Na mesma Pull Zone, confira se os cabeçalhos **CORS** estão ativos para `m3u8`, `ts`, `vtt` e `jpg` (necessário para o reprodutor no computador e para as legendas).
5. **Legendas:** na Bunny, abra o vídeo › Subtitles › envie o arquivo `.vtt` em português (código `pt-BR`). Depois, salve de novo o conteúdo no painel da Onzetec para ele reconhecer a legenda.
6. **Teste obrigatório:** no painel da Onzetec, crie uma videoaula "Somente assinantes", envie um vídeo curto (botão "Enviar arquivo de vídeo"), aguarde o processamento e confira:
   - (a) a conta de assinante assiste, com legenda;
   - (b) uma conta gratuita vê "exclusivo para assinantes" e não recebe o vídeo;
   - (c) o endereço do vídeo copiado (ferramentas do navegador) para de funcionar depois de 3 horas.

## 4. Mercado Pago (pagamentos)

1. Em **Suas integrações**, crie uma aplicação. Comece com **credenciais e usuários de teste** (vendedor e comprador).
2. **Webhooks:** URL `https://SEU_DOMINIO/api/webhooks/mercadopago`, eventos *Pagamentos* e *Planos e assinaturas*. Copie a **assinatura secreta** → `MERCADOPAGO_WEBHOOK_SECRET`.
3. Variáveis: `BILLING_PROVIDER=mercadopago`, `MERCADOPAGO_ACCESS_TOKEN` (de teste), `MERCADOPAGO_TEST_PAYER_EMAIL` (comprador de teste).
4. No painel da Onzetec › Planos: defina os preços e marque "Disponível para venda".
5. **Roteiro de teste (ambiente de testes):** assinatura aprovada → acesso liberado · cartão recusado → "Pagamento não aprovado" · cancelamento → acesso até o fim do período · livro por Pix → download liberado · reembolso → acesso revogado · reenvio da mesma notificação → sem duplicidade.
6. Só então troque para as credenciais de produção e **apague** `MERCADOPAGO_TEST_PAYER_EMAIL`.

## 5. Netlify (hospedagem) — plano Free

1. **Add new site › Import from Git** → escolha o repositório. As configurações de build vêm do `netlify.toml`.
2. **Site configuration › Environment variables** (todas com escopo "Builds, Functions and Runtime"):

   | Variável | Valor |
   |---|---|
   | `DATABASE_URL` | conexão **Transaction pooler** do Supabase (porta 6543) |
   | `NEXT_PUBLIC_SITE_URL` | `https://SEU_DOMINIO` |
   | `SESSION_SECRET` | `openssl rand -hex 32` |
   | `AUTH_MODE` | `supabase` |
   | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project Settings › API |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings › API (secreta) |
   | `STORAGE_PROVIDER` | `supabase` |
   | `DEMO_MEDIA_ENABLED` | `false` |
   | `VIDEO_PROVIDER` | `bunny_stream` |
   | `BUNNY_STREAM_*` | etapa 3 |
   | `BILLING_PROVIDER`, `MERCADOPAGO_*` | etapa 4 |
   | `CRON_SECRET` | `openssl rand -hex 24` |
   | `SUPPORT_EMAIL` | seu e-mail de atendimento |

   **Nunca** defina `DEV_AUTH_ALLOW_PRODUCTION_BUILD` nem `AUTH_MODE=dev` em produção.
3. **Domain management:** adicione o domínio do Registro.br (HTTPS automático).
4. **Limite de envio:** pelo painel da Onzetec dá para enviar imagens de até 4 MB e livros de até ~5 MB. Livros maiores: envie em Supabase › Storage › `private-files` › pasta `books/` e informe o caminho (ex.: `books/guia.pdf`) no campo "caminho do arquivo" do livro.
5. Acompanhe o consumo de créditos em **Usage**. Se chegar perto do fim do mês, considere o plano pago.

## 6. GitHub Actions (reconciliação e backup) — gratuito

Em **Settings › Secrets and variables › Actions** do repositório:

| Tipo | Nome | Valor |
|---|---|---|
| Variable | `SITE_URL` | `https://SEU_DOMINIO` |
| Secret | `CRON_SECRET` | o mesmo da Netlify |
| Secret | `BACKUP_DATABASE_URL` | conexão **Session pooler** do Supabase (porta 5432) |
| Variable | `BACKUP_AGE_RECIPIENT` | sua chave pública `age1…` (abaixo) |
| Variable | `PG_MAJOR` | versão do PostgreSQL do projeto (Settings › Infrastructure; ex.: `17`) |

**Chave do backup (uma vez, no seu computador):**
1. Instale o `age` (Windows: `winget install FiloSottile.age`; macOS: `brew install age`; Linux: `apt install age`).
2. `age-keygen -o onzetec-backup-chave.txt` — o comando mostra a chave pública (`age1…`): ela vai em `BACKUP_AGE_RECIPIENT`.
3. Guarde o arquivo `onzetec-backup-chave.txt` **fora da internet** (pendrive + cópia no gerenciador de senhas). Sem ele, os backups não podem ser abertos — por ninguém.

**Conferir:** em **Actions**, rode manualmente "Backup diário do banco" e "Reconciliação de pagamentos" (botão *Run workflow*). O backup aparece em *Artifacts* da execução e fica 30 dias.

> O GitHub pausa tarefas agendadas após 60 dias sem nenhuma atividade no repositório (em repositórios públicos) e avisa por e-mail. Basta reativar em Actions.

### Restaurar um backup (teste uma vez antes do lançamento)

1. Baixe o arquivo `.tar.gz.age` em Actions › execução › Artifacts (vem dentro de um .zip).
2. Crie um projeto Supabase **novo** (vazio) — não restaure por cima do projeto em uso.
3. No seu computador (com `age` e o cliente do PostgreSQL instalados):
   `TARGET_DATABASE_URL="<session pooler do projeto novo>" AGE_KEY_FILE=onzetec-backup-chave.txt bash scripts/restore-db.sh onzetec-AAAAMMDD.tar.gz.age`
4. O script recria tabelas, dados, regras de segurança e contas, e mostra a contagem de contas, conteúdos e assinaturas.
5. Aponte a Netlify para o projeto novo (variáveis do Supabase) e reconfigure as etapas 1.4–1.8 nele.

**Atenção:** o backup cobre o **banco** (dados, contas e regras). Arquivos de imagens e livros do Storage não entram nele — guarde os originais no seu computador ou num drive.

## 7. Antes de abrir as vendas

- [ ] Revisão jurídica de termos, privacidade, cancelamento e reembolso (docs/02 § Jurídico).
- [ ] Razão social, CNPJ e canal de atendimento publicados.
- [ ] Conteúdos de demonstração removidos ou substituídos.
- [ ] Logotipo oficial em `src/components/brand/logo.tsx` e ícones em `public/icons`.
- [ ] Testes das etapas 3.6 (vídeo) e 4.5 (pagamentos) concluídos.
- [ ] Backup gerado **e restaurado** uma vez (etapa 6).
- [ ] Teste com TalkBack e com pessoas do público-alvo.
- [ ] `npm run test:all` aprovado.
