'use client';

import { useState } from 'react';

const mockManufacturers = [
  {
    id: '1',
    name: 'NutriFoods Private Limited',
    type: 'food_manufacturing',
    location: 'Mumbai, Maharashtra',
    certifications: ['FSSAI', 'ISO 22000', 'HACCP'],
    minOrderQty: '500 units',
    leadTime: '15-20 days',
    categories: ['Snacks', 'Ready to Eat', 'Beverages'],
    capacity: '50,000 units/day',
    verified: true,
    image: '🍪'
  },
  {
    id: '2',
    name: 'PharmaCare Manufacturing',
    type: 'pharma',
    location: 'Hyderabad, Telangana',
    certifications: ['WHO-GMP', 'ISO 9001', 'ISO 14001'],
    minOrderQty: '10,000 units',
    leadTime: '30-45 days',
    categories: ['Tablets', 'Capsules', 'Syrups'],
    capacity: '1 Million units/day',
    verified: true,
    image: '💊'
  },
  {
    id: '3',
    name: 'PackRight Industries',
    type: 'packaging',
    location: 'Surat, Gujarat',
    certifications: ['ISO 9001', 'BIS'],
    minOrderQty: '1,000 units',
    leadTime: '7-10 days',
    categories: ['Flexible Packaging', 'Boxes', 'Labels'],
    capacity: '100,000 units/day',
    verified: true,
    image: '📦'
  },
  {
    id: '4',
    name: 'CleanCo Cosmetics',
    type: 'cosmetics',
    location: 'Bangalore, Karnataka',
    certifications: ['GMP', 'ISO 22716', 'BIS'],
    minOrderQty: '2,000 units',
    leadTime: '20-25 days',
    categories: ['Skincare', 'Haircare', 'Personal Care'],
    capacity: '30,000 units/day',
    verified: true,
    image: '🧴'
  },
  {
    id: '5',
    name: 'SteelTech Fabrications',
    type: 'industrial',
    location: 'Pune, Maharashtra',
    certifications: ['ISO 9001', 'CE Mark'],
    minOrderQty: '100 units',
    leadTime: '21-30 days',
    categories: ['Industrial Parts', 'Sheet Metal', 'Fabrications'],
    capacity: '5,000 units/month',
    verified: false,
    image: '⚙️'
  }
];

const categories = ['All', 'Food & Beverages', 'Pharmaceutical', 'Packaging', 'Cosmetics', 'Industrial'];

export default function ManufacturersPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [selected, setSelected] = useState<typeof mockManufacturers[0] | null>(null);

  const filtered = mockManufacturers.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.categories.some(c => c.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = category === 'All' || m.categories.some(c =>
      c.toLowerCase().includes(category.toLowerCase())
    );
    return matchesSearch && matchesCategory;
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0' }}>Find Manufacturers</h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Connect with verified manufacturers for OEM, private label, or contract manufacturing
        </p>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Search by name or category..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '250px',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid #d1d5db'
          }}
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
        >
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {/* Results */}
      <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{filtered.length} manufacturers found</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map(mfr => (
          <div
            key={mfr.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '1rem',
              padding: '1.5rem',
              display: 'flex',
              gap: '1.5rem',
              cursor: 'pointer',
              background: 'white'
            }}
            onClick={() => setSelected(mfr)}
          >
            <div style={{
              width: '5rem',
              height: '5rem',
              background: '#f3f4f6',
              borderRadius: '0.75rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '2.5rem',
              flexShrink: 0
            }}>
              {mfr.image}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <h3 style={{ margin: 0 }}>{mfr.name}</h3>
                {mfr.verified && (
                  <span style={{
                    background: '#dcfce7',
                    color: '#16a34a',
                    padding: '0.125rem 0.5rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem'
                  }}>
                    Verified ✓
                  </span>
                )}
              </div>

              <p style={{ margin: '0 0 0.75rem 0', color: '#6b7280', fontSize: '0.875rem' }}>
                📍 {mfr.location}
              </p>

              <div style={{ display: 'flex', gap: '2rem', marginBottom: '0.75rem', fontSize: '0.875rem' }}>
                <div><strong>MOQ:</strong> {mfr.minOrderQty}</div>
                <div><strong>Lead Time:</strong> {mfr.leadTime}</div>
                <div><strong>Capacity:</strong> {mfr.capacity}</div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {mfr.categories.map(cat => (
                  <span key={cat} style={{
                    background: '#ede9fe',
                    color: '#7c3aed',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem'
                  }}>
                    {cat}
                  </span>
                ))}
                {mfr.certifications.map(cert => (
                  <span key={cert} style={{
                    background: '#fef3c7',
                    color: '#d97706',
                    padding: '0.25rem 0.75rem',
                    borderRadius: '9999px',
                    fontSize: '0.75rem'
                  }}>
                    {cert}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button style={{
                padding: '0.5rem 1rem',
                background: '#a855f7',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}>
                Contact
              </button>
              <button style={{
                padding: '0.5rem 1rem',
                background: 'white',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}>
                Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selected && (
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
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '1rem',
              padding: '2rem',
              maxWidth: '600px',
              width: '90%'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '3rem' }}>{selected.image}</div>
                <div>
                  <h2 style={{ margin: 0 }}>{selected.name}</h2>
                  <p style={{ margin: 0, color: '#6b7280' }}>{selected.location}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer'
              }}>×</button>
            </div>

            <h4>Certifications</h4>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
              {selected.certifications.map(cert => (
                <span key={cert} style={{
                  background: '#dcfce7',
                  color: '#16a34a',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem'
                }}>
                  {cert}
                </span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Min Order Qty</div>
                <div style={{ fontWeight: 600 }}>{selected.minOrderQty}</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Lead Time</div>
                <div style={{ fontWeight: 600 }}>{selected.leadTime}</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Daily Capacity</div>
                <div style={{ fontWeight: 600 }}>{selected.capacity}</div>
              </div>
              <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
                <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Categories</div>
                <div style={{ fontWeight: 600 }}>{selected.categories.join(', ')}</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
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
                Request Quote
              </button>
              <button style={{
                flex: 1,
                padding: '0.75rem',
                background: 'white',
                color: '#a855f7',
                border: '1px solid #a855f7',
                borderRadius: '0.5rem',
                cursor: 'pointer'
              }}>
                Schedule Visit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
