import { PrismaClient } from '@prisma/client'

/**
 * Cliente Prisma único por processo. Em desenvolvimento o Next recompila e
 * recria módulos a cada alteração; guardar a instância no `globalThis` evita
 * estourar o pool de conexões do Postgres.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db

/** Tipo da transação do Prisma — usado pelos serviços de domínio. */
export type Tx = Omit<PrismaClient, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>
