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
    image: '🚚'
  },
  {
    id: '2',
    name: 'Western Pharma Distributors',
    type: 'distributor',
    city: 'Ahmedabad',
    state: 'Gujarat',
    brands: ['Sun Pharma', 'Cipla', 'Dr Reddy\'s'],
    categories: ['Pharmaceutical'],
    retailers: 320,
    rating: 4.6,
    verified: true,
    image: '💊'
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
    image: '🛒'
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
    image: '📺'
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
    image: '🔧'
  }
];

const categories = ['All', 'FMCG', 'Food & Beverages', 'Pharmaceutical', 'Electronics', 'Automotive', 'Grocery'];
const states = ['All States', 'Maharashtra', 'Gujarat', 'Tamil Nadu', 'Delhi', 'Karnataka'];

export default function DistributorsPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [state, setState] = useState('All States');
  const [type, setType] = useState('all');
  const [selectedDistributor, setSelectedDistributor] = useState<typeof mockDistributors[0] | null>(null);

  const filtered = mockDistributors.filter(d => {
    const matchesSearch = d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.brands.some(b => b.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === 'All' || d.categories.includes(category);
    const matchesState = state === 'All States' || d.state === state;
    const matchesType = type === 'all' || d.type === type;
    return matchesSearch && matchesCategory && matchesState && matchesType;
  });

  return (
    <div style={{ display: 'flex', minHeight: '80vh' }}>
      {/* Filters Sidebar */}
      <aside style={{
        width: '280px',
        padding: '1.5rem',
        borderRight: '1px solid #e5e7eb',
        background: '#f9fafb'
      }}>
        <h3 style={{ marginTop: 0 }}>Filters</h3>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
            Type
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
          >
            <option value="all">All Types</option>
            <option value="distributor">Distributor</option>
            <option value="wholesaler">Wholesaler</option>
            <option value="stockist">Stockist</option>
            <option value="dealer">Dealer</option>
          </select>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
            Category
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {categories.map(cat => (
              <label key={cat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="category"
                  checked={category === cat}
                  onChange={() => setCategory(cat)}
                />
                {cat}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontWeight: 500, marginBottom: '0.5rem' }}>
            State
          </label>
          <select
            value={state}
            onChange={(e) => setState(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
          >
            {states.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <button
          onClick={() => { setSearch(''); setCategory('All'); setState('All States'); setType('all'); }}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: '#ef4444',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer'
          }}
        >
          Clear Filters
        </button>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '1.5rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ margin: '0 0 1rem 0' }}>Find Distributors</h1>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <input
              type="text"
              placeholder="Search by name or brand..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                padding: '0.75rem 1rem',
                borderRadius: '0.5rem',
                border: '1px solid #d1d5db',
                fontSize: '1rem'
              }}
            />
          </div>
        </div>

        <p style={{ color: '#6b7280' }}>Showing {filtered.length} distributors</p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: '1rem'
        }}>
          {filtered.map(dist => (
            <div
              key={dist.id}
              style={{
                border: '1px solid #e5e7eb',
                borderRadius: '0.75rem',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onClick={() => setSelectedDistributor(dist)}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = '#a855f7';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(168, 85, 247, 0.1)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
                <div style={{
                  width: '4rem',
                  height: '4rem',
                  background: '#f3f4f6',
                  borderRadius: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  {dist.image}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <h3 style={{ margin: 0 }}>{dist.name}</h3>
                    {dist.verified && <span style={{ color: '#10b981' }}>✓</span>}
                  </div>
                  <p style={{ margin: '0.25rem 0 0 0', color: '#6b7280', fontSize: '0.875rem' }}>
                    {dist.city}, {dist.state}
                  </p>
                  <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.75rem', color: '#9ca3af', textTransform: 'capitalize' }}>
                    {dist.type}
                  </p>
                </div>
              </div>

              <div style={{ marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Rating: </span>
                <span style={{ fontWeight: 600 }}>⭐ {dist.rating}</span>
                <span style={{ marginLeft: '1rem', fontSize: '0.75rem', color: '#6b7280' }}>
                  {dist.retailers} retailers
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                {dist.categories.map(cat => (
                  <span key={cat} style={{
                    background: '#ede9fe',
                    color: '#7c3aed',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem'
                  }}>
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedDistributor && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
          onClick={() => setSelectedDistributor(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '500px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h2 style={{ margin: '0 0 0.5rem 0' }}>{selectedDistributor.name}</h2>
                <p style={{ margin: 0, color: '#6b7280' }}>
                  {selectedDistributor.city}, {selectedDistributor.state}
                </p>
              </div>
              <button
                onClick={() => setSelectedDistributor(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginTop: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0' }}>Brands Carried</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {selectedDistributor.brands.map(brand => (
                  <span key={brand} style={{
                    background: '#f3f4f6',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '0.25rem',
                    fontSize: '0.875rem'
                  }}>
                    {brand}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedDistributor.rating} ⭐</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Rating</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedDistributor.retailers}</div>
                <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>Retailers</div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', display: 'flex', gap: '0.75rem' }}>
              <button style={{
                flex: 1,
                padding: '0.75rem',
                background: '#a855f7',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 500
              }}>
                Send Inquiry
              </button>
              <button style={{
                flex: 1,
                padding: '0.75rem',
                background: 'white',
                color: '#a855f7',
                border: '1px solid #a855f7',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 500
              }}>
                View Profile
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
