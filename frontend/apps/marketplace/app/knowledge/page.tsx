'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, Grid3X3, List, BookOpen } from 'lucide-react';
import { getKnowledgePacks, getKnowledgeCategories, getIndustries } from '@/lib/api';
import type { KnowledgePack, Category } from '@/lib/types';
import KnowledgeCard from '@/components/KnowledgeCard';
import { IndustryFilter, SortFilter } from '@/components/CategoryFilter';

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  all: BookOpen,
  guides: BookOpen,
  templates: BookOpen,
  policies: BookOpen,
  training: BookOpen,
  compliance: BookOpen,
  'best-practices': BookOpen,
  'case-studies': BookOpen,
  regulations: BookOpen,
};

export default function KnowledgePage() {
  const [knowledgePacks, setKnowledgePacks] = useState<KnowledgePack[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [industries, setIndustries] = useState<{ id: string; name: string; icon: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [sortBy, setSortBy] = useState('popular');
  const [priceFilter, setPriceFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    async function loadData() {
      try {
        const [kb, cat, ind] = await Promise.all([
          getKnowledgePacks({ category: selectedCategory as any, industry: selectedIndustry as any, search, sortBy: sortBy as any, priceFilter: priceFilter as any }),
          getKnowledgeCategories(),
          getIndustries(),
        ]);
        setKnowledgePacks(kb);
        setCategories(cat);
        setIndustries(ind);
      } catch (error) {
        console.error('Failed to load knowledge packs:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [selectedCategory, selectedIndustry, sortBy, priceFilter, search]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Knowledge Marketplace</h1>
          <p className="text-gray-600">Guides, templates, and best practices for your industry</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-64 flex-shrink-0">
            <div className="bg-white rounded-xl border p-6 sticky top-24">
              <h3 className="font-semibold mb-4">Categories</h3>
              <div className="space-y-1">
                {categories.map((category) => {
                  const Icon = categoryIcons[category.id] || BookOpen;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center gap-2 ${
                        selectedCategory === category.id
                          ? 'bg-secondary text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span className="flex-1">{category.name}</span>
                      <span className={`text-xs ${selectedCategory === category.id ? 'text-white/70' : 'text-gray-400'}`}>
                        {category.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Search and Filters */}
            <div className="bg-white rounded-xl border p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="search"
                    placeholder="Search knowledge packs..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
                  />
                </div>
                <div className="flex items-center gap-3">
                  <IndustryFilter
                    industries={industries}
                    selectedIndustry={selectedIndustry}
                    onIndustryChange={setSelectedIndustry}
                  />
                  <SortFilter
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    priceFilter={priceFilter}
                    onPriceFilterChange={setPriceFilter}
                  />
                  <div className="flex border rounded-lg overflow-hidden">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-2 ${viewMode === 'grid' ? 'bg-secondary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      <Grid3X3 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-2 ${viewMode === 'list' ? 'bg-secondary text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Results */}
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                {loading ? 'Loading...' : `${knowledgePacks.length} knowledge packs found`}
              </p>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="bg-gray-100 rounded-xl h-80 animate-pulse" />
                ))}
              </div>
            ) : knowledgePacks.length === 0 ? (
              <div className="bg-white rounded-xl border p-12 text-center">
                <Filter className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No knowledge packs found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className={viewMode === 'grid' ? 'grid md:grid-cols-2 lg:grid-cols-3 gap-6' : 'space-y-4'}>
                {knowledgePacks.map((knowledge) => (
                  <KnowledgeCard
                    key={knowledge.id}
                    knowledge={knowledge}
                    compact={viewMode === 'list'}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
