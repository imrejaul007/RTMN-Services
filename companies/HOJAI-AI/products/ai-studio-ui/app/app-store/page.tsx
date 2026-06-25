'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, Grid, List, Filter, Star, Download, Sparkles, Bot, Workflow, Package, Building2 } from 'lucide-react';

const APP_ICONS = {
  skill: Sparkles,
  agent: Bot,
  workflow: Workflow,
  template: Package,
  'industry-os': Building2,
};

const APP_TYPE_LABELS = {
  skill: 'Skill',
  agent: 'Agent',
  workflow: 'Workflow',
  template: 'Template',
  'industry-os': 'Industry OS',
};

export default function AppStorePage() {
  const [apps, setApps] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [featured, setFeatured] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApps();
  }, [search, selectedCategory, selectedType]);

  const fetchApps = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedType) params.append('type', selectedType);

      const res = await fetch(`http://localhost:4400/api/v1/apps?${params}`);
      const data = await res.json();
      setApps(data.apps || []);

      // Fetch categories if not loaded
      if (categories.length === 0) {
        const catRes = await fetch('http://localhost:4400/api/v1/categories');
        const catData = await catRes.json();
        setCategories(catData.categories || []);
      }

      // Fetch featured
      if (featured.length === 0) {
        const featRes = await fetch('http://localhost:4400/api/v1/apps/featured');
        const featData = await featRes.json();
        setFeatured(featData.apps || []);
      }
    } catch (error) {
      console.error('Failed to fetch apps:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 to-slate-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-slate-950/80 backdrop-blur-sm border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">H</span>
              </div>
              <span className="text-white font-bold">HOJAI Studio</span>
            </Link>
            <span className="text-slate-500">/</span>
            <span className="text-white font-medium">App Store</span>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
            <Link href="/app-store" className="text-white font-medium">App Store</Link>
            <Link href="/app-store/installed" className="text-slate-300 hover:text-white transition-colors">My Installs</Link>
            <Link href="/app-store/publish" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors">
              Publish
            </Link>
          </nav>
        </div>
      </header>

      <main className="pt-24 pb-20 px-4">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-white mb-4">
              HOJAI App Store
            </h1>
            <p className="text-xl text-slate-400 mb-8">
              Discover and install AI skills, agents, workflows, and templates
            </p>

            {/* Search */}
            <div className="max-w-2xl mx-auto relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search apps, skills, agents..."
                className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-8">
            <select
              value={selectedCategory || ''}
              onChange={(e) => setSelectedCategory(e.target.value || null)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.icon} {cat.name}
                </option>
              ))}
            </select>

            <select
              value={selectedType || ''}
              onChange={(e) => setSelectedType(e.target.value || null)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="skill">Skills</option>
              <option value="agent">Agents</option>
              <option value="workflow">Workflows</option>
              <option value="template">Templates</option>
              <option value="industry-os">Industry OS</option>
            </select>
          </div>

          {/* Featured */}
          {!search && !selectedCategory && !selectedType && featured.length > 0 && (
            <div className="mb-12">
              <h2 className="text-2xl font-bold text-white mb-6">Featured</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {featured.slice(0, 3).map((app) => {
                  const Icon = APP_ICONS[app.type] || Package;
                  return (
                    <Link
                      key={app.id}
                      href={`/app-store/${app.id}`}
                      className="bg-gradient-to-br from-slate-900 to-slate-800 border border-blue-500/30 rounded-xl p-6 hover:border-blue-500/50 transition-all group"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                          {app.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-lg font-semibold text-white">{app.name}</h3>
                            {app.verified && (
                              <span className="text-blue-400 text-sm">✓</span>
                            )}
                          </div>
                          <p className="text-slate-400 text-sm mb-3 line-clamp-2">{app.shortDescription}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="flex items-center gap-1 text-yellow-400">
                              <Star className="w-4 h-4 fill-current" />
                              {app.rating}
                            </span>
                            <span className="text-slate-500">{app.installCount.toLocaleString()} installs</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              app.price === 0 ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {app.price === 0 ? 'Free' : `$${app.price}`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          {/* All Apps */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">
              {selectedType || selectedCategory ? 'Results' : 'All Apps'}
              <span className="text-slate-400 text-lg ml-2">({apps.length})</span>
            </h2>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : apps.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No apps found</h3>
                <p className="text-slate-400">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {apps.map((app) => {
                  const Icon = APP_ICONS[app.type] || Package;
                  return (
                    <Link
                      key={app.id}
                      href={`/app-store/${app.id}`}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center text-xl group-hover:bg-slate-700 transition-colors">
                          {app.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-medium truncate group-hover:text-blue-400 transition-colors">{app.name}</h3>
                          <p className="text-xs text-slate-500">{APP_TYPE_LABELS[app.type] || app.type}</p>
                        </div>
                      </div>
                      <p className="text-slate-400 text-sm line-clamp-2 mb-4">{app.shortDescription}</p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-yellow-400">
                          <Star className="w-4 h-4 fill-current" />
                          {app.rating}
                        </span>
                        <span className="text-slate-500">{app.installCount.toLocaleString()}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          app.price === 0 ? 'bg-green-500/10 text-green-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {app.price === 0 ? 'Free' : `$${app.price}`}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
