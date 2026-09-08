'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao, exigirSessao } from '@/server/auth/session'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { slugify } from '@/lib/utils'
import {
  alternarFormaSchema,
  configuracaoSchema,
  formaPagamentoSchema,
  idFormaSchema,
  lojaSchema,
  meuPerfilSchema,
} from './schemas'

const uuid = z.string().uuid()

export const salvarConfiguracao = acao(configuracaoSchema, async (entrada) => {
  const sessao = await exigirPermissao('configuracoes.gerenciar')

  const anterior = await db.configuracao.findUnique({ where: { lojaId: sessao.lojaId } })

  const dados = {
    nomeNegocio: entrada.nomeNegocio,
    logoUrl: entrada.logoUrl || null,
    alertaValidadeDias: entrada.alertaValidadeDias,
    pontosPorReal: entrada.pontosPorReal,
    valorPorPonto: entrada.valorPorPonto,
    taxaServicoPercentual: entrada.taxaServicoPercentual,
    taxaEntregaPadrao: entrada.taxaEntregaPadrao,
    descontoMaximoOperador: entrada.descontoMaximoOperador,
    baixaEstoqueNaVenda: entrada.baixaEstoqueNaVenda,
    horarioAbertura: entrada.horarioAbertura || null,
    horarioFechamento: entrada.horarioFechamento || null,
    diasFuncionamento: entrada.diasFuncionamento,
    whatsapp: entrada.whatsapp || null,
    instagram: entrada.instagram || null,
  }

  await db.configuracao.upsert({
    where: { lojaId: sessao.lojaId },
    create: { ...dados, lojaId: sessao.lojaId },
    update: dados,
  })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'configuracao.alterada',
    entidade: 'configuracao',
    entidadeId: sessao.lojaId,
    anterior: anterior
      ? {
          descontoMaximoOperador: String(anterior.descontoMaximoOperador),
          baixaEstoqueNaVenda: anterior.baixaEstoqueNaVenda,
          pontosPorReal: String(anterior.pontosPorReal),
        }
      : undefined,
    novo: {
      descontoMaximoOperador: entrada.descontoMaximoOperador,
      baixaEstoqueNaVenda: entrada.baixaEstoqueNaVenda,
      pontosPorReal: entrada.pontosPorReal,
    },
  })

  revalidatePath('/configuracoes')
  return { nomeNegocio: entrada.nomeNegocio }
})

export const salvarLoja = acao(lojaSchema, async (entrada) => {
  const sessao = await exigirPermissao('configuracoes.gerenciar')
  await db.loja.update({
    where: { id: sessao.lojaId },
    data: {
      nome: entrada.nome,
      cnpj: entrada.cnpj || null,
      telefone: entrada.telefone || null,
      email: entrada.email || null,
      cep: entrada.cep || null,
      logradouro: entrada.logradouro || null,
      numero: entrada.numero || null,
      complemento: entrada.complemento || null,
      bairro: entrada.bairro || null,
      cidade: entrada.cidade || null,
      uf: entrada.uf ? entrada.uf.toUpperCase() : null,
    },
  })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'loja.editada',
    entidade: 'loja',
    entidadeId: sessao.lojaId,
    novo: { nome: entrada.nome },
  })
  revalidatePath('/configuracoes')
  return { nome: entrada.nome }
})

// ═══════════════════════════════════════════════════════════════════════════
//  FORMAS DE PAGAMENTO
// ═══════════════════════════════════════════════════════════════════════════

export const salvarFormaPagamento = acao(formaPagamentoSchema, async (entrada) => {
  const sessao = await exigirPermissao('configuracoes.gerenciar')

  const dados = {
    nome: entrada.nome,
    slug: slugify(entrada.nome),
    tipo: entrada.tipo,
    taxaPercentual: entrada.taxaPercentual,
    taxaFixa: entrada.taxaFixa,
    prazoRecebimentoDias: entrada.prazoRecebimentoDias,
    // Dinheiro sempre conta na gaveta e sempre dá troco: o resto é escolha.
    contaNoCaixa: entrada.tipo === 'DINHEIRO' ? true : entrada.contaNoCaixa,
    permiteTroco: entrada.tipo === 'DINHEIRO' ? true : entrada.permiteTroco,
    ordem: entrada.ordem,
    ativo: entrada.ativo,
  }

  const forma = entrada.id
    ? await db.formaPagamento.update({ where: { id: entrada.id }, data: dados })
    : await db.formaPagamento.create({ data: { ...dados, lojaId: sessao.lojaId } })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'forma_pagamento.editada' : 'forma_pagamento.criada',
    entidade: 'forma_pagamento',
    entidadeId: forma.id,
    novo: dados,
  })

  revalidatePath('/configuracoes/pagamentos')
  revalidatePath('/pdv')
  return { id: forma.id, nome: forma.nome }
})

export const alternarFormaPagamento = acao(alternarFormaSchema, async ({ id, ativo }) => {
  const sessao = await exigirPermissao('configuracoes.gerenciar')
  const forma = await db.formaPagamento.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { nome: true } })
  if (!forma) throw new ErroDeNegocio('Forma de pagamento não encontrada.', 'NAO_ENCONTRADO')

  if (!ativo) {
    const ativas = await db.formaPagamento.count({ where: { lojaId: sessao.lojaId, ativo: true } })
    if (ativas <= 1) throw new ErroDeNegocio('Mantenha ao menos uma forma de pagamento ativa para o PDV funcionar.')
  }

  await db.formaPagamento.update({ where: { id }, data: { ativo } })
  revalidatePath('/configuracoes/pagamentos')
  revalidatePath('/pdv')
  return { nome: forma.nome, ativo }
})

export const excluirFormaPagamento = acao(idFormaSchema, async ({ id }) => {
  const sessao = await exigirPermissao('configuracoes.gerenciar')
  const forma = await db.formaPagamento.findFirst({
    where: { id, lojaId: sessao.lojaId },
    include: { _count: { select: { pagamentos: true } } },
  })
  if (!forma) throw new ErroDeNegocio('Forma de pagamento não encontrada.', 'NAO_ENCONTRADO')
  if (forma._count.pagamentos > 0) {
    throw new ErroDeNegocio('Esta forma já foi usada em vendas. Desative em vez de excluir.', 'CONFLITO')
  }

  await db.formaPagamento.delete({ where: { id } })
  revalidatePath('/configuracoes/pagamentos')
  return true
})

/** Dados da própria conta — qualquer pessoa logada pode ajustar os seus. */
export const salvarMeuPerfil = acao(meuPerfilSchema, async ({ nome, telefone }) => {
    const sessao = await exigirSessao()
    await db.usuario.update({ where: { id: sessao.id }, data: { nome, telefone: telefone || null } })
    revalidatePath('/configuracoes')
    return { nome }
})
