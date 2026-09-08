import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCb) as (
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>

/**
 * Hash de senha com scrypt do próprio Node.
 *
 * Escolha deliberada: scrypt é memory-hard, está no core do Node (nada de
 * dependência nativa que quebra em deploy) e os parâmetros ficam gravados
 * dentro do próprio hash, o que permite endurecê-los no futuro sem invalidar
 * as senhas já existentes.
 *
 * Formato: `scrypt$N$r$p$saltBase64$hashBase64`
 */
const N = 2 ** 15 // 32.768 iterações
const R = 8
const P = 1
const KEYLEN = 64
const MAXMEM = 64 * 1024 * 1024

export async function hashSenha(senha: string): Promise<string> {
  const salt = randomBytes(16)
  const derivado = await scrypt(senha.normalize('NFKC'), salt, KEYLEN, { N, r: R, p: P, maxmem: MAXMEM })
  return `scrypt$${N}$${R}$${P}$${salt.toString('base64')}$${derivado.toString('base64')}`
}

export async function verificarSenha(senha: string, hashArmazenado: string): Promise<boolean> {
  try {
    const partes = hashArmazenado.split('$')
    if (partes.length !== 6 || partes[0] !== 'scrypt') return false
    const [, nStr, rStr, pStr, saltB64, hashB64] = partes
    const salt = Buffer.from(saltB64, 'base64')
    const esperado = Buffer.from(hashB64, 'base64')
    const derivado = await scrypt(senha.normalize('NFKC'), salt, esperado.length, {
      N: Number(nStr),
      r: Number(rStr),
      p: Number(pStr),
      maxmem: MAXMEM,
    })
    return derivado.length === esperado.length && timingSafeEqual(derivado, esperado)
  } catch {
    return false
  }
}

/** Indica se o hash foi gerado com parâmetros mais fracos que os atuais. */
export function precisaRehash(hashArmazenado: string): boolean {
  const partes = hashArmazenado.split('$')
  if (partes.length !== 6 || partes[0] !== 'scrypt') return true
  return Number(partes[1]) < N
}

/** Validação mínima de senha, aplicada no servidor. */
export function validarForcaSenha(senha: string): string | null {
  if (senha.length < 8) return 'A senha precisa de pelo menos 8 caracteres.'
  if (!/[a-zA-Z]/.test(senha)) return 'A senha precisa de pelo menos uma letra.'
  if (!/[0-9]/.test(senha)) return 'A senha precisa de pelo menos um número.'
  return null
}
