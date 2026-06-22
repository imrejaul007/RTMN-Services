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
    icon: '🍪',
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)'
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
    icon: '💊',
    gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)'
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
    icon: '📦',
    gradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 100%)'
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
    icon: '🧴',
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)'
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
    icon: '⚙️',
    gradient: 'linear-gradient(135deg, #64748b 0%, #475569 100%)'
  }
];

const categories = ['All', 'Food Manufacturing', 'Pharmaceutical', 'Cosmetics', 'Packaging', 'Industrial'];

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
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#ffffff' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; }
        body { font-family: 'Inter', sans-serif; }
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '8rem 2rem 4rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{
              background: 'linear-gradient(135deg, #ec4899 0%, #8b5cf6 100%)',
              padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600
            }}>
              Manufacturing Network
            </span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
            Find Manufacturers
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#64748b', maxWidth: '600px', lineHeight: 1.7 }}>
            Connect with verified manufacturers for OEM, private label, or contract manufacturing.
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
              placeholder="Search by name or category..."
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

        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              style={{
                padding: '0.5rem 1rem', borderRadius: '8px',
                border: category === cat ? 'none' : '1px solid rgba(255,255,255,0.1)',
                background: category === cat
                  ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                  : 'rgba(255,255,255,0.05)',
                color: '#fff', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1.5rem' }}>
          Showing <strong style={{ color: '#fff' }}>{filtered.length}</strong> manufacturers
        </p>
      </div>

      {/* Manufacturer List */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 4rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {filtered.map(mfr => (
          <div
            key={mfr.id}
            style={{
              background: 'rgba(20, 20, 35, 0.8)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '20px', padding: '1.5rem',
              display: 'flex', gap: '1.5rem', cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onClick={() => setSelected(mfr)}
          >
            <div style={{
              width: '72px', height: '72px', borderRadius: '18px',
              background: mfr.gradient,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2rem', flexShrink: 0
            }}>
              {mfr.icon}
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{mfr.name}</h3>
                {mfr.verified && (
                  <span style={{
                    background: '#22c55e', color: '#fff',
                    padding: '0.125rem 0.5rem', borderRadius: '100px', fontSize: '0.625rem', fontWeight: 600
                  }}>
                    Verified ✓
                  </span>
                )}
              </div>
              <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                📍 {mfr.location}
              </p>

              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.875rem', marginBottom: '0.75rem' }}>
                <div><strong>MOQ:</strong> {mfr.minOrderQty}</div>
                <div><strong>Lead Time:</strong> {mfr.leadTime}</div>
                <div><strong>Capacity:</strong> {mfr.capacity}</div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {mfr.certifications.map(cert => (
                  <span key={cert} style={{
                    background: 'rgba(251, 191, 36, 0.1)', color: '#fbbf24',
                    padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 500
                  }}>
                    {cert}
                  </span>
                ))}
                {mfr.categories.map(cat => (
                  <span key={cat} style={{
                    background: 'rgba(139, 92, 246, 0.1)', color: '#a78bfa',
                    padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem'
                  }}>
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <button style={{
                padding: '0.5rem 1rem', borderRadius: '8px',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none', color: '#fff', fontWeight: 600, cursor: 'pointer'
              }}>
                Contact
              </button>
              <button style={{
                padding: '0.5rem 1rem', borderRadius: '8px',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
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
          onClick={() => setSelected(null)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 100, padding: '2rem'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'rgba(20, 20, 35, 0.98)',
              borderRadius: '24px', padding: '2rem', maxWidth: '600px', width: '100%',
              border: '1px solid rgba(255,255,255,0.1)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '16px',
                  background: selected.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  {selected.icon}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selected.name}</h2>
                  <p style={{ color: '#64748b' }}>{selected.location}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer'
              }}>×</button>
            </div>

            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase' }}>Certifications</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
              {selected.certifications.map(cert => (
                <span key={cert} style={{
                  background: 'rgba(34, 197, 94, 0.1)', color: '#22c55e',
                  padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 500
                }}>
                  ✓ {cert}
                </span>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Min Order Qty', value: selected.minOrderQty },
                { label: 'Lead Time', value: selected.leadTime },
                { label: 'Daily Capacity', value: selected.capacity },
                { label: 'Categories', value: selected.categories[0] }
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{item.label}</div>
                  <div style={{ fontSize: '1rem', fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={{
                flex: 1, padding: '0.875rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontWeight: 600, cursor: 'pointer'
              }}>
                Request Quote
              </button>
              <button style={{
                flex: 1, padding: '0.875rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '10px', color: '#fff',
                fontWeight: 600, cursor: 'pointer'
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
