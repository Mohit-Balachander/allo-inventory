'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Reservation } from '@/lib/types'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Countdown } from '@/components/Countdown'

export default function CheckoutPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [reservation, setReservation] = useState<Reservation | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    fetch(`/api/reservations/${id}`)
      .then(r => { if (!r.ok) { router.push('/'); return null } return r.json() })
      .then(data => { if (data) { setReservation(data); setLoading(false) } })
  }, [id, router])

  async function handleConfirm() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/reservations/${id}/confirm`, {
        method: 'POST',
        headers: { 'Idempotency-Key': `confirm-${id}` },
      })
      const data = await res.json()
      if (res.status === 410) {
        toast.error('Reservation expired — stock has been released')
        router.push('/')
        return
      }
      if (!res.ok) {
        toast.error(data.error || 'Confirmation failed')
        return
      }
      toast.success('Purchase confirmed!')
      setReservation(prev => prev ? { ...prev, status: 'CONFIRMED' } : prev)
    } finally {
      setActionLoading(false)
    }
  }

  async function handleCancel() {
    setActionLoading(true)
    try {
      const res = await fetch(`/api/reservations/${id}/release`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Cancellation failed')
        return
      }
      toast.info('Reservation cancelled — stock released')
      router.push('/')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
    </div>
  )

  if (!reservation) return null

  const statusColors = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    CONFIRMED: 'bg-green-100 text-green-800',
    RELEASED: 'bg-gray-100 text-gray-800',
  }

  return (
    <div className="max-w-lg mx-auto">
      <div className="mb-6">
        <button
          onClick={() => router.push('/')}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
        >
          ← Back to products
        </button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Checkout</CardTitle>
            <span className={`text-xs font-semibold px-2 py-1 rounded-full ${statusColors[reservation.status]}`}>
              {reservation.status}
            </span>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Product</span>
              <span className="font-medium">{reservation.productName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Warehouse</span>
              <span className="font-medium">{reservation.warehouseName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Quantity</span>
              <span className="font-medium">{reservation.quantity}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Reservation ID</span>
              <span className="font-mono text-xs text-gray-400">{reservation.id}</span>
            </div>
          </div>

          {reservation.status === 'PENDING' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-sm font-medium text-yellow-800 mb-2">
                Time remaining to complete purchase
              </p>
              <Countdown
                expiresAt={reservation.expiresAt}
                onExpire={() => {
                  toast.error('Reservation expired')
                  router.push('/')
                }}
              />
            </div>
          )}

          {reservation.status === 'CONFIRMED' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-800 font-semibold">✓ Purchase confirmed!</p>
              <p className="text-green-600 text-sm mt-1">Your order has been placed successfully.</p>
              <Button className="mt-4 w-full" onClick={() => router.push('/')}>
                Back to Products
              </Button>
            </div>
          )}

          {reservation.status === 'PENDING' && (
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleConfirm}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processing...' : 'Confirm Purchase'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}