'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { acao, acaoSimples } from '@/server/action'
import { registrarLog } from '@/server/audit'
import { db } from '@/server/db'
import { ErroDeNegocio } from '@/server/errors'
import { hashSenha, precisaRehash, verificarSenha } from '@/server/auth/password'
import { criarSessao, encerrarSessao, exigirSessao, limparSessoesExpiradas, revogarSessoesDoUsuario } from '@/server/auth/session'
import { entrarSchema, trocarSenhaSchema } from './schemas'

/**
 * Limite de tentativas de login.
 *
 * Em memória, por processo — suficiente para o cenário de uma loja atrás de uma
 * instância. Numa operação multi-loja isto migra para Redis; está isolado nesta
 * função justamente para essa troca ser local (ver docs/ARQUITETURA.md § Segurança).
 */
const tentativas = new Map<string, { contador: number; primeiraEm: number }>()
const JANELA_MS = 10 * 60_000
const MAX_TENTATIVAS = 8

function registrarTentativa(chave: string): boolean {
  const agora = Date.now()
  const atual = tentativas.get(chave)
  if (!atual || agora - atual.primeiraEm > JANELA_MS) {
    tentativas.set(chave, { contador: 1, primeiraEm: agora })
    return true
  }
  atual.contador += 1
  return atual.contador <= MAX_TENTATIVAS
}

function limparTentativas(chave: string) {
  tentativas.delete(chave)
}

export const entrar = acao(entrarSchema, async ({ identificador, senha }) => {
  const h = await headers()
  const ip = (h.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local'
  const chave = `${ip}:${identificador}`

  if (!registrarTentativa(chave)) {
    throw new ErroDeNegocio(
      'Muitas tentativas. Aguarde 10 minutos ou peça a um gerente para redefinir sua senha.',
      'REGRA_DE_NEGOCIO',
    )
  }

  // `email` e `apelido` são ambos únicos; a presença do @ decide por qual
  // coluna procurar, sem varredura.
  const usuario = await db.usuario.findUnique({
    where: identificador.includes('@') ? { email: identificador } : { apelido: identificador },
    select: { id: true, nome: true, senhaHash: true, ativo: true, lojaId: true },
  })

  // Mensagem idêntica para identificador inexistente e senha errada: não
  // revelamos quais acessos existem no sistema.
  const generico = 'Acesso ou senha incorretos.'
  if (!usuario) throw new ErroDeNegocio(generico, 'VALIDACAO', { senha: generico })

  const senhaOk = await verificarSenha(senha, usuario.senhaHash)
  if (!senhaOk) throw new ErroDeNegocio(generico, 'VALIDACAO', { senha: generico })

  if (!usuario.ativo) {
    throw new ErroDeNegocio('Este acesso está desativado. Fale com um gerente.', 'SEM_PERMISSAO')
  }
  if (!usuario.lojaId) {
    throw new ErroDeNegocio('Seu usuário não está vinculado a uma loja. Fale com um gerente.', 'REGRA_DE_NEGOCIO')
  }

  limparTentativas(chave)

  // Senha válida com parâmetros antigos: reforça o hash de forma transparente.
  if (precisaRehash(usuario.senhaHash)) {
    await db.usuario.update({ where: { id: usuario.id }, data: { senhaHash: await hashSenha(senha) } })
  }

  await criarSessao(usuario.id, { ip, userAgent: h.get('user-agent') ?? undefined })
  await db.usuario.update({ where: { id: usuario.id }, data: { ultimoLoginEm: new Date() } })
  await registrarLog({
    lojaId: usuario.lojaId,
    usuarioId: usuario.id,
    acao: 'sessao.iniciada',
    entidade: 'usuario',
    entidadeId: usuario.id,
  })
  await limparSessoesExpiradas()

  return { nome: usuario.nome }
})

export const sair = acaoSimples(async () => {
  const sessao = await exigirSessao().catch(() => null)
  if (sessao) {
    await registrarLog({
      lojaId: sessao.lojaId,
      usuarioId: sessao.id,
      acao: 'sessao.encerrada',
      entidade: 'usuario',
      entidadeId: sessao.id,
    })
  }
  await encerrarSessao()
  return true
})

/** Sai e redireciona — usada pelo botão do menu da conta. */
export async function sairERedirecionar() {
  await sair()
  redirect('/system')
}

export const trocarMinhaSenha = acao(trocarSenhaSchema, async ({ senhaAtual, novaSenha }) => {
  const sessao = await exigirSessao()
  const usuario = await db.usuario.findUniqueOrThrow({
    where: { id: sessao.id },
    select: { senhaHash: true },
  })

  if (!(await verificarSenha(senhaAtual, usuario.senhaHash))) {
    throw new ErroDeNegocio('Senha atual incorreta.', 'VALIDACAO', { senhaAtual: 'Senha atual incorreta.' })
  }

  await db.usuario.update({ where: { id: sessao.id }, data: { senhaHash: await hashSenha(novaSenha) } })
  // Derruba as outras sessões (o celular perdido) e mantém a atual.
  await revogarSessoesDoUsuario(sessao.id, sessao.sessaoId)
  await registrarLog({
    lojaId: sessao.lojaId,
    usuarioId: sessao.id,
    acao: 'usuario.senha_alterada',
    entidade: 'usuario',
    entidadeId: sessao.id,
  })
  return true
})
