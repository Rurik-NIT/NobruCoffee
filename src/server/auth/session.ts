import 'server-only'

import { createHash, randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { cache } from 'react'

import { db } from '@/server/db'
import { NaoAutenticado } from '@/server/errors'
import { temPermissao, type Permissao } from './permissions'

export const COOKIE_SESSAO = 'nobru_sessao'

const TTL_DIAS = Number(process.env.SESSION_TTL_DAYS ?? 7)

/**
 * Sessão opaca.
 *
 * O cookie carrega 32 bytes aleatórios; o banco guarda só o SHA-256 desse
 * token. Um dump do banco, portanto, não permite montar uma sessão válida.
 * Revogar é um UPDATE — o que um JWT autocontido não daria.
 */
function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export type UsuarioSessao = {
  id: string
  nome: string
  email: string
  avatarUrl: string | null
  empresaId: string
  lojaId: string
  lojaNome: string
  cargoId: string
  cargoNome: string
  cargoSlug: string
  permissoes: string[]
  sessaoId: string
}

export async function criarSessao(usuarioId: string, meta?: { ip?: string; userAgent?: string }) {
  const token = randomBytes(32).toString('base64url')
  const expiraEm = new Date(Date.now() + TTL_DIAS * 86_400_000)

  await db.sessao.create({
    data: {
      usuarioId,
      tokenHash: hashToken(token),
      expiraEm,
      ip: meta?.ip?.slice(0, 60),
      userAgent: meta?.userAgent?.slice(0, 300),
    },
  })

  const jar = await cookies()
  jar.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiraEm,
  })

  return { token, expiraEm }
}

export async function encerrarSessao() {
  const jar = await cookies()
  const token = jar.get(COOKIE_SESSAO)?.value
  if (token) {
    await db.sessao
      .updateMany({ where: { tokenHash: hashToken(token), revogadaEm: null }, data: { revogadaEm: new Date() } })
      .catch(() => undefined)
  }
  jar.delete(COOKIE_SESSAO)
}

/**
 * Revoga sessões de um usuário (troca de senha, desativação).
 * `exceto` preserva a sessão atual — quem troca a própria senha continua
 * logado, mas o celular perdido cai.
 */
export async function revogarSessoesDoUsuario(usuarioId: string, exceto?: string) {
  await db.sessao.updateMany({
    where: { usuarioId, revogadaEm: null, ...(exceto ? { id: { not: exceto } } : {}) },
    data: { revogadaEm: new Date() },
  })
}

/**
 * Sessão do request atual. `cache()` garante uma única consulta por requisição,
 * mesmo que dezenas de componentes chamem a função.
 */
export const sessaoAtual = cache(async (): Promise<UsuarioSessao | null> => {
  const jar = await cookies()
  const token = jar.get(COOKIE_SESSAO)?.value
  if (!token) return null

  const sessao = await db.sessao.findUnique({
    where: { tokenHash: hashToken(token) },
    select: {
      id: true,
      expiraEm: true,
      revogadaEm: true,
      usuario: {
        select: {
          id: true,
          nome: true,
          email: true,
          avatarUrl: true,
          ativo: true,
          empresaId: true,
          lojaId: true,
          loja: { select: { nome: true } },
          cargo: { select: { id: true, nome: true, slug: true, permissoes: true } },
        },
      },
    },
  })

  if (!sessao || sessao.revogadaEm || sessao.expiraEm < new Date()) return null
  const u = sessao.usuario
  if (!u.ativo || !u.lojaId) return null

  return {
    id: u.id,
    nome: u.nome,
    email: u.email,
    avatarUrl: u.avatarUrl,
    empresaId: u.empresaId,
    lojaId: u.lojaId,
    lojaNome: u.loja?.nome ?? '',
    cargoId: u.cargo.id,
    cargoNome: u.cargo.nome,
    cargoSlug: u.cargo.slug,
    permissoes: u.cargo.permissoes,
    sessaoId: sessao.id,
  }
})

/** Exige sessão válida. Use em toda Server Action e rota protegida. */
export async function exigirSessao(): Promise<UsuarioSessao> {
  const sessao = await sessaoAtual()
  if (!sessao) throw new NaoAutenticado()
  return sessao
}

/**
 * Exige sessão **e** permissão. É esta função — não o menu escondido — que
 * protege as operações. Nenhum serviço de domínio escreve no banco sem passar
 * por aqui.
 */
export async function exigirPermissao(requerida: Permissao | Permissao[]): Promise<UsuarioSessao> {
  const sessao = await exigirSessao()
  if (!temPermissao(sessao.permissoes, requerida)) {
    const { SemPermissao } = await import('@/server/errors')
    throw new SemPermissao()
  }
  return sessao
}

/** Versão não-lançante, para decidir o que renderizar. */
export async function podeFazer(requerida: Permissao | Permissao[]): Promise<boolean> {
  const sessao = await sessaoAtual()
  if (!sessao) return false
  return temPermissao(sessao.permissoes, requerida)
}

/** Limpa sessões expiradas — chamado no login, custo desprezível. */
export async function limparSessoesExpiradas() {
  await db.sessao
    .deleteMany({ where: { expiraEm: { lt: new Date(Date.now() - 30 * 86_400_000) } } })
    .catch(() => undefined)
}
