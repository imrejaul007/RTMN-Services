'use client';

import { useState } from 'react';
import Link from 'next/link';

const INDUSTRIES = [
  { id: 'restaurant', name: 'Restaurant', icon: '🍽️' },
  { id: 'hotel', name: 'Hotel', icon: '🏨' },
  { id: 'retail', name: 'Retail', icon: '🛒' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
  { id: 'ecommerce', name: 'E-commerce', icon: '🌐' },
  { id: 'education', name: 'Education', icon: '🎓' },
];

const CAPABILITIES = [
  { id: 'cap_001', name: 'Order Management', industry: 'restaurant', agents: 3, rating: 4.8, installs: 234, price: 49900, provider: 'Nexha Restaurant OS' },
  { id: 'cap_002', name: 'Inventory Tracking', industry: 'retail', agents: 2, rating: 4.6, installs: 189, price: 29900, provider: 'Nexha Retail OS' },
  { id: 'cap_003', name: 'AI Customer Support', industry: 'ecommerce', agents: 5, rating: 4.9, installs: 456, price: 79900, provider: 'Nexha Commerce OS' },
  { id: 'cap_004', name: 'Front Desk AI', industry: 'hotel', agents: 4, rating: 4.7, installs: 312, price: 59900, provider: 'Nexha Hotel OS' },
  { id: 'cap_005', name: 'Patient Scheduling', industry: 'healthcare', agents: 3, rating: 4.5, installs: 156, price: 69900, provider: 'Nexha Healthcare OS' },
  { id: 'cap_006', name: 'Student Analytics', industry: 'education', agents: 2, rating: 4.4, installs: 98, price: 39900, provider: 'Nexha Education OS' },
];

export default function ExplorePage() {
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCapabilities = CAPABILITIES.filter(cap => {
    const matchesIndustry = !selectedIndustry || cap.industry === selectedIndustry;
    const matchesSearch = !searchQuery || cap.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesIndustry && matchesSearch;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Explore Nexha Capabilities</h1>
      <p className="text-slate-600 mb-8">Discover AI capabilities from the Global Nexha network</p>

      {/* Global Nexha Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">Global Nexha Federation</h2>
            <p className="opacity-90">Connect to 1,000+ Nexhas across 50+ industries</p>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold">1,247</div>
              <div className="text-sm opacity-80">Nexhas</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">50+</div>
              <div className="text-sm opacity-80">Industries</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold">10K+</div>
              <div className="text-sm opacity-80">Capabilities</div>
            </div>
          </div>
        </div>
      </div>

      {/* Industry Filter */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Filter by Industry</h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setSelectedIndustry(null)}
            className={`px-4 py-2 rounded-full font-medium transition-all ${!selectedIndustry ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
          >
            All Industries
          </button>
          {INDUSTRIES.map(ind => (
            <button
              key={ind.id}
              onClick={() => setSelectedIndustry(ind.id)}
              className={`px-4 py-2 rounded-full font-medium transition-all flex items-center gap-2 ${selectedIndustry === ind.id ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              <span>{ind.icon}</span>
              <span>{ind.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="mb-8">
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="Search capabilities..."
          className="w-full px-6 py-4 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Capabilities Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {filteredCapabilities.map(cap => (
          <div key={cap.id} className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg transition-all">
            <div className="flex items-start justify-between mb-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center text-2xl">🤖</div>
              <div className="flex items-center gap-1 text-amber-500">
                <span>★</span>
                <span className="font-semibold text-slate-900">{cap.rating}</span>
              </div>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">{cap.name}</h3>
            <p className="text-sm text-slate-500 mb-4">by {cap.provider}</p>
            <div className="flex items-center gap-4 text-sm text-slate-500 mb-4">
              <span>🤖 {cap.agents} agents</span>
              <span>📥 {cap.installs}</span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-slate-100">
              <span className="text-xl font-bold text-slate-900">₹{(cap.price / 100).toLocaleString('en-IN')}</span>
              <Link href={`/listings/${cap.id}`} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium">
                View
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredCapabilities.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="text-4xl mb-4">🔍</div>
          <p className="text-slate-600">No capabilities found</p>
        </div>
      )}

      {/* Deploy CTA */}
      <div className="bg-slate-900 text-white rounded-2xl p-8 text-center">
        <h2 className="text-2xl font-bold mb-4">Deploy Anywhere in the Nexha Network</h2>
        <p className="opacity-80 mb-6">Purchase any capability and deploy it to your Nexha with one click</p>
        <Link href="/listings" className="inline-block px-8 py-3 bg-white text-slate-900 rounded-lg hover:bg-slate-100 font-medium">
          Browse All Capabilities
        </Link>
      </div>
    </div>
  );
}
