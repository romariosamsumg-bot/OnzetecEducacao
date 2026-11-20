# Onzetec Educação

Plataforma de assinatura para ensinar pessoas — com atenção especial ao público 50+ — a usar o celular Android, aplicativos e serviços digitais com autonomia e segurança.

PWA *mobile-first* em **Next.js 16 + React 19 + TypeScript**, **PostgreSQL (Supabase) com RLS**, **Supabase Auth**, **Bunny Stream** (vídeo) e **Mercado Pago** (pagamentos), hospedada na **Netlify**, com backup e tarefas no **GitHub Actions**. Custo previsto para ~1.000 usuários: ≈ US$ 1–15/mês ([detalhes](docs/04-servicos-e-custos.md)).

> **Situação atual:** primeira versão funcional com dados de demonstração claramente identificados. Pagamentos, vídeo em produção e autenticação Supabase estão **implementados no código, mas ainda não testados contra os serviços reais** (dependem de credenciais). Veja [docs/06-relatorio.md](docs/06-relatorio.md).

## Documentação

| Documento | Conteúdo |
|---|---|
| [01 — Avaliação de produto](docs/01-avaliacao-produto.md) | Visão, personas, jornadas, mapa, MVP, riscos, critérios de lançamento |
| [02 — Arquitetura](docs/02-arquitetura.md) | Stack, modelo de dados, segurança, LGPD, pagamentos, vídeo, pontos jurídicos |
| [03 — Design System](docs/03-design-system.md) | Tokens, tipografia, componentes, regras de acessibilidade |
| [04 — Serviços e custos](docs/04-servicos-e-custos.md) | Serviços externos, custos fixos e variáveis |
| [05 — Publicação](docs/05-publicacao.md) | Passo a passo para colocar no ar |
| [06 — Relatório](docs/06-relatorio.md) | O que foi implementado, testado e o que está pendente |

## Rodar localmente

Pré-requisitos: Node.js 20.9+, PostgreSQL 15+ (com `unaccent` e `pg_trgm`), ffmpeg (opcional, para recriar vídeos de demonstração).

```bash
npm install
cp .env.example .env.local          # ajuste DATABASE_URL e gere SESSION_SECRET

# Banco local (uma vez, como superusuário): cria o usuário e os papéis do Supabase
sudo -u postgres psql -f db/local/setup-roles.sql
sudo -u postgres createdb -O onzetec onzetec

npm run db:migrate:local             # shim do Supabase + migrações
npm run db:seed:dev                  # conteúdo de demonstração + contas de teste
npm run dev                          # http://localhost:3000
```

Contas de desenvolvimento (login sem senha, só com `AUTH_MODE=dev`):

| E-mail | Perfil |
|---|---|
| `admin@onzetec.local` | Administrador (painel em `/admin`) |
| `assinante@onzetec.local` | Assinante com acesso de cortesia |
| `visitante@onzetec.local` | Conta gratuita |

## Testes

```bash
npm test            # unidade + banco (RLS, comunidade, fluxo comercial) — usa o banco onzetec_test
npm run test:e2e    # Playwright em build de produção, tela de 360 px, com auditoria axe — banco onzetec_e2e
npm run test:all    # lint + tipos + todos os testes
```

Bancos de teste: `createdb -O onzetec onzetec_test` e `createdb -O onzetec onzetec_e2e` (são recriados a cada execução).

## Estrutura

```
supabase/migrations/   Migrações SQL versionadas (esquema, RLS, funções)
db/local/              Shim do Supabase para PostgreSQL comum (só local/CI)
scripts/               Migração, seed de demonstração, conceder admin, mídia demo, backup e restauração
.github/workflows/     Reconciliação de pagamentos (de hora em hora) e backup diário criptografado
src/app/(site)/        Páginas públicas e do assinante
src/app/admin/         Painel administrativo
src/app/api/           Webhook, reconciliação, downloads, exportação de dados
src/components/        Design system (ui/) e componentes de domínio
src/lib/               Acesso a dados, auth, billing, vídeo, storage, busca, SEO
src/server/actions/    Server Actions (todas re-verificam a sessão no servidor)
tests/                 unit/, db/, e2e/
```
