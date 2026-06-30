/**
 * Template Marketplace Page
 */

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Search, ArrowRight, Sparkles, Filter } from 'lucide-react';
import { StudioAPI } from '@/lib/api';

const MOCK_TEMPLATES = [
  { id: 'restaurant', name: 'Restaurant Commerce', industry: 'restaurant', description: 'Complete restaurant commerce with menu, orders, reservations', icon: '🍽️', tier: 'P0', workerCount: 5, moduleCount: 7, estimatedCost: 4900 },
  { id: 'hotel', name: 'Hotel & Hospitality', industry: 'hospitality', description: 'Hotel template with rooms, bookings, concierge', icon: '🏨', tier: 'P0', workerCount: 4, moduleCount: 6, estimatedCost: 6300 },
  { id: 'healthcare', name: 'Healthcare Commerce', industry: 'healthcare', description: 'Hospital, clinic, pharmacy, appointments', icon: '🏥', tier: 'P1', workerCount: 4, moduleCount: 5, estimatedCost: 7000 },
  { id: 'retail', name: 'Retail Commerce', industry: 'retail', description: 'D2C brand, supermarket, omnichannel', icon: '🛍️', tier: 'P1', workerCount: 3, moduleCount: 7, estimatedCost: 5400 },
  { id: 'fashion', name: 'Fashion Commerce', industry: 'fashion', description: 'Designer, wholesale, D2C, sizes, returns', icon: '👗', tier: 'P1', workerCount: 3, moduleCount: 6, estimatedCost: 5300 },
  { id: 'beauty', name: 'Beauty & Wellness', industry: 'beauty', description: 'Salon, spa, bookings, products', icon: '💄', tier: 'P1', workerCount: 2, moduleCount: 6, estimatedCost: 4100 },
  { id: 'automotive', name: 'Automotive Commerce', industry: 'automotive', description: 'Vehicle sales, service, parts', icon: '🚗', tier: 'P1', workerCount: 3, moduleCount: 5, estimatedCost: 4600 },
  { id: 'events', name: 'Events & Banquets', industry: 'events', description: 'Event planning, venue booking, catering', icon: '🎉', tier: 'P1', workerCount: 3, moduleCount: 6, estimatedCost: 4400 },
  { id: 'manufacturing', name: 'Manufacturing Commerce', industry: 'manufacturing', description: 'B2B manufacturing, raw materials, supply chain', icon: '🏭', tier: 'P2', workerCount: 3, moduleCount: 5, estimatedCost: 4600 },
  { id: 'construction', name: 'Construction Commerce', industry: 'construction', description: 'Cement, steel, contractors, equipment rentals', icon: '🏗️', tier: 'P2', workerCount: 3, moduleCount: 4, estimatedCost: 3600 },
  { id: 'logistics', name: 'Logistics Commerce', industry: 'logistics', description: 'Shipping, warehousing, last-mile', icon: '🚚', tier: 'P2', workerCount: 3, moduleCount: 4, estimatedCost: 4400 },
  { id: 'education', name: 'Education Commerce', industry: 'education', description: 'Courses, admissions, certifications', icon: '🎓', tier: 'P2', workerCount: 3, moduleCount: 5, estimatedCost: 4400 },
  { id: 'agriculture', name: 'Agriculture Commerce', industry: 'agriculture', description: 'Farming, produce, supply chain', icon: '🌾', tier: 'P2', workerCount: 3, moduleCount: 4, estimatedCost: 4400 },
  { id: 'travel', name: 'Travel & Tourism', industry: 'travel', description: 'Flights, hotels, packages, itineraries', icon: '✈️', tier: 'P1', workerCount: 3, moduleCount: 5, estimatedCost: 5300 },
  { id: 'real-estate', name: 'Real Estate Commerce', industry: 'real-estate', description: 'Property sales, rentals, mortgages', icon: '🏢', tier: 'P3', workerCount: 3, moduleCount: 4, estimatedCost: 4400 },
  { id: 'financial', name: 'Financial Services', industry: 'financial', description: 'Loans, insurance, investments', icon: '💰', tier: 'P3', workerCount: 2, moduleCount: 4, estimatedCost: 4400 },
  { id: 'legal', name: 'Legal Commerce', industry: 'legal', description: 'Lawyers, legal services, contracts', icon: '⚖️', tier: 'P3', workerCount: 2, moduleCount: 4, estimatedCost: 3300 },
  { id: 'professional', name: 'Professional Services', industry: 'professional', description: 'Consultants, agencies, freelancers', icon: '💼', tier: 'P3', workerCount: 2, moduleCount: 4, estimatedCost: 3300 },
  { id: 'fitness', name: 'Fitness & Gym', industry: 'fitness', description: 'Gym memberships, fitness classes, trainers', icon: '💪', tier: 'P3', workerCount: 2, moduleCount: 4, estimatedCost: 3300 },
  { id: 'entertainment', name: 'Entertainment Commerce', industry: 'entertainment', description: 'Content, streaming, events, merch', icon: '🎬', tier: 'P3', workerCount: 2, moduleCount: 5, estimatedCost: 3300 },
  { id: 'government', name: 'Government Commerce', industry: 'government', description: 'Procurement, public services, subsidies', icon: '🏛️', tier: 'P3', workerCount: 3, moduleCount: 4, estimatedCost: 4400 },
  { id: 'home-services', name: 'Home Services', industry: 'home-services', description: 'Plumbing, cleaning, repairs', icon: '🏠', tier: 'P3', workerCount: 2, moduleCount: 3, estimatedCost: 3300 },
  { id: 'non-profit', name: 'Non-Profit Commerce', industry: 'non-profit', description: 'Fundraising, donations, volunteer management', icon: '❤️', tier: 'P3', workerCount: 2, moduleCount: 4, estimatedCost: 2700 },
  { id: 'sports', name: 'Sports Commerce', industry: 'sports', description: 'Sports clubs, events, equipment', icon: '⚽', tier: 'P3', workerCount: 2, moduleCount: 4, estimatedCost: 3300 },
  { id: 'gaming', name: 'Gaming & eSports', industry: 'gaming', description: 'Games, tournaments, streams', icon: '🎮', tier: 'P3', workerCount: 2, moduleCount: 5, estimatedCost: 3300 },
  { id: 'exhibitions', name: 'Exhibitions & Trade Shows', industry: 'exhibitions', description: 'Trade shows, booth booking, leads', icon: '🏛️', tier: 'P1', workerCount: 2, moduleCount: 4, estimatedCost: 4400 },
];

export default function TemplatesPage() {
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('all');
  const [templates, setTemplates] = useState<any[]>(MOCK_TEMPLATES);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const response = await StudioAPI.listTemplates();
      if (response?.templates?.length) {
        setTemplates(response.templates);
      }
    } catch {
      // Use mock data
    } finally {
      setLoading(false);
    }
  }

  const filtered = templates.filter(t => {
    const matchSearch = !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase());
    const matchTier = tierFilter === 'all' || t.tier === tierFilter;
    return matchSearch && matchTier;
  });

  return (
    <div className="container py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Template Marketplace</h1>
        <p className="text-muted">Choose from 26 industry templates to start your commerce business</p>
      </header>

      {/* Filters */}
      <div className="card mb-8" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }} />
          <input
            className="input"
            placeholder="Search templates..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <Filter size={18} color="#6b7280" />
          {['all', 'P0', 'P1', 'P2', 'P3'].map(tier => (
            <button
              key={tier}
              className={`btn ${tierFilter === tier ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setTierFilter(tier)}
              style={{ padding: '0.5rem 1rem' }}
            >
              {tier === 'all' ? 'All' : tier}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      {loading ? (
        <div className="text-center py-16 text-muted">Loading templates...</div>
      ) : (
        <div className="grid grid-3">
          {filtered.map(template => (
            <TemplateCard key={template.id} template={template} />
          ))}
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted">
          No templates found. Try a different search.
        </div>
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: any }) {
  return (
    <Link href={`/templates/${template.id}`} className="card" style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
      <div className="flex-between mb-2">
        <div style={{ fontSize: '2.5rem' }}>{template.icon}</div>
        <span className={`badge ${template.tier === 'P0' ? 'badge-accent' : ''}`}>{template.tier}</span>
      </div>
      <h3 className="text-xl font-semibold mb-2">{template.name}</h3>
      <p className="text-sm text-muted mb-4">{template.description}</p>

      <div className="flex" style={{ gap: '0.75rem', fontSize: '0.875rem', color: '#6b7280' }}>
        <span>👥 {template.workerCount} workers</span>
        <span>📦 {template.moduleCount} modules</span>
        <span>💰 ₹{template.estimatedCost}/mo</span>
      </div>

      <div className="mt-4 flex" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="text-sm font-semibold" style={{ color: '#6366f1' }}>View Details →</span>
      </div>
    </Link>
  );
}