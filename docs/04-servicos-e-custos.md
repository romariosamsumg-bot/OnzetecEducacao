# Serviços externos e custos

> Valores consultados em novembro de 2026 em páginas públicas; **confirme no site de cada fornecedor antes de contratar**. Dólar não convertido (varia). Nenhum serviço foi contratado.

## Serviços necessários

| Serviço | Para quê | Obrigatório no lançamento | Observação |
|---|---|---|---|
| **Supabase** (Pro) | Banco PostgreSQL, Auth, Storage, backups diários | Sim | Plano gratuito pausa projetos inativos e não tem backup adequado — não usar para operação comercial |
| **Vercel** (Pro) ou outro host Node | Hospedagem do site, cron de reconciliação | Sim | O plano Hobby proíbe uso comercial |
| **Cloudflare Stream** | Vídeos com streaming adaptativo e URLs assinadas | Sim (para vídeos pagos) | Cobrança pré-paga por minutos armazenados |
| **Mercado Pago** | Assinaturas (cartão) e compras avulsas (Pix, cartão, boleto) | Sim (para vender) | Sem mensalidade; taxa por transação |
| **E-mail transacional** (ex.: Resend, Amazon SES, Brevo) | Confirmação de cadastro, código de acesso, recuperação de senha via SMTP do Supabase | Sim | O SMTP padrão do Supabase tem limite baixo e não serve para produção |
| **Domínio** `.com.br` (Registro.br) | Endereço próprio e e-mail | Sim | — |
| Monitoramento de erros (ex.: Sentry) | Alertas de falhas | Recomendado | Não integrado no código ainda |

## Custos fixos mensais (estimativa)

| Item | Valor de referência |
|---|---|
| Supabase Pro | US$ 25/mês por organização (inclui US$ 10 de crédito de computação — cobre a instância Micro) |
| Vercel Pro | ≈ US$ 20/mês por membro da equipe (1 pessoa) — **[confirmar no site]** |
| Cloudflare Stream | mínimo de US$ 5 por bloco de 1.000 minutos armazenados (pré-pago) |
| E-mail transacional | US$ 0 a 20/mês até alguns milhares de e-mails |
| Domínio .com.br | ≈ R$ 40/ano |
| **Total fixo aproximado** | **≈ US$ 50–70/mês** + domínio |

## Custos variáveis

| Item | Como cresce | Referência |
|---|---|---|
| Armazenamento de vídeo | por minuto de vídeo publicado | US$ 5 / 1.000 min armazenados/mês (ex.: 100 aulas de 10 min = 1.000 min ≈ US$ 5/mês) |
| Entrega de vídeo | por minuto assistido | US$ 1 / 1.000 min (ex.: 1.000 assinantes × 60 min/mês = 60.000 min ≈ US$ 60/mês) |
| Taxa do Mercado Pago — cartão | % de cada cobrança | 3,98% a 4,98% conforme prazo de recebimento (página oficial do Checkout) — **condições específicas de Assinaturas: confirmar no painel** |
| Taxa do Mercado Pago — Pix (livros) | % de cada venda | 0,99% |
| Banco e Auth acima do incluído | armazenamento > 8 GB, usuários ativos > 100 mil | US$ 0,125/GB; US$ 0,00325/MAU — irrelevante no início |
| Banda da Vercel acima do incluído | tráfego de páginas | Baixo: vídeos não passam pela Vercel |

**Leitura prática:** com poucas centenas de assinantes, a infraestrutura fica perto de US$ 60–120/mês; o custo que mais cresce é a **taxa de pagamento** (proporcional à receita) e, depois, a **entrega de vídeo** (proporcional ao uso).

## Fontes

- [Cloudflare Stream — preços](https://developers.cloudflare.com/stream/pricing/)
- [Mercado Pago — Checkout e taxas](https://www.mercadopago.com.br/ferramentas-para-vender/check-out)
- [Mercado Pago — custo do Pix](https://www.mercadopago.com.br/blog/quanto-custa-receber-pagamentos-via-pix-e-codigo-qr)
- [Supabase — preços](https://supabase.com/pricing)
