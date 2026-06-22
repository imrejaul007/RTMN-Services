import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Supplier Portal - NextaBizz',
  description: 'B2B Supplier Portal for NextaBizz - Manage orders, products, and performance',
};

export default function SupplierPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
