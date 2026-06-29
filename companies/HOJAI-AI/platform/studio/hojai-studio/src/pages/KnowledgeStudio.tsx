/**
 * HOJAI Knowledge Studio - Knowledge Base Management
 */

import React, { useState } from 'react';
import { Book, Plus, Search, Tag, Trash2, Edit, Upload, Download, Brain, Filter } from 'lucide-react';

const CATEGORIES = ['Product', 'Support', 'Sales', 'HR', 'Legal', 'Operations'];
const KNOWLEDGE_TYPES = ['Article', 'FAQ', 'Policy', 'Process', 'Guide'];

export function KnowledgeStudio() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [showUpload, setShowUpload] = useState(false);

  const articles = [
    { id: '1', title: 'How to reset password', category: 'Support', type: 'FAQ', updated: '2h ago', views: 234 },
    { id: '2', title: 'Pricing Policy 2026', category: 'Sales', type: 'Policy', updated: '1d ago', views: 89 },
    { id: '3', title: 'Onboarding Checklist', category: 'HR', type: 'Process', updated: '3d ago', views: 156 },
    { id: '4', title: 'Product Features Overview', category: 'Product', type: 'Article', updated: '1w ago', views: 567 },
  ];

  const filtered = articles.filter(a =>
    (category === 'All' || a.category === category) &&
    a.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
          <p className="text-gray-500 mt-1">Manage articles, FAQs, and policies</p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
            <Download className="w-4 h-4" />
            Import
          </button>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Plus className="w-4 h-4" />
            New Article
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Articles', value: '234', icon: Book },
          { label: 'FAQs', value: '89', icon: Brain },
          { label: 'Policies', value: '45', icon: Tag },
          { label: 'Processes', value: '67', icon: Filter },
        ].map(stat => (
          <div key={stat.label} className="bg-white p-4 rounded-xl border">
            <div className="flex items-center gap-3 mb-2">
              <stat.icon className="w-5 h-5 text-purple-600" />
              <span className="text-sm text-gray-500">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search knowledge base..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option>All</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Articles List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Title</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Category</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Type</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Updated</th>
              <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Views</th>
              <th className="px-6 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filtered.map(article => (
              <tr key={article.id} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <Brain className="w-5 h-5 text-purple-500" />
                    <span className="font-medium text-gray-900">{article.title}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-600">{article.category}</td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">{article.type}</span>
                </td>
                <td className="px-6 py-4 text-gray-500 text-sm">{article.updated}</td>
                <td className="px-6 py-4 text-gray-500">{article.views}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button className="p-1 hover:bg-gray-100 rounded">
                      <Edit className="w-4 h-4 text-gray-400" />
                    </button>
                    <button className="p-1 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg">
            <h2 className="text-lg font-bold mb-4">New Article</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    {CATEGORIES.map(c => <option key={c}>{c}</option>}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select className="w-full px-3 py-2 border rounded-lg">
                    {KNOWLEDGE_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea rows={10} className="w-full px-3 py-2 border rounded-lg font-mono text-sm" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowUpload(false)} className="flex-1 py-2 border rounded-lg">Cancel</button>
              <button className="flex-1 py-2 bg-purple-600 text-white rounded-lg">Create Article</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
