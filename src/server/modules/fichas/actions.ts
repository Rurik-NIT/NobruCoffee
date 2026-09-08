'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao } from '@/server/auth/session'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { moeda } from '@/lib/format'
import { converter, recalcularCustoFicha } from '@/server/modules/estoque/service'

const uuid = z.string().uuid()

const fichaSchema = z.object({
  /** Informado ao editar; ausente ao criar a primeira versão. */
  id: uuid.optional(),
  produtoId: uuid,
  rendimento: z.number().min(0.001, 'Informe o rendimento da receita.').max(99_999),
  unidadeRendimento: z.string().trim().max(10).default('UN'),
  modoPreparo: z.string().trim().max(4000).optional().or(z.literal('')),
  tempoPreparoMin: z.number().int().min(0).max(1440).nullable().optional(),
  itens: z
    .array(
      z.object({
        ingredienteId: uuid,
        quantidade: z.number().min(0.0001, 'Informe a quantidade.').max(999_999),
        unidade: z.enum(['G', 'KG', 'ML', 'L', 'UN', 'PCT', 'CX']),
        perdaPercentual: z.number().min(0).max(90).default(0),
        observacao: z.string().trim().max(120).optional().or(z.literal('')),
      }),
    )
    .min(1, 'A ficha precisa de pelo menos um insumo.')
    .max(60),
  /** Se true, cria uma nova versão em vez de alterar a atual. */
  novaVersao: z.boolean().default(false),
})

/**
 * Salva a ficha.
 *
 * Regra de versão: enquanto a ficha nunca foi usada em produção, editar altera
 * a própria versão. A partir do primeiro uso, qualquer alteração cria a versão
 * seguinte — senão o custo histórico das ordens já concluídas mudaria
 * retroativamente.
 */
export const salvarFicha = acao(fichaSchema, async (entrada) => {
  const sessao = await exigirPermissao('fichas.gerenciar')

  const produto = await db.produto.findFirst({
    where: { id: entrada.produtoId, lojaId: sessao.lojaId },
    select: { id: true, nome: true, tipo: true },
  })
  if (!produto) throw new ErroDeNegocio('Produto não encontrado.', 'NAO_ENCONTRADO')

  // Valida a compatibilidade de unidades antes de gravar qualquer coisa.
  const ingredientes = await db.ingrediente.findMany({
    where: { id: { in: entrada.itens.map((i) => i.ingredienteId) }, lojaId: sessao.lojaId },
    select: { id: true, nome: true, unidade: true },
  })
  for (const item of entrada.itens) {
    const ing = ingredientes.find((i) => i.id === item.ingredienteId)
    if (!ing) throw new ErroDeNegocio('Um dos insumos não pertence a esta loja.', 'VALIDACAO')
    converter(1, item.unidade, ing.unidade) // lança mensagem clara se incompatível
  }
  if (new Set(entrada.itens.map((i) => i.ingredienteId)).size !== entrada.itens.length) {
    throw new ErroDeNegocio('Há insumos repetidos na ficha. Some as quantidades em uma linha só.', 'VALIDACAO')
  }

  const resultado = await db.$transaction(async (tx) => {
    const atual = entrada.id
      ? await tx.fichaTecnica.findFirst({
          where: { id: entrada.id, produtoId: entrada.produtoId },
          include: { _count: { select: { itensProducao: true } } },
        })
      : await tx.fichaTecnica.findFirst({
          where: { produtoId: entrada.produtoId, ativa: true },
          include: { _count: { select: { itensProducao: true } } },
        })

    const precisaVersionar = Boolean(atual && (entrada.novaVersao || atual._count.itensProducao > 0))

    const dadosCabecalho = {
      rendimento: entrada.rendimento,
      unidadeRendimento: entrada.unidadeRendimento || 'UN',
      modoPreparo: entrada.modoPreparo || null,
      tempoPreparoMin: entrada.tempoPreparoMin ?? null,
    }

    let fichaId: string
    let versao: number

    if (!atual) {
      const criada = await tx.fichaTecnica.create({
        data: {
          produtoId: entrada.produtoId,
          versao: 1,
          ativa: true,
          criadoPorId: sessao.id,
          ...dadosCabecalho,
        },
        select: { id: true, versao: true },
      })
      fichaId = criada.id
      versao = criada.versao
    } else if (precisaVersionar) {
      const ultima = await tx.fichaTecnica.findFirst({
        where: { produtoId: entrada.produtoId },
        orderBy: { versao: 'desc' },
        select: { versao: true },
      })
      await tx.fichaTecnica.updateMany({ where: { produtoId: entrada.produtoId }, data: { ativa: false } })
      const nova = await tx.fichaTecnica.create({
        data: {
          produtoId: entrada.produtoId,
          versao: (ultima?.versao ?? 0) + 1,
          ativa: true,
          criadoPorId: sessao.id,
          ...dadosCabecalho,
        },
        select: { id: true, versao: true },
      })
      fichaId = nova.id
      versao = nova.versao
    } else {
      await tx.fichaTecnica.update({ where: { id: atual.id }, data: dadosCabecalho })
      await tx.fichaTecnicaItem.deleteMany({ where: { fichaId: atual.id } })
      fichaId = atual.id
      versao = atual.versao
    }

    await tx.fichaTecnicaItem.createMany({
      data: entrada.itens.map((i) => ({
        fichaId,
        ingredienteId: i.ingredienteId,
        quantidade: i.quantidade,
        unidade: i.unidade,
        perdaPercentual: i.perdaPercentual,
        observacao: i.observacao || null,
      })),
    })

    const custos = await recalcularCustoFicha(tx, fichaId)

    await registrarLog(
      {
        lojaId: sessao.lojaId,
        usuarioId: sessao.id,
        acao: precisaVersionar || !atual ? 'ficha.versao_criada' : 'ficha.editada',
        entidade: 'ficha_tecnica',
        entidadeId: fichaId,
        novo: {
          produto: produto.nome,
          versao,
          itens: entrada.itens.length,
          custoUnitario: moeda(custos.custoUnitario),
        },
      },
      tx,
    )

    return { fichaId, versao, ...custos, versionada: precisaVersionar }
  })

  revalidatePath('/fichas-tecnicas')
  revalidatePath('/produtos')
  return resultado
})

/** Volta para uma versão anterior — sem apagar nada. */
export const ativarVersao = acao(z.object({ fichaId: uuid }), async ({ fichaId }) => {
  const sessao = await exigirPermissao('fichas.gerenciar')

  const resultado = await db.$transaction(async (tx) => {
    const ficha = await tx.fichaTecnica.findFirst({
      where: { id: fichaId, produto: { lojaId: sessao.lojaId } },
      select: { id: true, produtoId: true, versao: true, produto: { select: { nome: true } } },
    })
    if (!ficha) throw new ErroDeNegocio('Versão não encontrada.', 'NAO_ENCONTRADO')

    await tx.fichaTecnica.updateMany({ where: { produtoId: ficha.produtoId }, data: { ativa: false } })
    await tx.fichaTecnica.update({ where: { id: fichaId }, data: { ativa: true } })
    const custos = await recalcularCustoFicha(tx, fichaId)

    await registrarLog(
      {
        lojaId: sessao.lojaId,
        usuarioId: sessao.id,
        acao: 'ficha.versao_ativada',
        entidade: 'ficha_tecnica',
        entidadeId: fichaId,
        novo: { produto: ficha.produto.nome, versao: ficha.versao, custoUnitario: moeda(custos.custoUnitario) },
      },
      tx,
    )
    return { versao: ficha.versao, ...custos }
  })

  revalidatePath('/fichas-tecnicas')
  return resultado
})

export const excluirFicha = acao(z.object({ fichaId: uuid }), async ({ fichaId }) => {
  const sessao = await exigirPermissao('fichas.gerenciar')
  const ficha = await db.fichaTecnica.findFirst({
    where: { id: fichaId, produto: { lojaId: sessao.lojaId } },
    include: { _count: { select: { itensProducao: true } }, produto: { select: { nome: true } } },
  })
  if (!ficha) throw new ErroDeNegocio('Ficha não encontrada.', 'NAO_ENCONTRADO')
  if (ficha._count.itensProducao > 0) {
    throw new ErroDeNegocio(
      'Esta versão já foi usada em produção e não pode ser excluída — o custo histórico depende dela.',
      'CONFLITO',
    )
  }

  await db.fichaTecnica.delete({ where: { id: fichaId } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'ficha.excluida',
    entidade: 'ficha_tecnica',
    entidadeId: fichaId,
    anterior: { produto: ficha.produto.nome, versao: ficha.versao },
  })
  revalidatePath('/fichas-tecnicas')
  return true
})

/** Carrega a ficha ativa (ou vazia) de um produto para o editor no cliente. */
export const carregarFichaDoProduto = acao(z.object({ produtoId: uuid }), async ({ produtoId }) => {
  const sessao = await exigirPermissao('fichas.ver')
  const ficha = await db.fichaTecnica.findFirst({
    where: { produtoId, ativa: true, produto: { lojaId: sessao.lojaId } },
    include: { itens: true },
  })
  if (!ficha) return null
  return {
    id: ficha.id,
    versao: ficha.versao,
    rendimento: Number(ficha.rendimento),
    unidadeRendimento: ficha.unidadeRendimento,
    modoPreparo: ficha.modoPreparo ?? '',
    tempoPreparoMin: ficha.tempoPreparoMin,
    itens: ficha.itens.map((i) => ({
      ingredienteId: i.ingredienteId,
      quantidade: Number(i.quantidade),
      unidade: i.unidade,
      perdaPercentual: Number(i.perdaPercentual),
      observacao: i.observacao ?? '',
    })),
  }
})
