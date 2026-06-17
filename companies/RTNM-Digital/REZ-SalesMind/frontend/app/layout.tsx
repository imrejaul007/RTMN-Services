import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Sidebar } from '@/components/ui/sidebar'
import { Header } from '@/components/ui/header'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'REZ SalesMind - AI-Powered Sales Intelligence',
  description: 'Autonomous SDR, AI email generation, multi-channel campaigns, and CRM integration',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex h-screen overflow-hidden bg-background">
          <Sidebar />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  )
}
