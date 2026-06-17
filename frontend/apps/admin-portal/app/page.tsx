'use client'

import Link from 'next/link'
import {
  Workflow,
  BookOpen,
  Users,
  Settings,
  Plug,
  Activity,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'

const stats = [
  { name: 'Active Workflows', value: '24', change: '+3 this week', icon: Workflow },
  { name: 'KB Articles', value: '156', change: '+12 this week', icon: BookOpen },
  { name: 'Team Members', value: '18', change: '+2 this week', icon: Users },
  { name: 'Integrations', value: '8', change: 'Active', icon: Plug },
]

const recentActivity = [
  { id: 1, action: 'Workflow deployed', item: 'Customer Onboarding v3', time: '2 hours ago', status: 'success' },
  { id: 2, action: 'KB article updated', item: 'Getting Started Guide', time: '4 hours ago', status: 'success' },
  { id: 3, action: 'Integration connected', item: 'Slack Connector', time: '6 hours ago', status: 'success' },
  { id: 4, action: 'SLA policy modified', item: 'Premium Support Tier', time: '1 day ago', status: 'warning' },
  { id: 5, action: 'Team member added', item: 'Sarah Chen', time: '1 day ago', status: 'success' },
]

const quickActions = [
  { name: 'Create Workflow', href: '/workflows', icon: Workflow, color: 'bg-blue-500' },
  { name: 'Add KB Article', href: '/knowledge', icon: BookOpen, color: 'bg-green-500' },
  { name: 'Manage Team', href: '/teams', icon: Users, color: 'bg-purple-500' },
  { name: 'Add Integration', href: '/integrations', icon: Plug, color: 'bg-orange-500' },
]

export default function AdminDashboard() {
  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white dark:bg-slate-900 rounded-xl p-6 border shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">{stat.name}</p>
                <p className="text-3xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.change}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.icon === Workflow ? 'bg-blue-100 text-blue-600' : stat.icon === BookOpen ? 'bg-green-100 text-green-600' : stat.icon === Users ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600'}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.href}
              className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-xl border shadow-sm hover:shadow-md transition-shadow"
            >
              <div className={`p-3 rounded-lg ${action.color}`}>
                <action.icon className="h-6 w-6 text-white" />
              </div>
              <span className="text-sm font-medium">{action.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Activity</h2>
              <Activity className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div className="divide-y">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center gap-4 p-4">
                <div className={`p-2 rounded-full ${activity.status === 'success' ? 'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  {activity.status === 'success' ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <AlertCircle className="h-4 w-4" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{activity.action}</p>
                  <p className="text-xs text-muted-foreground">{activity.item}</p>
                </div>
                <span className="text-xs text-muted-foreground">{activity.time}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-sm">
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">System Health</h2>
              <TrendingUp className="h-5 w-5 text-muted-foreground" />
            </div>
          </div>
          <div className="p-6 space-y-4">
            {[
              { name: 'API Gateway', status: 'Operational', uptime: '99.9%' },
              { name: 'Workflow Engine', status: 'Operational', uptime: '99.5%' },
              { name: 'Knowledge Base', status: 'Operational', uptime: '99.8%' },
              { name: 'Event Bus', status: 'Operational', uptime: '99.7%' },
              { name: 'Auth Service', status: 'Operational', uptime: '99.9%' },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-sm font-medium">{service.name}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-muted-foreground">{service.uptime}</span>
                  <span className="text-xs text-green-600 font-medium">{service.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/sla"
          className="group bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">SLA Policies</h3>
              <p className="text-sm text-muted-foreground mt-1">Configure response times and policies</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link
          href="/settings"
          className="group bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Organization Settings</h3>
              <p className="text-sm text-muted-foreground mt-1">Manage org config and preferences</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
        <Link
          href="/integrations"
          className="group bg-white dark:bg-slate-900 rounded-xl border shadow-sm p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Integrations</h3>
              <p className="text-sm text-muted-foreground mt-1">Connect third-party services</p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </div>
        </Link>
      </div>
    </div>
  )
}
