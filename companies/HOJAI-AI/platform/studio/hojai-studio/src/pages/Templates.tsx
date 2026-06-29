/**
 * HOJAI Studio - Templates Page
 */

import React, { useState } from 'react';
import { Search, Download, Star, Clock, Zap } from 'lucide-react';

const templates = [
  { id: '1', name: 'Lead Qualification Pipeline', category: 'Sales', price: 999, rating: 4.8, installs: 234, description: 'Auto-qualify leads with AI scoring' },
  { id: '2', name: 'AI First Response', category: 'Support', price: 1499, rating: 4.9, installs: 567, description: 'Instant AI-powered ticket responses' },
  { id: '3', name: 'Invoice Processing', category: 'Finance', price: 1999, rating: 4.7, installs: 123, description: 'Automated invoice validation and approval' },
  { id: '4', name: 'Content Calendar', category: 'Marketing', price: 999, rating: 4.6, installs: 456, description: 'AI-powered content scheduling' },
  { id: '5', name: 'Employee Onboarding', category: 'HR', price: 799, rating: 4.8, installs: 89, description: 'Automated new hire onboarding' },
  { id: '6', name: 'Daily Briefing', category: 'Founder', price: 1499, rating: 4.9, installs: 67, description: 'AI executive daily summary' },
  { id: '7', name: 'LinkedIn Outreach', category: 'Sales', price: 1299, rating: 4.5, installs: 345, description: 'Automated LinkedIn engagement' },
  { id: '8', name: 'Sentiment Triage', category: 'Support', price: 799, rating: 4.7, installs: 234, description: 'Priority routing by sentiment' },
];

const categories = ['All', 'Sales', 'Marketing', 'Support', 'Finance', 'HR', 'Founder'];

export function Templates() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = templates.filter(
    (t) =>
      (category === 'All' || t.category === category) &&
      t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Templates</h1>
        <p className="text-gray-500 mt-1">
          Pre-built workflows to automate your business
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex items-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                category === cat
                  ? 'bg-purple-100 text-purple-700'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((template) => (
          <div
            key={template.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {template.category}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{template.description}</p>
              <div className="flex items-center gap-4 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500" />
                  {template.rating}
                </span>
                <span className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  {template.installs}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-gray-900">
                  ₹{template.price}
                  <span className="text-sm font-normal text-gray-400">/mo</span>
                </span>
                <button className="px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
                  Install
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
