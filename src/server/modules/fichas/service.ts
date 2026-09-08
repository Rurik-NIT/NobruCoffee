import 'server-only'

import { db } from '@/server/db'
import { brl, margem, num } from '@/lib/money'

/**
 * Fichas técnicas.
 *
 * A ficha é o único lugar onde o custo de um produto produzido nasce. Ela é
 * versionada: mudar a receita cria a versão seguinte e mantém a anterior
 * inteira, porque o custo de um donut vendido em julho tem que continuar sendo
 * o custo de julho quando alguém abrir o relatório em dezembro.
 */
export async function listarFichas(lojaId: string, busca?: string) {
  const fichas = await db.fichaTecnica.findMany({
    where: {
      ativa: true,
      produto: {
        lojaId,
        ...(busca
          ? {
              OR: [
                { nome: { contains: busca, mode: 'insensitive' } },
                { sku: { contains: busca, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
    },
    include: {
      produto: {
        select: {
          id: true,
          nome: true,
          sku: true,
          precoVenda: true,
          imagemUrl: true,
          categoria: { select: { nome: true, cor: true } },
        },
      },
      _count: { select: { itens: true } },
    },
    orderBy: { produto: { nome: 'asc' } },
  })

  return fichas.map((f) => {
    const custoUnitario = num(f.custoUnitario)
    const precoVenda = num(f.produto.precoVenda)
    return {
      id: f.id,
      versao: f.versao,
      produtoId: f.produto.id,
      produto: f.produto.nome,
      sku: f.produto.sku,
      imagemUrl: f.produto.imagemUrl,
      categoria: f.produto.categoria,
      rendimento: num(f.rendimento),
      unidadeRendimento: f.unidadeRendimento,
      itens: f._count.itens,
      custoTotal: num(f.custoTotal),
      custoUnitario,
      precoVenda,
      margem: margem(precoVenda, custoUnitario),
      lucroUnitario: brl(precoVenda - custoUnitario),
      atualizadoEm: f.atualizadoEm,
    }
  })
}

export async function obterFicha(lojaId: string, fichaId: string) {
  const ficha = await db.fichaTecnica.findFirst({
    where: { id: fichaId, produto: { lojaId } },
    include: {
      produto: { select: { id: true, nome: true, sku: true, precoVenda: true, tipo: true } },
      criadoPor: { select: { nome: true } },
      itens: {
        include: { ingrediente: { select: { id: true, nome: true, sku: true, unidade: true, custoMedio: true, estoqueAtual: true } } },
        orderBy: { ingrediente: { nome: 'asc' } },
      },
    },
  })
  if (!ficha) return null

  const itens = ficha.itens.map((i) => ({
    id: i.id,
    ingredienteId: i.ingredienteId,
    nome: i.ingrediente.nome,
    sku: i.ingrediente.sku,
    unidadeInsumo: i.ingrediente.unidade,
    unidade: i.unidade,
    quantidade: num(i.quantidade),
    perdaPercentual: num(i.perdaPercentual),
    custoMedio: num(i.ingrediente.custoMedio),
    custo: num(i.custo),
    estoqueAtual: num(i.ingrediente.estoqueAtual),
    observacao: i.observacao,
  }))

  const custoUnitario = num(ficha.custoUnitario)
  const precoVenda = num(ficha.produto.precoVenda)

  return {
    id: ficha.id,
    versao: ficha.versao,
    ativa: ficha.ativa,
    produto: ficha.produto,
    rendimento: num(ficha.rendimento),
    unidadeRendimento: ficha.unidadeRendimento,
    modoPreparo: ficha.modoPreparo,
    tempoPreparoMin: ficha.tempoPreparoMin,
    custoTotal: num(ficha.custoTotal),
    custoUnitario,
    precoVenda,
    margem: margem(precoVenda, custoUnitario),
    lucroUnitario: brl(precoVenda - custoUnitario),
    criadoPor: ficha.criadoPor?.nome ?? null,
    criadoEm: ficha.criadoEm,
    itens,
    /** Participação de cada insumo no custo — mostra onde está o dinheiro. */
    composicao: itens
      .map((i) => ({
        rotulo: i.nome,
        valor: i.custo,
        apoio: `${i.quantidade} ${i.unidade.toLowerCase()}${i.perdaPercentual > 0 ? ` · perda ${i.perdaPercentual}%` : ''}`,
      }))
      .sort((a, b) => b.valor - a.valor),
  }
}

/** Histórico de versões de um produto — a trilha de custo ao longo do tempo. */
export async function historicoFichas(lojaId: string, produtoId: string) {
  const fichas = await db.fichaTecnica.findMany({
    where: { produtoId, produto: { lojaId } },
    orderBy: { versao: 'desc' },
    include: { criadoPor: { select: { nome: true } }, _count: { select: { itens: true } } },
  })
  return fichas.map((f) => ({
    id: f.id,
    versao: f.versao,
    ativa: f.ativa,
    custoUnitario: num(f.custoUnitario),
    custoTotal: num(f.custoTotal),
    rendimento: num(f.rendimento),
    itens: f._count.itens,
    criadoPor: f.criadoPor?.nome ?? null,
    criadoEm: f.criadoEm,
  }))
}

/** Produtos que produzimos e ainda não têm ficha — a lista de pendências. */
export async function produtosSemFicha(lojaId: string) {
  const produtos = await db.produto.findMany({
    where: {
      lojaId,
      ativo: true,
      tipo: { in: ['PRODUZIDO', 'PREPARADO'] },
      fichasTecnicas: { none: { ativa: true } },
    },
    select: { id: true, nome: true, sku: true, precoVenda: true, tipo: true },
    orderBy: { nome: 'asc' },
  })
  return produtos.map((p) => ({ ...p, precoVenda: num(p.precoVenda) }))
}
