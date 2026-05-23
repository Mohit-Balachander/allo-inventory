import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { ReserveSchema } from '@/lib/schemas'

export async function POST(req: Request) {
  const body = await req.json()
  const parsed = ReserveSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
  }

  const { productId, warehouseId, quantity } = parsed.data
  const idempotencyKey = req.headers.get('Idempotency-Key')

  if (idempotencyKey) {
    const cached = await redis.get(`idem:${idempotencyKey}`)
    if (cached) return NextResponse.json(cached, { status: 200 })
  }

  const lockKey = `lock:${productId}:${warehouseId}`
  const lockVal = crypto.randomUUID()
  const acquired = await redis.set(lockKey, lockVal, { nx: true, ex: 10 })

  if (!acquired) {
  return NextResponse.json({ error: 'Not enough stock available' }, { status: 409 })
}

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (prisma as any).$transaction(async (tx: any) => {
      const stocks: { id: string; total: number; reserved: number }[] =
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (tx as any).$queryRaw`
          SELECT id, total, reserved
          FROM "Stock"
          WHERE "productId" = ${productId}
          AND "warehouseId" = ${warehouseId}
          FOR UPDATE
        `

      const stock = stocks[0]
      if (!stock) throw new Error('STOCK_NOT_FOUND')

      const available = stock.total - stock.reserved
      if (available < quantity) throw new Error('INSUFFICIENT_STOCK')

      await tx.$executeRaw`
        UPDATE "Stock"
        SET reserved = reserved + ${quantity}
        WHERE id = ${stock.id}
      `

      const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

      return tx.reservation.create({
        data: {
          productId,
          warehouseId,
          quantity,
          expiresAt,
          status: 'PENDING',
          ...(idempotencyKey ? { idempotencyKey } : {}),
        },
        include: { product: true, warehouse: true },
      })
    })

    const response = {
      id: result.id,
      productId: result.productId,
      productName: result.product.name,
      warehouseId: result.warehouseId,
      warehouseName: result.warehouse.name,
      quantity: result.quantity,
      status: result.status,
      expiresAt: result.expiresAt,
      createdAt: result.createdAt,
    }

    if (idempotencyKey) {
      await redis.set(`idem:${idempotencyKey}`, response, { ex: 86400 })
    }

    return NextResponse.json(response, { status: 201 })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'INSUFFICIENT_STOCK') {
      return NextResponse.json({ error: 'Not enough stock available' }, { status: 409 })
    }
    if (message === 'STOCK_NOT_FOUND') {
      return NextResponse.json({ error: 'Stock not found' }, { status: 404 })
    }
    return NextResponse.json({ error: 'Reservation failed' }, { status: 500 })
  } finally {
    const current = await redis.get(lockKey)
    if (current === lockVal) await redis.del(lockKey)
  }
}