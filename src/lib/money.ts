/**
 * Dinheiro e quantidades no Nobru.
 *
 * O banco guarda Decimal. O Prisma devolve `Decimal` (objeto), que não é
 * serializável para Client Components. A regra do projeto é simples:
 * **toda fronteira server → client converte Decimal em number**, usando os
 * helpers abaixo, e todo arredondamento monetário passa por `brl()`.
 */

export type DecimalLike = { toString(): string } | number | string | null | undefined

/** Converte qualquer Decimal/­string/number em number. `null` vira 0. */
export function num(value: DecimalLike): number {
  if (value === null || value === undefined) return 0
  if (typeof value === 'number') return value
  const parsed = Number(value.toString())
  return Number.isFinite(parsed) ? parsed : 0
}

/** Arredonda para centavos, evitando o clássico 0.1 + 0.2. */
export function brl(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/** Arredonda quantidades para 3 casas (gramas, ml). */
export function qty(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000
}

export function sum(values: number[]): number {
  return brl(values.reduce((acc, v) => acc + v, 0))
}

/** Margem bruta em % sobre o preço de venda. */
export function margem(precoVenda: number, precoCusto: number): number {
  if (precoVenda <= 0) return 0
  return brl(((precoVenda - precoCusto) / precoVenda) * 100)
}

/** Markup em % sobre o custo. */
export function markup(precoVenda: number, precoCusto: number): number {
  if (precoCusto <= 0) return 0
  return brl(((precoVenda - precoCusto) / precoCusto) * 100)
}

/** Variação percentual entre dois períodos. */
export function variacao(atual: number, anterior: number): number | null {
  if (anterior === 0) return atual === 0 ? 0 : null
  return brl(((atual - anterior) / Math.abs(anterior)) * 100)
}

/** Rateia um valor entre pesos, jogando a sobra de centavos no maior peso. */
export function ratear(total: number, pesos: number[]): number[] {
  const somaPesos = pesos.reduce((a, b) => a + b, 0)
  if (somaPesos <= 0) return pesos.map(() => 0)
  const partes = pesos.map((p) => brl((total * p) / somaPesos))
  const diff = brl(total - partes.reduce((a, b) => a + b, 0))
  if (diff !== 0) {
    const maiorIdx = pesos.indexOf(Math.max(...pesos))
    partes[maiorIdx] = brl(partes[maiorIdx] + diff)
  }
  return partes
}
