import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import * as dotenv from 'dotenv'

dotenv.config()

const pool = new Pool({
  connectionString: process.env.DIRECT_URL,
  ssl: { rejectUnauthorized: false }
})
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  const wh1 = await prisma.warehouse.create({
    data: { name: 'Mumbai Central', location: 'Mumbai, Maharashtra' }
  })
  const wh2 = await prisma.warehouse.create({
    data: { name: 'Delhi North', location: 'Delhi, NCR' }
  })
  const wh3 = await prisma.warehouse.create({
    data: { name: 'Bangalore Tech Park', location: 'Bangalore, Karnataka' }
  })

  const products = await Promise.all([
    prisma.product.create({ data: { name: 'Wireless Earbuds Pro', description: 'Active noise cancellation, 30hr battery', price: 4999, imageUrl: 'https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=400' }}),
    prisma.product.create({ data: { name: 'Smart Watch Series X', description: 'Health tracking, GPS, AMOLED display', price: 12999, imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400' }}),
    prisma.product.create({ data: { name: 'Mechanical Keyboard TKL', description: 'Cherry MX switches, RGB backlit', price: 7499, imageUrl: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400' }}),
    prisma.product.create({ data: { name: 'USB-C Hub 7-in-1', description: '4K HDMI, 100W PD, SD card reader', price: 2499, imageUrl: 'https://images.unsplash.com/photo-1625480859445-e87a2b9c8784?w=400' }}),
    prisma.product.create({ data: { name: 'Portable SSD 1TB', description: '1050MB/s read, shock resistant', price: 8999, imageUrl: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400' }}),
  ])

  for (const product of products) {
    await prisma.stock.createMany({
      data: [
        { productId: product.id, warehouseId: wh1.id, total: product.name === 'Portable SSD 1TB' ? 1 : 15, reserved: 0 },
        { productId: product.id, warehouseId: wh2.id, total: product.name === 'Portable SSD 1TB' ? 1 : 10, reserved: 0 },
        { productId: product.id, warehouseId: wh3.id, total: product.name === 'Portable SSD 1TB' ? 1 : 8,  reserved: 0 },
      ]
    })
  }

  console.log('✅ Seeded:', products.length, 'products, 3 warehouses')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())