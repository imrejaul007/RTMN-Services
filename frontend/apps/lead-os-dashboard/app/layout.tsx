import type { Metadata } from 'next';
import './globals.css';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';

export const metadata: Metadata = {
  title: 'LeadOS - Intelligent Lead Generation',
  description: 'AI-powered lead discovery, enrichment, and outreach platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 flex flex-col">
            <Header />
            <div className="flex-1 bg-gray-50">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
