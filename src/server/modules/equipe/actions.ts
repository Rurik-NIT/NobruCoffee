'use server'

import { revalidatePath } from 'next/cache'

import { acao } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { hashSenha, validarForcaSenha } from '@/server/auth/password'
import { TODAS_PERMISSOES } from '@/server/auth/permissions'
import { exigirPermissao, revogarSessoesDoUsuario } from '@/server/auth/session'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { slugify } from '@/lib/utils'
import { alternarUsuarioSchema, cargoSchema, idUsuarioSchema, usuarioSchema } from './schemas'

export const salvarUsuario = acao(usuarioSchema, async (entrada) => {
  const sessao = await exigirPermissao('equipe.gerenciar')

  const cargo = await db.cargo.findFirst({
    where: { id: entrada.cargoId, empresaId: sessao.empresaId },
    select: { id: true, nome: true, permissoes: true },
  })
  if (!cargo) throw new ErroDeNegocio('Cargo inválido.', 'VALIDACAO', { cargoId: 'Escolha um cargo.' })

  // Só quem administra permissões pode conceder acesso total a outra pessoa.
  if (cargo.permissoes.includes('*')) await exigirPermissao('equipe.permissoes')

  const duplicado = await db.usuario.findFirst({
    where: { email: entrada.email, ...(entrada.id ? { id: { not: entrada.id } } : {}) },
    select: { id: true },
  })
  if (duplicado) throw new ErroDeNegocio('Este e-mail já está em uso.', 'CONFLITO', { email: 'E-mail já cadastrado.' })

  const dados = {
    nome: entrada.nome,
    email: entrada.email,
    cargoId: entrada.cargoId,
    telefone: entrada.telefone || null,
    cpf: entrada.cpf || null,
    admitidoEm: entrada.admitidoEm ? new Date(`${entrada.admitidoEm}T12:00:00`) : null,
    ativo: entrada.ativo,
  }

  let usuario: { id: string; nome: string }

  if (entrada.id) {
    const atual = await db.usuario.findFirst({
      where: { id: entrada.id, empresaId: sessao.empresaId },
      select: { id: true, cargoId: true, ativo: true },
    })
    if (!atual) throw new ErroDeNegocio('Funcionário não encontrado.', 'NAO_ENCONTRADO')

    const senhaNova = entrada.senha
      ? await (async () => {
          const problema = validarForcaSenha(entrada.senha!)
          if (problema) throw new ErroDeNegocio(problema, 'VALIDACAO', { senha: problema })
          return hashSenha(entrada.senha!)
        })()
      : undefined

    usuario = await db.usuario.update({
      where: { id: entrada.id },
      data: { ...dados, ...(senhaNova ? { senhaHash: senhaNova } : {}) },
      select: { id: true, nome: true },
    })

    // Desativar ou trocar senha derruba as sessões abertas na hora.
    if (senhaNova || (atual.ativo && !entrada.ativo)) {
      await revogarSessoesDoUsuario(entrada.id)
    }
  } else {
    if (!entrada.senha) {
      throw new ErroDeNegocio('Defina a senha inicial.', 'VALIDACAO', { senha: 'Obrigatória para novo acesso.' })
    }
    const problema = validarForcaSenha(entrada.senha)
    if (problema) throw new ErroDeNegocio(problema, 'VALIDACAO', { senha: problema })

    usuario = await db.usuario.create({
      data: {
        ...dados,
        empresaId: sessao.empresaId,
        lojaId: sessao.lojaId,
        senhaHash: await hashSenha(entrada.senha),
      },
      select: { id: true, nome: true },
    })
  }

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: entrada.id ? 'usuario.editado' : 'usuario.criado',
    entidade: 'usuario',
    entidadeId: usuario.id,
    novo: { nome: dados.nome, email: dados.email, cargo: cargo.nome, ativo: dados.ativo, senhaAlterada: Boolean(entrada.senha) },
  })

  revalidatePath('/equipe')
  return { id: usuario.id, nome: usuario.nome }
})

export const alternarUsuario = acao(alternarUsuarioSchema, async ({ id, ativo }) => {
  const sessao = await exigirPermissao('equipe.gerenciar')
  if (id === sessao.id) throw new ErroDeNegocio('Você não pode desativar o seu próprio acesso.')

  const usuario = await db.usuario.findFirst({ where: { id, empresaId: sessao.empresaId }, select: { nome: true } })
  if (!usuario) throw new ErroDeNegocio('Funcionário não encontrado.', 'NAO_ENCONTRADO')

  await db.usuario.update({ where: { id }, data: { ativo } })
  if (!ativo) await revogarSessoesDoUsuario(id)

  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: ativo ? 'usuario.reativado' : 'usuario.desativado',
    entidade: 'usuario',
    entidadeId: id,
    novo: { nome: usuario.nome },
  })
  revalidatePath('/equipe')
  return { nome: usuario.nome, ativo }
})

export const encerrarSessoesDoUsuario = acao(idUsuarioSchema, async ({ id }) => {
  const sessao = await exigirPermissao('equipe.gerenciar')
  const usuario = await db.usuario.findFirst({ where: { id, empresaId: sessao.empresaId }, select: { nome: true } })
  if (!usuario) throw new ErroDeNegocio('Funcionário não encontrado.', 'NAO_ENCONTRADO')

  await revogarSessoesDoUsuario(id)
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'usuario.sessoes_encerradas',
    entidade: 'usuario',
    entidadeId: id,
    novo: { nome: usuario.nome },
  })
  revalidatePath('/equipe')
  return { nome: usuario.nome }
})

// ═══════════════════════════════════════════════════════════════════════════
//  CARGOS E PERMISSÕES
// ═══════════════════════════════════════════════════════════════════════════

export const salvarCargo = acao(cargoSchema, async (entrada) => {
  const sessao = await exigirPermissao('equipe.permissoes')

  // Só aceita chaves que existem no catálogo — protege contra permissão inventada.
  const validas = entrada.permissoes.filter((p) => (TODAS_PERMISSOES as string[]).includes(p))
  if (validas.length === 0) throw new ErroDeNegocio('Selecione ao menos uma permissão.', 'VALIDACAO', { permissoes: 'Obrigatório.' })

  if (entrada.id) {
    const atual = await db.cargo.findFirst({
      where: { id: entrada.id, empresaId: sessao.empresaId },
      select: { id: true, nome: true, sistema: true, permissoes: true },
    })
    if (!atual) throw new ErroDeNegocio('Cargo não encontrado.', 'NAO_ENCONTRADO')
    // O Administrador não perde o `*`: alguém precisa poder destravar o sistema.
    if (atual.permissoes.includes('*')) {
      throw new ErroDeNegocio('O cargo Administrador tem acesso total e não pode ser editado.', 'REGRA_DE_NEGOCIO')
    }

    const atualizado = await db.cargo.update({
      where: { id: entrada.id },
      data: { nome: entrada.nome, descricao: entrada.descricao || null, permissoes: validas },
      select: { id: true, nome: true },
    })
    await registrarLog({
      lojaId: sessao.lojaId,
      usuarioId: sessao.id,
      acao: 'cargo.permissoes_alteradas',
      entidade: 'cargo',
      entidadeId: atualizado.id,
      anterior: { permissoes: atual.permissoes.length },
      novo: { nome: entrada.nome, permissoes: validas.length, lista: validas },
    })
    revalidatePath('/equipe/cargos')
    return { id: atualizado.id, nome: atualizado.nome }
  }

  const criado = await db.cargo.create({
    data: {
      empresaId: sessao.empresaId,
      nome: entrada.nome,
      slug: slugify(entrada.nome),
      descricao: entrada.descricao || null,
      permissoes: validas,
    },
    select: { id: true, nome: true },
  })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'cargo.criado',
    entidade: 'cargo',
    entidadeId: criado.id,
    novo: { nome: entrada.nome, permissoes: validas.length },
  })
  revalidatePath('/equipe/cargos')
  return criado
})

export const excluirCargo = acao(idUsuarioSchema, async ({ id }) => {
  const sessao = await exigirPermissao('equipe.permissoes')
  const cargo = await db.cargo.findFirst({
    where: { id, empresaId: sessao.empresaId },
    include: { _count: { select: { usuarios: true } } },
  })
  if (!cargo) throw new ErroDeNegocio('Cargo não encontrado.', 'NAO_ENCONTRADO')
  if (cargo.sistema) throw new ErroDeNegocio('Cargos padrão do sistema não podem ser excluídos.')
  if (cargo._count.usuarios > 0) {
    throw new ErroDeNegocio(
      `${cargo._count.usuarios} pessoa(s) usam este cargo. Mova-as para outro cargo antes de excluir.`,
      'CONFLITO',
    )
  }

  await db.cargo.delete({ where: { id } })
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'cargo.excluido',
    entidade: 'cargo',
    entidadeId: id,
    anterior: { nome: cargo.nome },
  })
  revalidatePath('/equipe/cargos')
  return true
})
