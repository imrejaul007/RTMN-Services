'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Book,
  FileText,
  Eye,
  ThumbsUp,
  Clock,
  ChevronRight,
  Tag,
  Filter,
} from 'lucide-react';
import { api } from '@/lib/api';
import clsx from 'clsx';

const categories = [
  'All',
  'Operations',
  'Customer Service',
  'Workflow',
  'Products',
  'Technical',
  'Billing',
];

export default function KnowledgePage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const { data: articles, isLoading } = useQuery({
    queryKey: ['knowledge', search],
    queryFn: () => api.searchKnowledge(search),
    enabled: search.length >= 2,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  // Demo articles
  const demoArticles = [
    {
      id: 'KB-001',
      title: 'How to Process Refunds',
      summary: 'Step-by-step guide for processing customer refunds in the system.',
      category: 'Operations',
      tags: ['refund', 'payments', 'processing'],
      views: 1523,
      helpful: 342,
      updatedAt: '2024-03-10',
    },
    {
      id: 'KB-002',
      title: 'Handling Shipping Delays',
      summary: 'Best practices for managing customer expectations during shipping delays.',
      category: 'Customer Service',
      tags: ['shipping', 'delay', 'communication'],
      views: 892,
      helpful: 234,
      updatedAt: '2024-03-08',
    },
    {
      id: 'KB-003',
      title: 'Escalation Procedures',
      summary: 'When and how to escalate tickets to supervisors or specialized teams.',
      category: 'Workflow',
      tags: ['escalation', 'procedure', 'workflow'],
      views: 567,
      helpful: 189,
      updatedAt: '2024-03-05',
    },
    {
      id: 'KB-004',
      title: 'Product Return Policy',
      summary: 'Complete guide to our return policy including timeframes and conditions.',
      category: 'Operations',
      tags: ['returns', 'policy', 'guidelines'],
      views: 2103,
      helpful: 456,
      updatedAt: '2024-03-01',
    },
    {
      id: 'KB-005',
      title: 'Managing Customer Expectations',
      summary: 'Techniques for setting realistic expectations and preventing escalations.',
      category: 'Customer Service',
      tags: ['communication', 'expectations', 'tips'],
      views: 1245,
      helpful: 312,
      updatedAt: '2024-02-28',
    },
    {
      id: 'KB-006',
      title: 'API Integration Guide',
      summary: 'Technical documentation for third-party API integrations.',
      category: 'Technical',
      tags: ['api', 'integration', 'developer'],
      views: 432,
      helpful: 98,
      updatedAt: '2024-02-25',
    },
  ];

  const filteredArticles = articles?.length
    ? articles.filter((a) =>
        selectedCategory === 'All' || a.category === selectedCategory
      )
    : demoArticles.filter((a) =>
        selectedCategory === 'All' || a.category === selectedCategory
      );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Book className="w-8 h-8 text-primary-600" />
          <h1 className="text-2xl font-bold text-slate-900">Knowledge Base</h1>
        </div>
        <p className="text-slate-500">Find answers and share knowledge with your team</p>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search articles by title, content, or tags..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </form>

      {/* Categories */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        {categories.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
              selectedCategory === category
                ? 'bg-primary-600 text-white'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            )}
          >
            {category}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">156</p>
            <p className="text-xs text-slate-500">Total Articles</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <Eye className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">12.5K</p>
            <p className="text-xs text-slate-500">Views This Month</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
            <ThumbsUp className="w-5 h-5 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">89%</p>
            <p className="text-xs text-slate-500">Helpfulness Rate</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <Clock className="w-5 h-5 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-900">3.2</p>
            <p className="text-xs text-slate-500">Avg Read Time (min)</p>
          </div>
        </div>
      </div>

      {/* Articles */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-6 animate-pulse">
              <div className="h-6 bg-slate-200 rounded w-1/3 mb-3" />
              <div className="h-4 bg-slate-200 rounded w-full mb-2" />
              <div className="h-4 bg-slate-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredArticles.map((article) => (
            <div
              key={article.id}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:border-primary-200 hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-medium">
                      {article.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{article.title}</h3>
                  <p className="text-slate-600 mb-4">{article.summary}</p>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Eye className="w-4 h-4" />
                      {article.views.toLocaleString()} views
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <ThumbsUp className="w-4 h-4" />
                      {article.helpful} found helpful
                    </div>
                    <div className="flex items-center gap-1 text-sm text-slate-500">
                      <Clock className="w-4 h-4" />
                      Updated {article.updatedAt}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    {article.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-0.5 bg-primary-50 text-primary-600 rounded text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Popular Tags */}
      <div className="mt-8 bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <Tag className="w-5 h-5 text-slate-500" />
          <h3 className="font-semibold text-slate-900">Popular Tags</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {['refund', 'shipping', 'returns', 'account', 'password', 'payment', 'delay', 'cancel', 'tracking', 'upgrade', 'pricing', 'discount'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSearchInput(tag)}
              className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-sm hover:bg-primary-50 hover:text-primary-700 transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
