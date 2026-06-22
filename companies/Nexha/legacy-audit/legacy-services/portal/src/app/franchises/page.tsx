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
    fee: '₹5 Lakhs',
    image: '🍔',
    verified: true,
    gradient: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)',
    highlights: ['AI Menu Personalization', 'Dark Kitchen Model', '30-min Delivery']
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
    verified: true,
    gradient: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
    highlights: ['AI Skin Analysis', 'CRM Integration', 'Membership App']
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
    verified: true,
    gradient: 'linear-gradient(135deg, #22d3ee 0%, #0891b2 100%)',
    highlights: ['Smart Equipment', 'Personal Training App', 'Nutrition AI']
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
    verified: true,
    gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)',
    highlights: ['Smart Inventory', '30-min Delivery', 'Low Labor Cost']
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
    verified: false,
    gradient: 'linear-gradient(135deg, #eab308 0%, #ca8a04 100%)',
    highlights: ['Delivery First', 'Cloud Kitchen', 'Low Setup Cost']
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
    verified: true,
    gradient: 'linear-gradient(135deg, #a16207 0%, #854d0e 100%)',
    highlights: ['Artisan Roasters', 'Co-working Space', 'Premium Positioning']
  }
];

const industries = ['All', 'Restaurant', 'Salon', 'Fitness', 'Retail', 'Cafe'];
const investmentRanges = ['Any', 'Under ₹10L', '₹10-25L', '₹25-50L', 'Above ₹50L'];

export default function FranchisesPage() {
  const [search, setSearch] = useState('');
  const [industry, setIndustry] = useState('All');
  const [investment, setInvestment] = useState(0);
  const [selected, setSelected] = useState<typeof mockFranchises[0] | null>(null);

  const filtered = mockFranchises.filter(f => {
    const matchesSearch = f.brandName.toLowerCase().includes(search.toLowerCase()) ||
      f.description.toLowerCase().includes(search.toLowerCase());
    const matchesIndustry = industry === 'All' || f.type === industry.toLowerCase();
    return matchesSearch && matchesIndustry;
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
        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        padding: '8rem 2rem 4rem'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <span style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%)',
              padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem', fontWeight: 600
            }}>
              Franchise Opportunities
            </span>
          </div>
          <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '1rem' }}>
            Invest in Proven Brands
          </h1>
          <p style={{ fontSize: '1.125rem', color: '#64748b', maxWidth: '600px', lineHeight: 1.7 }}>
            Browse verified franchise opportunities with AI-powered support, marketing tools, and supply chain integration.
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
            <svg style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <path d="M21 21l-4.35-4.35"/>
            </svg>
            <input
              type="text"
              placeholder="Search brands..."
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
          <select
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            style={{
              padding: '1rem 1.5rem', borderRadius: '12px',
              background: 'rgba(30, 30, 50, 0.8)',
              border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.95rem', cursor: 'pointer'
            }}
          >
            {industries.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
            <strong style={{ color: '#fff' }}>{filtered.length}</strong> franchise opportunities found
          </p>
        </div>
      </div>

      {/* Franchise Grid */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 2rem 4rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(420px, 1fr))', gap: '1.5rem' }}>
        {filtered.map(franchise => (
          <div
            key={franchise.id}
            style={{
              background: 'rgba(20, 20, 35, 0.8)',
              border: '1px solid rgba(255,255,255,0.05)',
              borderRadius: '24px', overflow: 'hidden',
              cursor: 'pointer', transition: 'all 0.3s'
            }}
            onClick={() => setSelected(franchise)}
          >
            {/* Header with gradient */}
            <div style={{
              padding: '1.5rem',
              background: franchise.gradient,
              display: 'flex', alignItems: 'center', gap: '1rem'
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.75rem'
              }}>
                {franchise.image}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{franchise.brandName}</h3>
                  {franchise.verified && (
                    <span style={{ fontSize: '0.875rem' }}>✓</span>
                  )}
                </div>
                <p style={{ opacity: 0.9, fontSize: '0.875rem' }}>{franchise.category} • {franchise.locations} locations</p>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '1.5rem' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                {franchise.description}
              </p>

              {/* Metrics */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.25rem' }}>
                {[
                  { label: 'Investment', value: franchise.investment },
                  { label: 'ROI Period', value: franchise.roi }
                ].map((metric, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.875rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{metric.label}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{metric.value}</div>
                  </div>
                ))}
                {[
                  { label: 'Franchise Fee', value: franchise.fee },
                  { label: 'Monthly Sales', value: franchise.avgMonthlySales }
                ].map((metric, i) => (
                  <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '0.875rem', borderRadius: '10px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{metric.label}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 600 }}>{metric.value}</div>
                  </div>
                ))}
              </div>

              {/* Highlights */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {franchise.highlights.map(h => (
                  <span key={h} style={{
                    background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc',
                    padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.75rem'
                  }}>
                    {h}
                  </span>
                ))}
              </div>

              {/* CTA */}
              <button style={{
                width: '100%', padding: '0.875rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none', borderRadius: '10px', color: '#fff',
                fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer'
              }}>
                Get Details →
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
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: '64px', height: '64px', borderRadius: '16px',
                  background: selected.gradient,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '2rem'
                }}>
                  {selected.image}
                </div>
                <div>
                  <h2 style={{ fontSize: '1.5rem', fontWeight: 700 }}>{selected.brandName}</h2>
                  <p style={{ color: '#64748b' }}>{selected.category} Franchise</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)} style={{
                background: 'none', border: 'none', color: '#64748b', fontSize: '1.5rem', cursor: 'pointer'
              }}>×</button>
            </div>

            <p style={{ color: '#94a3b8', lineHeight: 1.7, marginBottom: '1.5rem' }}>{selected.description}</p>

            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Investment Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              {[
                { label: 'Total Investment', value: selected.investment },
                { label: 'Franchise Fee', value: selected.fee },
                { label: 'Expected ROI', value: selected.roi },
                { label: 'Avg Monthly Sales', value: selected.avgMonthlySales }
              ].map((item, i) => (
                <div key={i} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '12px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>{item.label}</div>
                  <div style={{ fontSize: '1.125rem', fontWeight: 600 }}>{item.value}</div>
                </div>
              ))}
            </div>

            <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: '#64748b', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What's Included</h4>
            <ul style={{ color: '#94a3b8', fontSize: '0.875rem', lineHeight: 2, marginBottom: '1.5rem', paddingLeft: '1.25rem' }}>
              <li>Complete operational training</li>
              <li>AI-powered inventory management system</li>
              <li>Marketing & advertising support</li>
              <li>Supply chain integration</li>
              <li>Technology stack (POS, CRM, Analytics)</li>
            </ul>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={{
                flex: 1, padding: '1rem',
                background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                border: 'none', borderRadius: '12px', color: '#fff',
                fontSize: '1rem', fontWeight: 600, cursor: 'pointer'
              }}>
                Apply Now
              </button>
              <button style={{
                flex: 1, padding: '1rem',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: '12px', color: '#fff',
                fontSize: '1rem', fontWeight: 600, cursor: 'pointer'
              }}>
                Request Callback
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
