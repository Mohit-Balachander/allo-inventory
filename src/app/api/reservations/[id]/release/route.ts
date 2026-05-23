import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params

  const reservation = await prisma.reservation.findUnique({ where: { id } })

  if (!reservation) {
    return NextResponse.json({ error: 'Reservation not found' }, { status: 404 })
  }
  if (reservation.status !== 'PENDING') {
    return NextResponse.json({ error: `Reservation is already ${reservation.status}` }, { status: 409 })
  }

  await prisma.reservation.update({
    where: { id },
    data: { status: 'RELEASED' }
  })

  await prisma.stock.updateMany({
    where: { productId: reservation.productId, warehouseId: reservation.warehouseId },
    data: { reserved: { decrement: reservation.quantity } }
  })

  return NextResponse.json({ id, status: 'RELEASED' })
}
