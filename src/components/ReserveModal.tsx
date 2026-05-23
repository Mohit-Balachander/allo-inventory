'use client'

import { useState } from 'react'
import type { ReactElement } from 'react'
import { useRouter } from 'next/navigation'
import { Product } from '@/lib/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

interface Props {
  product: Product
  onClose: () => void
  onSuccess: () => void
}

export function ReserveModal({ product, onClose, onSuccess }: Props): ReactElement {
  const router = useRouter()
  const [warehouseId, setWarehouseId] = useState(product.stocks[0]?.warehouseId ?? '')
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)

  const selectedStock = product.stocks.find(s => s.warehouseId === warehouseId)

  async function handleReserve(): Promise<void> {
    setLoading(true)
    try {
      const res = await fetch('/api/reservations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
        },
        body: JSON.stringify({ productId: product.id, warehouseId, quantity }),
      })

      const data = await res.json()

      if (res.status === 409) {
        toast.error('Not enough stock available')
        return
      }
      if (!res.ok) {
        toast.error(data.error || 'Reservation failed')
        return
      }

      toast.success('Reserved! You have 10 minutes to confirm.')
      onSuccess()
      router.push(`/checkout/${data.id}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reserve {product.name}</DialogTitle>
          <DialogDescription>
            Choose a warehouse and quantity. You'll have 10 minutes to complete payment.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Warehouse</label>
            <select
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={warehouseId}
              onChange={e => { setWarehouseId(e.target.value); setQuantity(1) }}
            >
              {product.stocks.map(s => (
                <option key={s.warehouseId} value={s.warehouseId} disabled={s.available === 0}>
                  {s.warehouseName} — {s.available} available
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Quantity</label>
            <input
              type="number"
              min={1}
              max={selectedStock?.available ?? 1}
              value={quantity}
              onChange={e => setQuantity(Number(e.target.value))}
              className="w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {selectedStock && (
              <p className="text-xs text-gray-400 mt-1">{selectedStock.available} units available</p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
            <Button
              className="flex-1"
              onClick={handleReserve}
              disabled={loading || quantity < 1 || quantity > (selectedStock?.available ?? 0)}
            >
              {loading ? 'Reserving...' : 'Confirm Reserve'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
