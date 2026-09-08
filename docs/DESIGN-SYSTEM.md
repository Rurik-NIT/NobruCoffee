# Design system

Tokens, componentes e as regras que mantêm 30 telas parecendo o mesmo produto.

Fonte da verdade: [`src/styles/globals.css`](../src/styles/globals.css) (tokens)
e [`src/components/ui/`](../src/components/ui) (primitivos).

---

## Direção

O sistema é o **fundo da loja**, não um dashboard de SaaS.

A Nobru tem fachada preta com madeira, lousa de menu a giz, uniformes pretos com
lettering creme e uma vitrine quente. O sistema herda isso: **chrome escuro,
superfície de trabalho em papel creme, vermelho tijolo para ação**.

O que isso evita, deliberadamente: o azul genérico de painel administrativo, o
cinza-neutro de ferramenta corporativa, e o cream-com-serifa que virou padrão de
interface gerada por IA.

---

## Cor

Extraída pixel a pixel do selo da marca
([brief § 6.2](referencias/NOBRU_COFFEE_BRIEF.md)).

### Marca

| Token | Hex | Onde |
|---|---|---|
| `--color-nobru-500` | `#D24237` | Ação primária, ativo, marca. 47% dos pixels do logo |
| `--color-nobru-600` | `#B3352C` | Hover e pressionado |
| `--color-cream` | `#FFEBD6` | Texto sobre o chrome escuro. Lettering "No bru" |
| `--color-amber-nobru` | `#F7A96C` | Só decorativo. É a palavra "COFFEE" do selo |

> O âmbar sobre o vermelho tem contraste 2,37:1 — **nunca** corpo de texto.
> O creme sobre o vermelho dá 3,96:1: passa AA só em texto grande. Botão
> vermelho usa **branco** (4,59:1).

### Superfície e tinta

| Token | Hex | Uso |
|---|---|---|
| `--color-paper` | `#FAF3E9` | Fundo da página |
| `--color-paper-raised` | `#FFFDF8` | Cartão, tabela, drawer |
| `--color-paper-sunken` | `#F2E9DC` | Faixa de destaque, cabeçalho de tabela |
| `--color-ink` | `#1C1A19` | Sidebar, lousa, uniforme |
| `--color-body` | `#1C1A19` | Texto — 15,74:1 sobre o papel (AAA) |
| `--color-body-muted` | `#6B625B` | Apoio |
| `--color-body-subtle` | `#948A82` | Rótulo, placeholder |
| `--color-hairline` | `#E8DCC9` | Borda padrão |

### Semânticos

| Token | Hex | Origem |
|---|---|---|
| `--color-leaf` | `#2E7D5B` | Verde das plantas da fachada. Sucesso |
| `--color-caution` | `#B8730F` | Âmbar escurecido até virar legível. Alerta |
| `--color-danger` | `#C0392B` | Erro, perda, cancelamento |
| `--color-info` | `#6B4A2F` | Madeira do salão. Informação neutra |

Status **nunca** aparece só por cor: sempre com ícone ou texto.

### Cor em gráficos

Regra validada com o script de CVD do design system, **não escolhida a olho**
(`src/components/charts/index.tsx`):

| Séries | Regra |
|---|---|
| 1 | Vermelho da marca, matiz único, sem legenda — o título nomeia |
| 2 | `#D24237` + `#7A4E9B`. Único par próximo da paleta quente que passa em protanopia (ΔE 17,2), deuteranopia e tritanopia |
| 3+ | **Não se inventa um terceiro matiz.** Vira barra horizontal ordenada por magnitude, com rampa de um só matiz e o valor escrito em cada linha |

Vermelho + verde **reprova** (ΔE 5,8 em protanopia) — por isso o verde da marca
só aparece em status com ícone e texto, nunca como série. A regra de 3+ também é
a melhor forma: o operador compara "PIX vs Dinheiro" muito melhor em barras
rotuladas do que numa rosca.

Rampa sequencial (luminância estritamente decrescente, verificada):
`#FADCD4 → #EFA79A → #DE6E5D → #D24237 → #A02C24 → #6B1C17`

Todo gráfico traz **"Ver dados"** — a mesma informação em tabela, para leitor de
tela, impressão e conferência.

---

## Tipografia

Três famílias, três papéis. Nenhuma é a escolha padrão de dashboard.

| Papel | Fonte | Por quê |
|---|---|---|
| **Display** | Nunito 800/900 | Geométrica, ultra-bold, terminais arredondados — a mais próxima do lettering "No bru" do selo |
| **Interface** | Figtree 400–700 | Humanista quente, legível a 11px nas tabelas densas. Não é Inter |
| **Mono** | IBM Plex Mono | **Só** códigos (`PED-000123`), comanda e fechamento de caixa. O sotaque de papel de balcão |

Regras:

- Título usa `letter-spacing: -0.02em` e `text-wrap: balance`.
- **Dinheiro e quantidade sempre em algarismos tabulares** — `th`, `td` e
  `[data-numeric]` recebem `font-variant-numeric: tabular-nums` no CSS base, para
  a coluna "bater" na leitura.
- `.eyebrow` — caixa alta, `0.18em`, 11px: o rótulo de seção, como as etiquetas
  da vitrine.

---

## Forma

| Token | Valor | Uso |
|---|---|---|
| `--radius-control` | 10px | Botão, input, select |
| `--radius-card` | 14px | Cartão, painel, tabela |
| `--radius-panel` | 18px | Modal, drawer, destaque |

O raio vem do selo da marca, que é um quadrado arredondado. Generoso o bastante
para ser acolhedor, contido o bastante para não virar infantil.

Sombras são **quentes**, nunca cinza-azuladas:
`0 1px 2px rgba(28,26,25,.05), 0 10px 24px -14px rgba(28,26,25,.22)`.

---

## Elementos de assinatura

O que faz este sistema não ser confundível com outro. Três, e só três — o resto
é disciplina.

### 1. Comanda (`.ticket`)

Papel com **borda serrilhada** embaixo, feita com `mask-image` radial. Usada no
carrinho do PDV, no recibo e no fechamento de caixa. Documento financeiro parece
papel de verdade, com mono e o ⭕️ no topo.

### 2. Carimbo (`.stamp`)

`SOLD OUT`, `CANCELADO`, `PAGO`. Rotação de −4°, traço de 2px, caixa alta
espaçada — um carimbo de borracha batido à mão. Vem direto do vocabulário da
loja: os posts de "SOLD OUT!" no Instagram.

### 3. Lousa (`.chalkboard`)

Fundo preto fosco com textura pontilhada sutil e texto creme. É a sidebar, o
painel do login, o total do pagamento e o rodapé da landing — a lousa de menu da
fachada.

---

## Componentes

`src/components/ui/` — todos acessíveis, todos com os tokens acima.

| Arquivo | Traz |
|---|---|
| `button.tsx` | 7 variantes, 7 tamanhos (inclusive `touch` de 56px para o PDV), estado `loading` |
| `input.tsx` | Input, Textarea, busca com limpar, **MoneyInput** (digita em centavos, como maquininha), QuantityInput, **QuantityStepper** (alvos de 44px), data e data-hora nativos |
| `field.tsx` | Envelope de campo: rótulo, erro com `aria-describedby`, dica, seção |
| `table.tsx` | Tabela com scroll próprio, cabeçalho recessivo, coluna `numerico` alinhada à direita |
| `dialog.tsx` / `sheet.tsx` | Modal e drawer lateral (formulário longo sem perder a lista atrás) |
| `select.tsx` / `combobox.tsx` | Select do Radix e combobox com busca por nome, SKU e telefone |
| `toggles.tsx` | Checkbox, switch, radio, **SegmentedControl** de toque |
| `confirm.tsx` | Confirmação que **pede motivo** em ação que mexe em dinheiro — o texto vai para a auditoria |
| `states.tsx` | Vazio, erro, sem permissão, offline, esqueleto de tabela e de cartões |
| `badge.tsx` | Badge, **Stamp**, StatusDot com pulso |
| `toast.tsx` | Sonner com os tokens do sistema |

### Padrões (`components/patterns/`)

`PageHeader`, `Panel`, `KpiGrid`, `FiltrosLista` (filtro na URL), `PaginacaoUrl`,
`SeletorPeriodo`, `TotalRow`, `DefRow`.

---

## Responsividade

| Largura | O que muda |
|---|---|
| **375px** | Menu inferior com 4 atalhos; comanda do PDV vira drawer com barra de total fixa; tabela rola no próprio container |
| **768px** | Grade do PDV em 3 colunas; filtros lado a lado; KPIs em 2 colunas |
| **1024px** | Sidebar aparece; comanda do PDV fixa à direita; KPIs em 4 colunas |
| **1280px+** | Sidebar recolhível para 68px, liberando espaço para as tabelas |

Não é o desktop encolhido: no mobile a navegação **muda de forma**, e o PDV
reorganiza o fluxo em vez de espremer as mesmas colunas.

---

## Acessibilidade

- Contraste de texto ≥ 4,5:1 (corpo em 15,74:1)
- Foco visível: `outline: 2px solid var(--color-nobru-500)` com offset
- Alvo de toque de 44px no PDV e nos steppers
- `aria-invalid` e `aria-describedby` nos campos com erro
- Status com ícone e texto, nunca só cor
- `prefers-reduced-motion` respeitado no CSS base
- Gráfico sempre com tabela alternativa
- Rótulo em todo controle sem texto visível

---

## Movimento

Pouco e curto. Nenhuma animação de transição de página.

- `nobru-in` (0,28s) — entrada de modal e drawer
- `nobru-fade` (0,2s) — dropdown, popover, tooltip
- Hover de cartão do PDV: `-translate-y-0.5`
- Botão pressionado: `translate-y-px`
- Skeleton com brilho no tom do papel

---

## Impressão

`@media print` entrega comanda de 80 mm: margem de 4 mm, sombra removida,
serrilha escondida, `.no-print` fora. Recibo e fechamento de caixa são
imprimíveis direto do navegador, sem tela intermediária.
