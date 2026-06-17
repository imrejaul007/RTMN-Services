'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Ticket,
  Clock,
  CheckCircle,
  Star,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Users,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import { TicketCard } from '@/components/TicketCard';
import { api, DEMO_METRICS, DEMO_TICKETS } from '@/lib/api';

function MetricCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down';
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-slate-900">{value}</p>
          {change && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${
              changeType === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              <TrendingUp className={`w-3 h-3 ${changeType === 'down' && 'rotate-180'}`} />
              {change}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: tickets } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => api.getTickets(),
  });

  const metrics = DEMO_METRICS;
  const urgentTickets = tickets?.filter(t => t.priority === 'urgent' && t.status === 'open') || [];
  const recentTickets = tickets?.slice(0, 5) || [];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 mt-1">Welcome back, Sarah. Here's your support overview.</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Open Tickets"
          value={metrics.openTickets}
          change="+12% from yesterday"
          changeType="up"
          icon={Ticket}
          color="bg-blue-100 text-blue-600"
        />
        <MetricCard
          title="Avg Response Time"
          value={metrics.avgResponseTime}
          change="-8% from last week"
          changeType="up"
          icon={Clock}
          color="bg-purple-100 text-purple-600"
        />
        <MetricCard
          title="Resolution Rate"
          value={`${metrics.resolutionRate}%`}
          change="+3% from last week"
          changeType="up"
          icon={CheckCircle}
          color="bg-green-100 text-green-600"
        />
        <MetricCard
          title="Customer Satisfaction"
          value={`${metrics.customerSatisfaction}/5`}
          change="+0.2 from last month"
          changeType="up"
          icon={Star}
          color="bg-yellow-100 text-yellow-600"
        />
      </div>

      {/* Urgent Tickets Alert */}
      {urgentTickets.length > 0 && (
        <div className="mb-8 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-5 h-5 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-red-900">
                {urgentTickets.length} Urgent Ticket{urgentTickets.length > 1 ? 's' : ''} Require Attention
              </h3>
              <p className="text-sm text-red-700">
                SLA breach risk - immediate action needed
              </p>
            </div>
            <Link
              href="/tickets?priority=urgent"
              className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
            >
              View All
            </Link>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Tickets */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-slate-900">Recent Tickets</h2>
              <p className="text-xs text-slate-500">Latest updates from your queue</p>
            </div>
            <Link
              href="/tickets"
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="p-4 space-y-3">
            {recentTickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} compact />
            ))}
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">Today's Activity</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-blue-600" />
                  </div>
                  <span className="text-sm text-slate-600">Tickets Received</span>
                </div>
                <span className="font-semibold text-slate-900">{metrics.ticketsToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <span className="text-sm text-slate-600">Resolved</span>
                </div>
                <span className="font-semibold text-slate-900">{Math.round(metrics.ticketsToday * 0.7)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <span className="text-sm text-slate-600">Customers Helped</span>
                </div>
                <span className="font-semibold text-slate-900">{Math.round(metrics.ticketsToday * 0.85)}</span>
              </div>
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h3 className="font-semibold text-slate-900 mb-4">This Week</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Total Tickets</span>
                  <span className="font-medium text-slate-900">{metrics.ticketsThisWeek}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-primary-500 rounded-full" style={{ width: '100%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Resolved</span>
                  <span className="font-medium text-green-600">{Math.round(metrics.ticketsThisWeek * 0.94)}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '94%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">Urgent</span>
                  <span className="font-medium text-red-600">{metrics.urgentTickets}</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500 rounded-full" style={{ width: `${(metrics.urgentTickets / metrics.ticketsThisWeek) * 100}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* Live Activity */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Activity className="w-5 h-5 text-green-500 animate-pulse" />
              <h3 className="font-semibold text-slate-900">Live Activity</h3>
            </div>
            <div className="space-y-3">
              {[
                { action: 'New ticket assigned', ticket: 'TKT-006', time: '2m ago' },
                { action: 'Customer replied', ticket: 'TKT-001', time: '5m ago' },
                { action: 'Ticket resolved', ticket: 'TKT-003', time: '12m ago' },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className="w-2 h-2 mt-2 bg-green-500 rounded-full" />
                  <div>
                    <p className="text-sm text-slate-700">{activity.action}</p>
                    <p className="text-xs text-slate-400">{activity.ticket} • {activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
