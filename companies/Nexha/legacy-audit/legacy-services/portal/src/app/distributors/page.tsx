'use client';

import { useState } from 'react';

// Mock data - would come from DistributionOS API
const mockDistributors = [
  {
    id: '1',
    name: 'Metro Foods Distribution',
    type: 'distributor',
    city: 'Mumbai',
    state: 'Maharashtra',
    brands: ['Nestle', 'Hindustan Unilever', 'ITC'],
    categories: ['FMCG', 'Food & Beverages'],
    retailers: 450,
    rating: 4.8,
    verified: true,
    icon: '🚚',
    coverage: 'West India',
    established: 2015,
    specialization: 'Premium FMCG distribution'
  },
  {
    id: '2',
    name: 'Western Pharma Distributors',
    type: 'distributor',
    city: 'Ahmedabad',
    state: 'Gujarat',
    brands: ['Sun Pharma', 'Cipla', "Dr Reddy's"],
    categories: ['Pharmaceutical'],
    retailers: 320,
    rating: 4.6,
    verified: true,
    icon: '💊',
    coverage: 'Gujarat Region',
    established: 2010,
    specialization: 'Pharmaceutical distribution'
  },
  {
    id: '3',
    name: 'South India Grocery Hub',
    type: 'wholesaler',
    city: 'Chennai',
    state: 'Tamil Nadu',
    brands: ['Multiple Local Brands'],
    categories: ['Grocery', 'Packed Foods'],
    retailers: 680,
    rating: 4.5,
    verified: true,
    icon: '🛒',
    coverage: 'South India',
    established: 2008,
    specialization: 'Grocery & staples'
  },
  {
    id: '4',
    name: 'Delhi NCR Electronics Dist',
    type: 'distributor',
    city: 'Delhi',
    state: 'Delhi',
    brands: ['Samsung', 'LG', 'Sony'],
    categories: ['Electronics', 'Appliances'],
    retailers: 180,
    rating: 4.7,
    verified: true,
    icon: '📺',
    coverage: 'NCR Region',
    established: 2012,
    specialization: 'Consumer electronics'
  },
  {
    id: '5',
    name: 'Pune Auto Parts Wholesale',
    type: 'stockist',
    city: 'Pune',
    state: 'Maharashtra',
    brands: ['Bosch', 'Motherson', 'Endurance'],
    categories: ['Automotive Parts'],
    retailers: 95,
    rating: 4.4,
    verified: false,
    icon: '🔧',
    coverage: 'Maharashtra',
    established: 2018,
    specialization: 'Auto components'
  },
  {
    id: '6',
    name: 'Mumbai Coastal Foods',
    type: 'distributor',
    city: 'Mumbai',
    state: 'Maharashtra',
    brands: ['Parle', 'Britannia', 'Lijjat'],
    categories: ['FMCG', 'Snacks'],
    retailers: 520,
    rating: 4.9,
    verified: true,
    icon: '🍪',
    coverage: 'Western India',
    established: 2005,
    specialization: 'Snacks & biscuits'
  }
];

const categoryFilters = ['All', 'FMCG', 'Food & Beverages', 'Pharmaceutical', 'Electronics', 'Automotive', 'Grocery'];
const typeFilters = ['All', 'distributor', 'wholesaler', 'stockist', 'dealer'];

export default function DistributorsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [type, setType] = useState('All');
  const [selectedDistributor, setSelectedDistributor] = useState<typeof mockDistributors[0] | null>(null);

  const filtered = mockDistributors.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.city.toLowerCase().includes(search.toLowerCase()) ||
      d.brands.some(b => b.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === 'All' || d.categories.includes(category);
    const matchesType = type === 'All' || d.type === type;
    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#ffffff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        * { box-sizing: border-box; }

        body { font-family: 'Inter', sans-serif; }

        .filter-btn {
          padding: 0.5rem 1rem;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.05);
          color: #94a3b8;
          cursor: pointer;
          transition: all 0.2s;
        }

        .filter-btn:hover {
          border-color: rgba(99, 102, 241, 0.5);
          color: #fff;
        }

        .filter-btn.active {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          border-color: transparent;
          color: #fff;
        }

        .distributor-card {
          background: rgba(20, 20, 35, 0.8);
          border: 1px solid rgba(255,255,255,0.05);
          border-radius: 20px;
          padding: 1.5rem;
          transition: all 0.3s;
          cursor: pointer;
        }

        .distributor-card:hover {
          border-color: rgba(99, 102, 241, 0.3);
          transform: translateY(-4px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.3);
        }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '8rem 2rem 4rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600 }}>B2B Marketplace</span>
            <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Find the best partners for your business</span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
            Find Distributors
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#64748b', maxWidth: '600px', lineHeight: 1.7 }}>
            Connect with verified distributors, wholesalers, and stockists across India.
            AI-powered matching based on your business profile.
          </p>
        </div>
      </div>

      {/* Search & Filters */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search by name, city, or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%', padding: '1rem 1rem 1rem 3rem',
                background: 'rgba(30, 30, 50, 0.8)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none'
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>Category</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {categoryFilters.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`filter-btn ${category === cat ? 'active' : ''}`}
                  style={{ fontSize: '0.875rem' }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>Type</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {typeFilters.map(t => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`filter-btn ${type === t ? 'active' : ''}`}
                  style={{ fontSize: '0.875rem', textTransform: 'capitalize' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            Showing <strong style={{ color: '#fff' }}>{filtered.length}</strong> distributors
          </p>
        </div>
      </div>

      {/* Distributor Grid */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 4rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', gap: '1.5rem' }}>
        {filtered.map(dist => (
          <div key={dist.id} className="distributor-card" onClick={() => setSelectedDistributor(dist)}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '16px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.75rem', flexShrink: 0
              }}>
                {dist.icon}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                  <h3 style={{ fontSize: '1.125rem', fontWeight: 700 }}>{dist.name}</h3>
                  {dist.verified && (
                    <span style={{ background: '#22c55e', color: '#fff', padding: '0.125rem 0.5rem', borderRadius: '100px', fontSize: '0.625rem', fontWeight: 600 }}>
                      Verified
                    </span>
                  )}
                </div>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>{dist.city}, {dist.state}</p>
                <p style={{ color: '#8b5cf6', fontSize: '0.75rem', marginTop: '0.25rem' }}>{dist.specialization}</p>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem', padding: '1rem', background: 'rgba(0,0,0,0.2)', borderRadius: '12px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{dist.retailers}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Retailers</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fbbf24' }}>⭐ {dist.rating}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Rating</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#fff' }}>{dist.established}</div>
                <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Est.</div>
              </div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.5rem', fontWeight: 500 }}>Brands</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {dist.brands.map(brand => (
                  <span key={brand} style={{
                    background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc',
                    padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem'
                  }}>
                    {brand}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={{
                flex: 1, padding: '0.75rem', borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer'
              }}>
                View Profile
              </button>
              <button style={{
                padding: '0.75rem 1rem', borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', cursor: 'pointer'
              }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedDistributor && (
        <div
          onClick={() => setSelectedDistributor(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(20, 20, 35, 0.95)',
              borderRadius: '24px', padding: '2rem', maxWidth: '600px', width: '100%',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <div style={{
                  width: '72px', height: '72px', borderRadius: '16px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  {selectedDistributor.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selectedDistributor.name}</h2>
                    {selectedDistributor.verified && <span style={{ background: '#22c55e', padding: '0.125rem 0.5rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600 }}>Verified</span>}
                  </div>
                  <p style={{ color: '#64748b' }}>{selectedDistributor.city}, {selectedDistributor.state}</p>
                  <p style={{ color: '#8b5cf6', fontSize: '0.875rem', marginTop: '0.25rem' }}>{selectedDistributor.coverage}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDistributor(null)}
                style={{ background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer' }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Retailers', value: selectedDistributor.retailers },
                { label: 'Rating', value: `⭐ ${selectedDistributor.rating}` },
                { label: 'Est.', value: selectedDistributor.established }
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{item.value}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>{item.label}</div>
                </div>
              ))}
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.75rem', fontWeight: 500 }}>BRANDS</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedDistributor.brands.map(brand => (
                  <span key={brand} style={{
                    background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc',
                    padding: '0.5rem 1rem', borderRadius: '100px', fontSize: '0.875rem'
                  }}>
                    {brand}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={{
                flex: 1, padding: '1rem', borderRadius: '12px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '1rem'
              }}>
                Send Inquiry
              </button>
              <button style={{
                flex: 1, padding: '1rem', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '1rem'
              }}>
                Schedule Call
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
