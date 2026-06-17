'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  ChevronRight,
  User,
  Building2,
  Mail,
  Phone,
  Calendar,
  TrendingUp,
  MoreHorizontal,
  Star,
} from 'lucide-react'
import LeadScore from '@/components/LeadScore'

const leads = [
  {
    id: '1',
    name: 'Robert Martinez',
    email: 'rmartinez@company.com',
    phone: '+1 (555) 111-2222',
    company: 'InnovateTech Solutions',
    role: 'Head of Sales',
    source: 'website',
    status: 'new',
    score: 85,
    scoreBreakdown: {
      engagement: 30,
      firmographics: 25,
      demographics: 20,
      intent: 10,
    },
    assignedTo: 'John Smith',
    createdAt: '2026-06-15',
    lastActivity: '2026-06-16',
    notes: 'Interested in enterprise plan. Requested demo.',
  },
  {
    id: '2',
    name: 'Lisa Thompson',
    email: 'lthompson@startup.io',
    phone: '+1 (555) 222-3333',
    company: 'StartupIO',
    role: 'Founder',
    source: 'linkedin',
    status: 'contacted',
    score: 72,
    scoreBreakdown: {
      engagement: 25,
      firmographics: 22,
      demographics: 15,
      intent: 10,
    },
    assignedTo: 'Sarah Lee',
    createdAt: '2026-06-10',
    lastActivity: '2026-06-14',
    notes: 'Early stage startup, budget constraints.',
  },
  {
    id: '3',
    name: 'Michael Brown',
    email: 'mbrown@enterprise.net',
    phone: '+1 (555) 333-4444',
    company: 'EnterpriseNet Global',
    role: 'CTO',
    source: 'referral',
    status: 'qualified',
    score: 94,
    scoreBreakdown: {
      engagement: 35,
      firmographics: 30,
      demographics: 19,
      intent: 10,
    },
    assignedTo: 'John Smith',
    createdAt: '2026-06-01',
    lastActivity: '2026-06-15',
    notes: 'High priority lead. Referred by Acme Corp.',
  },
  {
    id: '4',
    name: 'Jennifer Wilson',
    email: 'jwilson@media.com',
    phone: '+1 (555) 444-5555',
    company: 'MediaMax Inc',
    role: 'Marketing Director',
    source: 'webinar',
    status: 'new',
    score: 45,
    scoreBreakdown: {
      engagement: 15,
      firmographics: 15,
      demographics: 10,
      intent: 5,
    },
    assignedTo: 'Unassigned',
    createdAt: '2026-06-14',
    lastActivity: '2026-06-14',
    notes: 'Attended webinar on marketing automation.',
  },
  {
    id: '5',
    name: 'David Chen',
    email: 'dchen@tech.co',
    phone: '+1 (555) 555-6666',
    company: 'TechCo Solutions',
    role: 'VP Engineering',
    source: 'cold_outreach',
    status: 'contacted',
    score: 58,
    scoreBreakdown: {
      engagement: 18,
      firmographics: 20,
      demographics: 12,
      intent: 8,
    },
    assignedTo: 'Sarah Lee',
    createdAt: '2026-06-05',
    lastActivity: '2026-06-12',
    notes: 'Responded to cold email. Wants more info.',
  },
]

const sourceLabels: Record<string, string> = {
  website: 'Website',
  linkedin: 'LinkedIn',
  referral: 'Referral',
  webinar: 'Webinar',
  cold_outreach: 'Cold Outreach',
  event: 'Event',
}

const statusColors: Record<string, { bg: string; text: string }> = {
  new: { bg: 'bg-blue-50', text: 'text-blue-700' },
  contacted: { bg: 'bg-amber-50', text: 'text-amber-700' },
  qualified: { bg: 'bg-green-50', text: 'text-green-700' },
  unqualified: { bg: 'bg-gray-50', text: 'text-gray-700' },
}

export default function LeadsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'score' | 'date' | 'name'>('score')

  const filteredLeads = leads
    .filter((lead) => {
      const matchesSearch =
        lead.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        lead.company.toLowerCase().includes(searchQuery.toLowerCase())
      const matchesStatus = statusFilter === 'all' || lead.status === statusFilter
      return matchesSearch && matchesStatus
    })
    .sort((a, b) => {
      if (sortBy === 'score') return b.score - a.score
      if (sortBy === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      return a.name.localeCompare(b.name)
    })

  const leadStats = {
    total: leads.length,
    new: leads.filter((l) => l.status === 'new').length,
    contacted: leads.filter((l) => l.status === 'contacted').length,
    qualified: leads.filter((l) => l.status === 'qualified').length,
    hotLeads: leads.filter((l) => l.score >= 80).length,
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leads</h1>
          <p className="text-gray-500 mt-1">
            Track and qualify new leads ({leads.length} total)
          </p>
        </div>
        <button className="px-4 py-2 bg-crm-600 text-white rounded-lg text-sm font-medium hover:bg-crm-700 flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Lead
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{leadStats.total}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wider">New</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{leadStats.new}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Contacted</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{leadStats.contacted}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Qualified</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{leadStats.qualified}</p>
        </div>
        <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Hot Leads</p>
          <p className="text-2xl font-bold text-red-500 mt-1">{leadStats.hotLeads}</p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search leads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-500"
        >
          <option value="all">All Status</option>
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="qualified">Qualified</option>
          <option value="unqualified">Unqualified</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'score' | 'date' | 'name')}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-500"
        >
          <option value="score">Sort by Score</option>
          <option value="date">Sort by Date</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {filteredLeads.map((lead) => (
          <Link
            key={lead.id}
            href={`/leads/${lead.id}`}
            className="block bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-crm-200 hover:shadow-md transition-all"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-crm-100 flex items-center justify-center">
                  <User className="w-6 h-6 text-crm-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">{lead.name}</h3>
                    {lead.score >= 80 && (
                      <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {lead.role} at {lead.company}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <LeadScore score={lead.score} breakdown={lead.scoreBreakdown} compact />

                <div className="text-center px-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                      statusColors[lead.status].bg
                    } ${statusColors[lead.status].text}`}
                  >
                    {lead.status}
                  </span>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500">Source</p>
                  <p className="text-sm font-medium text-gray-700">
                    {sourceLabels[lead.source]}
                  </p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500">Assigned</p>
                  <p className="text-sm font-medium text-gray-700">{lead.assignedTo}</p>
                </div>

                <div className="text-center">
                  <p className="text-xs text-gray-500">Last Activity</p>
                  <p className="text-sm font-medium text-gray-700">{lead.lastActivity}</p>
                </div>

                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            </div>

            {lead.notes && (
              <p className="mt-3 text-sm text-gray-500 pl-16">{lead.notes}</p>
            )}
          </Link>
        ))}
      </div>

      {filteredLeads.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
          <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No leads found</h3>
          <p className="text-gray-500 mt-1">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}
