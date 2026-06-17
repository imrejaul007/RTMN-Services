'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  ChevronRight,
  DollarSign,
  Calendar,
  Users,
  ArrowUpRight,
} from 'lucide-react'
import Pipeline from '@/components/Pipeline'

const deals = [
  {
    id: '1',
    title: 'Enterprise License - Acme Corp',
    value: 85000,
    contact: 'Sarah Johnson',
    company: 'TechStart Inc',
    stage: 'proposal',
    probability: 60,
    expectedClose: '2026-06-30',
    daysInStage: 5,
  },
  {
    id: '2',
    title: 'Annual Subscription - Global Retail',
    value: 120000,
    contact: 'Emily Davis',
    company: 'Global Retail Corp',
    stage: 'negotiation',
    probability: 80,
    expectedClose: '2026-06-25',
    daysInStage: 8,
  },
  {
    id: '3',
    title: 'Starter Package - StartupXYZ',
    value: 15000,
    contact: 'James Wilson',
    company: 'StartupXYZ',
    stage: 'qualification',
    probability: 30,
    expectedClose: '2026-07-15',
    daysInStage: 3,
  },
  {
    id: '4',
    title: 'Pro Plan - TechInnovate',
    value: 45000,
    contact: 'David Kim',
    company: 'TechInnovate',
    stage: 'discovery',
    probability: 20,
    expectedClose: '2026-08-01',
    daysInStage: 12,
  },
  {
    id: '5',
    title: 'Enterprise Suite - Enterprise Solutions',
    value: 200000,
    contact: 'Michael Chen',
    company: 'Enterprise Solutions',
    stage: 'closed_won',
    probability: 100,
    expectedClose: '2026-06-10',
    daysInStage: 0,
  },
]

const stageStats = {
  discovery: { count: 12, value: 890000 },
  qualification: { count: 8, value: 520000 },
  proposal: { count: 5, value: 680000 },
  negotiation: { count: 3, value: 420000 },
  closed_won: { count: 15, value: 1250000 },
  closed_lost: { count: 6, value: 380000 },
}

export default function DealsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'pipeline' | 'list'>('pipeline')

  const filteredDeals = deals.filter(
    (deal) =>
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.company.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPipelineValue = deals
    .filter((d) => d.stage !== 'closed_won' && d.stage !== 'closed_lost')
    .reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
          <p className="text-gray-500 mt-1">
            Manage your sales pipeline and track deal progress
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-green-50 rounded-lg">
            <p className="text-sm text-gray-500">Pipeline Value</p>
            <p className="text-lg font-bold text-green-600">
              ${totalPipelineValue.toLocaleString()}
            </p>
          </div>
          <button className="px-4 py-2 bg-crm-600 text-white rounded-lg text-sm font-medium hover:bg-crm-700 flex items-center gap-2">
            <Plus className="w-4 h-4" />
            New Deal
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-500 focus:border-transparent"
          />
        </div>
        <button className="px-3 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
          <Filter className="w-4 h-4" />
          Filters
        </button>
        <div className="flex border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('pipeline')}
            className={`px-3 py-2 text-sm ${
              viewMode === 'pipeline'
                ? 'bg-crm-50 text-crm-600'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            Pipeline
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-2 text-sm ${
              viewMode === 'list'
                ? 'bg-crm-50 text-crm-600'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* Stage Summary */}
      <div className="grid grid-cols-5 gap-4">
        {Object.entries(stageStats).map(([stage, stats]) => (
          <div
            key={stage}
            className="bg-white rounded-lg p-4 shadow-sm border border-gray-100"
          >
            <p className="text-xs text-gray-500 uppercase tracking-wider capitalize">
              {stage.replace('_', ' ')}
            </p>
            <p className="text-xl font-bold text-gray-900 mt-1">{stats.count}</p>
            <p className="text-sm text-gray-500 mt-0.5">
              ${(stats.value / 1000).toFixed(0)}K
            </p>
          </div>
        ))}
      </div>

      {/* Pipeline View */}
      {viewMode === 'pipeline' && (
        <Pipeline />
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deal
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expected Close
                </th>
                <th className="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredDeals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{deal.title}</p>
                    <p className="text-sm text-gray-500">{deal.company}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">
                      ${deal.value.toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm text-gray-700 capitalize">
                        {deal.stage.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">{deal.contact}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{deal.expectedClose}</td>
                  <td className="px-6 py-4">
                    <Link
                      href={`/deals/${deal.id}`}
                      className="text-crm-600 hover:text-crm-700"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
