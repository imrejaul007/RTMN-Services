/**
 * Root Layout
 */

import './globals.css';

export const metadata = {
  title: 'Commerce Studio | HOJAI AI',
  description: 'No-code platform to build AI-powered commerce businesses',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}