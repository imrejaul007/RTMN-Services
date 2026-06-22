import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CorpPerks - Smart Corporate Spend & Benefits Platform',
  description: 'One platform for employee benefits, corporate bookings, GST invoices, and rewards.',
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
