'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { exigirPermissao, exigirSessao } from '@/server/auth/session'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import {
  ajustarPontosSchema,
  alternarCupomSchema,
  arquivarClienteSchema,
  buscaClienteSchema,
  cadastroRapidoSchema,
  clienteSchema,
  cupomAniversarioSchema,
  cupomSchema,
} from './schemas'
import { buscarClientes } from './service'

const uuid = z.string().uuid()

export const salvarCliente = acao(clienteSchema, async (entrada) => {
  const sessao = await exigirPermissao('clientes.gerenciar')

  // O telefone é a chave do cliente na loja — é por ele que o balcão procura.
  const duplicado = await db.cliente.findFirst({
    where: { lojaId: sessao.lojaId, telefone: entrada.telefone, ...(entrada.id ? { id: { not: entrada.id } } : {}) },
    select: { id: true, nome: true },
  })
  if (duplicado) {
    throw new ErroDeNegocio(`Este telefone já é de ${duplicado.nome}.`, 'CONFLITO', {
      telefone: `Já cadastrado para ${duplicado.nome}.`,
    })
  }

  const dados = {
    nome: entrada.nome,
    telefone: entrada.telefone,
    email: entrada.email || null,
    cpf: entrada.cpf || null,
    dataNascimento: entrada.dataNascimento ? new Date(`${entrada.dataNascimento}T12:00:00`) : null,
    cep: entrada.cep || null,
    logradouro: entrada.logradouro || null,
    numero: entrada.numero || null,
    complemento: entrada.complemento || null,
    bairro: entrada.bairro || null,
    cidade: entrada.cidade || null,
    uf: entrada.uf ? entrada.uf.toUpperCase() : null,
    observacoes: entrada.observacoes || null,
    ativo: entrada.ativo,
  }

  const cliente = entrada.id
    ? await db.cliente.update({ where: { id: entrada.id }, data: dados })
    : await db.cliente.create({ data: { ...dados, lojaId: sessao.lojaId } })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'cliente.editado' : 'cliente.criado',
    entidade: 'cliente',
    entidadeId: cliente.id,
    novo: { nome: cliente.nome, telefone: cliente.telefone },
  })

  revalidatePath('/clientes')
  revalidatePath('/pdv')
  return { id: cliente.id, nome: cliente.nome, telefone: cliente.telefone }
})

/** Cadastro expresso no PDV: nome e telefone, o resto depois. */
export const cadastroRapidoCliente = acao(cadastroRapidoSchema, async ({ nome, telefone }) => {
    const sessao = await exigirPermissao('clientes.gerenciar')
    const existente = await db.cliente.findFirst({
      where: { lojaId: sessao.lojaId, telefone },
      select: { id: true, nome: true, telefone: true, pontos: true },
    })
    if (existente) return existente

    const cliente = await db.cliente.create({
      data: { lojaId: sessao.lojaId, nome, telefone },
      select: { id: true, nome: true, telefone: true, pontos: true },
    })
    await registrarLog({
      lojaId: sessao.lojaId,
      usuarioId: sessao.id,
      acao: 'cliente.criado_pdv',
      entidade: 'cliente',
      entidadeId: cliente.id,
      novo: { nome, telefone },
    })
    revalidatePath('/clientes')
    return cliente
})

export const buscarClientesAction = acao(buscaClienteSchema, async ({ termo }) => {
    const sessao = await exigirSessao()
    if (termo.length < 2) return []
    return buscarClientes(sessao.lojaId, termo)
})

export const arquivarCliente = acao(arquivarClienteSchema, async ({ id, ativo }) => {
  const sessao = await exigirPermissao('clientes.gerenciar')
  const cliente = await db.cliente.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { nome: true } })
  if (!cliente) throw new ErroDeNegocio('Cliente não encontrado.', 'NAO_ENCONTRADO')

  await db.cliente.update({ where: { id }, data: { ativo } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: ativo ? 'cliente.reativado' : 'cliente.arquivado',
    entidade: 'cliente',
    entidadeId: id,
  })
  revalidatePath('/clientes')
  return { nome: cliente.nome, ativo }
})

// ═══════════════════════════════════════════════════════════════════════════
//  FIDELIDADE E CUPONS
// ═══════════════════════════════════════════════════════════════════════════

export const ajustarPontos = acao(ajustarPontosSchema, async ({ clienteId, pontos, descricao }) => {
    const sessao = await exigirPermissao('fidelidade.ajustar')

    const resultado = await db.$transaction(async (tx) => {
      const cliente = await tx.cliente.findFirst({
        where: { id: clienteId, lojaId: sessao.lojaId },
        select: { nome: true, pontos: true },
      })
      if (!cliente) throw new ErroDeNegocio('Cliente não encontrado.', 'NAO_ENCONTRADO')
      if (cliente.pontos + pontos < 0) {
        throw new ErroDeNegocio(`${cliente.nome} tem ${cliente.pontos} pontos — o ajuste deixaria o saldo negativo.`)
      }

      const atualizado = await tx.cliente.update({
        where: { id: clienteId },
        data: { pontos: { increment: pontos } },
        select: { pontos: true },
      })
      await tx.transacaoFidelidade.create({
        data: {
          clienteId,
          tipo: 'AJUSTE',
          pontos,
          saldoApos: atualizado.pontos,
          descricao,
          usuarioId: sessao.id,
        },
      })
      await registrarLog(
        {
          lojaId: sessao.lojaId,
          usuarioId: sessao.id,
          acao: 'fidelidade.ajustada',
          entidade: 'cliente',
          entidadeId: clienteId,
          novo: { pontos, saldoApos: atualizado.pontos, descricao },
        },
        tx,
      )
      return { nome: cliente.nome, saldo: atualizado.pontos }
    })

    revalidatePath('/clientes')
    revalidatePath('/clientes/fidelidade')
    return resultado
})

export const salvarCupom = acao(cupomSchema, async (entrada) => {
  const sessao = await exigirPermissao('fidelidade.ajustar')
  const codigo = entrada.codigo.toUpperCase()

  const duplicado = await db.cupom.findFirst({
    where: { lojaId: sessao.lojaId, codigo, ...(entrada.id ? { id: { not: entrada.id } } : {}) },
    select: { id: true },
  })
  if (duplicado) throw new ErroDeNegocio('Já existe um cupom com este código.', 'CONFLITO', { codigo: 'Código em uso.' })

  const dados = {
    codigo,
    descricao: entrada.descricao || null,
    tipo: entrada.tipo,
    valor: entrada.valor,
    minimoCompra: entrada.minimoCompra,
    usoMaximo: entrada.usoMaximo ?? null,
    validoDe: entrada.validoDe ? new Date(`${entrada.validoDe}T00:00:00`) : null,
    validoAte: entrada.validoAte ? new Date(`${entrada.validoAte}T00:00:00`) : null,
    clienteId: entrada.clienteId ?? null,
    ativo: entrada.ativo,
  }

  const cupom = entrada.id
    ? await db.cupom.update({ where: { id: entrada.id }, data: dados })
    : await db.cupom.create({ data: { ...dados, lojaId: sessao.lojaId } })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'cupom.editado' : 'cupom.criado',
    entidade: 'cupom',
    entidadeId: cupom.id,
    novo: dados,
  })

  revalidatePath('/clientes/fidelidade')
  return { id: cupom.id, codigo: cupom.codigo }
})

export const alternarCupom = acao(alternarCupomSchema, async ({ id, ativo }) => {
  const sessao = await exigirPermissao('fidelidade.ajustar')
  const cupom = await db.cupom.findFirst({ where: { id, lojaId: sessao.lojaId }, select: { codigo: true } })
  if (!cupom) throw new ErroDeNegocio('Cupom não encontrado.', 'NAO_ENCONTRADO')
  await db.cupom.update({ where: { id }, data: { ativo } })
  revalidatePath('/clientes/fidelidade')
  return { codigo: cupom.codigo, ativo }
})

/** Cupom de aniversário: 15% válido por 7 dias, nominal ao cliente. */
export const emitirCupomAniversario = acao(cupomAniversarioSchema, async ({ clienteId }) => {
  const sessao = await exigirPermissao('fidelidade.ajustar')
  const cliente = await db.cliente.findFirst({
    where: { id: clienteId, lojaId: sessao.lojaId },
    select: { nome: true, telefone: true },
  })
  if (!cliente) throw new ErroDeNegocio('Cliente não encontrado.', 'NAO_ENCONTRADO')

  const codigo = `NIVER${cliente.telefone.slice(-4)}${String(new Date().getFullYear()).slice(-2)}`
  const existente = await db.cupom.findFirst({ where: { lojaId: sessao.lojaId, codigo }, select: { id: true } })
  if (existente) throw new ErroDeNegocio('O cupom de aniversário deste cliente já foi emitido este ano.', 'CONFLITO')

  const cupom = await db.cupom.create({
    data: {
      lojaId: sessao.lojaId,
      codigo,
      descricao: `Aniversário de ${cliente.nome}`,
      tipo: 'PERCENTUAL',
      valor: 15,
      usoMaximo: 1,
      validoDe: new Date(),
      validoAte: new Date(Date.now() + 7 * 86_400_000),
      clienteId,
    },
    select: { id: true, codigo: true },
  })

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'cupom.aniversario_emitido',
    entidade: 'cupom',
    entidadeId: cupom.id,
    novo: { cliente: cliente.nome, codigo: cupom.codigo },
  })

  revalidatePath('/clientes')
  revalidatePath('/clientes/fidelidade')
  return { codigo: cupom.codigo, cliente: cliente.nome }
})

/** Carrega o cliente completo para o formulário no cliente. */
export const obterClienteAction = acao(arquivarClienteSchema.pick({ id: true }), async ({ id }) => {
  const sessao = await exigirPermissao('clientes.ver')
  const c = await db.cliente.findFirst({ where: { id, lojaId: sessao.lojaId } })
  if (!c) throw new ErroDeNegocio('Cliente não encontrado.', 'NAO_ENCONTRADO')
  return {
    id: c.id,
    nome: c.nome,
    telefone: c.telefone,
    email: c.email ?? '',
    cpf: c.cpf ?? '',
    dataNascimento: c.dataNascimento ? c.dataNascimento.toISOString().slice(0, 10) : '',
    cep: c.cep ?? '',
    logradouro: c.logradouro ?? '',
    numero: c.numero ?? '',
    complemento: c.complemento ?? '',
    bairro: c.bairro ?? '',
    cidade: c.cidade ?? '',
    uf: c.uf ?? '',
    observacoes: c.observacoes ?? '',
    ativo: c.ativo,
  }
})
