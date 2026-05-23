import path from 'path'
import { defineConfig } from 'prisma/config'
import * as dotenv from 'dotenv'

dotenv.config()

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: {
    seed: 'ts-node --compiler-options {"module":"CommonJS"} prisma/seed.mts',
  },
  datasource: {
    url: process.env.DIRECT_URL!,
  },
})
