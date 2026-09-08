/**
 * Barril do kit de gráficos.
 *
 * Sem `'use client'` aqui: a diretiva marca o módulo inteiro, e um barril
 * marcado tornaria clientes até as peças que são de servidor. Cada metade
 * declara o que é.
 */
export * from './interativos'
export * from './tiles'

/** O kit reexportava os formatadores; mantido para não quebrar imports. */
export { moeda, numero } from '@/lib/format'
