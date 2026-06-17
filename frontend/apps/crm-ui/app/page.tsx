'use client'

import { useState, useEffect } from 'react'
import {
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Clock,
  Target,
  Briefcase,
  UserPlus,
  CheckCircle2,
} from 'lucide-react'
import Link from 'next/link'
import Pipeline from '@/components/Pipeline'

const stats = [
  {
    name: 'Total Revenue',
    value: '$1.24M',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    name: 'Active Deals',
    value: '47',
    change: '+8.2%',
    trend: 'up',
    icon: Briefcase,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    name: 'New Leads',
    value: '128',
    change: '+23.1%',
    trend: 'up',
    icon: UserPlus,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    name: 'Win Rate',
    value: '34.2%',
    change: '-2.1%',
    trend: 'down',
    icon: Target,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
]

const recentActivities = [
  {
    id: 1,
    type: 'deal_won',
    title: 'Acme Corp Deal Closed',
    value: '$45,000',
    time: '2 hours ago',
  },
  {
    id: 2,
    type: 'lead_added',
    title: 'New Lead: Sarah Johnson',
    company: 'TechStart Inc',
    time: '3 hours ago',
  },
  {
    id: 3,
    type: 'task_completed',
    title: 'Follow-up call completed',
    contact: 'John Smith',
    time: '4 hours ago',
  },
  {
    id: 4,
    type: 'meeting_scheduled',
    title: 'Demo scheduled',
    contact: 'Emily Davis',
    time: '5 hours ago',
  },
  {
    id: 5,
    type: 'deal_won',
    title: 'Enterprise License Sold',
    value: '$120,000',
    time: '6 hours ago',
  },
]

const upcomingTasks = [
  {
    id: 1,
    title: 'Follow up with Acme Corp',
    due: 'Today, 2:00 PM',
    priority: 'high',
    contact: 'John Smith',
  },
  {
    id: 2,
    title: 'Send proposal to TechStart',
    due: 'Today, 5:00 PM',
    priority: 'medium',
    contact: 'Sarah Johnson',
  },
  {
    id: 3,
    title: 'Quarterly review call',
    due: 'Tomorrow, 10:00 AM',
    priority: 'high',
    contact: 'Emily Davis',
  },
  {
    id: 4,
    title: 'Contract review meeting',
    due: 'Tomorrow, 3:00 PM',
    priority: 'medium',
    contact: 'Michael Brown',
  },
]

export default function CRMDashboard() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-8">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="grid grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-xl"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">CRM Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here is your sales overview.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/leads"
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add Lead
          </Link>
          <Link
            href="/deals"
            className="px-4 py-2 bg-crm-600 text-white rounded-lg text-sm font-medium hover:bg-crm-700 flex items-center gap-2"
          >
            <Briefcase className="w-4 h-4" />
            New Deal
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div
                className={`flex items-center gap-1 text-sm ${
                  stat.trend === 'up' ? 'text-green-600' : 'text-red-500'
                }`}
              >
                {stat.trend === 'up' ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
                {stat.change}
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500 mt-1">{stat.name}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pipeline Overview */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Deal Pipeline</h2>
            <Link
              href="/deals"
              className="text-sm text-crm-600 hover:text-crm-700 font-medium"
            >
              View all
            </Link>
          </div>
          <Pipeline />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <Activity className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="w-2 h-2 rounded-full bg-crm-500 mt-2" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {activity.title}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {activity.value && (
                      <span className="text-xs font-medium text-green-600">
                        {activity.value}
                      </span>
                    )}
                    {activity.company && (
                      <span className="text-xs text-gray-500">{activity.company}</span>
                    )}
                    {activity.contact && (
                      <span className="text-xs text-gray-500">{activity.contact}</span>
                    )}
                  </div>
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Upcoming Tasks</h2>
            <Link
              href="/tasks"
              className="text-sm text-crm-600 hover:text-crm-700 font-medium"
            >
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-100 hover:border-crm-200 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-1 h-10 rounded-full ${
                      task.priority === 'high' ? 'bg-red-500' : 'bg-amber-500'
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{task.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{task.contact}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {task.due}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            <Link
              href="/contacts"
              className="p-4 rounded-lg border border-gray-100 hover:border-crm-200 hover:bg-crm-50 transition-all group"
            >
              <Users className="w-8 h-8 text-crm-600 mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Manage Contacts</p>
              <p className="text-sm text-gray-500 mt-1">View & edit contacts</p>
            </Link>
            <Link
              href="/reports"
              className="p-4 rounded-lg border border-gray-100 hover:border-crm-200 hover:bg-crm-50 transition-all group"
            >
              <TrendingUp className="w-8 h-8 text-crm-600 mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">View Reports</p>
              <p className="text-sm text-gray-500 mt-1">Sales analytics</p>
            </Link>
            <Link
              href="/leads"
              className="p-4 rounded-lg border border-gray-100 hover:border-crm-200 hover:bg-crm-50 transition-all group"
            >
              <UserPlus className="w-8 h-8 text-crm-600 mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Leads</p>
              <p className="text-sm text-gray-500 mt-1">Track new leads</p>
            </Link>
            <Link
              href="/tasks"
              className="p-4 rounded-lg border border-gray-100 hover:border-crm-200 hover:bg-crm-50 transition-all group"
            >
              <CheckCircle2 className="w-8 h-8 text-crm-600 mb-3 group-hover:scale-110 transition-transform" />
              <p className="font-medium text-gray-900">Tasks</p>
              <p className="text-sm text-gray-500 mt-1">Activity tracking</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
