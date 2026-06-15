import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RTMN — Real-Time Multi-Industry Network',
  description: 'AI-powered digital twins for 24 industries. Hotel to Healthcare — connected, not siloed.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
