import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HOJAI AI Demo Portal',
  description: 'Interactive showcase of HOJAI AI capabilities - 174 AI Employees, 12 Core Platforms, 66+ Services',
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