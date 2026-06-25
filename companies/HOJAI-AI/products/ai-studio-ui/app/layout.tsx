import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'HOJAI Studio — Build AI-Native Companies in 30 Minutes',
  description: 'The operating system for AI-native companies. Launch your business with AI workforce, memory, and global commerce network.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
        {children}
      </body>
    </html>
  );
}
