import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(req: Request): Promise<NextResponse> {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const expired = await prisma.reservation.findMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() }
    }
  })

  for (const r of expired) {
    await prisma.reservation.update({
      where: { id: r.id },
      data: { status: 'RELEASED' }
    })
    await prisma.stock.updateMany({
      where: { productId: r.productId, warehouseId: r.warehouseId },
      data: { reserved: { decrement: r.quantity } }
    })
  }

  return NextResponse.json({ released: expired.length })
}
