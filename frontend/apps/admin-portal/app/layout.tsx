import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/Sidebar'

export const metadata: Metadata = {
  title: 'Admin Portal | RTMN',
  description: 'RTMN Admin Configuration Portal - Workflows, Knowledge Base, Settings',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <div className="flex">
          <Sidebar />
          <main className="flex-1 ml-64 min-h-screen">
            <header className="sticky top-0 z-40 border-b bg-white dark:bg-slate-900">
              <div className="flex h-16 items-center justify-between px-6">
                <div className="flex items-center gap-4">
                  <h1 className="text-xl font-semibold">Admin Portal</h1>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">RTMN Organization</span>
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-medium">
                    A
                  </div>
                </div>
              </div>
            </header>
            <div className="p-6">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  )
}
