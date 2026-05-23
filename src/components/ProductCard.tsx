import { Product } from '@/lib/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import Image from 'next/image'
import type { ReactElement } from 'react'

interface Props {
  product: Product
  onReserve: () => void
}

export function ProductCard({ product, onReserve }: Props): ReactElement {
  const totalAvailable = product.stocks.reduce((sum, s) => sum + s.available, 0)

  return (
    <Card className="overflow-hidden flex flex-col">
      {product.imageUrl && (
        <div className="relative h-48 bg-gray-100">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover"
          />
        </div>
      )}
      <CardContent className="flex-1 pt-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="font-semibold text-gray-900">{product.name}</h3>
          <Badge variant={totalAvailable > 0 ? 'default' : 'destructive'}>
            {totalAvailable > 0 ? `${totalAvailable} left` : 'Out of stock'}
          </Badge>
        </div>
        <p className="text-sm text-gray-500 mb-4">{product.description}</p>
        <p className="text-lg font-bold text-blue-600">₹{product.price.toLocaleString('en-IN')}</p>

        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">Stock by warehouse</p>
          {product.stocks.map(s => (
            <div key={s.warehouseId} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{s.warehouseName}</span>
              <span className={s.available === 0 ? 'text-red-500 font-medium' : 'text-green-600 font-medium'}>
                {s.available} available
              </span>
            </div>
          ))}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          className="w-full"
          onClick={onReserve}
          disabled={totalAvailable === 0}
        >
          {totalAvailable === 0 ? 'Out of Stock' : 'Reserve'}
        </Button>
      </CardFooter>
    </Card>
  )
}
