'use client'

import { useEffect, useState } from 'react'
import { Product } from '@/lib/types'
import { ProductCard } from '@/components/ProductCard'
import { ReserveModal } from '@/components/ReserveModal'

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Product | null>(null)

  useEffect(() => {
    fetch('/api/products')
      .then(r => r.json())
      .then(data => { setProducts(data); setLoading(false) })
  }, [])

  const refresh = () => {
    fetch('/api/products')
      .then(r => r.json())
      .then(setProducts)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <p className="text-gray-500 mt-1">Reserve stock across our warehouses</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map(product => (
          <ProductCard
            key={product.id}
            product={product}
            onReserve={() => setSelected(product)}
          />
        ))}
      </div>

      {selected && (
        <ReserveModal
          product={selected}
          onClose={() => setSelected(null)}
          onSuccess={() => { setSelected(null); refresh() }}
        />
      )}
    </div>
  )
}