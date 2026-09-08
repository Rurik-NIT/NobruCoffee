'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao } from '@/server/auth/session'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { brl, num } from '@/lib/money'
import { moeda, quantidade as fmtQtd } from '@/lib/format'
import { movimentar } from '@/server/modules/estoque/service'
import { perdaSchema } from './schemas'

const uuid = z.string().uuid()

/**
 * Registrar perda faz duas coisas de uma vez: tira do estoque e guarda o custo.
 * Sem a baixa, o saldo mente; sem o custo, o relatório de perdas não serve para
 * decidir nada.
 */
export const registrarPerda = acao(perdaSchema, async (entrada) => {
  const sessao = await exigirPermissao('perdas.registrar')

  const resultado = await db.$transaction(async (tx) => {
    let custoUnitario = 0
    let nome = ''
    let unidade = 'UN'

    if (entrada.tipo === 'produto') {
      const produto = await tx.produto.findFirst({
        where: { id: entrada.produtoId!, lojaId: sessao.lojaId },
        select: { id: true, nome: true, precoCusto: true, unidade: true, controlaEstoque: true },
      })
      if (!produto) throw new ErroDeNegocio('Produto não encontrado.', 'NAO_ENCONTRADO')
      custoUnitario = num(produto.precoCusto)
      nome = produto.nome
      unidade = produto.unidade

      if (produto.controlaEstoque) {
        await movimentar(tx, {
          lojaId: sessao.lojaId,
          produtoId: produto.id,
          tipo: 'PERDA',
          quantidade: entrada.quantidade,
          custoUnitario,
          origemTipo: 'perda',
          usuarioId: sessao.id,
          observacao: `${entrada.motivo}${entrada.observacao ? ` · ${entrada.observacao}` : ''}`,
        })
      }
    } else {
      const ingrediente = await tx.ingrediente.findFirst({
        where: { id: entrada.ingredienteId!, lojaId: sessao.lojaId },
        select: { id: true, nome: true, custoMedio: true, unidade: true },
      })
      if (!ingrediente) throw new ErroDeNegocio('Insumo não encontrado.', 'NAO_ENCONTRADO')
      custoUnitario = num(ingrediente.custoMedio)
      nome = ingrediente.nome
      unidade = ingrediente.unidade

      await movimentar(tx, {
        lojaId: sessao.lojaId,
        ingredienteId: ingrediente.id,
        tipo: 'PERDA',
        quantidade: entrada.quantidade,
        origemTipo: 'perda',
        usuarioId: sessao.id,
        observacao: `${entrada.motivo}${entrada.observacao ? ` · ${entrada.observacao}` : ''}`,
      })
    }

    const custoEstimado = brl(entrada.quantidade * custoUnitario)

    const perda = await tx.perda.create({
      data: {
        lojaId: sessao.lojaId,
        produtoId: entrada.tipo === 'produto' ? entrada.produtoId! : null,
        ingredienteId: entrada.tipo === 'insumo' ? entrada.ingredienteId! : null,
        quantidade: entrada.quantidade,
        motivo: entrada.motivo,
        custoEstimado,
        observacao: entrada.observacao || null,
        usuarioId: sessao.id,
      },
      select: { id: true },
    })

    await registrarLog(
      {
        lojaId: sessao.lojaId,
        usuarioId: sessao.id,
        acao: 'perda.registrada',
        entidade: 'perda',
        entidadeId: perda.id,
        novo: { item: nome, quantidade: fmtQtd(entrada.quantidade, unidade), motivo: entrada.motivo, custo: moeda(custoEstimado) },
      },
      tx,
    )

    return { nome, custoEstimado }
  })

  revalidatePath('/perdas')
  revalidatePath('/estoque')
  revalidatePath('/dashboard')
  return resultado
})
