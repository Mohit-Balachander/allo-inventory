import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(): Promise<NextResponse> {
  const warehouses = await prisma.warehouse.findMany({
    orderBy: { name: 'asc' }
  })
  return NextResponse.json(warehouses)
}
