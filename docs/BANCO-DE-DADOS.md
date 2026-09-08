# Banco de dados

PostgreSQL 16 · Prisma 6 · 40 tabelas · fonte da verdade em
[`prisma/schema.prisma`](../prisma/schema.prisma).

---

## Convenções

| Regra | Motivo |
|---|---|
| Tabelas e colunas em **português, snake_case** (via `@@map`/`@map`) | O domínio é falado em português na loja; `pedido_itens` é mais legível que `order_items` para quem dá manutenção aqui |
| PK `uuid` com `gen_random_uuid()` no **default do banco** | Nativo desde o PG13; funciona também para inserção por SQL cru |
| `criado_em` / `atualizado_em` em toda tabela mutável | Auditoria e ordenação |
| Dinheiro `Decimal(12,2)`, quantidade `Decimal(12,3)`, custo unitário `Decimal(12,4)` | **Nunca `Float`.** Ponto flutuante em dinheiro é erro de saldo |
| `loja_id` em tudo que é operacional | O schema já é multi-loja |
| `onDelete: Cascade` em filho, `SetNull` em referência opcional | Excluir uma loja limpa a operação; excluir um usuário não apaga a venda dele |

---

## Mapa das tabelas

### Tenancy
`empresas` → `lojas` → `configuracoes`

`configuracoes` é 1:1 com a loja e guarda as regras que o sistema aplica em
operação: desconto máximo do operador, pontos por real, alerta de validade, se a
venda baixa estoque.

### Identidade
`cargos` · `usuarios` · `sessoes`

- `cargos.permissoes` é `String[]` com as chaves do catálogo em código.
  `['*']` = acesso total (só o Administrador).
- `sessoes.token_hash` é **único** e guarda só o SHA-256 do token do cookie.

### Catálogo
`categorias` · `produtos` · `produto_variacoes` · `adicionais` ·
`produto_adicionais` · `combo_itens`

- `produtos.tipo` (`SIMPLES`, `PRODUZIDO`, `PREPARADO`, `COMBO`) decide o que a
  venda faz no estoque.
- `ativo` × `disponivel`: existe no catálogo × pode ser vendido hoje (SOLD OUT).
- `adicionais.ingrediente_id` liga o adicional a um insumo; vender já baixa.

### Estoque
`ingredientes` · `lotes` · `movimentos_estoque` · `inventarios` ·
`inventario_itens`

- `movimentos_estoque` aponta para `ingrediente_id` **ou** `produto_id` — um
  livro só para os dois.
- `saldo_apos` grava o saldo resultante na própria linha: dá para reconstruir o
  estoque de qualquer dia sem somar tudo desde o início.
- `origem_tipo` / `origem_id` amarram o movimento ao documento que o causou.

### Fichas técnicas
`fichas_tecnicas` · `ficha_tecnica_itens`

Versionadas por produto (`@@unique([produtoId, versao])`), com só uma `ativa`.
`custo_total` e `custo_unitario` ficam **congelados** na versão.

### Produção
`ordens_producao` · `ordem_producao_itens` · `perdas`

`perdas` aceita produto **ou** insumo, com motivo e custo estimado.

### Compras
`fornecedores` · `pedidos_compra` · `pedido_compra_itens` · `recebimentos` ·
`recebimento_itens`

`quantidade_recebida` no item do pedido é o que permite recebimento parcial sem
quebrar o documento.

### Clientes
`clientes` · `transacoes_fidelidade` · `cupons`

- `clientes` guarda métricas agregadas (`total_gasto`, `total_pedidos`,
  `ultima_compra_em`, `pontos`) mantidas na transação da venda.
- `@@unique([lojaId, telefone])`: o telefone é a chave do cliente no balcão.
- `transacoes_fidelidade.saldo_apos` dá extrato auditável de pontos.

### Vendas
`mesas` · `pedidos` · `pedido_itens` · `pedido_item_adicionais`

- **Não existe tabela `vendas`.** Venda = `pedido` com `status = FINALIZADO`.
- `pedido_itens` congela `nome`, `preco_unitario` e `custo_unitario` no momento
  da venda — mudar o preço amanhã não reescreve o faturamento de ontem.
- `pedidos.custo_total` é o CMV do pedido, congelado.

### Caixa e pagamento
`caixas` · `movimentos_caixa` · `formas_pagamento` · `pagamentos`

- `formas_pagamento.conta_no_caixa` separa dinheiro de cartão na conferência —
  é o campo que faz o fechamento fazer sentido.
- `movimentos_caixa` registra **todo** pagamento (para o resumo por forma), e a
  aritmética da gaveta filtra por `conta_no_caixa`.
- `caixas.diferenca` guarda a divergência apurada, sem bloquear o fechamento.

### Financeiro
`categorias_financeiras` · `contas_pagar` · `contas_receber`

Despesa = conta a pagar liquidada. Receita = conta a receber liquidada.
`contas_pagar.recorrencia` faz a próxima parcela nascer sozinha ao liquidar.

### Sistema
`notificacoes` · `logs_sistema` · `contadores`

- `notificacoes` tem `@@unique([lojaId, chave])`, com a chave carregando a data —
  rodar o gerador dez vezes no mesmo dia não duplica o aviso.
- `contadores` são as sequências por loja dos códigos legíveis
  (`PED-000123`), incrementadas atomicamente.

---

## Índices que importam

```prisma
@@index([lojaId, finalizadoEm])    // pedidos — base de todo relatório de vendas
@@index([lojaId, status])          // pedidos, encomendas, compras, contas
@@index([ingredienteId, criadoEm]) // movimentos — extrato de um insumo
@@index([origemTipo, origemId])    // movimentos — o estorno busca por aqui
@@index([lojaId, dataEntrega])     // encomendas — a agenda
@@index([validade])                // lotes — o painel de vencimento
@@index([entidade, entidadeId])    // auditoria — histórico de um registro
```

---

## Constraint que o Prisma não expressa

`movimentos_estoque` deve ter **exatamente um** entre `ingrediente_id` e
`produto_id`. O serviço garante isso, mas a regra merece existir no banco.
Adicione na primeira migration versionada:

```sql
ALTER TABLE movimentos_estoque
  ADD CONSTRAINT movimento_um_alvo
  CHECK (num_nonnulls(ingrediente_id, produto_id) = 1);
```

Vale o mesmo para `perdas` (produto **ou** insumo) e `pagamentos` (pedido **ou**
encomenda).

---

## Migrations

Em desenvolvimento, `pnpm db:push` é suficiente. **Para produção, migre para
migrations versionadas** antes do primeiro deploy:

```bash
pnpm db:migrate --name inicial
pnpm db:deploy
```

Está listado como prioridade alta no README.

---

## Seed

`prisma/seed.ts` gera 45 dias de operação com RNG determinístico (semente
`20160802`, a data de abertura do CNPJ) — a mesma base toda vez.

Produz compras recebidas, produção diária com perda, ~2.000 vendas distribuídas
pelo perfil real de movimento de uma cafeteria (pico das 15h às 18h, sábado e
domingo mais cheios, segunda fechada), caixas fechados com divergência
ocasional, encomendas em vários estágios, perdas de vitrine e contas fixas.

**O seed não usa os serviços de domínio** — eles importam `server-only` e não
rodam fora do Next. Ele escreve direto com o Prisma, mantendo as mesmas regras de
saldo por um helper local `movimentar()`.
