import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  const idempotencyKey = req.headers.get('Idempotency-Key')

  if (idempotencyKey) {
    const cached = await redis.get(`idem:confirm:${idempotencyKey}`)
    if (cached) return NextResponse.json(cached, { status: 200 })
  }

  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }
  if (reservation.status !== 'PENDING') {
    return NextResponse.json({ error: `Reservation is already ${reservation.status}` }, { status: 409 })
  }
  if (new Date() > reservation.expiresAt) {
    await prisma.reservation.update({ where: { id }, data: { status: 'RELEASED' } })
    await prisma.stock.updateMany({
      where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
      data: { reserved: { decrement: reservation.quantity } }
    })
    return NextResponse.json({ error: 'Reservation has expired' }, { status: 410 })
  }

  const updated = await prisma.reservation.update({
    where: { id },
    data: { status: 'CONFIRMED' },
    include: { product: true, warehouse: true }
  })

  await prisma.stock.updateMany({
    where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
    data: {
      reserved: { decrement: reservation.quantity },
      total: { decrement: reservation.quantity }
    }
  })

  const response = {
    id: updated.id,
    status: updated.status,
    productName: updated.product.name,
    warehouseName: updated.warehouse.name,
    quantity: updated.quantity,
    confirmedAt: updated.updatedAt,
  }

  if (idempotencyKey) {
    await redis.set(`idem:confirm:${idempotencyKey}`, response, { ex: 86400 })
  }

  return NextResponse.json(response)
}
