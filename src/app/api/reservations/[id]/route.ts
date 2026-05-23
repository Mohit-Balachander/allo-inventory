import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params

  const reservation = await prisma.reservation.findUnique({
    where: { id },
    include: { product: true, warehouse: true },
  })

  if (!reservation) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: reservation.id,
    productId: reservation.productId,
    productName: reservation.product.name,
    warehouseId: reservation.warehouseId,
    warehouseName: reservation.warehouse.name,
    quantity: reservation.quantity,
    status: reservation.status,
    expiresAt: reservation.expiresAt,
    createdAt: reservation.createdAt,
  })
}
