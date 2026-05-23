import { z } from 'zod'

export const ReserveSchema = z.object({
  productId: z.string().min(1),
  warehouseId: z.string().min(1),
  quantity: z.number().int().positive(),
})

export const IdParamSchema = z.object({
  id: z.string().min(1),
})

export type ReserveInput = z.infer<typeof ReserveSchema>