'use client'

import { useState, useEffect } from 'react'
import { DashboardStats } from '@/components/dashboard/stats'
import { PipelineChart } from '@/components/dashboard/pipeline-chart'
import { RecentActivity } from '@/components/dashboard/recent-activity'
import { AIAssistant } from '@/components/dashboard/ai-assistant'
import { IntegrationStatus } from '@/components/dashboard/integration-status'
import {
  TrendingUp,
  Users,
  Mail,
  Phone,
  MessageSquare,
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react'

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalLeads: 0,
    activeWorkflows: 0,
    emailsSent: 0,
    meetingsBooked: 0,
    conversionRate: 0,
    responseRate: 0
  })

  useEffect(() => {
    // Simulate loading
    setTimeout(() => {
      setStats({
        totalLeads: 1247,
        activeWorkflows: 5,
        emailsSent: 8934,
        meetingsBooked: 127,
        conversionRate: 8.5,
        responseRate: 12.3
      })
      setLoading(false)
    }, 500)
  }, [])

  const pipelineData = [
    { stage: 'New', count: 342, value: 0 },
    { stage: 'Contacted', count: 287, value: 143500 },
    { stage: 'Qualified', count: 156, value: 312000 },
    { stage: 'Proposal', count: 89, value: 445000 },
    { stage: 'Negotiation', count: 45, value: 360000 },
    { stage: 'Closed Won', count: 28, value: 280000 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sales Dashboard</h1>
          <p className="text-muted-foreground">
            AI-powered insights and autonomous SDR performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-green-600 flex items-center gap-1">
            <ArrowUpRight className="h-4 w-4" />
            +12.5% vs last week
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Total Leads</div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{loading ? '-' : stats.totalLeads.toLocaleString()}</span>
            <span className="text-sm text-green-600 flex items-center">
              <ArrowUpRight className="h-3 w-3" /> +23
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Emails Sent</div>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{loading ? '-' : stats.emailsSent.toLocaleString()}</span>
            <span className="text-sm text-green-600 flex items-center">
              <ArrowUpRight className="h-3 w-3" /> +156
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Meetings Booked</div>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{loading ? '-' : stats.meetingsBooked}</span>
            <span className="text-sm text-green-600 flex items-center">
              <ArrowUpRight className="h-3 w-3" /> +8
            </span>
          </div>
        </div>

        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">Conversion Rate</div>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">{loading ? '-' : stats.conversionRate}%</span>
            <span className="text-sm text-red-600 flex items-center">
              <ArrowDownRight className="h-3 w-3" /> -0.3%
            </span>
          </div>
        </div>
      </div>

      {/* Charts and Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Sales Pipeline</h2>
          <PipelineChart data={pipelineData} />
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Activity</h2>
          <RecentActivity />
        </div>
      </div>

      {/* AI Assistant and Integrations */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">AI Assistant</h2>
          <AIAssistant />
        </div>

        <div className="rounded-lg border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4">Integration Status</h2>
          <IntegrationStatus />
        </div>
      </div>
    </div>
  )
}
