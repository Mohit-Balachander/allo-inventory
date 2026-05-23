import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaClient } = require('@prisma/client')

type PrismaClientType = InstanceType<typeof PrismaClient>

const globalForPrisma = globalThis as unknown as { prisma: PrismaClientType }

function createPrismaClient(): PrismaClientType {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

export const prisma: PrismaClientType = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma