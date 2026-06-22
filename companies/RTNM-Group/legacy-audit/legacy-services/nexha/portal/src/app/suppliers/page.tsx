import Link from 'next/link';

export default function SuppliersPage() {
  return (
    <div style={{ padding: '4rem 2rem', maxWidth: '1000px', margin: '0 auto', textAlign: 'center' }}>
      <div style={{ fontSize: '5rem', marginBottom: '1rem' }}>📦</div>
      <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>Supplier Marketplace</h1>
      <p style={{ fontSize: '1.25rem', color: '#6b7280', marginBottom: '2rem' }}>
        Access thousands of verified suppliers for all your procurement needs.
        Powered by NextaBizz.
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '1rem',
        marginBottom: '3rem'
      }}>
        {['Raw Materials', 'Packaging', 'Equipment', 'Services', 'Logistics', 'Ingredients'].map(cat => (
          <div key={cat} style={{
            background: '#f9fafb',
            padding: '1.5rem',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontWeight: 500 }}>{cat}</div>
            <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>1,200+ suppliers</div>
          </div>
        ))}
      </div>

      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '1rem',
        padding: '3rem',
        color: 'white'
      }}>
        <h2 style={{ margin: '0 0 1rem 0' }}>Ready to source?</h2>
        <p style={{ margin: '0 0 1.5rem 0', opacity: 0.9 }}>
          Access the full NextaBizz supplier network with RFQ, quotes, and order management.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="https://nextabizz.rez.money" target="_blank">
            <button style={{
              padding: '0.875rem 2rem',
              background: 'white',
              color: '#667eea',
              border: 'none',
              borderRadius: '0.5rem',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '1rem'
            }}>
              Go to NextaBizz →
            </button>
          </Link>
        </div>
      </div>

      <div style={{ marginTop: '3rem', display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7' }}>1,243</div>
          <div style={{ color: '#6b7280' }}>Verified Suppliers</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7' }}>50,000+</div>
          <div style={{ color: '#6b7280' }}>Products Listed</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#a855f7' }}>₹100Cr+</div>
          <div style={{ color: '#6b7280' }}>Monthly GMV</div>
        </div>
      </div>
    </div>
  );
}
