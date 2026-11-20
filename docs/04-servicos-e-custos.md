# Serviços externos e custos

> Configuração escolhida: **custo mínimo, segura, para pelo menos 1.000 usuários**.
> Valores consultados em novembro de 2026, em boa parte em sites de terceiros — **confirme no site de cada fornecedor antes de contratar**. Nenhum serviço foi contratado.

## Serviços

| Serviço | Para quê | Plano | Custo |
|---|---|---|---|
| **Supabase** | Banco PostgreSQL, login (Auth) e arquivos (Storage) | Free | US$ 0 |
| **Netlify** | Hospedagem do site | Free (permite uso comercial) | US$ 0 |
| **Bunny Stream** | Vídeos com streaming adaptativo e links assinados | Pago por uso | ≈ US$ 1–15/mês |
| **Resend** | E-mails de cadastro, código e senha (SMTP do Supabase) | Free (3.000/mês) | US$ 0 |
| **GitHub Actions** | Backup diário criptografado + reconciliação de pagamentos de hora em hora | Incluído no GitHub | US$ 0 |
| **Mercado Pago** | Assinaturas (cartão) e livros (Pix, cartão, boleto) | Sem mensalidade | Taxa por venda |
| **Registro.br** | Domínio `.com.br` | Anual | ≈ R$ 40/ano |

**Total previsto para ~1.000 usuários: ≈ US$ 1 a 15/mês + domínio + taxas do Mercado Pago.** O único custo que cresce com o uso é o vídeo.

## Por que cabe no gratuito (1.000 usuários)

| Recurso | Limite gratuito | Uso estimado com 1.000 alunos |
|---|---|---|
| Banco (Supabase) | 500 MB | ~20–50 MB (contas, progresso, comentários, conteúdos) |
| Contas ativas (Supabase Auth) | 50.000/mês | 1.000 |
| Arquivos (Supabase Storage) | 1 GB | Capas e imagens de passos: ~100–300 MB. Livros em PDF podem pesar — acompanhar |
| Tráfego do site (Netlify) | ~30 GB/mês (300 créditos) | ~10–20 GB: páginas e scripts. **Vídeos não passam pela Netlify** |
| E-mails (Resend) | 3.000/mês, 100/dia | Cadastros e recuperações de senha: poucas centenas |

## Vídeo — a conta que importa

Estimativa com vídeo em 720p (≈ 10 MB por minuto assistido):

| Cenário | Minutos assistidos/mês | Tráfego | Bunny Stream* | Cloudflare Stream (comparação) |
|---|---|---|---|---|
| Uso leve (15 min/aluno) | 15.000 | ~150 GB | ≈ US$ 1,50–7 | ≈ US$ 20 |
| Uso médio (30 min/aluno) | 30.000 | ~300 GB | ≈ US$ 3–14 | ≈ US$ 35 |
| Uso alto (60 min/aluno) | 60.000 | ~600 GB | ≈ US$ 6–27 | ≈ US$ 65 |

\* Faixa entre a tarifa de entrega mais barata (Europa/EUA, US$ 0,01/GB) e uma tarifa maior estimada para a América do Sul — **confirme a tarifa da região na calculadora da Bunny**. Armazenamento: US$ 0,01/GB/mês (100 aulas de 10 min ≈ 10 GB ≈ US$ 0,10). Mínimo da Bunny: US$ 1/mês.

O Cloudflare Stream continua disponível no código (`VIDEO_PROVIDER=cloudflare_stream`), caso prefira no futuro.

## Taxas do Mercado Pago

- Cartão de crédito (vendas online): 3,98% a 4,98%, conforme o prazo de recebimento (página oficial). **Condições específicas de Assinaturas: confirmar no painel.**
- Pix (livros): 0,99%.

## Limites dos planos gratuitos e como foram tratados

| Limite | Tratamento |
|---|---|
| Supabase Free **sem backup automático confiável** | Backup diário criptografado pelo GitHub Actions (`.github/workflows/backup.yml`), com restauração testada (`scripts/restore-db.sh`) |
| Supabase Free **pausa após 7 dias sem uso** | A reconciliação de hora em hora consulta o banco e o mantém ativo |
| Netlify Free **pausa o site se acabarem os créditos** | Vídeos fora da Netlify; acompanhar o consumo no painel. Se crescer: plano pago da Netlify |
| Sem suporte nem garantia de disponibilidade | Aceitável no início |
| GitHub desativa tarefas agendadas após 60 dias sem atividade no repositório (repositórios públicos) | Fazer qualquer commit ou reativar em Actions; o GitHub avisa por e-mail |

## Quando começar a pagar

| Gatilho | Mudança | Custo |
|---|---|---|
| ~50 assinaturas pagantes, ou dados que não podem ser perdidos de jeito nenhum | Supabase Pro (backup diário oficial, restauração por ponto no tempo, sem pausa) | US$ 25/mês |
| Créditos da Netlify perto do fim | Plano pago da Netlify, ou Vercel Pro | ≈ US$ 9–20/mês |
| Mais de 3.000 e-mails/mês | Plano pago do Resend | ≈ US$ 20/mês |

## Fontes

- [Bunny Stream — preços oficiais](https://docs.bunny.net/stream/pricing)
- [Bunny.net — análise de preços 2026](https://www.bitdoze.com/bunny-net-review/)
- [Comparativo de custo Mux × Cloudflare × Bunny](https://apicostcalc.com/mux-vs-cloudflare-stream-vs-bunny-stream-cost-calculator.html)
- [Netlify — limites do plano gratuito 2026](https://netli.fyi/blog/netlify-free-plan-limits-2026)
- [Netlify — Next.js 16](https://www.netlify.com/changelog/next-js-16-deploy-on-netlify/)
- [Supabase — limites do plano gratuito 2026](https://dev.to/mahdi_benrhouma_fe1c6005/supabase-free-tier-limits-in-2026-what-you-actually-get-and-when-you-will-hit-them-4mhe)
- [Cloudflare Stream — preços](https://developers.cloudflare.com/stream/pricing/)
- [Mercado Pago — Checkout e taxas](https://www.mercadopago.com.br/ferramentas-para-vender/check-out)
- [Mercado Pago — custo do Pix](https://www.mercadopago.com.br/blog/quanto-custa-receber-pagamentos-via-pix-e-codigo-qr)
