'use client';

import { useState } from 'react';

// Mock data - would come from FranchiseOS API
const mockFranchises = [
  {
    id: '1',
    brandName: 'BurgerBox',
    type: 'restaurant',
    category: 'QSR',
    description: 'Premium burgers with AI-personalized menus',
    investment: '₹15-25 Lakhs',
    roi: '18-24 months',
    locations: 150,
    avgMonthlySales: '₹8-12 Lakhs',
    fee: '₹5 Lakhs (one-time)',
    image: '🍔',
    verified: true
  },
  {
    id: '2',
    brandName: 'GlowSalon',
    type: 'salon',
    category: 'Beauty',
    description: 'Tech-enabled salon with AI skin analysis',
    investment: '₹8-15 Lakhs',
    roi: '12-18 months',
    locations: 89,
    avgMonthlySales: '₹4-6 Lakhs',
    fee: '₹2 Lakhs',
    image: '💇',
    verified: true
  },
  {
    id: '3',
    brandName: 'FitZone Pro',
    type: 'fitness',
    category: 'Gym',
    description: 'Smart gym with AI workout recommendations',
    investment: '₹25-40 Lakhs',
    roi: '24-30 months',
    locations: 45,
    avgMonthlySales: '₹10-15 Lakhs',
    fee: '₹8 Lakhs',
    image: '🏋️',
    verified: true
  },
  {
    id: '4',
    brandName: 'FreshMart',
    type: 'retail',
    category: 'Grocery',
    description: 'AI-managed smart grocery store',
    investment: '₹5-10 Lakhs',
    roi: '8-12 months',
    locations: 230,
    avgMonthlySales: '₹15-25 Lakhs',
    fee: '₹1 Lakh',
    image: '🛒',
    verified: true
  },
  {
    id: '5',
    brandName: 'PizzaHub Express',
    type: 'restaurant',
    category: 'Pizza',
    description: 'Fast-casual pizza with delivery focus',
    investment: '₹10-18 Lakhs',
    roi: '14-20 months',
    locations: 180,
    avgMonthlySales: '₹6-9 Lakhs',
    fee: '₹3 Lakhs',
    image: '🍕',
    verified: false
  },
  {
    id: '6',
    brandName: 'CafeBrew',
    type: 'cafe',
    category: 'Coffee',
    description: 'Premium coffee shop with artisanal beans',
    investment: '₹6-12 Lakhs',
    roi: '12-16 months',
    locations: 67,
    avgMonthlySales: '₹3-5 Lakhs',
    fee: '₹2 Lakhs',
    image: '☕',
    verified: true
  }
];

const industries = ['All', 'Restaurant', 'Salon', 'Fitness', 'Retail', 'Cafe'];
const investmentRanges = [
  { min: 0, max: Infinity, label: 'Any Investment' },
  { min: 0, max: 10, label: 'Under ₹10 Lakhs' },
  { min: 10, max: 25, label: '₹10-25 Lakhs' },
  { min: 25, max: 50, label: '₹25-50 Lakhs' },
  { min: 50, max: Infinity, label: 'Above ₹50 Lakhs' }
];

export default function FranchisesPage() {
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All');
  const [investment, setInvestment] = useState(0);
  const [selectedFranchise, setSelectedFranchise] = useState<typeof mockFranchises[0] | null>(null);

  const filtered = mockFranchises.filter(f => {
    const matchesSearch = f.brandName.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase());
    const matchesIndustry = industry === 'All' || f.type === industry.toLowerCase();
    const range = investmentRanges[investment];
    const invNum = parseInt(f.investment.replace(/[^0-9]/g, ''));
    const matchesInvestment = invNum >= range.min && invNum <= range.max;
    return matchesSearch && matchesIndustry && matchesInvestment;
  });

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem 0' }}>Franchise Opportunities</h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Invest in proven brands with AI-powered support and marketing
        </p>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        display: 'flex',
        gap: '1rem',
        marginBottom: '2rem',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="Search brands..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            minWidth: '250px',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            border: '1px solid #d1d5db',
            fontSize: '1rem'
          }}
        />

        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
        >
          {industries.map(i => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>

        <select
          value={investment}
          onChange={(e) => setInvestment(parseInt(e.target.value))}
          style={{ padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #d1d5db' }}
        >
          {investmentRanges.map((r, i) => (
            <option key={r.label} value={i}>{r.label}</option>
          ))}
        </select>
      </div>

      {/* Stats Bar */}
      <div style={{
        display: 'flex',
        gap: '2rem',
        padding: '1rem',
        background: '#f3f4f6',
        borderRadius: '0.5rem',
        marginBottom: '2rem'
      }}>
        <div><strong>{filtered.length}</strong> franchises found</div>
        <div><strong>₹5Cr+</strong> total investment tracked</div>
        <div><strong>850+</strong> active franchises</div>
      </div>

      {/* Franchise Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
        gap: '1.5rem'
      }}>
        {filtered.map(franchise => (
          <div
            key={franchise.id}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: '1rem',
              overflow: 'hidden',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedFranchise(franchise)}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              padding: '1.5rem',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem'
            }}>
              <div style={{
                width: '4rem',
                height: '4rem',
                background: 'rgba(255,255,255,0.2)',
                borderRadius: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem'
              }}>
                {franchise.image}
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ margin: 0 }}>{franchise.brandName}</h3>
                  {franchise.verified && <span>✓</span>}
                </div>
                <p style={{ margin: '0.25rem 0 0 0', opacity: 0.9, fontSize: '0.875rem' }}>
                  {franchise.category} • {franchise.locations} locations
                </p>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '1.25rem' }}>
              <p style={{ margin: '0 0 1rem 0', color: '#4b5563' }}>
                {franchise.description}
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <Metric label="Investment" value={franchise.investment} />
                <Metric label="ROI Period" value={franchise.roi} />
                <Metric label="Franchise Fee" value={franchise.fee} />
                <Metric label="Monthly Sales" value={franchise.avgMonthlySales} />
              </div>

              <button style={{
                width: '100%',
                padding: '0.75rem',
                background: '#a855f7',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: 'pointer',
                fontWeight: 500
              }}>
                Get Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedFranchise && (
        <FranchiseModal
          franchise={selectedFranchise}
          onClose={() => setSelectedFranchise(null)}
        />
      )}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ background: '#f9fafb', padding: '0.75rem', borderRadius: '0.5rem' }}>
      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{label}</div>
      <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{value}</div>
    </div>
  );
}

function FranchiseModal({
  franchise,
  onClose
}: {
  franchise: typeof mockFranchises[0];
  onClose: () => void;
}) {
  return (
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
      onClick={onClose}
    >
      <div
        style={{
          background: 'white',
          borderRadius: '1rem',
          padding: '2rem',
          maxWidth: '600px',
          width: '90%',
          maxHeight: '90vh',
          overflow: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{
              width: '3.5rem',
              height: '3.5rem',
              background: '#f3f4f6',
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem'
            }}>
              {franchise.image}
            </div>
            <div>
              <h2 style={{ margin: 0 }}>{franchise.brandName}</h2>
              <p style={{ margin: 0, color: '#6b7280' }}>{franchise.category} Franchise</p>
            </div>
          </div>
          <button
            onClick={onClose}
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

        <p style={{ marginBottom: '1.5rem' }}>{franchise.description}</p>

        <h4 style={{ marginBottom: '1rem' }}>Investment Details</h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Total Investment</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{franchise.investment}</div>
          </div>
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Franchise Fee</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{franchise.fee}</div>
          </div>
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Expected ROI</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{franchise.roi}</div>
          </div>
          <div style={{ background: '#f9fafb', padding: '1rem', borderRadius: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Avg Monthly Sales</div>
            <div style={{ fontSize: '1.25rem', fontWeight: 600 }}>{franchise.avgMonthlySales}</div>
          </div>
        </div>

        <h4 style={{ marginBottom: '1rem' }}>What's Included</h4>
        <ul style={{ marginBottom: '1.5rem' }}>
          <li>Complete operational training</li>
          <li>AI-powered inventory management system</li>
          <li>Marketing & advertising support</li>
          <li>Supply chain integration</li>
          <li>Technology stack (POS, CRM, Analytics)</li>
        </ul>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button style={{
            flex: 1,
            padding: '0.875rem',
            background: '#a855f7',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '1rem'
          }}>
            Apply Now
          </button>
          <button style={{
            flex: 1,
            padding: '0.875rem',
            background: 'white',
            color: '#a855f7',
            border: '1px solid #a855f7',
            borderRadius: '0.5rem',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '1rem'
          }}>
            Request Callback
          </button>
        </div>
      </div>
    </div>
  );
}
