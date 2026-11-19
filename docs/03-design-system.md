# Design System — "Editorial calmo"

Fonte da verdade dos tokens: `src/app/globals.css` (`@theme`). Componentes: `src/components/ui/`.

## Princípios

1. **Uma ação principal por tela**, em laranja. O resto é secundário (marinho) ou contornado.
2. **Ícone nunca sozinho** em ações: sempre com texto visível (exceção: setas de ordenar no painel, que têm `aria-label` e `title`).
3. **Tudo grande e com respiro:** texto base 18 px, controles ≥ 48 px de altura, alvos de toque ≥ 44 × 44 px.
4. **Previsível:** navegação de 5 itens sempre no mesmo lugar; "Voltar" com texto em todas as telas internas.
5. **Sem pressa:** nada se move sozinho, nada toca sozinho. Animações ≤ 200 ms, desligáveis.

## Cores (contraste medido, WCAG 2.2)

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `navy-900` | `#0B2545` | Títulos, cabeçalhos, botão secundário | 15,4:1 sobre branco |
| `orange-500` | `#F47B20` | **Fundo** do botão primário, com texto `navy-950` | 5,6:1 |
| `orange-700` | `#A84300` | Links e destaques em texto | 6,1:1 sobre branco |
| `ink` | `#14181F` | Texto corrido | 16,8:1 sobre `paper` |
| `ink-soft` | `#3D4654` | Texto secundário | > 9:1 |
| `ink-muted` | `#566070` | Metadados | 6,4:1 |
| `paper` | `#FAF8F4` | Fundo de leitura (branco quente, menos ofuscante) | — |
| `success-700` / `danger-700` / `warning-800` | `#1E7A46` / `#B42318` / `#8A5300` | Estados | ≥ 5,3:1 |

> O laranja da marca **com texto branco** teria 2,7:1 e reprovaria — por isso o botão primário usa texto marinho.

## Tipografia

- **Atkinson Hyperlegible Next** (Braille Institute, via `next/font`, auto-hospedada no build), pesos 400–700.
- Escala: corpo 1 rem (18 px) · secundário 0,95 rem · metadado 0,85 rem (mín. ~15 px) · H2 1,35 rem · H1 1,8–2,2 rem.
- Controle **Tamanho do texto** (cabeçalho e Minha conta): 100% / 115% / 130% da raiz; aplicado antes da pintura por script inline (sem "piscar"), salvo em cookie e no perfil.
- Toda a interface usa `rem`: ampliar o texto aumenta também espaçamentos e controles.

## Componentes

| Componente | Arquivo | Notas |
|---|---|---|
| `Button`, `ButtonLink` | `ui/button.tsx` | Variantes: primary, secondary, outline, ghost, danger, inverse; tamanhos sm (44 px), md (48 px), lg (56 px); estado `loading` com `aria-busy` |
| `TextField`, `TextArea`, `SelectField`, `Checkbox`, `RadioCard` | `ui/form.tsx` | Rótulo sempre visível, dica e erro ligados por `aria-describedby`, erro com ícone + texto; IDs com escopo por formulário (o Next.js mantém páginas ocultas no DOM) |
| `Alert` | `ui/primitives.tsx` | info/success/warning/error; `live` usa `role=status`/`alert` |
| `Card`, `Badge`, `AccessBadge`, `DemoBadge` | `ui/primitives.tsx` | "Gratuito", "Assinantes", "Demonstração" sempre em texto |
| `PageHeader`, `BackLink`, `SectionHeader` | `ui/primitives.tsx` | Hierarquia consistente; "Ver tudo" com complemento para leitores de tela |
| `EmptyState`, `LoadingBlock`, `Skeleton` | `ui/primitives.tsx` | Estados vazios com próxima ação; carregamento anunciado |
| `ProgressBar` | `ui/primitives.tsx` | `role=progressbar` com rótulo |
| Navegação | `layout/main-nav.tsx` | Barra inferior (celular, 64 px de altura por item) e cabeçalho (≥ 1024 px) |
| Cartões de conteúdo | `content/cards.tsx` | Área clicável inteira, título como link real |
| Reprodutor | `player/video-player.tsx` | Controles com texto, teclado (espaço, setas), anúncios para leitor de tela |
| Comunidade | `community/*` | Curtir/Salvar com `aria-pressed`, comentários em texto puro |
| Editores do painel | `admin/editors.tsx` | Etapas numeradas com imagem, blocos de artigo, envio de imagem/vídeo — sem HTML |

## Acessibilidade — checklist aplicado

- [x] `lang="pt-BR"`, *skip link* "Pular para o conteúdo", landmarks (`header`, `nav`, `main`, `footer`).
- [x] Foco visível (contorno laranja de 3 px) em todos os elementos interativos.
- [x] Zoom do navegador permitido; texto a 130% + largura equivalente a 200% de zoom sem rolagem horizontal (teste E2E).
- [x] Formulários: rótulos, erros explicativos em português, foco não se perde ao validar.
- [x] Vídeo: sem *autoplay*, legendas (WebVTT/HLS), transcrição, velocidade, controles nomeados.
- [x] `prefers-reduced-motion` + preferência "Reduzir animações" na conta.
- [x] Nada comunicado só por cor ou só por ícone.
- [x] Auditoria automática axe (WCAG 2.0/2.1/2.2 A e AA) em 14 páginas públicas + páginas do assinante e do painel — **0 violações**.
- [ ] **Pendente (humano):** teste com TalkBack no Android, com pessoas 50+ reais e com leitores de tela de desktop (NVDA).
