'use client'

import { ArrowUpRight, ArrowDownRight, Users, Mail, Calendar, TrendingUp } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: number
  icon: React.ReactNode
  loading?: boolean
}

export function DashboardStats({ stats, loading }: { stats: any, loading: boolean }) {
  const statCards: StatCardProps[] = [
    { title: 'Total Leads', value: stats.totalLeads, change: 12.5, icon: <Users className="h-5 w-5" /> },
    { title: 'Active Workflows', value: stats.activeWorkflows, change: 5, icon: <TrendingUp className="h-5 w-5" /> },
    { title: 'Emails Sent', value: stats.emailsSent, change: 8.3, icon: <Mail className="h-5 w-5" /> },
    { title: 'Meetings Booked', value: stats.meetingsBooked, change: 15.2, icon: <Calendar className="h-5 w-5" /> },
  ]

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((stat, index) => (
        <div key={index} className="rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-muted-foreground">{stat.title}</div>
            <div className="text-muted-foreground">{stat.icon}</div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold">
              {loading ? '-' : typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </span>
          </div>
          {stat.change !== undefined && (
            <div className={`mt-2 text-sm flex items-center gap-1 ${stat.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {stat.change >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(stat.change)}% vs last week
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
