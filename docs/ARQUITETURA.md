# Arquitetura

Decisões estruturais e o motivo de cada uma. Onde uma escolha contraria o óbvio,
o texto explica o que se ganhou.

---

## 1. Camadas

```
Server Component (página)   ──▶  server/modules/<domínio>/service.ts   ──▶  Prisma
        │                                (leitura)
        │
Client Component (interação) ──▶  server/modules/<domínio>/actions.ts  ──▶  Prisma
                                         (escrita)
                                            │
                              valida (Zod) · exige permissão · transação · audita
```

**Regra:** nenhum componente fala com o banco. Página lê pelo `service`,
interação escreve pela `action`.

Não existe camada de API REST. Server Actions dão mutação tipada ponta a ponta;
uma rota HTTP intermediária só existiria para reserializar o que o TypeScript já
garante. Quando um consumidor externo aparecer (integração fiscal, iFood), aí
sim entra `app/api/` — os `services` já estão prontos para isso.

### Envelope único de ação

Toda Server Action devolve o mesmo formato (`src/server/action.ts`):

```ts
{ ok: true, dados: T } | { ok: false, erro: string, codigo, campos? }
```

Com isso a UI tem **um** caminho para tratar sucesso, erro de campo e erro de
negócio — sem `try/catch` espalhado em componente e sem `throw` cruzando a
fronteira servidor/cliente. O hook `useAcao` liga esse envelope a pendência de
botão, toast e erro por campo.

---

## 2. Decisões de modelagem

### Pedido é o documento único de venda

O enunciado sugeria `Sale`/`SaleItem` **e** `Order`/`OrderItem`. Foram unificados
em `pedidos`/`pedido_itens`.

Uma venda **é** um pedido com `status = FINALIZADO` e pagamentos aprovados.
Manter dois documentos para o mesmo fato significaria duplicar itens, totais e
custo — e abrir espaço para divergirem. Num sistema de caixa, "o relatório diz um
número e a comanda diz outro" é o pior defeito possível.

Balcão, mesa, delivery e encomenda são o mesmo documento com `tipo` diferente.

### Despesa e receita não são tabelas

`Expense` e `Revenue` viraram estados de `contas_pagar` e `contas_receber`:
**despesa = conta a pagar liquidada**, **receita = conta a receber liquidada**.
Tabelas separadas repetiriam os mesmos campos e criariam duas versões da verdade
sobre o mesmo lançamento.

### Permissão é código, não tabela

O catálogo de 53 permissões vive em `src/server/auth/permissions.ts`. O banco
guarda só **quais chaves** cada cargo recebeu (`cargos.permissoes String[]`).

Motivo: a lista de permissões é comportamento do sistema, versionada junto com as
telas que ela protege. Uma tabela `Permission` exigiria seed, migration e um JOIN
por requisição para entregar exatamente a mesma informação — e permitiria uma
permissão órfã no banco sem código correspondente.

### Usuário acumula login e ficha de funcionário

`User` e `Employee` viraram `usuarios`. Numa cafeteria, todo funcionário tem
acesso e todo acesso é de um funcionário. Duas tabelas em relação 1:1
obrigatória são uma tabela.

### Um livro de movimentos para insumo e produto

`movimentos_estoque` aponta para `ingrediente_id` **ou** `produto_id`. Duas
tabelas separadas dariam dois históricos para responder "o que aconteceu com o
estoque na quinta" — e obrigariam a unir os dois em toda consulta.

### Saldo desnormalizado, mantido na transação

`ingredientes.estoque_atual` e `produtos.estoque_atual` guardam o saldo, embora
ele seja derivável da soma dos movimentos.

É desnormalização deliberada: a grade do PDV mostra saldo de 40 produtos a cada
carregamento, e somar o histórico para isso seria caro e ficaria mais caro a cada
mês. A consistência vem de **nunca escrever esses campos fora de
`movimentar()`**, que atualiza saldo e grava o movimento na mesma transação.

### Ficha técnica versionada

Editar uma ficha já usada em produção **cria a versão seguinte**. Sem isso, mudar
a receita alteraria retroativamente o custo de ordens concluídas — e o relatório
de margem do mês passado deixaria de bater.

---

## 3. Consistência transacional

O núcleo do sistema são três transações. Todas são tudo-ou-nada.

### Venda (`server/modules/pedidos/finalizar.ts`)

```
valida pedido e caixa aberto
  → resgata pontos (vira desconto)
  → recalcula totais no servidor          ← nunca confia no total do cliente
  → confere se o pagamento fecha exato
  → grava pagamentos + movimentos de caixa
  → baixa estoque conforme o tipo do produto
  → atualiza cliente, fidelidade, cupom, mesa
  → marca FINALIZADO e audita
```

Se qualquer passo falhar — inclusive estoque insuficiente — **nada** é gravado.
Uma venda com pagamento registrado e sem baixa de estoque quebraria o fechamento
do turno.

**Baixa de estoque por tipo de produto:**

| Tipo | O que sai |
|---|---|
| `SIMPLES` (revenda) | Unidade do estoque do produto |
| `PRODUZIDO` com controle | Estoque de acabados (o insumo já saiu na produção) |
| `PREPARADO` ou sem controle | Consome a ficha técnica no ato |
| `COMBO` | Explode nos componentes e aplica a regra de cada um |

### Produção (`producao/actions.ts` → `concluirOrdem`)

Consome insumo pelo **total que foi ao forno** (produzido + perdido — a massa
queimada gastou farinha do mesmo jeito), dá entrada nos acabados, registra a
perda e congela o custo real da ordem.

### Recebimento de compra (`compras/actions.ts`)

Dá entrada, cria lote com validade, **recalcula o custo médio ponderado** e
fecha o pedido quando não há mais pendência.

### Corrida resolvida no banco

Saldos mudam com `increment`, que é atômico no PostgreSQL. Dois caixas vendendo o
mesmo donut no mesmo segundo não sobrescrevem um ao outro; se o saldo final
ficar negativo, a transação inteira volta atrás.

### Códigos de documento

`PED-000123`, `OP-000045`, `CX-000012` vêm da tabela `contadores`, por loja, via
`upsert` com `increment` — atômico, e por isso sem número repetido em
concorrência. Uma sequence do Postgres não serviria: o contador é por loja.

---

## 4. Duas velocidades no PDV

Decisão que mais moldou a experiência de uso.

**Balcão** — o carrinho vive no **cliente** até o pagamento. Tocar num donut é
instantâneo; a gravação acontece uma vez, em `venderDireto`. Ir ao servidor a
cada item deixaria o operador esperando com a fila na frente.

**Mesa, delivery e encomenda** — o pedido existe no banco desde o primeiro item,
porque a cozinha precisa vê-lo antes do pagamento, e o pedido precisa sobreviver
a um refresh.

Os dois caminhos convergem em `finalizarNaTransacao()` — um núcleo só, para
balcão e mesa nunca divergirem em estoque ou fidelidade.

---

## 5. Autenticação e autorização

### Sessão opaca, não JWT

O cookie carrega 32 bytes aleatórios; o banco guarda só o **SHA-256** desse token.

- Um dump do banco não permite montar uma sessão válida.
- Revogar é um `UPDATE` — o que um JWT autocontido não daria sem lista de
  bloqueio, que é justamente o estado no banco que o JWT prometia evitar.
- Desativar um funcionário derruba a sessão dele na hora.

Senha com **scrypt** do próprio Node: memory-hard, sem dependência nativa que
quebra em deploy, e com os parâmetros gravados dentro do hash — dá para endurecer
sem invalidar as senhas existentes (`precisaRehash` faz a migração ao logar).

### Três camadas de autorização

1. **Middleware** — olha se existe cookie. Roda no edge, não fala com o banco.
   É conveniência de roteamento, **não é a barreira**.
2. **Layout autenticado** — valida a sessão de verdade e monta o menu já filtrado
   pelo cargo. O cliente nunca recebe a lista de telas que não pode abrir.
3. **Server Action** — `exigirPermissao()` antes de qualquer escrita. **É esta
   camada que protege.** Digitar a URL na mão ou chamar a action direto não
   contorna nada.

Algumas permissões separam exatamente onde costuma doer: `pdv.desconto` ×
`pdv.desconto_livre`, `produtos.ver` × `produtos.preco`, `caixa.fechar` ×
`caixa.conferir`.

---

## 6. Dinheiro e números

- Banco: `Decimal(12,2)` para dinheiro, `Decimal(12,3)` para quantidade,
  `Decimal(12,4)` para custo unitário. **Nunca `Float`.**
- Fronteira servidor→cliente: `Decimal` do Prisma não é serializável para Client
  Component. Todo `service` converte com `num()` antes de devolver.
- Arredondamento monetário sempre por `brl()`, que evita o clássico
  `0.1 + 0.2`.
- Rateio (dividir conta, custo de combo) por `ratear()`, que joga a sobra de
  centavos no maior peso — a soma das partes sempre fecha com o total.
- Preço e custo são **congelados no item do pedido** no momento da venda. Mudar o
  preço amanhã não reescreve o faturamento de ontem.

---

## 7. Auditoria

`logs_sistema` grava quem, o quê, quando, de onde, com antes e depois. O log é
escrito **dentro da transação** nas operações sensíveis, então não existe
"aconteceu mas não registrou".

Nunca lança: falhar ao auditar não pode derrubar a operação em si.

---

## 8. PWA e o escopo honesto do offline

O que **existe**: instalável, casca no aparelho, assets estáticos em cache,
página de offline explicando a situação, aviso de "sem conexão" no PDV.

O que **não existe**: fila de venda offline.

Uma fila offline num sistema com estoque, caixa e fidelidade exigiria resolver
conflito de saldo na reconexão — dois aparelhos vendendo o último donut, caixas
divergentes, pontos aplicados duas vezes. Entregar isso pela metade seria pior do
que não ter: o operador confiaria numa venda que talvez não exista.

A decisão está documentada no service worker, na FAQ da landing e no manual.

---

## 9. Multi-loja

O schema já é multi-loja: `Empresa → Loja`, e tudo que é operacional carrega
`loja_id`. Todo `service` filtra por `sessao.lojaId`, e toda `action` confere se
o registro pertence à loja da sessão antes de escrever.

A interface opera uma loja por vez. Habilitar o resto é trocar `lojaId` na sessão
e somar por `empresaId` nos relatórios — sem migration.

---

## 10. Performance

- Relatórios usam agregação no banco (`groupBy`, `$queryRaw`), nunca `findMany`
  somado em JavaScript. Com um ano de vendas, é a diferença entre 40 ms e travar.
- Listas paginam por offset e trazem o total da seleção junto.
- Filtro vive na **URL**: a página continua Server Component, o link é
  compartilhável e o botão voltar funciona.
- `cache()` do React na sessão: uma consulta por requisição, mesmo com dezenas de
  componentes chamando.
- Nenhum N+1 nas listas — giro de 30 dias, contagens e agregados vêm em consulta
  única.
- `revalidatePath` dirigido: a action invalida só as rotas afetadas.

---

## 11. Segurança — resumo

| Vetor | Tratamento |
|---|---|
| Senha vazada | scrypt memory-hard, salt por senha |
| Roubo de sessão | Token opaco, só o hash no banco, revogável |
| Escalada de privilégio | `exigirPermissao` no servidor em toda escrita |
| Entrada maliciosa | Zod em toda mutação; Prisma parametriza o SQL |
| Força bruta no login | 8 tentativas / 10 min por IP+e-mail; mensagem idêntica para e-mail inexistente e senha errada |
| Vazamento por erro | Erro de banco traduzido; stack só no log do servidor |
| Clickjacking / MIME | Cabeçalhos em `next.config.ts` |
| Segredo no repositório | `.env` no `.gitignore`; só `.env.example` versionado |

**Limite conhecido:** o rate limit é em memória, por processo. Com mais de uma
instância, migrar para Redis — está isolado em uma função só para essa troca ser
local.

---

## 12. Fiscal

O sistema **não emite documento fiscal**. A comanda é o comprovante da loja.

A modelagem já guarda o que uma integração de NFC-e exigiria (CNPJ da loja, CPF
do cliente, item com preço e quantidade, forma de pagamento, sequência de
documento). A integração em si depende de certificado A1, SEFAZ-SP e homologação
— e afirmar que emite sem emitir seria um problema para a loja, não para o
sistema.
