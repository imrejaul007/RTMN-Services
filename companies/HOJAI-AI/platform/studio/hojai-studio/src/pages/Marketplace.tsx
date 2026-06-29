/**
 * HOJAI Studio - BLR AI Marketplace
 */

import React, { useState } from 'react';
import { Search, ShoppingBag, Star, Download, Filter } from 'lucide-react';

interface MarketplaceItem {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  price: number;
  rating: number;
  reviews: number;
  installs: number;
  author: string;
  featured?: boolean;
}

const items: MarketplaceItem[] = [
  { id: '1', name: 'Sales Department Pack', category: 'Departments', subcategory: 'Sales', description: 'Complete AI sales team with 5 agents', price: 45000, rating: 4.9, reviews: 234, installs: 567, author: 'HOJAI' },
  { id: '2', name: 'Marketing Department Pack', category: 'Departments', subcategory: 'Marketing', description: 'Full marketing AI team with content, ads, analytics', price: 50000, rating: 4.8, reviews: 189, installs: 456, author: 'HOJAI' },
  { id: '3', name: 'Support Department Pack', category: 'Departments', subcategory: 'Support', description: 'Customer support AI team with tickets & chat', price: 35000, rating: 4.9, reviews: 312, installs: 678, author: 'HOJAI' },
  { id: '4', name: 'Zomato Restaurant Agent', category: 'Agents', subcategory: 'Restaurant', description: 'Scrape Zomato for restaurant data', price: 9999, rating: 4.7, reviews: 89, installs: 234, author: 'HOJAI' },
  { id: '5', name: 'LinkedIn Outreach Agent', category: 'Agents', subcategory: 'Sales', description: 'Automate LinkedIn prospecting', price: 4999, rating: 4.6, reviews: 156, installs: 567, author: 'Partner' },
  { id: '6', name: 'Hotel Booking Flow', category: 'Flows', subcategory: 'Hospitality', description: 'Complete hotel booking automation', price: 9999, rating: 4.8, reviews: 78, installs: 345, author: 'HOJAI' },
  { id: '7', name: 'Google Maps Scraper', category: 'Actors', subcategory: 'Data', description: 'Extract business data from Google Maps', price: 2999, rating: 4.5, reviews: 234, installs: 890, author: 'HOJAI' },
  { id: '8', name: 'Healthcare Appointment Flow', category: 'Flows', subcategory: 'Healthcare', description: 'Automate patient appointments', price: 4999, rating: 4.9, reviews: 45, installs: 123, author: 'HOJAI' },
];

const categories = ['All', 'Departments', 'Agents', 'Flows', 'Actors'];
const subcategories = ['All', 'Sales', 'Marketing', 'Support', 'Finance', 'HR', 'Restaurant', 'Hospitality', 'Healthcare', 'Data'];

export function Marketplace() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [subcategory, setSubcategory] = useState('All');

  const filtered = items.filter(item =>
    (category === 'All' || item.category === category) &&
    (subcategory === 'All' || item.subcategory === subcategory) &&
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
            <ShoppingBag className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">BLR AI Marketplace</h1>
            <p className="text-gray-500">AI agents, workflows, and department packs</p>
          </div>
        </div>
      </div>

      {/* Featured Banner */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-8 mb-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <span className="px-2 py-0.5 bg-white/20 rounded text-sm">Featured</span>
            <h2 className="text-2xl font-bold mt-2">Full Suite Bundle</h2>
            <p className="text-white/80 mt-1">All 5 department packs + 100 templates</p>
            <div className="flex items-center gap-4 mt-4">
              <span className="text-3xl font-bold">₹2,00,000</span>
              <span className="text-white/60 line-through">₹2,60,000</span>
              <span className="px-2 py-0.5 bg-green-500 rounded text-sm">23% OFF</span>
            </div>
          </div>
          <button className="px-6 py-3 bg-white text-purple-600 font-semibold rounded-xl hover:bg-gray-100 transition-colors">
            Get Bundle
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search marketplace..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <select
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            {subcategories.map((sub) => (
              <option key={sub} value={sub}>{sub}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Items Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-3">
                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                  {item.subcategory}
                </span>
                {item.featured && (
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                    Featured
                  </span>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
              <p className="text-sm text-gray-500 mb-4 line-clamp-2">{item.description}</p>
              <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {item.rating}
                </span>
                <span>({item.reviews})</span>
                <span>•</span>
                <span>{item.installs} installs</span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-gray-900">₹{item.price.toLocaleString()}</span>
                  {item.price >= 1000 && <span className="text-sm text-gray-400">/mo</span>}
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2">
              <button className="flex-1 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Install
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
