import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'HOJAI AI — CompanyOS — The Operating System For AI-Native Organizations',
  description: 'Deploy AI employees, organizational memory, and autonomous workflows on one platform. Software manages functions. HOJAI manages organizations.',
  keywords: ['CompanyOS', 'AI employees', 'organizational memory', 'AI workforce', 'business automation', 'AI-native organizations', 'digital twins', 'autonomous workflows'],
  authors: [{ name: 'HOJAI AI' }],
  openGraph: {
    title: 'HOJAI AI — CompanyOS',
    description: 'The Operating System For AI-Native Organizations. Deploy AI employees, organizational memory, and autonomous workflows on one platform.',
    url: 'https://hojai.ai',
    siteName: 'HOJAI AI',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HOJAI AI — CompanyOS',
    description: 'Software manages functions. HOJAI manages organizations.',
  },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="antialiased">
        {children}
      </body>
    </html>
  )
}
