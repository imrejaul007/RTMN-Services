import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BOA - Business Operating Agent',
  description: 'RTMN Executive Intelligence Dashboard',
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
