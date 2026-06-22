import Head from 'next/head';
import { useState, useEffect } from 'react';

interface Agent {
  id: string;
  name: string;
  description: string;
  category: string;
  pricing: { model: string; price: number; currency: string };
  metrics: { installations: number; rating: number; reviews: number };
  provider: { name: string; verified: boolean };
  certification?: { level: string };
}

const CATEGORIES = [
  { id: 'all', name: 'All Agents', icon: '🤖' },
  { id: 'support', name: 'Customer Support', icon: '🎧' },
  { id: 'sales', name: 'Sales & CRM', icon: '💰' },
  { id: 'hr', name: 'Human Resources', icon: '👔' },
  { id: 'finance', name: 'Finance', icon: '📊' },
  { id: 'healthcare', name: 'Healthcare', icon: '🏥' },
  { id: 'legal', name: 'Legal', icon: '⚖️' },
  { id: 'marketing', name: 'Marketing', icon: '📢' },
  { id: 'operations', name: 'Operations', icon: '⚙️' },
];

export default function MarketplaceHome() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAgents();
  }, []);

  useEffect(() => {
    let filtered = agents;

    if (selectedCategory !== 'all') {
      filtered = filtered.filter(a => a.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        a =>
          a.name.toLowerCase().includes(query) ||
          a.description.toLowerCase().includes(query)
      );
    }

    setFilteredAgents(filtered);
  }, [agents, selectedCategory, searchQuery]);

  const fetchAgents = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:4550/api/agents');
      const data = await res.json();
      setAgents(data.data || []);
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      // Mock data for demo
      setAgents([
        {
          id: '1',
          name: 'Legal Document Analyzer',
          description: 'AI agent that reviews, analyzes, and summarizes legal documents.',
          category: 'legal',
          pricing: { model: 'monthly', price: 29999, currency: 'INR' },
          metrics: { installations: 234, rating: 4.7, reviews: 48 },
          provider: { name: 'LegalTech AI', verified: true },
          certification: { level: 'platinum' },
        },
        {
          id: '2',
          name: 'HR Resume Screener',
          description: 'Intelligent resume screening agent that ranks candidates.',
          category: 'hr',
          pricing: { model: 'per_task', price: 50, currency: 'INR' },
          metrics: { installations: 567, rating: 4.5, reviews: 123 },
          provider: { name: 'TalentAI Labs', verified: true },
          certification: { level: 'gold' },
        },
        {
          id: '3',
          name: 'Healthcare Appointment Bot',
          description: 'Manages patient appointments, sends reminders.',
          category: 'healthcare',
          pricing: { model: 'per_conversation', price: 5, currency: 'INR' },
          metrics: { installations: 892, rating: 4.6, reviews: 256 },
          provider: { name: 'MediBot Inc', verified: true },
        },
        {
          id: '4',
          name: 'Sales Intelligence Agent',
          description: 'AI agent that qualifies leads and schedules meetings.',
          category: 'sales',
          pricing: { model: 'monthly', price: 19999, currency: 'INR' },
          metrics: { installations: 456, rating: 4.6, reviews: 89 },
          provider: { name: 'SalesAI Labs', verified: true },
          certification: { level: 'gold' },
        },
        {
          id: '5',
          name: 'Marketing Content Generator',
          description: 'Creates social media posts, email campaigns, and blog articles.',
          category: 'marketing',
          pricing: { model: 'freemium', price: 0, currency: 'INR' },
          metrics: { installations: 2341, rating: 4.2, reviews: 567 },
          provider: { name: 'ContentAI Studio', verified: false },
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getPricingDisplay = (agent: Agent) => {
    const { model, price } = agent.pricing;
    if (model === 'freemium') return 'Free';
    if (model === 'per_conversation') return `₹${price}/conv`;
    if (model === 'per_task') return `₹${price}/task`;
    if (model === 'per_minute') return `₹${price}/min`;
    if (model === 'monthly') return `₹${price.toLocaleString()}/mo`;
    return `₹${price}`;
  };

  const getCertificationBadge = (level?: string) => {
    if (!level) return null;
    const colors: Record<string, string> = {
      bronze: 'bg-amber-100 text-amber-800',
      silver: 'bg-gray-100 text-gray-600',
      gold: 'bg-yellow-100 text-yellow-700',
      platinum: 'bg-purple-100 text-purple-800',
    };
    return (
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[level] || ''}`}>
        {level.charAt(0).toUpperCase() + level.slice(1)}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Hojai Marketplace - AI Agent Store</title>
        <meta name="description" content="Discover and deploy AI agents for your business" />
      </Head>

      {/* Header */}
      <header className="bg-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Hojai Marketplace</h1>
              <p className="text-indigo-200 mt-1">AI Agent Store - Deploy intelligent agents for your business</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 bg-indigo-700 rounded-lg font-medium hover:bg-indigo-800 transition">
                Submit Agent
              </button>
              <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium hover:bg-indigo-50 transition">
                Sign In
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Search */}
        <div className="mb-8">
          <div className="relative">
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full px-4 py-3 pl-12 text-lg bg-white rounded-xl border border-gray-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition"
            />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-xl">🔍</span>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition ${
                selectedCategory === cat.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span>{cat.icon}</span>
              <span className="font-medium">{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Featured */}
        {selectedCategory === 'all' && !searchQuery && (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Featured Agents ⭐</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredAgents.filter(a => a.certification?.level === 'platinum').slice(0, 2).map(agent => (
                <div key={agent.id} className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">🏆</span>
                      <div>
                        <h3 className="text-xl font-bold">{agent.name}</h3>
                        <p className="text-indigo-200 text-sm">{agent.provider.name}</p>
                      </div>
                    </div>
                    {getCertificationBadge(agent.certification?.level)}
                  </div>
                  <p className="text-indigo-100 mb-4">{agent.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm">
                      <span>⭐ {agent.metrics.rating}</span>
                      <span>📦 {agent.metrics.installations}</span>
                      <span>💬 {agent.metrics.reviews}</span>
                    </div>
                    <button className="px-4 py-2 bg-white text-indigo-600 rounded-lg font-medium">
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Agent Grid */}
        <section>
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            {CATEGORIES.find(c => c.id === selectedCategory)?.name || 'All Agents'}
            <span className="text-gray-400 font-normal text-base ml-2">
              ({filteredAgents.length})
            </span>
          </h2>

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <p className="mt-4 text-gray-500">Loading agents...</p>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl">
              <span className="text-6xl">🤖</span>
              <h3 className="text-lg font-medium text-gray-900 mt-4">No agents found</h3>
              <p className="text-gray-500 mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAgents.map(agent => (
                <div key={agent.id} className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center text-2xl">
                        {CATEGORIES.find(c => c.id === agent.category)?.icon || '🤖'}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{agent.name}</h3>
                        <p className="text-sm text-gray-500">{agent.provider.name}</p>
                      </div>
                    </div>
                    {agent.provider.verified && (
                      <span className="text-green-500">✓</span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">{agent.description}</p>

                  <div className="flex items-center gap-3 text-sm text-gray-500 mb-4">
                    <span>⭐ {agent.metrics.rating}</span>
                    <span>📦 {agent.metrics.installations}</span>
                    <span>💬 {agent.metrics.reviews}</span>
                    {agent.certification && getCertificationBadge(agent.certification.level)}
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <span className="text-lg font-bold text-indigo-600">
                      {getPricingDisplay(agent)}
                    </span>
                    <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition">
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8 mt-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p>© 2026 Hojai Marketplace. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
