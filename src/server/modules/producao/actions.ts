'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao } from '@/server/auth/session'
import { proximoCodigo } from '@/server/counters'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { brl, num } from '@/lib/money'
import { moeda } from '@/lib/format'
import { calcularConsumo, movimentar } from '@/server/modules/estoque/service'

const uuid = z.string().uuid()

const criarOrdemSchema = z.object({
  data: z.string().min(8, 'Escolha a data.'),
  turno: z.string().trim().max(20).optional().or(z.literal('')),
  observacao: z.string().trim().max(300).optional().or(z.literal('')),
  itens: z
    .array(
      z.object({
        produtoId: uuid,
        quantidadePlanejada: z.number().min(0.001, 'Informe a quantidade.').max(99_999),
        observacao: z.string().trim().max(120).optional().or(z.literal('')),
      }),
    )
    .min(1, 'Adicione ao menos um produto à ordem.')
    .max(60),
})

export const criarOrdemProducao = acao(criarOrdemSchema, async (entrada) => {
  const sessao = await exigirPermissao('producao.gerenciar')

  if (new Set(entrada.itens.map((i) => i.produtoId)).size !== entrada.itens.length) {
    throw new ErroDeNegocio('Há produtos repetidos na ordem. Some as quantidades em uma linha só.', 'VALIDACAO')
  }

  const produtos = await db.produto.findMany({
    where: { id: { in: entrada.itens.map((i) => i.produtoId) }, lojaId: sessao.lojaId },
    select: { id: true, nome: true, fichasTecnicas: { where: { ativa: true }, select: { id: true } } },
  })
  if (produtos.length !== entrada.itens.length) throw new ErroDeNegocio('Um dos produtos não pertence a esta loja.')

  const semFicha = produtos.filter((p) => p.fichasTecnicas.length === 0)
  if (semFicha.length > 0) {
    throw new ErroDeNegocio(
      `Sem ficha técnica: ${semFicha.map((p) => p.nome).join(', ')}. Crie a ficha para o sistema saber o que consumir.`,
      'REGRA_DE_NEGOCIO',
    )
  }

  const ordem = await db.$transaction(async (tx) => {
    const codigo = await proximoCodigo(tx, sessao.lojaId, 'producao')

    let custoEstimado = 0
    const itensComCusto: Array<{ produtoId: string; fichaTecnicaId: string; quantidadePlanejada: number; custoUnitario: number; observacao: string | null }> = []

    for (const item of entrada.itens) {
      const produto = produtos.find((p) => p.id === item.produtoId)!
      const fichaId = produto.fichasTecnicas[0].id
      const consumo = await calcularConsumo(tx, item.produtoId, item.quantidadePlanejada, fichaId)
      custoEstimado += consumo.custoTotal
      itensComCusto.push({
        produtoId: item.produtoId,
        fichaTecnicaId: fichaId,
        quantidadePlanejada: item.quantidadePlanejada,
        custoUnitario: item.quantidadePlanejada > 0 ? consumo.custoTotal / item.quantidadePlanejada : 0,
        observacao: item.observacao || null,
      })
    }

    return tx.ordemProducao.create({
      data: {
        lojaId: sessao.lojaId,
        codigo,
        data: new Date(`${entrada.data}T12:00:00`),
        turno: entrada.turno || null,
        observacao: entrada.observacao || null,
        responsavelId: sessao.id,
        custoEstimado: brl(custoEstimado),
        itens: { createMany: { data: itensComCusto } },
      },
      select: { id: true, codigo: true, custoEstimado: true },
    })
  })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'producao.ordem_criada',
    entidade: 'ordem_producao',
    entidadeId: ordem.id,
    novo: { codigo: ordem.codigo, itens: entrada.itens.length, custoEstimado: moeda(ordem.custoEstimado) },
  })

  revalidatePath('/producao')
  revalidatePath('/producao/ordens')
  return { id: ordem.id, codigo: ordem.codigo }
})

export const iniciarOrdem = acao(z.object({ id: uuid }), async ({ id }) => {
  const sessao = await exigirPermissao('producao.gerenciar')
  const ordem = await db.ordemProducao.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { status: true, codigo: true } })
  if (!ordem) throw new ErroDeNegocio('Ordem não encontrada.', 'NAO_ENCONTRADO')
  if (ordem.status !== 'PLANEJADA') throw new ErroDeNegocio('Só uma ordem planejada pode ser iniciada.')

  await db.ordemProducao.update({ where: { id }, data: { status: 'EM_PRODUCAO', iniciadaEm: new Date() } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'producao.ordem_iniciada',
    entidade: 'ordem_producao',
    entidadeId: id,
    novo: { codigo: ordem.codigo },
  })
  revalidatePath('/producao')
  revalidatePath(`/producao/ordens/${id}`)
  return { codigo: ordem.codigo }
})

/** Apontamento do que saiu do forno. Não movimenta estoque ainda. */
export const apontarProducao = acao(
  z.object({
    ordemId: uuid,
    itens: z.array(
      z.object({
        itemId: uuid,
        quantidadeProduzida: z.number().min(0).max(99_999),
        quantidadePerdida: z.number().min(0).max(99_999).default(0),
      }),
    ),
  }),
  async ({ ordemId, itens }) => {
    const sessao = await exigirPermissao('producao.gerenciar')
    const ordem = await db.ordemProducao.findFirst({ where: { id: ordemId, lojaId: sessao.lojaId }, select: { status: true } })
    if (!ordem) throw new ErroDeNegocio('Ordem não encontrada.', 'NAO_ENCONTRADO')
    if (ordem.status === 'CONCLUIDA' || ordem.status === 'CANCELADA') {
      throw new ErroDeNegocio('Esta ordem já foi encerrada.')
    }

    await db.$transaction(async (tx) => {
      for (const item of itens) {
        await tx.ordemProducaoItem.update({
          where: { id: item.itemId },
          data: { quantidadeProduzida: item.quantidadeProduzida, quantidadePerdida: item.quantidadePerdida },
        })
      }
      if (ordem.status === 'PLANEJADA') {
        await tx.ordemProducao.update({ where: { id: ordemId }, data: { status: 'EM_PRODUCAO', iniciadaEm: new Date() } })
      }
    })

    revalidatePath(`/producao/ordens/${ordemId}`)
    revalidatePath('/producao')
    return true
  },
)

/**
 * Conclui a ordem.
 *
 * É aqui que o estoque muda, e por isso é uma transação só: consome os insumos
 * pelo que foi **realmente** produzido (não pelo planejado), dá entrada nos
 * acabados, registra as perdas do forno e congela o custo real da ordem.
 */
export const concluirOrdem = acao(z.object({ id: uuid }), async ({ id }) => {
  const sessao = await exigirPermissao('producao.gerenciar')

  const resultado = await db.$transaction(
    async (tx) => {
      const ordem = await tx.ordemProducao.findFirst({
        where: { id, lojaId: sessao.lojaId },
        include: { itens: { include: { produto: { select: { id: true, nome: true, controlaEstoque: true } } } } },
      })
      if (!ordem) throw new ErroDeNegocio('Ordem não encontrada.', 'NAO_ENCONTRADO')
      if (ordem.status === 'CONCLUIDA') throw new ErroDeNegocio('Esta ordem já foi concluída.')
      if (ordem.status === 'CANCELADA') throw new ErroDeNegocio('Esta ordem está cancelada.')

      const comProducao = ordem.itens.filter((i) => num(i.quantidadeProduzida) > 0 || num(i.quantidadePerdida) > 0)
      if (comProducao.length === 0) {
        throw new ErroDeNegocio('Aponte a quantidade produzida antes de concluir a ordem.')
      }

      let custoReal = 0

      for (const item of comProducao) {
        const produzido = num(item.quantidadeProduzida)
        const perdido = num(item.quantidadePerdida)
        const total = produzido + perdido

        // Insumos saem pelo total que foi para o forno, inclusive o que queimou.
        if (total > 0) {
          const consumo = await calcularConsumo(tx, item.produtoId, total, item.fichaTecnicaId)
          for (const c of consumo.itens) {
            await movimentar(tx, {
              lojaId: sessao.lojaId,
              ingredienteId: c.ingredienteId,
              tipo: 'SAIDA_PRODUCAO',
              quantidade: c.quantidade,
              origemTipo: 'ordem_producao',
              origemId: ordem.id,
              usuarioId: sessao.id,
              observacao: `Ordem ${ordem.codigo} · ${item.produto.nome}`,
            })
          }
          custoReal += consumo.custoTotal

          const custoUnitarioReal = total > 0 ? consumo.custoTotal / total : 0
          await tx.ordemProducaoItem.update({
            where: { id: item.id },
            data: { custoUnitario: Math.round(custoUnitarioReal * 10_000) / 10_000 },
          })
        }

        // Acabados entram no estoque.
        if (produzido > 0 && item.produto.controlaEstoque) {
          await movimentar(tx, {
            lojaId: sessao.lojaId,
            produtoId: item.produtoId,
            tipo: 'ENTRADA_PRODUCAO',
            quantidade: produzido,
            origemTipo: 'ordem_producao',
            origemId: ordem.id,
            usuarioId: sessao.id,
            observacao: `Ordem ${ordem.codigo}`,
          })
          // Produzir de novo volta a deixar o item disponível na vitrine.
          await tx.produto.update({ where: { id: item.produtoId }, data: { disponivel: true } })
        }

        // Perda do forno vai para o módulo de perdas, com custo estimado.
        if (perdido > 0) {
          const custoUnit = num(item.custoUnitario)
          await tx.perda.create({
            data: {
              lojaId: sessao.lojaId,
              produtoId: item.produtoId,
              ordemProducaoId: ordem.id,
              quantidade: perdido,
              motivo: 'ERRO_PRODUCAO',
              custoEstimado: brl(perdido * custoUnit),
              observacao: `Perda apontada na ordem ${ordem.codigo}`,
              usuarioId: sessao.id,
            },
          })
        }
      }

      await tx.ordemProducao.update({
        where: { id },
        data: { status: 'CONCLUIDA', concluidaEm: new Date(), custoReal: brl(custoReal) },
      })

      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'producao.ordem_concluida',
          entidade: 'ordem_producao',
          entidadeId: id,
          novo: {
            codigo: ordem.codigo,
            custoEstimado: moeda(ordem.custoEstimado),
            custoReal: moeda(brl(custoReal)),
            itens: comProducao.length,
          },
        },
        tx,
      )

      return {
        codigo: ordem.codigo,
        custoReal: brl(custoReal),
        produzido: comProducao.reduce((a, i) => a + num(i.quantidadeProduzida), 0),
      }
    },
    { timeout: 30_000 },
  )

  revalidatePath('/producao')
  revalidatePath('/producao/ordens')
  revalidatePath('/estoque')
  revalidatePath('/perdas')
  return resultado
})

export const cancelarOrdem = acao(
  z.object({ id: uuid, motivo: z.string().trim().min(3, 'Informe o motivo.').max(200) }),
  async ({ id, motivo }) => {
    const sessao = await exigirPermissao('producao.gerenciar')
    const ordem = await db.ordemProducao.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { status: true, codigo: true } })
    if (!ordem) throw new ErroDeNegocio('Ordem não encontrada.', 'NAO_ENCONTRADO')
    if (ordem.status === 'CONCLUIDA') {
      throw new ErroDeNegocio('Uma ordem concluída já movimentou estoque e não pode ser cancelada. Registre uma perda ou um ajuste.')
    }

    await db.ordemProducao.update({
      where: { id },
      data: { status: 'CANCELADA', observacao: motivo },
    })
    await registrarLog({
      lojaId: sessao.lojaId,
      usuarioId: sessao.id,
      acao: 'producao.ordem_cancelada',
      entidade: 'ordem_producao',
      entidadeId: id,
      novo: { codigo: ordem.codigo, motivo },
    })
    revalidatePath('/producao/ordens')
    return true
  },
)
