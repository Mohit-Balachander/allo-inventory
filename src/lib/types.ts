export interface Stock {
  warehouseId: string
  warehouseName: string
  location: string
  available: number
  total: number
  reserved: number
}

export interface Product {
  id: string
  name: string
  description: string
  imageUrl: string | null
  price: number
  stocks: Stock[]
}

export interface Reservation {
  id: string
  productId: string
  productName: string
  warehouseId: string
  warehouseName: string
  quantity: number
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED'
  expiresAt: string
  createdAt: string
}