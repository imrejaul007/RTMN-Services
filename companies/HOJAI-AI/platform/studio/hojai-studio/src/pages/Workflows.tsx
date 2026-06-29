/**
 * HOJAI Studio - Workflows Page
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Play, Pause, MoreVertical, Clock, Zap } from 'lucide-react';

const workflows = [
  { id: '1', name: 'Lead Qualification Pipeline', category: 'sales', status: 'active', runs: 234, success: 98 },
  { id: '2', name: 'AI First Response', category: 'support', status: 'active', runs: 567, success: 95 },
  { id: '3', name: 'Invoice Processing', category: 'finance', status: 'active', runs: 89, success: 99 },
  { id: '4', name: 'Content Calendar', category: 'marketing', status: 'paused', runs: 45, success: 100 },
  { id: '5', name: 'Employee Onboarding', category: 'hr', status: 'active', runs: 12, success: 100 },
  { id: '6', name: 'Daily Briefing', category: 'founder', status: 'active', runs: 30, success: 100 },
];

const categories = ['All', 'sales', 'marketing', 'support', 'finance', 'hr', 'founder'];

export function Workflows() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const filtered = workflows.filter(w =>
    (category === 'All' || w.category === category) &&
    w.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Workflows</h1>
          <p className="text-gray-500 mt-1">Automate your business with AI-powered workflows</p>
        </div>
        <Link
          to="/workflows/new"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Workflow
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
              {cat === 'All' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Workflow Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((workflow) => (
          <div
            key={workflow.id}
            className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-purple-200 transition-all"
          >
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${workflow.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <button className="p-1 hover:bg-gray-100 rounded">
                    <MoreVertical className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">{workflow.name}</h3>
              <p className="text-sm text-gray-500 mb-4 capitalize">{workflow.category}</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4 text-gray-500">
                  <span className="flex items-center gap-1">
                    <Play className="w-4 h-4" />
                    {workflow.runs} runs
                  </span>
                  <span>{workflow.success}% success</span>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-2">
              <Link
                to={`/workflows/${workflow.id}`}
                className="flex-1 py-2 text-center text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              >
                Edit
              </Link>
              <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                {workflow.status === 'active' ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
