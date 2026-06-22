import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'NeXha - B2B Commerce Infrastructure Network',
  description: 'Connect with distributors, manufacturers, and franchise opportunities',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', margin: 0, padding: 0 }}>
        <header style={{
          background: '#1a1a2e',
          color: 'white',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <h1 style={{ margin: 0, fontSize: '1.5rem' }}>NeXha</h1>
            <span style={{ color: '#a855f7', fontSize: '0.875rem' }}>Commerce Network</span>
          </div>
          <nav style={{ display: 'flex', gap: '1.5rem' }}>
            <a href="/" style={{ color: 'white', textDecoration: 'none' }}>Home</a>
            <a href="/distributors" style={{ color: 'white', textDecoration: 'none' }}>Distributors</a>
            <a href="/manufacturers" style={{ color: 'white', textDecoration: 'none' }}>Manufacturers</a>
            <a href="/franchises" style={{ color: 'white', textDecoration: 'none' }}>Franchises</a>
            <a href="/suppliers" style={{ color: 'white', textDecoration: 'none' }}>Suppliers</a>
          </nav>
        </header>
        <main>{children}</main>
        <footer style={{
          background: '#f3f4f6',
          padding: '2rem',
          textAlign: 'center',
          marginTop: '4rem'
        }}>
          <p style={{ color: '#6b7280', margin: 0 }}>
            © 2026 NeXha - Part of RTNM Group |
            <a href="/api-docs" style={{ color: '#6366f1' }}>API</a> |
            <a href="/dashboard" style={{ color: '#6366f1' }}>Dashboard</a>
          </p>
        </footer>
      </body>
    </html>
  );
}
