import 'server-only'

import { headers } from 'next/headers'

import { db, type Tx } from './db'

/**
 * Log de auditoria.
 *
 * Registra o que a operação precisa poder explicar depois: quem mudou preço,
 * quem cancelou venda, quem ajustou estoque, quem mexeu em permissões.
 * Nunca lança — uma falha ao auditar não pode derrubar a operação em si.
 */
export type EntradaLog = {
  lojaId?: string | null
  usuarioId?: string | null
  acao: string
  entidade: string
  entidadeId?: string | null
  anterior?: unknown
  novo?: unknown
}

async function metaRequisicao() {
  try {
    const h = await headers()
    return {
      ip: (h.get('x-forwarded-for') ?? h.get('x-real-ip') ?? '').split(',')[0].trim().slice(0, 60) || null,
      userAgent: h.get('user-agent')?.slice(0, 300) ?? null,
    }
  } catch {
    return { ip: null, userAgent: null }
  }
}

export async function registrarLog(entrada: EntradaLog, tx?: Tx) {
  try {
    const meta = await metaRequisicao()
    const cliente = tx ?? db
    await cliente.logSistema.create({
      data: {
        lojaId: entrada.lojaId ?? null,
        usuarioId: entrada.usuarioId ?? null,
        acao: entrada.acao,
        entidade: entrada.entidade,
        entidadeId: entrada.entidadeId ?? null,
        dadosAnteriores: entrada.anterior === undefined ? undefined : (entrada.anterior as object),
        dadosNovos: entrada.novo === undefined ? undefined : (entrada.novo as object),
        ip: meta.ip,
        userAgent: meta.userAgent,
      },
    })
  } catch (erro) {
    console.error('[auditoria] falha ao registrar log', entrada.acao, erro)
  }
}

/** Reduz um objeto do Prisma aos campos que interessam no log. */
export function snapshot<T extends Record<string, unknown>>(obj: T, campos: (keyof T)[]) {
  const out: Record<string, unknown> = {}
  for (const campo of campos) {
    const valor = obj[campo]
    out[campo as string] =
      valor && typeof valor === 'object' && 'toString' in valor && !(valor instanceof Date)
        ? valor.toString()
        : valor instanceof Date
          ? valor.toISOString()
          : valor
  }
  return out
}
