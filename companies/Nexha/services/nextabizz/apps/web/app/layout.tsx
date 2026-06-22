import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NextaBizz',
  description: 'B2B Restaurant Inventory Management Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
