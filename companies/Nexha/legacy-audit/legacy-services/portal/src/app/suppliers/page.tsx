import Link from 'next/link';

export default function SuppliersPage() {
  const categories = [
    { name: 'Raw Materials', icon: '🏭', count: 450, color: '#6366f1' },
    { name: 'Packaging', icon: '📦', count: 320, color: '#8b5cf6' },
    { name: 'Equipment', icon: '⚙️', count: 280, color: '#ec4899' },
    { name: 'Services', icon: '🔧', count: 180, color: '#f59e0b' },
    { name: 'Logistics', icon: '🚚', count: 150, color: '#10b981' },
    { name: 'Ingredients', icon: '🧪', count: 120, color: '#3b82f6' },
  ];

  const stats = [
    { value: '1,243', label: 'Verified Suppliers' },
    { value: '50,000+', label: 'Products' },
    { value: '₹100Cr+', label: 'Monthly GMV' },
  ];

  const features = [
    {
      icon: '📋',
      title: 'RFQ System',
      desc: 'Create requests for quotation and get multiple quotes from suppliers'
    },
    {
      icon: '✅',
      title: 'Verified Suppliers',
      desc: 'All suppliers go through verification process'
    },
    {
      icon: '💳',
      title: 'Secure Payments',
      desc: 'Escrow protection and secure transactions'
    },
    {
      icon: '📊',
      title: 'Analytics',
      desc: 'Track spending, compare suppliers, optimize costs'
    }
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#ffffff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; }
        a { text-decoration: none; }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.1) 0%, rgba(245, 158, 11, 0.05) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '8rem 2rem 4rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', textAlign: 'center' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)',
            padding: '0.5rem 1rem', borderRadius: '100px', marginBottom: '1.5rem'
          }}>
            <span style={{ fontSize: '1.25rem' }}>📦</span>
            <span style={{ color: '#fbbf24', fontWeight: 600 }}>Powered by NextaBizz</span>
          </div>

          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
            Supplier Marketplace
          </h1>

          <p style={{ fontSize: '1.125rem', color: '#94a3b8', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: 1.7 }}>
            Access thousands of verified suppliers for all your procurement needs.
            AI-powered matching, secure payments, and order tracking.
          </p>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
            <Link href="https://nextabizz.rez.money" style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff', padding: '1rem 2rem', borderRadius: '12px',
              fontWeight: 600
            }}>
              Go to NextaBizz →
            </Link>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '4rem 2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap' }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#f59e0b' }}>{stat.value}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 4rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Categories</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)', gap: '1rem' }}>
          {categories.map((cat, i) => (
            <div key={i} style={{
              background: 'rgba(20, 20, 35, 0.8)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '16px', padding: '1.5rem', textAlign: 'center',
              cursor: 'pointer', transition: 'all 0.2s'
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: `linear-gradient(135deg, ${cat.color}40 0%, ${cat.color}20 100%)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem', margin: '0 auto 1rem'
              }}>
                {cat.icon}
              </div>
              <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{cat.name}</div>
              <div style={{ fontSize: '0.875rem', color: '#64748b' }}>{cat.count}+ suppliers</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{
        background: 'rgba(20, 20, 35, 0.5)',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        padding: '4rem 2rem'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, textAlign: 'center', marginBottom: '3rem' }}>
            Why Source Through NeXha?
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr)', gap: '1.5rem' }}>
            {features.map((feature, i) => (
              <div key={i} style={{
                padding: '1.5rem', borderRadius: '16px',
                background: 'rgba(30, 30, 50, 0.5)',
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{feature.icon}</div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>{feature.title}</h3>
                <p style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: 1.6 }}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{
        padding: '4rem 2rem', textAlign: 'center'
      }}>
        <div style={{
          maxWidth: '600px', margin: '0 auto',
          padding: '3rem',
          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
          borderRadius: '24px'
        }}>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1rem' }}>
            Ready to Source?
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.9)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Access the full NextaBizz supplier network with RFQ, quotes, and order management.
          </p>
          <Link href="https://nextabizz.rez.money" style={{
            display: 'inline-block',
            background: '#ffffff', color: '#d97706',
            padding: '1rem 2rem', borderRadius: '12px',
            fontWeight: 600
          }}>
            Go to NextaBizz →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <div style={{
        padding: '2rem', textAlign: 'center',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        color: '#64748b', fontSize: '0.875rem'
      }}>
        © 2026 NeXha - Part of RTNM Group
      </div>
    </div>
  );
}
