import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ minHeight: '80vh' }}>
      {/* Hero Section */}
      <section style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
        color: 'white',
        padding: '6rem 2rem',
        textAlign: 'center'
      }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
          The Infrastructure Behind<br />
          <span style={{ color: '#a855f7' }}>Modern Commerce</span>
        </h1>
        <p style={{ fontSize: '1.25rem', color: '#9ca3af', maxWidth: '600px', margin: '0 auto 2rem' }}>
          Connect with distributors, manufacturers, and franchise opportunities.
          Build your supply chain with India's smartest commerce network.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link href="/distributors">
            <button style={{
              background: '#a855f7',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1rem'
            }}>
              Find Distributors
            </button>
          </Link>
          <Link href="/franchises">
            <button style={{
              background: 'transparent',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.5rem',
              border: '1px solid white',
              cursor: 'pointer',
              fontSize: '1rem'
            }}>
              Explore Franchises
            </button>
          </Link>
        </div>
      </section>

      {/* Marketplace Categories */}
      <section style={{ padding: '4rem 2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h2 style={{ fontSize: '2rem', textAlign: 'center', marginBottom: '3rem' }}>
          B2B Infrastructure Marketplace
        </h2>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '1.5rem'
        }}>
          {/* Distributors */}
          <MarketplaceCard
            title="Distributors"
            description="Find distributors, wholesalers, and stockists for your products"
            icon="🚚"
            href="/distributors"
            count={847}
            tags={['FMCG', 'Pharma', 'Food & Bev', 'Retail']}
          />

          {/* Manufacturers */}
          <MarketplaceCard
            title="Manufacturers"
            description="Connect with manufacturers for OEM, private label, or contract manufacturing"
            icon="🏭"
            href="/manufacturers"
            count={234}
            tags={['OEM', 'Private Label', 'Contract Mfg']}
          />

          {/* Franchise Opportunities */}
          <MarketplaceCard
            title="Franchise Opportunities"
            description="Browse and invest in franchise brands across industries"
            icon="🏪"
            href="/franchises"
            count={156}
            tags={['Restaurant', 'Salon', 'Fitness', 'Retail']}
          />

          {/* Suppliers */}
          <MarketplaceCard
            title="Suppliers"
            description="Source products from verified suppliers"
            icon="📦"
            href="/suppliers"
            count={1243}
            tags={['Raw Materials', 'Packaging', 'Equipment']}
          />
        </div>
      </section>

      {/* Stats Section */}
      <section style={{
        background: '#f9fafb',
        padding: '4rem 2rem',
        textAlign: 'center'
      }}>
        <h2 style={{ marginBottom: '2rem' }}>Trusted by 10,000+ Businesses</h2>
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '4rem',
          flexWrap: 'wrap'
        }}>
          <Stat number="10K+" label="Active Businesses" />
          <Stat number="₹500Cr+" label="Monthly GMV" />
          <Stat number="50+" label="Cities Covered" />
          <Stat number="98%" label="Satisfaction" />
        </div>
      </section>

      {/* How It Works */}
      <section style={{ padding: '4rem 2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '3rem' }}>How NeXha Works</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <Step number="1" title="Create Profile" description="Register your business and complete verification" />
          <Step number="2" title="Discover" description="Search and filter distributors, manufacturers, or franchises" />
          <Step number="3" title="Connect" description="Send inquiries, negotiate, and close deals" />
          <Step number="4" title="Grow" description="Manage relationships and scale your network" />
        </div>
      </section>
    </div>
  );
}

function MarketplaceCard({
  title,
  description,
  icon,
  href,
  count,
  tags
}: {
  title: string;
  description: string;
  icon: string;
  href: string;
  count: number;
  tags: string[];
}) {
  return (
    <Link href={href} style={{ textDecoration: 'none' }}>
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '1rem',
        padding: '1.5rem',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: 'white'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = '#a855f7';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.1)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = '#e5e7eb';
        e.currentTarget.style.boxShadow = 'none';
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>{icon}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{title}</h3>
          <span style={{
            background: '#f3f4f6',
            padding: '0.25rem 0.75rem',
            borderRadius: '9999px',
            fontSize: '0.875rem',
            color: '#6b7280'
          }}>
            {count.toLocaleString()} listed
          </span>
        </div>
        <p style={{ color: '#6b7280', margin: '0 0 1rem 0' }}>{description}</p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {tags.map(tag => (
            <span key={tag} style={{
              background: '#ede9fe',
              color: '#7c3aed',
              padding: '0.25rem 0.5rem',
              borderRadius: '0.25rem',
              fontSize: '0.75rem'
            }}>
              {tag}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}

function Stat({ number, label }: { number: string; label: string }) {
  return (
    <div>
      <div style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#a855f7' }}>{number}</div>
      <div style={{ color: '#6b7280' }}>{label}</div>
    </div>
  );
}

function Step({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
      <div style={{
        background: '#a855f7',
        color: 'white',
        width: '2rem',
        height: '2rem',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {number}
      </div>
      <div>
        <h4 style={{ margin: '0 0 0.25rem 0' }}>{title}</h4>
        <p style={{ margin: 0, color: '#6b7280' }}>{description}</p>
      </div>
    </div>
  );
}
