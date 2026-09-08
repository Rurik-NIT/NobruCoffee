import 'server-only'

import type { Prisma, TipoMovimento, UnidadeMedida } from '@prisma/client'

import type { Tx } from '@/server/db'
import { EstoqueInsuficiente, ErroDeNegocio } from '@/server/errors'
import { brl, num, qty } from '@/lib/money'
import { quantidade as fmtQtd } from '@/lib/format'

/**
 * ════════════════════════════════════════════════════════════════════════════
 *  O LIVRO DO ESTOQUE
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Toda alteração de saldo — compra, produção, venda, perda, ajuste, inventário
 * — passa por `movimentar()`. Nenhum módulo escreve `estoqueAtual` na mão.
 *
 * Três garantias que isso compra:
 *
 *  1. **Histórico completo.** Cada linha de `movimentos_estoque` guarda o saldo
 *     resultante, então dá para reconstruir o estoque de qualquer dia e
 *     responder "por que faltou farinha na quinta".
 *
 *  2. **Corrida resolvida no banco.** O saldo muda com `increment`, que é
 *     atômico no Postgres. Dois caixas vendendo o mesmo donut no mesmo segundo
 *     não sobrescrevem um ao outro. Se o saldo final ficar negativo e a operação
 *     não permitir, lança — e a transação inteira volta atrás.
 *
 *  3. **Custo que acompanha a realidade.** Entradas recalculam o custo médio
 *     ponderado, e é esse custo que a ficha técnica usa para dizer quanto
 *     custa um donut hoje, não o preço da nota de três meses atrás.
 */

export type AlvoMovimento = { ingredienteId: string } | { produtoId: string }

export type EntradaMovimento = AlvoMovimento & {
  lojaId: string
  tipo: TipoMovimento
  /** Sempre positivo. O sinal é definido pelo tipo do movimento. */
  quantidade: number
  /** Obrigatório em entradas: custo unitário da nota. */
  custoUnitario?: number
  loteId?: string | null
  origemTipo?: string | null
  origemId?: string | null
  observacao?: string | null
  usuarioId?: string | null
  /** Permite saldo negativo (usado em ajuste de inventário). */
  permitirNegativo?: boolean
}

const TIPOS_ENTRADA: TipoMovimento[] = ['ENTRADA_COMPRA', 'ENTRADA_MANUAL', 'ENTRADA_PRODUCAO', 'ESTORNO_VENDA']

export function eEntrada(tipo: TipoMovimento) {
  return TIPOS_ENTRADA.includes(tipo)
}

/**
 * Aplica um movimento e devolve o saldo resultante.
 * Deve rodar dentro de `db.$transaction` junto com o documento que o originou.
 */
export async function movimentar(tx: Tx, entrada: EntradaMovimento) {
  const quantidadeAbs = qty(Math.abs(entrada.quantidade))
  if (quantidadeAbs <= 0) throw new ErroDeNegocio('A quantidade do movimento precisa ser maior que zero.')

  const entradaMov = eEntrada(entrada.tipo)
  const delta = entradaMov ? quantidadeAbs : -quantidadeAbs

  if ('ingredienteId' in entrada) {
    return movimentarIngrediente(tx, entrada, entrada.ingredienteId, delta, quantidadeAbs, entradaMov)
  }
  return movimentarProduto(tx, entrada, entrada.produtoId, delta, quantidadeAbs, entradaMov)
}

async function movimentarIngrediente(
  tx: Tx,
  entrada: EntradaMovimento,
  ingredienteId: string,
  delta: number,
  quantidadeAbs: number,
  entradaMov: boolean,
) {
  const antes = await tx.ingrediente.findUnique({
    where: { id: ingredienteId },
    select: { id: true, nome: true, unidade: true, custoMedio: true, estoqueAtual: true, lojaId: true },
  })
  if (!antes) throw new ErroDeNegocio('Insumo não encontrado para movimentar.', 'NAO_ENCONTRADO')
  if (antes.lojaId !== entrada.lojaId) throw new ErroDeNegocio('Insumo de outra loja.', 'CONFLITO')

  const depois = await tx.ingrediente.update({
    where: { id: ingredienteId },
    data: { estoqueAtual: { increment: delta } },
    select: { estoqueAtual: true },
  })
  const saldoApos = qty(num(depois.estoqueAtual))

  if (saldoApos < 0 && !entrada.permitirNegativo) {
    throw new EstoqueInsuficiente(
      antes.nome,
      fmtQtd(num(antes.estoqueAtual), antes.unidade),
      fmtQtd(quantidadeAbs, antes.unidade),
    )
  }

  // Custo médio ponderado: só entradas com custo informado mexem no custo.
  let custoUnitario = num(antes.custoMedio)
  if (entradaMov && entrada.custoUnitario !== undefined && entrada.custoUnitario > 0) {
    const saldoAnterior = Math.max(0, qty(saldoApos - delta))
    const valorAnterior = saldoAnterior * num(antes.custoMedio)
    const valorEntrada = quantidadeAbs * entrada.custoUnitario
    const novoSaldo = saldoAnterior + quantidadeAbs
    const novoCusto = novoSaldo > 0 ? (valorAnterior + valorEntrada) / novoSaldo : entrada.custoUnitario
    custoUnitario = entrada.custoUnitario
    await tx.ingrediente.update({
      where: { id: ingredienteId },
      data: { custoMedio: Math.round(novoCusto * 10_000) / 10_000 },
    })
  }

  if (entrada.loteId) await ajustarLote(tx, entrada.loteId, delta)

  await tx.movimentoEstoque.create({
    data: {
      lojaId: entrada.lojaId,
      ingredienteId,
      loteId: entrada.loteId ?? null,
      tipo: entrada.tipo,
      quantidade: delta,
      custoUnitario,
      saldoApos,
      origemTipo: entrada.origemTipo ?? null,
      origemId: entrada.origemId ?? null,
      observacao: entrada.observacao ?? null,
      usuarioId: entrada.usuarioId ?? null,
    },
  })

  return { saldoApos, custoUnitario, nome: antes.nome, unidade: antes.unidade }
}

async function movimentarProduto(
  tx: Tx,
  entrada: EntradaMovimento,
  produtoId: string,
  delta: number,
  quantidadeAbs: number,
  entradaMov: boolean,
) {
  const antes = await tx.produto.findUnique({
    where: { id: produtoId },
    select: { id: true, nome: true, unidade: true, precoCusto: true, estoqueAtual: true, controlaEstoque: true, lojaId: true },
  })
  if (!antes) throw new ErroDeNegocio('Produto não encontrado para movimentar.', 'NAO_ENCONTRADO')
  if (antes.lojaId !== entrada.lojaId) throw new ErroDeNegocio('Produto de outra loja.', 'CONFLITO')

  // Produto sem controle de estoque (café feito na hora) não gera movimento —
  // quem baixa insumo nesse caso é a ficha técnica.
  if (!antes.controlaEstoque) {
    return { saldoApos: num(antes.estoqueAtual), custoUnitario: num(antes.precoCusto), nome: antes.nome, unidade: antes.unidade }
  }

  const depois = await tx.produto.update({
    where: { id: produtoId },
    data: { estoqueAtual: { increment: delta } },
    select: { estoqueAtual: true },
  })
  const saldoApos = qty(num(depois.estoqueAtual))

  if (saldoApos < 0 && !entrada.permitirNegativo) {
    throw new EstoqueInsuficiente(antes.nome, fmtQtd(num(antes.estoqueAtual), 'UN'), fmtQtd(quantidadeAbs, 'UN'))
  }

  await tx.movimentoEstoque.create({
    data: {
      lojaId: entrada.lojaId,
      produtoId,
      tipo: entrada.tipo,
      quantidade: delta,
      custoUnitario: entrada.custoUnitario ?? num(antes.precoCusto),
      saldoApos,
      origemTipo: entrada.origemTipo ?? null,
      origemId: entrada.origemId ?? null,
      observacao: entrada.observacao ?? null,
      usuarioId: entrada.usuarioId ?? null,
    },
  })

  return { saldoApos, custoUnitario: num(antes.precoCusto), nome: antes.nome, unidade: antes.unidade }
}

async function ajustarLote(tx: Tx, loteId: string, delta: number) {
  const lote = await tx.lote.update({
    where: { id: loteId },
    data: { quantidade: { increment: delta } },
    select: { quantidade: true },
  })
  if (num(lote.quantidade) < 0) {
    throw new ErroDeNegocio('O lote informado não tem saldo suficiente.', 'ESTOQUE_INSUFICIENTE')
  }
}

// ───────────────────────────────────────────────────────────────────────────
//  CONVERSÃO DE UNIDADES
// ───────────────────────────────────────────────────────────────────────────

/**
 * A ficha técnica pode pedir "0,08 kg de farinha" enquanto o estoque controla
 * farinha em gramas. Convertemos para a unidade do insumo antes de baixar.
 * Unidades discretas (UN, PCT, CX) não se convertem entre si de propósito:
 * "1 caixa" não é um número universal de unidades.
 */
const FATORES: Partial<Record<UnidadeMedida, { base: 'MASSA' | 'VOLUME'; fator: number }>> = {
  G: { base: 'MASSA', fator: 1 },
  KG: { base: 'MASSA', fator: 1000 },
  ML: { base: 'VOLUME', fator: 1 },
  L: { base: 'VOLUME', fator: 1000 },
}

export function converter(valor: number, de: UnidadeMedida, para: UnidadeMedida): number {
  if (de === para) return valor
  const origem = FATORES[de]
  const destino = FATORES[para]
  if (!origem || !destino || origem.base !== destino.base) {
    throw new ErroDeNegocio(
      `Não é possível converter ${de} em ${para}. Ajuste a unidade na ficha técnica ou no cadastro do insumo.`,
    )
  }
  return qty((valor * origem.fator) / destino.fator)
}

// ───────────────────────────────────────────────────────────────────────────
//  FICHA TÉCNICA → CONSUMO
// ───────────────────────────────────────────────────────────────────────────

export type ItemConsumo = {
  ingredienteId: string
  nome: string
  unidade: UnidadeMedida
  /** Já convertido para a unidade do insumo e com a perda técnica somada. */
  quantidade: number
  custoUnitario: number
  custoTotal: number
  estoqueAtual: number
}

/**
 * Explode a ficha técnica ativa de um produto em consumo de insumos, para uma
 * quantidade produzida. Retorna a lista sem escrever nada — assim a tela de
 * produção pode mostrar "vai faltar" antes de o operador confirmar.
 */
export async function calcularConsumo(
  tx: Tx,
  produtoId: string,
  quantidadeProduzida: number,
  fichaIdEspecifica?: string | null,
): Promise<{ fichaId: string | null; itens: ItemConsumo[]; custoTotal: number }> {
  const ficha = fichaIdEspecifica
    ? await tx.fichaTecnica.findUnique({
        where: { id: fichaIdEspecifica },
        include: { itens: { include: { ingrediente: true } } },
      })
    : await tx.fichaTecnica.findFirst({
        where: { produtoId, ativa: true },
        orderBy: { versao: 'desc' },
        include: { itens: { include: { ingrediente: true } } },
      })

  if (!ficha) return { fichaId: null, itens: [], custoTotal: 0 }

  const rendimento = num(ficha.rendimento) || 1
  const execucoes = quantidadeProduzida / rendimento

  const itens: ItemConsumo[] = ficha.itens.map((item) => {
    const bruto = num(item.quantidade) * (1 + num(item.perdaPercentual) / 100)
    const naUnidadeDoInsumo = converter(bruto, item.unidade, item.ingrediente.unidade)
    const quantidade = qty(naUnidadeDoInsumo * execucoes)
    const custoUnitario = num(item.ingrediente.custoMedio)
    return {
      ingredienteId: item.ingredienteId,
      nome: item.ingrediente.nome,
      unidade: item.ingrediente.unidade,
      quantidade,
      custoUnitario,
      custoTotal: brl(quantidade * custoUnitario),
      estoqueAtual: num(item.ingrediente.estoqueAtual),
    }
  })

  return {
    fichaId: ficha.id,
    itens,
    custoTotal: brl(itens.reduce((acc, i) => acc + i.custoTotal, 0)),
  }
}

/** Consome os insumos da ficha técnica. Usado pela produção e pela venda. */
export async function consumirFicha(
  tx: Tx,
  params: {
    lojaId: string
    produtoId: string
    quantidade: number
    tipo: TipoMovimento
    origemTipo: string
    origemId: string
    usuarioId?: string | null
    fichaId?: string | null
    /** Fator da variação (300ml de café = 1.5× a ficha do 200ml). */
    fator?: number
  },
) {
  const fator = params.fator ?? 1
  const { itens, custoTotal } = await calcularConsumo(tx, params.produtoId, params.quantidade * fator, params.fichaId)
  if (itens.length === 0) return { custoTotal: 0, consumidos: 0 }

  for (const item of itens) {
    await movimentar(tx, {
      lojaId: params.lojaId,
      ingredienteId: item.ingredienteId,
      tipo: params.tipo,
      quantidade: item.quantidade,
      origemTipo: params.origemTipo,
      origemId: params.origemId,
      usuarioId: params.usuarioId,
    })
  }

  return { custoTotal, consumidos: itens.length }
}

/** Recalcula e grava o custo de uma ficha a partir do custo médio atual. */
export async function recalcularCustoFicha(tx: Tx, fichaId: string) {
  const ficha = await tx.fichaTecnica.findUnique({
    where: { id: fichaId },
    include: { itens: { include: { ingrediente: { select: { custoMedio: true, unidade: true } } } } },
  })
  if (!ficha) throw new ErroDeNegocio('Ficha técnica não encontrada.', 'NAO_ENCONTRADO')

  let custoTotal = 0
  for (const item of ficha.itens) {
    const bruto = num(item.quantidade) * (1 + num(item.perdaPercentual) / 100)
    const naUnidade = converter(bruto, item.unidade, item.ingrediente.unidade)
    const custo = naUnidade * num(item.ingrediente.custoMedio)
    custoTotal += custo
    await tx.fichaTecnicaItem.update({
      where: { id: item.id },
      data: { custo: Math.round(custo * 10_000) / 10_000 },
    })
  }

  const rendimento = num(ficha.rendimento) || 1
  const custoUnitario = custoTotal / rendimento

  await tx.fichaTecnica.update({
    where: { id: fichaId },
    data: {
      custoTotal: Math.round(custoTotal * 10_000) / 10_000,
      custoUnitario: Math.round(custoUnitario * 10_000) / 10_000,
    },
  })

  // O custo do produto acompanha a ficha ativa — é o número que alimenta margem
  // no catálogo e CMV na venda.
  if (ficha.ativa) {
    await tx.produto.update({
      where: { id: ficha.produtoId },
      data: { precoCusto: brl(custoUnitario) },
    })
  }

  return { custoTotal: brl(custoTotal), custoUnitario: brl(custoUnitario) }
}

// ───────────────────────────────────────────────────────────────────────────
//  CONSULTAS DE APOIO
// ───────────────────────────────────────────────────────────────────────────

/** Insumos no ou abaixo do mínimo — alimenta o painel e as notificações. */
export function whereEstoqueBaixo(lojaId: string): Prisma.IngredienteWhereInput {
  return { lojaId, ativo: true, estoqueMinimo: { gt: 0 } }
}

export async function listarEstoqueBaixo(tx: Tx, lojaId: string, limite = 50) {
  const ingredientes = await tx.ingrediente.findMany({
    where: whereEstoqueBaixo(lojaId),
    select: {
      id: true,
      nome: true,
      sku: true,
      unidade: true,
      estoqueAtual: true,
      estoqueMinimo: true,
      custoMedio: true,
    },
    orderBy: { nome: 'asc' },
  })
  return ingredientes
    .filter((i) => num(i.estoqueAtual) <= num(i.estoqueMinimo))
    .map((i) => ({
      ...i,
      estoqueAtual: num(i.estoqueAtual),
      estoqueMinimo: num(i.estoqueMinimo),
      custoMedio: num(i.custoMedio),
      /** Quanto falta para voltar ao mínimo. */
      faltando: qty(Math.max(0, num(i.estoqueMinimo) - num(i.estoqueAtual))),
    }))
    .slice(0, limite)
}

/** Lotes vencendo dentro da janela configurada. */
export async function listarValidadesProximas(tx: Tx, lojaId: string, dias: number, limite = 100) {
  const limiteData = new Date()
  limiteData.setDate(limiteData.getDate() + dias)
  const lotes = await tx.lote.findMany({
    where: {
      quantidade: { gt: 0 },
      validade: { not: null, lte: limiteData },
      ingrediente: { lojaId, ativo: true },
    },
    include: { ingrediente: { select: { id: true, nome: true, unidade: true, custoMedio: true } } },
    orderBy: { validade: 'asc' },
    take: limite,
  })
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  return lotes.map((l) => {
    const validade = l.validade!
    const diasRestantes = Math.round((validade.getTime() - hoje.getTime()) / 86_400_000)
    return {
      id: l.id,
      codigo: l.codigo,
      validade,
      diasRestantes,
      vencido: diasRestantes < 0,
      quantidade: num(l.quantidade),
      valorEmRisco: brl(num(l.quantidade) * num(l.custoUnitario || l.ingrediente.custoMedio)),
      ingrediente: l.ingrediente,
    }
  })
}
