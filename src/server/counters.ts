import type { Tx } from './db'

/**
 * Códigos legíveis por loja (PED-000123, OP-000045, ENC-000007).
 *
 * Um `upsert` com `increment` é atômico no Postgres, então dois caixas
 * vendendo ao mesmo tempo nunca recebem o mesmo número. Precisa rodar dentro
 * da mesma transação da operação que consome o código.
 */
export const PREFIXOS = {
  pedido: 'PED',
  encomenda: 'ENC',
  producao: 'OP',
  compra: 'PC',
  caixa: 'CX',
  inventario: 'INV',
} as const

export type ChaveContador = keyof typeof PREFIXOS

export async function proximoCodigo(tx: Tx, lojaId: string, chave: ChaveContador): Promise<string> {
  const contador = await tx.contador.upsert({
    where: { lojaId_chave: { lojaId, chave } },
    create: { lojaId, chave, valor: 1 },
    update: { valor: { increment: 1 } },
    select: { valor: true },
  })
  return `${PREFIXOS[chave]}-${String(contador.valor).padStart(6, '0')}`
}
