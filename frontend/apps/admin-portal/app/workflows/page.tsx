'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Plus,
  Search,
  Filter,
  Workflow,
  MoreHorizontal,
  Play,
  Pause,
  Copy,
  Trash2,
  Edit,
  ChevronRight,
} from 'lucide-react'

const workflows = [
  {
    id: 'wf-1',
    name: 'Customer Onboarding',
    description: 'Automated onboarding flow for new customers',
    status: 'active',
    triggers: 1247,
    lastRun: '2 hours ago',
    steps: 8,
  },
  {
    id: 'wf-2',
    name: 'Support Ticket Routing',
    description: 'Route support tickets based on category and priority',
    status: 'active',
    triggers: 3892,
    lastRun: '15 minutes ago',
    steps: 5,
  },
  {
    id: 'wf-3',
    name: 'Invoice Processing',
    description: 'Automated invoice generation and delivery',
    status: 'paused',
    triggers: 456,
    lastRun: '3 days ago',
    steps: 12,
  },
  {
    id: 'wf-4',
    name: 'Lead Qualification',
    description: 'Qualify leads based on engagement scoring',
    status: 'active',
    triggers: 2156,
    lastRun: '30 minutes ago',
    steps: 6,
  },
  {
    id: 'wf-5',
    name: 'Subscription Renewal',
    description: 'Handle subscription renewals and notifications',
    status: 'draft',
    triggers: 0,
    lastRun: 'Never',
    steps: 4,
  },
]

export default function WorkflowsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredWorkflows = workflows.filter((wf) => {
    const matchesSearch = wf.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      wf.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || wf.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Workflows</h1>
          <p className="text-muted-foreground mt-1">Build and manage automated workflows</p>
        </div>
        <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors">
          <Plus className="h-4 w-4" />
          Create Workflow
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search workflows..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg bg-background"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg bg-background"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Workflow Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredWorkflows.map((workflow) => (
          <div
            key={workflow.id}
            className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-lg ${workflow.status === 'active' ? 'bg-green-100 text-green-600' : workflow.status === 'paused' ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-600'}`}>
                  <Workflow className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold">{workflow.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{workflow.description}</p>
                  <div className="flex items-center gap-4 mt-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                      workflow.status === 'active' ? 'bg-green-100 text-green-700' :
                      workflow.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {workflow.status === 'active' && <div className="h-1.5 w-1.5 rounded-full bg-green-500" />}
                      {workflow.status}
                    </span>
                    <span className="text-xs text-muted-foreground">{workflow.steps} steps</span>
                    <span className="text-xs text-muted-foreground">Last run: {workflow.lastRun}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <Play className="h-4 w-4" />
                </button>
                <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <div className="text-sm">
                <span className="text-muted-foreground">Total triggers: </span>
                <span className="font-medium">{workflow.triggers.toLocaleString()}</span>
              </div>
              <Link
                href={`/workflows/${workflow.id}`}
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                Edit <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {filteredWorkflows.length === 0 && (
        <div className="text-center py-12">
          <Workflow className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No workflows found</h3>
          <p className="text-muted-foreground">Try adjusting your search or filters</p>
        </div>
      )}
    </div>
  )
}
