'use client';

import React from 'react';
import { useOpportunities } from '@/hooks/useDashboard';
import { Opportunities, OpportunityStats } from '@/components/Opportunities';
import { Target, TrendingUp, DollarSign, Clock, Filter, Download, Plus } from 'lucide-react';
import { clsx } from 'clsx';

const categories = [
  { id: 'all', label: 'All Categories' },
  { id: 'expansion', label: 'Expansion' },
  { id: 'new_market', label: 'New Market' },
  { id: 'efficiency', label: 'Efficiency' },
  { id: 'partnership', label: 'Partnership' },
  { id: 'technology', label: 'Technology' }
];

const statuses = [
  { id: 'all', label: 'All Statuses' },
  { id: 'identified', label: 'Identified' },
  { id: 'qualified', label: 'Qualified' },
  { id: 'pursuing', label: 'Pursuing' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' }
];

export default function OpportunitiesPage() {
  const { opportunities, loading, error } = useOpportunities();
  const [selectedCategory, setSelectedCategory] = React.useState('all');
  const [selectedStatus, setSelectedStatus] = React.useState('all');

  const filteredOpps = opportunities.filter(opp => {
    if (selectedCategory !== 'all' && opp.category !== selectedCategory) return false;
    if (selectedStatus !== 'all' && opp.status !== selectedStatus) return false;
    return true;
  });

  const stats = {
    total: opportunities.length,
    active: opportunities.filter(o => o.status !== 'won' && o.status !== 'lost').length,
    pipeline: opportunities.filter(o => o.status !== 'lost').reduce((s, o) => s + o.value, 0),
    weighted: opportunities.filter(o => o.status !== 'lost').reduce((s, o) => s + o.value * o.probability / 100, 0),
    won: opportunities.filter(o => o.status === 'won').reduce((s, o) => s + o.value, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-danger-600 font-medium">Error loading opportunities</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Opportunities Pipeline</h1>
          <p className="text-gray-500 mt-1">Track and manage business opportunities</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
            <Plus className="w-4 h-4" />
            New Opportunity
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Opportunities</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-primary-50 rounded-xl border border-primary-200 p-4">
          <p className="text-xs text-primary-600 mb-1">Active Pipeline</p>
          <p className="text-2xl font-bold text-primary-700">{stats.active}</p>
        </div>
        <div className="bg-success-50 rounded-xl border border-success-200 p-4">
          <p className="text-xs text-success-600 mb-1">Total Pipeline Value</p>
          <p className="text-2xl font-bold text-success-700">
            ${(stats.pipeline / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="bg-warning-50 rounded-xl border border-warning-200 p-4">
          <p className="text-xs text-warning-600 mb-1">Weighted Value</p>
          <p className="text-2xl font-bold text-warning-700">
            ${(stats.weighted / 1000000).toFixed(1)}M
          </p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Won to Date</p>
          <p className="text-2xl font-bold text-gray-700">
            ${(stats.won / 1000).toFixed(0)}K
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          <div className="flex gap-2">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={clsx(
                  'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                  selectedCategory === cat.id
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          <div className="border-l border-gray-200 pl-4 flex gap-2">
            {statuses.map((status) => (
              <button
                key={status.id}
                onClick={() => setSelectedStatus(status.id)}
                className={clsx(
                  'px-3 py-1 text-xs font-medium rounded-full transition-colors',
                  selectedStatus === status.id
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                )}
              >
                {status.label}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-3 text-sm text-gray-500">
          Showing {filteredOpps.length} of {opportunities.length} opportunities
        </div>
      </div>

      {/* Opportunities List */}
      <Opportunities opportunities={filteredOpps} />

      {/* Pipeline Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Category</h3>
          <div className="space-y-3">
            {categories.filter(c => c.id !== 'all').map((cat) => {
              const catOpps = opportunities.filter(o => o.category === cat.id);
              const catValue = catOpps.reduce((s, o) => s + o.value, 0);
              const percentage = stats.pipeline > 0 ? (catValue / stats.pipeline) * 100 : 0;
              return (
                <div key={cat.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{cat.label}</span>
                    <span className="text-gray-500">${(catValue / 1000000).toFixed(1)}M ({catOpps.length})</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* By Status */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">By Status</h3>
          <div className="space-y-3">
            {statuses.filter(s => s.id !== 'all').map((status) => {
              const statusOpps = opportunities.filter(o => o.status === status.id);
              const statusValue = statusOpps.reduce((s, o) => s + o.value, 0);
              const percentage = stats.pipeline > 0 ? (statusValue / stats.pipeline) * 100 : 0;
              return (
                <div key={status.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-gray-700">{status.label}</span>
                    <span className="text-gray-500">${(statusValue / 1000000).toFixed(1)}M ({statusOpps.length})</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all',
                        status.id === 'won' ? 'bg-success-500' :
                        status.id === 'lost' ? 'bg-danger-500' :
                        status.id === 'pursuing' ? 'bg-warning-500' :
                        'bg-primary-500'
                      )}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
