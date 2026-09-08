# Manual de uso — Nobru Coffee

**Como operar o sistema de ponta a ponta**, do primeiro cadastro ao fechamento do mês.

Este documento acompanha um ciclo completo: você monta a loja no sistema, abre o
caixa, vende, produz, repõe, fecha o dia e olha o resultado do mês. Cada seção
diz **o que fazer**, **onde**, e **por que o sistema pede aquilo** — porque quase
toda regra chata aqui existe para evitar um problema pior depois.

> Endereços das telas aparecem assim: `Vendas › PDV`. Todas ficam no menu à
> esquerda (no celular, no botão ☰).

---

## Índice

1. [Antes de começar](#1-antes-de-começar)
2. [Dia 0 — montar a loja no sistema](#2-dia-0--montar-a-loja-no-sistema)
3. [O fluxo que amarra tudo](#3-o-fluxo-que-amarra-tudo)
4. [Rotina da manhã](#4-rotina-da-manhã)
5. [Durante o expediente — vender](#5-durante-o-expediente--vender)
6. [Mesas](#6-mesas)
7. [Encomendas](#7-encomendas)
8. [Rotina do fim do dia](#8-rotina-do-fim-do-dia)
9. [Rotina semanal — comprar e receber](#9-rotina-semanal--comprar-e-receber)
10. [Rotina mensal — inventário e resultado](#10-rotina-mensal--inventário-e-resultado)
11. [Equipe e permissões](#11-equipe-e-permissões)
12. [Quando algo dá errado](#12-quando-algo-dá-errado)
13. [O que o sistema ainda não faz](#13-o-que-o-sistema-ainda-não-faz)

---

## 1. Antes de começar

### Entrar

Acesse `/entrar` com o e-mail e a senha que o gerente cadastrou.

**Cada pessoa tem o seu acesso.** Não existe login compartilhado, e isso não é
burocracia: o sistema grava quem cancelou cada venda, quem deu cada desconto e
quem ajustou cada saldo de estoque. Com login compartilhado, a resposta para
"quem fez isso?" seria sempre "o caixa" — e aí a trilha não serve para nada.

Na base de demonstração, a senha de todos é `nobru2026`:

| E-mail | Cargo | O que enxerga |
|---|---|---|
| `jessica@nobrucoffee.com.br` | Administrador | Tudo |
| `bruno@nobrucoffee.com.br` | Gerente | Tudo menos permissões e configurações |
| `camila@nobrucoffee.com.br` | Atendente | PDV, mesas, pedidos, clientes, encomendas |
| `diego@nobrucoffee.com.br` | Atendente | idem |
| `aline@nobrucoffee.com.br` | Produção | Produção, fichas, estoque, recebimentos |

Entre com cargos diferentes para ver o menu mudar. **O menu esconde o que o
cargo não abre, mas quem barra de verdade é o servidor** — digitar o endereço na
mão não contorna nada.

### Instalar no aparelho

No celular ou no iPad, o navegador oferece **Instalar** (ou *Adicionar à tela de
início*). Instalado, o sistema abre em tela cheia, sem barra de endereço — o que
importa no iPad do balcão, onde cada toque errado custa tempo.

---

## 2. Dia 0 — montar a loja no sistema

Ordem recomendada. Cada passo depende do anterior.

### 2.1 Configurações da loja

`Gestão › Configurações`

Preencha nome, CNPJ e endereço (saem no recibo) e, principalmente, as **regras da
operação**:

| Campo | O que significa na prática |
|---|---|
| **Desconto máximo do operador** | Até quanto o atendente pode dar sem chamar gerente. Acima disso, o PDV bloqueia e pede alguém com a permissão de desconto livre. |
| **Baixar estoque na venda** | Ligado (recomendado): vender consome insumo/produto. Desligue só se o estoque for controlado fora do sistema. |
| **Pontos por R$ 1,00** e **valor de 1 ponto** | A regra de fidelidade. Com `1` ponto por real e `R$ 0,05` por ponto, o cliente ganha 5% de volta. |
| **Alerta de validade** | Com quantos dias de antecedência o lote entra no sino de avisos. |

### 2.2 Formas de pagamento

`Gestão › Formas de pagamento`

Já vêm Dinheiro, PIX, Débito, Crédito, iFood e Fiado. Ajuste as **taxas reais da
sua maquininha** — é isso que faz o relatório mostrar quanto sobrou de verdade,
não quanto foi vendido.

Uma marcação merece atenção: **"conta na gaveta"**. Ela separa o que é dinheiro
físico do que é cartão. É o que permite o fechamento do caixa comparar o que você
contou com o que deveria ter — sem somar o cartão, que não está lá.

### 2.3 Categorias

`Produtos › Categorias`

Comece com poucas e distintas: Donuts, BLENDS NC, Cookies, Salgados, Confeitaria,
Bebidas. **A cor é o que separa os grupos na grade do PDV** — escolha cores bem
diferentes entre si; o operador reconhece pela cor antes de ler.

### 2.4 Insumos

`Estoque › Insumos`

Cadastre tudo que a produção consome, inclusive embalagem e guardanapo.

Três campos definem a qualidade de todo o resto:

- **Unidade de controle** — controle na menor unidade prática: farinha em `g`,
  leite em `ml`, ovo em `un`. Depois de ter saldo, a unidade não muda mais (isso
  invalidaria fichas e histórico).
- **Custo por unidade** — quanto custa 1 g, 1 ml, 1 un. É a base de tudo. Não
  precisa ser perfeito no dia 0: o primeiro recebimento de compra já corrige.
- **Estoque mínimo** — abaixo disso, o insumo entra nos avisos. Sem mínimo, não
  há alerta de reposição.

Marque **perecível** no que tem validade. Isso passa a exigir a validade no
recebimento e liga o controle em `Estoque › Validades`.

### 2.5 Produtos

`Produtos › Catálogo` → **Novo produto**

O campo mais importante é o **tipo**, porque ele decide o que acontece no estoque
quando o produto é vendido:

| Tipo | Exemplo | O que a venda faz |
|---|---|---|
| **Produção própria** | Donut, cookie, coxinha | Tira do estoque de **acabados**. Os insumos já saíram na produção. |
| **Preparado na hora** | Café, milkshake, misto | Consome a **ficha técnica** no ato da venda. |
| **Revenda** | Água, refrigerante | Tira a unidade do estoque do produto. |
| **Combo** | Café da tarde | Explode nos componentes e aplica a regra de cada um. |

Ainda no cadastro:

- **Variações** para tamanhos (café 200 ml e 300 ml). O *fator ficha* diz quanto
  a mais a variação consome — `1,45` no 300 ml significa 45% a mais de insumo.
- **Adicionais** liberados naquele produto. Se o adicional estiver ligado a um
  insumo, vendê-lo já baixa estoque.
- **Disponível hoje** é o **SOLD OUT**. Desligue quando esgotar: o produto some do
  PDV mas continua no catálogo e no histórico. Não arquive por causa disso.

### 2.6 Fichas técnicas

`Produtos › Fichas técnicas`

**É aqui que o custo nasce.** Sem ficha, um produto de produção própria não sabe
quanto custa e não baixa insumo.

Para cada produto, informe quanto entra de cada insumo. A tela mostra o custo por
linha **enquanto você digita** — e é comum descobrir ali que um ingrediente
responde por metade do custo.

Dois detalhes que valem o esforço:

- **Perda técnica (%)** — o óleo que fica na fritura, a massa que gruda na
  bancada. Sem isso o custo sai otimista demais.
- **Rendimento** — se a receita rende 12 cookies, informe `12`. O sistema divide
  para chegar ao custo unitário.

A tela avisa quando a unidade da linha não converte para a do insumo (pedir `un`
de uma farinha controlada em `g`, por exemplo).

> **Versões.** Enquanto a ficha nunca foi usada em produção, editar altera a
> própria versão. Depois do primeiro uso, qualquer mudança **cria a versão
> seguinte** — senão o custo das ordens já concluídas mudaria retroativamente, e
> o relatório do mês passado deixaria de bater.

### 2.7 Fornecedores, mesas e equipe

- `Compras › Fornecedores` — cadastre e volte aos insumos para definir o
  **fornecedor padrão** de cada um. É isso que agrupa a sugestão de reposição.
- `Vendas › Mesas` — só se houver consumo no local.
- `Gestão › Equipe` — uma pessoa, um acesso, um cargo.

### 2.8 Estoque inicial

Duas formas:

1. **Saldo inicial no cadastro do insumo** — rápido, gera uma entrada manual.
2. **Pedido de compra recebido** — mais fiel, porque o preço da nota já ajusta o
   custo médio. É o caminho recomendado.

---

## 3. O fluxo que amarra tudo

Vale entender isto uma vez; o resto do manual fica óbvio depois.

```
COMPRA ──▶ RECEBIMENTO ──▶ ESTOQUE (insumo)
                                │
                                │ ficha técnica
                                ▼
                          PRODUÇÃO ──▶ ESTOQUE (acabado)
                                              │
                                              ▼
                        VENDA (PDV) ──▶ PAGAMENTO ──▶ CAIXA
                             │                          │
                             │                          ▼
                             │                    FECHAMENTO
                             ▼
                     CLIENTE · PONTOS · RELATÓRIOS
```

Consequências práticas:

- O **recebimento** — não o pedido de compra — é o que muda estoque e custo.
- A **ficha técnica** é a ponte entre produto e insumo. Sem ela, o elo quebra.
- A **produção** consome insumo e cria acabado. São dois movimentos, uma
  transação.
- A **venda** tira do acabado (donut) **ou** consome a ficha (café), conforme o
  tipo do produto.
- O **caixa** é o que amarra o dinheiro ao turno. Sem caixa aberto, não há venda.

---

## 4. Rotina da manhã

### 4.1 Abrir o caixa

`Vendas › Caixas` → **Abrir caixa**

Informe o **fundo de troco** — o dinheiro que está fisicamente na gaveta agora.

Sem caixa aberto o PDV não registra vendas. É proposital: é o caixa que permite,
no fim do turno, comparar o que deveria estar na gaveta com o que está.

Só um caixa aberto por loja. Dois turnos = fechar um, abrir outro.

### 4.2 Planejar a produção

`Produção › Produção do dia` → **Nova ordem**

A tela abre **já preenchida** com a sugestão do sistema: média vendida nos
últimos 7 dias, menos o que sobrou em estoque. Ajuste os números — quem decide é
quem conhece o movimento do dia.

Ao criar a ordem, o sistema mostra os **insumos necessários** e avisa em vermelho
o que vai faltar, **antes** de o padeiro começar.

### 4.3 Apontar e concluir

Durante a produção, em `Produção › Ordens`, abra a ordem e informe:

- **Produzido** — o que saiu bom.
- **Perdido** — o que queimou ou deformou.

Use **Salvar** para registrar parcialmente durante a manhã. Ao terminar, clique
em **Concluir**. Este botão é o que mexe no estoque:

- consome os insumos pelo **total que foi ao forno** (produzido + perdido — a
  massa queimada gastou farinha do mesmo jeito);
- dá entrada dos produzidos no estoque de acabados;
- registra a perda no módulo de perdas, com o custo;
- congela o **custo real** da ordem, para comparar com o previsto.

> Produzir de novo um item esgotado **religa a disponibilidade** dele no PDV
> automaticamente.

### 4.4 Olhar os avisos

O sino no topo mostra o que precisa de decisão hoje: insumo no mínimo, lote
vencendo, encomenda nas próximas 48h, conta a vencer, caixa com diferença.

Todo aviso leva para a tela onde o problema se resolve.

---

## 5. Durante o expediente — vender

`Vendas › PDV`

### 5.1 A venda comum de balcão

1. Escolha o tipo: **Balcão**, **Viagem** ou **Entrega**.
2. Toque nos produtos. Um toque = um item. Toque de novo para somar.
   - Produto com tamanho ou adicional abre uma janela; produto simples entra
     direto.
3. Ajuste quantidades na comanda à direita (no celular, no botão inferior).
4. **Cobrar** → escolha a forma → **Confirmar venda**.

O carrinho fica **no aparelho** até o pagamento — por isso tocar num donut é
instantâneo, sem esperar o servidor. A gravação acontece uma vez, no
"Confirmar": pedido, itens, pagamento, caixa, estoque e pontos, tudo em uma
transação. Se algo falhar (um insumo sem saldo, por exemplo), **nada** é gravado
e a tela diz o motivo — melhor que uma venda registrada pela metade.

### 5.2 Dinheiro e troco

Escolha **Dinheiro** e informe o **valor recebido**. Os botões de R$ 20 / 50 /
100 / 200 preenchem com um toque, e o **troco aparece em destaque** — é o número
para ler em voz alta enquanto abre a gaveta.

### 5.3 Dividir o pagamento

Na janela de pagamento, **Dividir pagamento** → escolha a primeira forma → o
sistema já sugere o restante na segunda. Até 4 formas. O botão de confirmar só
libera quando a soma fecha exatamente com o total.

### 5.4 Identificar o cliente

Toque no ícone de pessoa → busque por nome ou telefone → ou cadastre na hora com
**nome + WhatsApp**.

Com cliente identificado:

- a compra entra no histórico dele;
- ele acumula pontos;
- pode **resgatar pontos** como desconto na própria janela de pagamento.

### 5.5 Desconto e cupom

Botão **Desconto**. Três modos: percentual, valor ou cupom.

- **O motivo é obrigatório** e vai para o log de auditoria com o seu nome.
- Acima do limite do seu cargo, o sistema bloqueia e pede um gerente.
- Cupom é validado na hora: validade, valor mínimo, limite de uso e se é nominal
  a outro cliente.

### 5.6 Comanda

Depois de confirmar, aparece a comanda com troco e pontos ganhos. **Imprimir**
manda para a impressora térmica de 80 mm. **Nova venda** limpa a tela.

> A comanda é o comprovante da loja, **não é documento fiscal** (veja a
> seção 13).

---

## 6. Mesas

`Vendas › Mesas`

O mapa mostra número, tempo aberto e consumo de cada mesa. A cor da borda é o
estado.

- **Abrir mesa** → cria o pedido e leva ao PDV. Diferente do balcão, **os itens
  são gravados conforme entram**, porque a cozinha precisa vê-los antes do
  pagamento.
- **Transferir** — muda o pedido de mesa mantendo a mesma comanda.
- **Juntar** — passa os itens de uma mesa para a conta de outra e libera a
  primeira.
- **Dividir** — calcula quanto cada pessoa paga. A cobrança continua em uma
  comanda só, com pagamento dividido no fechamento.
- **Abrir conta** → **Cobrar** finaliza e libera a mesa.

---

## 7. Encomendas

`Clientes › Encomendas`

A tela padrão é a **agenda**: atrasadas, o que sai hoje, o que sai nos próximos
7 dias. Encomenda é o pedido com mais dinheiro e o mais fácil de esquecer, porque
acontece no futuro.

### Fluxo

```
Orçamento → Confirmada → Em produção → Pronta → Entregue
```

1. **Nova encomenda** — cliente, data e hora, itens, tema, decoração e sinal.
   Nasce como **orçamento**: uma consulta de preço não deve virar compromisso
   para a cozinha.
2. **Confirmar** — cria a **conta a receber** do saldo e coloca na agenda.
3. **Receber pagamento** — sinal ou saldo, entra no caixa aberto e abate a conta.
4. **Gerar ordem de produção** — cria a ordem com os itens ligados a produtos que
   tenham ficha técnica.
5. **Pronta** → **Entregue**.

> **Não dá para entregar com saldo em aberto.** O sistema exige o recebimento
> antes — é a regra que evita a encomenda sair da loja sem estar paga.

---

## 8. Rotina do fim do dia

### 8.1 Registrar perdas

`Produção › Perdas` → **Registrar perda**

O que sobrou na vitrine, caiu, queimou ou venceu. Escolha o item, a quantidade e
o motivo. **O custo aparece antes de confirmar** — é o número que interessa ao
dono: quanto acabou de sair do bolso.

Registrar a perda baixa o estoque na hora e entra no relatório do mês. Sem isso,
o sistema acha que o donut ainda está na vitrine.

### 8.2 Sangria

`Vendas › Caixas` → **Sangria / suprimento**

- **Sangria** — dinheiro que sai da gaveta para o cofre.
- **Suprimento** — dinheiro que entra (reforço de troco).
- **Despesa** — pagamento feito com o dinheiro da gaveta. Além de sair do caixa,
  entra no financeiro como despesa liquidada.

### 8.3 Fechar o caixa

`Vendas › Caixas` → **Fechar caixa**

1. **Conte o dinheiro da gaveta.**
2. Informe o valor contado.
3. O sistema mostra o esperado e a diferença.
4. Se houver diferença, **explique na observação**.

A tela deixa o esperado escondido até você digitar. É de propósito: ver o número
antes de contar contamina a contagem, e uma contagem contaminada não serve para
apurar nada.

**Diferença não bloqueia o fechamento.** Bloquear faria o operador "ajustar" o
número contado até bater — e aí o sistema mentiria bonito. Ela fica registrada,
vira aviso e um gerente concilia depois em **Conferir divergência**.

O fechamento gera um ticket com fundo, vendas em dinheiro, sangrias, esperado,
contado, diferença e o total por forma de pagamento. Dá para imprimir.

> O caixa não fecha com pedidos em aberto. Finalize ou cancele antes.

---

## 9. Rotina semanal — comprar e receber

### 9.1 Ver o que falta

`Compras › Pedidos de compra` mostra a **reposição sugerida**: insumos no
mínimo, agrupados pelo fornecedor padrão de cada um, com o valor estimado.

**Gerar pedido** transforma o grupo em pedido de compra em rascunho.

### 9.2 Pedido de compra

Confira quantidades e preços (o sistema sugere o custo médio atual; ajuste para o
preço combinado). A tela avisa quando o preço está bem acima do custo médio.

**Marcar como enviado** quando mandar para o fornecedor.

> Pedido de compra **não muda estoque**. É intenção, não mercadoria.

### 9.3 Receber

Quando a mercadoria chegar, abra o pedido → **Registrar recebimento**.

Vem preenchido com o que falta receber e o preço do pedido — o caso comum
("chegou tudo pelo combinado") é um clique. Corrija as linhas quando vier
diferente.

- **Insumo perecível exige validade.** O sistema cria o lote e passa a acompanhar
  o vencimento.
- **O preço informado aqui recalcula o custo médio** do insumo — e, por tabela, o
  custo de todas as fichas que o usam.
- **Recebimento parcial é normal.** O pedido fica *parcial* até fechar sozinho
  quando o último item chega.
- Marque **gerar conta a pagar** para o valor entrar no financeiro com
  vencimento.

### 9.4 Recalcular custos

Depois de recebimentos com variação grande de preço, use `Produtos › Fichas
técnicas` → **Recalcular custos**. Todas as fichas ativas recalculam com o custo
médio atual, e a margem do catálogo se atualiza junto.

---

## 10. Rotina mensal — inventário e resultado

### 10.1 Inventário

`Estoque › Inventário` → **Abrir inventário**

O sistema gera uma folha com todos os insumos ativos e congela o saldo de cada
um. A contagem pode levar o dia inteiro.

Na folha, o **saldo do sistema fica escondido por padrão**. Conte primeiro,
digite depois — a diferença aparece na hora. Use **Só pendentes** para não se
perder.

**Finalizar e ajustar** move os saldos divergentes para o valor contado, gera um
movimento de ajuste para cada um (auditável) e mostra o impacto financeiro total.
Itens não contados ficam como estão.

### 10.2 Contas

`Financeiro › Contas a pagar` — aluguel, energia, folha, fornecedores.
Contas marcadas como **recorrentes** recriam a próxima parcela sozinhas ao serem
liquidadas.

`Financeiro › Contas a receber` — fiado, saldo de encomendas e outras receitas.

Ambas marcam **atrasado** sozinhas ao passar do vencimento.

### 10.3 Resultado

`Financeiro › Fluxo de caixa` — entradas e saídas dia a dia, taxas de cartão
descontadas, resultado e margem do período.

`Gestão › Relatórios` — quatro abas:

| Aba | Responde |
|---|---|
| **Vendas** | Quanto vendi, por dia, por tipo, por forma de pagamento, por operador |
| **Produtos** | Qual produto dá dinheiro — faturamento, custo, lucro e margem por item |
| **Produção** | Planejado × produzido × vendido, aderência e aproveitamento |
| **Estoque** | Onde está o dinheiro parado, o que está em alerta, quanto se perdeu |

A comparação do painel é sempre com o **mesmo dia da semana anterior**, não com
ontem: numa cafeteria, terça e sábado são negócios diferentes.

---

## 11. Equipe e permissões

`Gestão › Equipe` — uma pessoa, um acesso.

`Gestão › Cargos e permissões` — quatro cargos vêm prontos:

| Cargo | Para quem |
|---|---|
| **Administrador** | Dono. Acesso total, inclusive permissões. |
| **Gerente** | Operação completa e financeiro. Não mexe em permissões nem em configurações. |
| **Atendente** | PDV, mesas, pedidos, clientes, encomendas. Sem financeiro. |
| **Produção** | Produção, fichas, estoque, recebimento de compras. |

Dá para criar cargos próprios marcando permissão por permissão. Algumas separam
exatamente onde costuma doer:

- `pdv.desconto` × `pdv.desconto_livre` — dar desconto até o limite × acima dele
- `pdv.cancelar_item` × `pdv.cancelar_pedido` × `pdv.estornar`
- `produtos.ver` × `produtos.preco` — ver o catálogo × mudar preço
- `financeiro.ver` × `financeiro.gerenciar`
- `caixa.fechar` × `caixa.conferir` — fechar × aprovar uma divergência

**Desativar um acesso desconecta a pessoa na hora** e preserva todo o histórico
de vendas dela.

### Auditoria

`Gestão › Auditoria` mostra quem fez o quê, quando, com o antes e o depois.
Preço alterado, venda cancelada, estoque ajustado, permissão mudada, caixa
fechado — tudo com IP e horário. É a trilha que explica uma diferença de caixa
três semanas depois.

---

## 12. Quando algo dá errado

| Situação | O que fazer |
|---|---|
| **Errou um item na comanda** | Botão de lixeira no item. Precisa da permissão de cancelar item. |
| **Cliente desistiu antes de pagar** | `Vendas › Pedidos` → ⋯ → **Cancelar pedido**, com motivo. |
| **Venda já finalizada e errada** | `Vendas › Pedidos` → ⋯ → **Cancelar e estornar**. Devolve estoque, estorna os pagamentos no caixa e desfaz os pontos. Exige permissão de estorno. |
| **Faltou dinheiro no caixa** | Feche informando o valor real e explique na observação. Um gerente concilia em **Conferir divergência**. Nunca "ajuste" o número contado. |
| **Estoque não bate com a prateleira** | Item isolado: `Estoque › Insumos` → ⋯ → **Ajustar saldo**, com motivo. Vários itens: abra um inventário. |
| **Produto acabou no meio do dia** | Desligue **Disponível** na lista de produtos (ou no cadastro). Volta sozinho na próxima produção. |
| **Preço do insumo subiu** | O recebimento já ajusta o custo médio. Depois rode **Recalcular custos** e confira quais produtos ficaram com margem baixa em `Produtos › Catálogo`. |
| **"Nenhum caixa aberto"** | Abra o caixa em `Vendas › Caixas`. O PDV não grava venda sem caixa. |
| **"Estoque insuficiente"** | A ficha técnica pede mais do que existe. Dê entrada no insumo, ajuste o saldo, ou corrija a ficha. |
| **Esqueceu a senha** | Um gerente redefine em `Gestão › Equipe` → editar → nova senha. |

---

## 13. O que o sistema ainda não faz

Esta seção existe porque saber o limite economiza uma descoberta ruim no meio do
turno.

- **Não emite documento fiscal.** A comanda é o comprovante da loja. O cadastro
  já guarda CNPJ, CPF e o que uma integração de NFC-e exigiria, mas a integração
  em si não existe.
- **Não vende offline.** O aplicativo abre sem internet e mostra um aviso, mas
  nenhuma venda é gravada sem rede. Uma fila offline exigiria resolver conflito
  de saldo de estoque e de caixa na reconexão; entregar isso pela metade seria
  pior do que não ter.
- **Não integra com o iFood.** Pedidos de iFood são lançados no PDV como tipo
  *iFood* para o faturamento ficar completo, mas não há sincronia automática.
- **Não envia WhatsApp sozinho.** Os botões abrem a conversa com o cliente; o
  texto é seu.
- **Uma loja por vez na tela.** O banco já é multi-loja, mas a interface opera
  uma loja de cada vez.
- **Sem app nativo.** É um PWA instalável — na prática, abre como aplicativo, mas
  não está nas lojas da Apple e do Google.

---

## Cinco minutos para conhecer o sistema

Se quiser experimentar rápido na base de demonstração:

1. Entre como `camila@nobrucoffee.com.br` / `nobru2026`.
2. `Vendas › Caixas` → **Abrir caixa** com R$ 150.
3. `Vendas › PDV` → toque em **Donut Nutella**, **Cappuccino** (escolha 300 ml e
   uma calda) e **Coxinha**.
4. **Cobrar** → **Dinheiro** → recebido R$ 100 → veja o troco → **Confirmar**.
5. `Estoque › Movimentações` → veja a farinha, o leite e o copo que acabaram de
   sair — a venda do cappuccino consumiu a ficha técnica.
6. `Gestão › Auditoria` → a venda está lá, com o seu nome.
7. Saia e entre como `jessica@nobrucoffee.com.br` → `Gestão › Relatórios` →
   aba **Produtos** → veja a margem de cada item.

Em sete passos você percorreu o caminho inteiro: caixa → venda → ficha técnica →
estoque → auditoria → resultado.
