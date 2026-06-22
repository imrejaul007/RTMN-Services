'use client';

import { useState } from 'react';
import ServiceCategoryCard, { ServiceCategory } from './components/ServiceCategoryCard';

// Service category data
const serviceCategories: ServiceCategory[] = [
  {
    id: 'cat-1',
    name: 'Technology & IT',
    slug: 'technology-it',
    description: 'Software development, web design, IT support, cloud services, and digital transformation solutions for your business.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    providerCount: 156,
    avgRating: 4.8,
    popularServices: ['Web Development', 'Mobile Apps', 'Cloud Setup', 'IT Support'],
    accentColor: '#8B5CF6',
  },
  {
    id: 'cat-2',
    name: 'Marketing & Advertising',
    slug: 'marketing-advertising',
    description: 'Digital marketing, social media management, SEO optimization, content creation, and brand strategy services.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    providerCount: 203,
    avgRating: 4.7,
    popularServices: ['SEO Services', 'Social Media', 'Content Writing', 'PPC Ads'],
    accentColor: '#EC4899',
  },
  {
    id: 'cat-3',
    name: 'Financial Services',
    slug: 'financial-services',
    description: 'Accounting, tax preparation, financial planning, payroll services, and business consulting.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    providerCount: 89,
    avgRating: 4.9,
    popularServices: ['Tax Filing', 'Accounting', 'Audit Services', 'Payroll'],
    accentColor: '#10B981',
  },
  {
    id: 'cat-4',
    name: 'Legal Services',
    slug: 'legal-services',
    description: 'Contract review, legal consultation, intellectual property, business registration, and compliance services.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
      </svg>
    ),
    providerCount: 67,
    avgRating: 4.6,
    popularServices: ['Contract Review', 'IP Registration', 'Business Law', 'Compliance'],
    accentColor: '#F59E0B',
  },
  {
    id: 'cat-5',
    name: 'Human Resources',
    slug: 'human-resources',
    description: 'Recruitment, staffing, employee training, HR consulting, payroll management, and benefits administration.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
    providerCount: 124,
    avgRating: 4.7,
    popularServices: ['Recruitment', 'Training', 'HR Consulting', 'Staffing'],
    accentColor: '#3B82F6',
  },
  {
    id: 'cat-6',
    name: 'Logistics & Supply Chain',
    slug: 'logistics-supply-chain',
    description: 'Warehouse management, freight forwarding, inventory management, and supply chain optimization services.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />
      </svg>
    ),
    providerCount: 98,
    avgRating: 4.5,
    popularServices: ['Warehousing', 'Freight', 'Inventory', 'Last Mile'],
    accentColor: '#EF4444',
  },
  {
    id: 'cat-7',
    name: 'Design & Creative',
    slug: 'design-creative',
    description: 'Graphic design, UI/UX design, video production, animation, branding, and creative content services.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
      </svg>
    ),
    providerCount: 178,
    avgRating: 4.8,
    popularServices: ['Graphic Design', 'UI/UX', 'Video Editing', 'Branding'],
    accentColor: '#8B5CF6',
  },
  {
    id: 'cat-8',
    name: 'Consulting & Strategy',
    slug: 'consulting-strategy',
    description: 'Business consulting, strategy planning, market research, process optimization, and growth advisory.',
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    providerCount: 112,
    avgRating: 4.7,
    popularServices: ['Business Strategy', 'Market Research', 'Process Consulting', 'Growth'],
    accentColor: '#06B6D4',
  },
];

// Featured services
const featuredServices = [
  {
    title: 'Same-Day IT Support',
    description: 'Get emergency IT support within hours',
    savings: '20% off first service',
  },
  {
    title: 'Startup Package',
    description: 'Complete business setup in 7 days',
    savings: 'Flat 15% discount',
  },
  {
    title: 'Monthly Retainers',
    description: 'Dedicated resources at fixed cost',
    savings: 'Up to 30% savings',
  },
];

type ViewMode = 'all' | 'popular' | 'featured';

export default function ServicesPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCategories = serviceCategories.filter(category => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.description.toLowerCase().includes(searchQuery.toLowerCase());

    if (viewMode === 'popular') {
      return matchesSearch && category.providerCount > 150;
    }
    if (viewMode === 'featured') {
      return matchesSearch && category.avgRating >= 4.8;
    }
    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      {/* Page Header */}
      <div className="border-b border-[#2d2d44] bg-[#13131f]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-white">Services Marketplace</h1>
              <p className="mt-2 text-gray-400">
                Find trusted service providers for your business needs
              </p>
            </div>

            {/* Search */}
            <div className="relative w-full lg:w-96">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search services..."
                className="w-full pl-12 pr-4 py-3 bg-[#1a1a2e] border border-[#2d2d44] rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* View Mode Tabs */}
          <div className="flex items-center gap-2 mt-6">
            {(['all', 'popular', 'featured'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`
                  px-4 py-2 rounded-lg text-sm font-medium transition-all capitalize
                  ${viewMode === mode
                    ? 'bg-violet-600 text-white'
                    : 'bg-[#1a1a2e] text-gray-400 hover:text-white hover:bg-[#2d2d44]'
                  }
                `}
              >
                {mode === 'all' ? 'All Services' : mode === 'popular' ? 'Most Popular' : 'Top Rated'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Grid */}
          <div className="lg:col-span-3">
            {/* Results Count */}
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-gray-400">
                Showing <span className="text-white font-medium">{filteredCategories.length}</span> categories
              </p>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-[#2d2d44] flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-white mb-2">No services found</h3>
                <p className="text-sm text-gray-400">
                  Try adjusting your search or filters to find what you are looking for.
                </p>
                <button
                  onClick={() => { setSearchQuery(''); setViewMode('all'); }}
                  className="mt-4 px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-lg hover:bg-violet-500 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredCategories.map(category => (
                  <ServiceCategoryCard key={category.id} category={category} />
                ))}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* How It Works */}
            <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
              <div className="space-y-4">
                {[
                  { step: 1, title: 'Browse Services', desc: 'Explore categories and find what you need' },
                  { step: 2, title: 'Submit Request', desc: 'Fill out a detailed RFQ form' },
                  { step: 3, title: 'Get Quotes', desc: 'Receive competitive quotes from providers' },
                  { step: 4, title: 'Choose & Connect', desc: 'Select the best fit and get started' },
                ].map(item => (
                  <div key={item.step} className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center">
                      <span className="text-sm font-bold text-violet-400">{item.step}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{item.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Offers */}
            <div className="bg-gradient-to-br from-violet-600/20 to-purple-600/20 border border-violet-500/30 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Featured Offers</h3>
              <div className="space-y-4">
                {featuredServices.map((service, index) => (
                  <div key={index} className="p-3 bg-[#1a1a2e]/50 rounded-xl border border-[#2d2d44]">
                    <p className="text-sm font-medium text-white">{service.title}</p>
                    <p className="text-xs text-gray-400 mt-1">{service.description}</p>
                    <p className="text-xs font-medium text-emerald-400 mt-2">{service.savings}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Platform Stats</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Service Providers</span>
                  <span className="text-lg font-bold text-white">1,200+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Categories</span>
                  <span className="text-lg font-bold text-white">50+</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Avg Response Time</span>
                  <span className="text-lg font-bold text-white">2 hrs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Customer Satisfaction</span>
                  <span className="text-lg font-bold text-emerald-400">98%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
