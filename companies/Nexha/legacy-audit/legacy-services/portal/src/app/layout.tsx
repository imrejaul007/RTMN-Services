import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NeXha - B2B Commerce Infrastructure Network',
  description: 'Connect with distributors, manufacturers, and franchise opportunities. The OS for Commerce Networks.',
  keywords: ['B2B', 'commerce', 'distributors', 'franchises', 'manufacturers', 'suppliers'],
  authors: [{ name: 'RTNM Group' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          html, body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            background: #0a0a0f;
            color: #ffffff;
            scroll-behavior: smooth;
          }

          a {
            text-decoration: none;
            color: inherit;
          }

          ::-webkit-scrollbar {
            width: 8px;
          }

          ::-webkit-scrollbar-track {
            background: #0a0a0f;
          }

          ::-webkit-scrollbar-thumb {
            background: #2a2a3f;
            border-radius: 4px;
          }

          ::selection {
            background: rgba(99, 102, 241, 0.3);
            color: #ffffff;
          }
        `}</style>
      </head>
      <body>{children}</body>
    </html>
  );
}
