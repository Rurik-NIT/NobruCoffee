<div align="center">

# ⭕️ Nobru Coffee

**O sistema operacional de uma cafeteria que produz o que vende.**

PDV · Ficha técnica · Produção · Estoque · Compras · Clientes · Encomendas · Caixa · Financeiro

</div>

---

## O que é

Sistema interno de gestão para a [Nobru Coffee e Donuts](https://www.instagram.com/nobrucoffee/)
(Av. São João, 390 — São José dos Campos/SP), construído do zero e desenhado para
o problema real de quem **fabrica e vende no mesmo balcão**: a venda precisa
saber quanto de farinha saiu, a compra precisa atualizar a margem do donut, e o
caixa precisa fechar no fim do turno.

A raiz do domínio é o **site público da loja** — história, cardápio, horário e
endereço, sem nenhuma menção ao sistema. Quem trabalha lá entra por `/system`.

| | |
|---|---|
| **Manual de uso ponta a ponta** | [`docs/MANUAL-DE-USO.md`](docs/MANUAL-DE-USO.md) |
| **Decisões de arquitetura** | [`docs/ARQUITETURA.md`](docs/ARQUITETURA.md) |
| **Modelo de dados** | [`docs/BANCO-DE-DADOS.md`](docs/BANCO-DE-DADOS.md) |
| **Design system** | [`docs/DESIGN-SYSTEM.md`](docs/DESIGN-SYSTEM.md) |
| **Deploy** | [`docs/DEPLOY.md`](docs/DEPLOY.md) |
| **Pendências com o cliente** | [`docs/PENDENCIAS-DO-CLIENTE.md`](docs/PENDENCIAS-DO-CLIENTE.md) |

---

## Stack

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | **Next.js 15** (App Router, Server Actions) | Renderização no servidor com mutação tipada ponta a ponta, sem camada de API só para repassar JSON |
| Linguagem | **TypeScript** estrito | O domínio tem dinheiro e estoque; erro de tipo aqui é erro de saldo |
| Banco | **PostgreSQL 16** | Transação real, `Decimal` exato, `increment` atômico |
| ORM | **Prisma 6** | Schema como fonte da verdade e migrations versionadas |
| UI | **Tailwind CSS 4** + **Radix UI** | Tokens no CSS, acessibilidade dos primitivos resolvida |
| Auth | Sessão opaca própria (`scrypt` + cookie httpOnly) | Sem dependência externa; revogação real por linha no banco |
| Gráficos | SVG à mão | Cinco formas simples, controle total, zero dependência |
| PWA | Manifest + service worker próprio | Instalável, com escopo offline honesto |

Sem biblioteca de estado global, sem cliente HTTP, sem biblioteca de formulário:
o dado vem do Server Component e volta pela Server Action.

---

## Começar

**Pré-requisitos:** Node 20.11+, um gerenciador de pacotes (bun, pnpm ou npm) e
um PostgreSQL 14+ alcançável.

```bash
bun install
cp .env.example .env          # aponte DATABASE_URL e gere o AUTH_SECRET
bun run dev                   # http://localhost:3000
```

`dev` chama [`scripts/preparar-banco.mjs`](scripts/preparar-banco.mjs) antes de
subir o servidor. O script cria o banco se ele não existir, aplica o schema se
as tabelas faltarem e popula os 45 dias de histórico se estiver vazio — nesta
ordem, e nada disso de novo nas execuções seguintes: com tudo de pé ele sai em
menos de meio segundo. Quando encontra algo que não pode resolver sozinho, ele
imprime o comando que resolve.

O banco pode ser **qualquer** PostgreSQL — Neon, Supabase, Railway, RDS, um
Postgres instalado na máquina, ou o `docker compose` incluído. O sistema não
depende de Docker; o `docker-compose.yml` existe só como conveniência.

**O passo que precisa de superusuário.** Criar um *papel* no PostgreSQL não é
algo que o script possa fazer — exige credencial de administrador do banco. Num
Postgres local, isto roda uma vez:

```bash
psql -U postgres -c "CREATE ROLE nobru LOGIN PASSWORD 'nobru' CREATEDB;" -c "CREATE DATABASE nobru OWNER nobru;"
```

Num banco gerenciado (Neon, Supabase) o usuário já vem criado: basta colar a
`DATABASE_URL` no `.env`.

Gerar o segredo de sessão:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

**No VS Code:** `Ctrl+Shift+B` roda a tarefa **Rodar**. `F5` sobe com depurador
e abre o navegador conectado. As demais tarefas estão em
[`.vscode/tasks.json`](.vscode/tasks.json).

### Acessos da base de demonstração

O login aceita **e-mail ou apelido de acesso** — o apelido existe para não
digitar o endereço inteiro no iPad do balcão.

| Apelido | Senha | Cargo | E-mail |
|---|---|---|---|
| `admin` | `admin` | Administrador | `jessica@nobrucoffee.com.br` |
| `gerente` | `nobru2026` | Gerente | `bruno@nobrucoffee.com.br` |
| `camila` | `nobru2026` | Atendente | `camila@nobrucoffee.com.br` |
| `diego` | `nobru2026` | Atendente | `diego@nobrucoffee.com.br` |
| `aline` | `nobru2026` | Produção | `aline@nobrucoffee.com.br` |

`admin/admin` é credencial de teste local. Troque antes de qualquer uso real —
o cargo Administrador tem acesso total, inclusive a permissões.

O seed gera 45 dias com ~2.000 vendas, produção diária, compras recebidas,
encomendas, perdas e contas — o painel já abre com números que fazem sentido.

---

## Variáveis de ambiente

| Variável | Obrigatória | Padrão | Para quê |
|---|---|---|---|
| `DATABASE_URL` | **sim** | — | Conexão PostgreSQL |
| `AUTH_SECRET` | **sim** | — | Segredo de sessão (48 bytes aleatórios) |
| `NEXT_PUBLIC_APP_URL` | não | `http://localhost:3000` | URL pública, usada em cookies e PWA |
| `STORE_TIMEZONE` | não | `America/Sao_Paulo` | Fuso do fechamento de caixa e relatórios |
| `SESSION_TTL_DAYS` | não | `7` | Validade da sessão |
| `NODE_ENV` | não | `development` | `production` liga cookie `secure` e o service worker |

O `.env` é ignorado pelo git. Nenhum segredo vai para o repositório.

---

## Scripts

| Comando | O que faz |
|---|---|
| `pnpm dev` | Desenvolvimento em `:3000` |
| `pnpm build` | Build de produção (roda `prisma generate` antes) |
| `pnpm start` | Serve o build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm verificar:rotas` | Confere que todo item do menu tem página e toda permissão existe (roda sem banco) |
| `pnpm gerar:icones` | Regera os ícones do PWA a partir da paleta da marca |
| `pnpm db:up` / `db:down` | Postgres local via docker compose (opcional) |
| `pnpm db:push` | Aplica o schema sem migration (desenvolvimento) |
| `pnpm db:migrate` | Cria e aplica migration versionada |
| `pnpm db:deploy` | Aplica migrations em produção |
| `pnpm db:seed` | Popula a base de demonstração |
| `pnpm db:reset` | Zera e repopula |
| `pnpm db:studio` | Prisma Studio |
| `pnpm setup` | `db:up` + `db:push` + `db:seed` (requer Docker) |

---

## Estrutura

```
prisma/
  schema.prisma            Modelo relacional (40 tabelas)
  seed.ts                  45 dias de operação sintética
scripts/
  gerar-icones.mjs         Gera os ícones do PWA sem dependência
  verificar-rotas.mjs      Garante que nenhum link do menu leva a 404
src/
  app/
    (marketing)/           Site público da loja (raiz do domínio)
    (auth)/system/         Login do sistema
    (app)/                 Sistema autenticado — 31 rotas
    offline/               Página servida pelo service worker
    layout.tsx             Fontes, tokens, toasts
  components/
    ui/                    Design system (botão, tabela, drawer, diálogo…)
    charts/                Kit de gráficos SVG
    app-shell/             Sidebar, topbar, marca, PWA
    patterns/              Cabeçalho de página, filtros de URL, painéis
  server/
    auth/                  Sessão, senha, catálogo de permissões
    modules/<domínio>/     service.ts (leitura) · actions.ts (escrita) · schemas.ts
    action.ts              Envelope único das Server Actions
    audit.ts               Log de auditoria
    db.ts                  Cliente Prisma
  lib/                     Formatação pt-BR, dinheiro, utilidades
  middleware.ts            Portaria de rota (cookie), não a barreira de segurança
docs/                      Manual, arquitetura, banco, design, deploy
```

**Regra de camadas:** componente não fala com o banco. Página (Server Component)
chama `service.ts`; interação chama `actions.ts`; a Server Action valida com
Zod, exige permissão, executa a transação e registra auditoria.

---

## Funcionalidades implementadas

<details>
<summary><b>Vendas</b></summary>

- PDV touch com grade por categoria, busca, variações, adicionais e combos
- Venda de balcão em uma transação (carrinho local) e pedido persistente para
  mesa/delivery
- Tipos: balcão, viagem, mesa, delivery, encomenda, iFood
- Pagamento dividido em até 4 formas, cálculo de troco, cupom e resgate de pontos
- Desconto com limite por cargo e motivo obrigatório
- Comanda de 80 mm para impressora térmica
- Fila de preparo com tempo aberto e avanço de status
- Cancelamento e estorno com devolução de estoque, caixa e pontos
- Mapa de mesas: abrir, transferir, juntar, dividir conta, reservar
</details>

<details>
<summary><b>Produtos e produção</b></summary>

- Catálogo com custo, margem, giro de 30 dias e SOLD OUT
- Categorias, adicionais (com baixa de insumo), variações com fator de ficha, combos
- Fichas técnicas versionadas com perda técnica e custo por insumo
- Recálculo de custo em massa a partir do custo médio atual
- Produção do dia: sugestão pela média de 7 dias, apontamento e conclusão
  transacional
- Perdas com motivo, custo estimado e ranking por item e por motivo
</details>

<details>
<summary><b>Estoque e compras</b></summary>

- Livro de movimentos com saldo após cada lançamento
- Custo médio ponderado recalculado a cada entrada
- Lotes com validade e painel de vencimento
- Movimento manual, ajuste auditado e inventário com folha de contagem
- Fornecedores, pedidos de compra, recebimento parcial e sugestão de reposição
  agrupada por fornecedor
</details>

<details>
<summary><b>Clientes, caixa e financeiro</b></summary>

- CRM com histórico, ticket médio, favoritos e dias sem comprar
- Fidelidade com extrato, ajuste manual e cupons (inclusive de aniversário)
- Encomendas com fluxo, sinal, geração de ordem de produção e agenda
- Caixa: abertura, sangria, suprimento, despesa, fechamento às cegas e
  conferência de divergência
- Contas a pagar (com recorrência que se recria) e a receber
- Fluxo de caixa diário, resultado e margem
</details>

<details>
<summary><b>Sistema</b></summary>

- RBAC com 53 permissões, 4 cargos padrão e editor de cargos
- Log de auditoria com antes/depois, IP e horário
- Central de avisos idempotente (estoque, validade, encomenda, conta, caixa,
  aniversário)
- Relatórios de vendas, produtos, produção e estoque
- PWA instalável com escopo offline honesto
- Estados de carregando, vazio, erro, sem permissão e offline em todas as telas
</details>

---

## Segurança

- Senha com **scrypt** (memory-hard, parâmetros gravados no próprio hash,
  re-hash transparente ao endurecer)
- **Sessão opaca**: o cookie tem o token, o banco só o SHA-256 — um dump não
  permite montar sessão. Revogação é um `UPDATE`
- Cookie `httpOnly`, `sameSite=lax`, `secure` em produção
- **Autorização no servidor** em toda Server Action (`exigirPermissao`); o menu
  escondido é conveniência, não barreira
- Validação de entrada com Zod em toda mutação
- Rate limit no login (8 tentativas / 10 min por IP+e-mail)
- Erro de banco nunca chega à tela — o envelope de ação traduz e loga
- Cabeçalhos `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
  `Permissions-Policy`

---

## Estado de verificação

O que foi executado neste repositório:

| Verificação | Estado |
|---|---|
| `prisma validate` | ✅ schema válido |
| `tsc --noEmit` | ✅ sem erro |
| `next lint` | ✅ sem aviso |
| `next build` | ✅ 40 rotas compilam |
| `verificar:rotas` | ✅ 31 itens de menu, 53 permissões, nenhum link órfão |
| `db:push` + `db:seed` + fluxo de venda | ⚠️ **não executado** — a máquina de desenvolvimento não tinha PostgreSQL disponível |

Ou seja: **nenhuma consulta chegou a rodar contra um banco real**. O schema é
válido e todo o código compila e passa a tipagem, mas o primeiro `pnpm db:push
&& pnpm db:seed` é o passo que ainda precisa ser feito — e é onde qualquer
divergência entre schema e consulta apareceria. O workflow em
`.github/workflows/ci.yml` faz exatamente isso com um Postgres de serviço.

---

## Limites conhecidos

Ver [`docs/MANUAL-DE-USO.md` § 13](docs/MANUAL-DE-USO.md#13-o-que-o-sistema-ainda-não-faz).
Em resumo: **sem emissão fiscal**, **sem venda offline**, **sem integração com
iFood**, e a interface opera **uma loja por vez** (o banco já é multi-loja).

## Próximos passos

| Prioridade | Item |
|---|---|
| Alta | Migrations versionadas (`db:migrate`) no lugar de `db:push` para produção |
| Alta | Testes automatizados do núcleo transacional (venda, produção, recebimento) |
| Alta | Upload de imagem de produto (hoje o campo aceita URL) |
| Média | Integração fiscal NFC-e |
| Média | Visão consolidada multi-loja |
| Média | Rate limit em Redis (hoje em memória, por processo) |
| Média | Modo noturno para o salão com luz baixa |
| Baixa | Integração iFood, exportação de relatórios em PDF/Excel |
| Baixa | Idiomas `en` e `es` (a landing já está preparada) |
