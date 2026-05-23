import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type StockWithWarehouse = {
  warehouseId: string
  total: number
  reserved: number
  warehouse: { name: string; location: string }
}

type ProductWithStocks = {
  id: string
  name: string
  description: string
  imageUrl: string | null
  price: number
  stocks: StockWithWarehouse[]
}

export async function GET() {
  const products = await prisma.product.findMany({
    include: {
      stocks: {
        include: { warehouse: true }
      }
    },
    orderBy: { createdAt: 'asc' }
  }) as ProductWithStocks[]

  const data = products.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description,
    imageUrl: p.imageUrl,
    price: p.price,
    stocks: p.stocks.map(s => ({
      warehouseId: s.warehouseId,
      warehouseName: s.warehouse.name,
      location: s.warehouse.location,
      available: s.total - s.reserved,
      total: s.total,
      reserved: s.reserved,
    }))
  }))

  return NextResponse.json(data)
}