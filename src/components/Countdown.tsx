'use client'

import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'

interface Props {
  expiresAt: string
  onExpire: () => void
}

export function Countdown({ expiresAt, onExpire }: Props): ReactElement {
  const [remaining, setRemaining] = useState(0)

  useEffect(() => {
    const calc = () => Math.max(0, new Date(expiresAt).getTime() - Date.now())
    setRemaining(calc())

    const interval = setInterval(() => {
      const r = calc()
      setRemaining(r)
      if (r === 0) { clearInterval(interval); onExpire() }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const pct = (remaining / (10 * 60 * 1000)) * 100

  const color = remaining < 60000 ? 'bg-red-500' : remaining < 180000 ? 'bg-yellow-500' : 'bg-blue-500'

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className={`text-2xl font-mono font-bold ${remaining < 60000 ? 'text-red-600' : 'text-gray-800'}`}>
          {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
        </span>
        <span className="text-xs text-gray-400">expires at {new Date(expiresAt).toLocaleTimeString()}</span>
      </div>
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
