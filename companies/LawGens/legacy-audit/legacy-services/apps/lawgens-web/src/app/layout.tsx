import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'LawGens - Legal AI Platform',
  description: 'AI-Powered Legal Research, Contracts & Compliance',
  keywords: ['legal', 'ai', 'contract analysis', 'compliance', 'court research'],
  authors: [{ name: 'RTNM Digital' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}