import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import './globals.css'
import { Toaster } from 'sonner'

const geist = Geist({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Allo Inventory',
  description: 'Multi-warehouse inventory reservation platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <nav className="border-b bg-white sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">A</span>
            </div>
            <span className="font-semibold text-gray-900">Allo Inventory</span>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-4 py-8">
          {children}
        </main>
        <Toaster richColors position="top-right" />
      </body>
    </html>
  )
}