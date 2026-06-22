import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support Dashboard - ReZ',
  description: 'Unified Support Inbox',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
