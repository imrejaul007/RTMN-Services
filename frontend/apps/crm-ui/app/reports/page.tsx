'use client'

import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Briefcase,
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

const revenueData = [
  { month: 'Jan', revenue: 85000, target: 80000 },
  { month: 'Feb', revenue: 92000, target: 85000 },
  { month: 'Mar', revenue: 88000, target: 90000 },
  { month: 'Apr', revenue: 105000, target: 95000 },
  { month: 'May', revenue: 115000, target: 100000 },
  { month: 'Jun', revenue: 124000, target: 110000 },
]

const dealsByStage = [
  { name: 'Discovery', value: 12, color: '#6b7280' },
  { name: 'Qualification', value: 8, color: '#3b82f6' },
  { name: 'Proposal', value: 5, color: '#8b5cf6' },
  { name: 'Negotiation', value: 3, color: '#f59e0b' },
  { name: 'Closed Won', value: 15, color: '#22c55e' },
]

const teamPerformance = [
  { name: 'John Smith', deals: 12, revenue: 245000, conversion: 34 },
  { name: 'Sarah Lee', deals: 10, revenue: 198000, conversion: 31 },
  { name: 'Mike Johnson', deals: 8, revenue: 156000, conversion: 28 },
  { name: 'Emily Chen', deals: 7, revenue: 142000, conversion: 29 },
]

const leadSources = [
  { name: 'Website', value: 35, color: '#0ea5e9' },
  { name: 'LinkedIn', value: 25, color: '#0077b5' },
  { name: 'Referral', value: 20, color: '#22c55e' },
  { name: 'Cold Outreach', value: 12, color: '#f59e0b' },
  { name: 'Events', value: 8, color: '#8b5cf6' },
]

const monthlyTrends = [
  { month: 'Jan', leads: 45, qualified: 22, deals: 8 },
  { month: 'Feb', leads: 52, qualified: 28, deals: 10 },
  { month: 'Mar', leads: 48, qualified: 25, deals: 9 },
  { month: 'Apr', leads: 65, qualified: 35, deals: 12 },
  { month: 'May', leads: 72, qualified: 40, deals: 15 },
  { month: 'Jun', leads: 85, qualified: 48, deals: 18 },
]

const stats = [
  {
    name: 'Total Revenue',
    value: '$724K',
    change: '+12.5%',
    trend: 'up',
    icon: DollarSign,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    name: 'Deals Closed',
    value: '47',
    change: '+8.2%',
    trend: 'up',
    icon: Briefcase,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    name: 'Conversion Rate',
    value: '34.2%',
    change: '+2.1%',
    trend: 'up',
    icon: Target,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    name: 'Avg Deal Size',
    value: '$15.4K',
    change: '-3.2%',
    trend: 'down',
    icon: TrendingUp,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
  },
]

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState('6months')
  const [selectedReport, setSelectedReport] = useState('overview')

  const reports = [
    { id: 'overview', label: 'Overview' },
    { id: 'revenue', label: 'Revenue' },
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'team', label: 'Team Performance' },
    { id: 'leads', label: 'Lead Analysis' },
  ]

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sales Reports</h1>
          <p className="text-gray-500 mt-1">
            Analytics and insights for your sales performance
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-crm-500"
          >
            <option value="30days">Last 30 Days</option>
            <option value="3months">Last 3 Months</option>
            <option value="6months">Last 6 Months</option>
            <option value="1year">Last Year</option>
          </select>
          <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2">
            <Download className="w-4 h-4" />
            Export
          </button>
        </div>
      </div>

      {/* Report Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-6">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report.id)}
              className={`py-3 text-sm font-medium border-b-2 transition-colors ${
                selectedReport === report.id
                  ? 'border-crm-600 text-crm-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {report.label}
            </button>
          ))}
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Revenue vs Target</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} tickFormatter={(v) => `$${v / 1000}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`$${value.toLocaleString()}`, '']}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="target"
                  stroke="#9ca3af"
                  strokeDasharray="5 5"
                  name="Target"
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#22c55e"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                  name="Revenue"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Deals by Stage */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Deals by Stage</h2>
          </div>
          <div className="h-72 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dealsByStage}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {dealsByStage.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend
                  layout="vertical"
                  align="right"
                  verticalAlign="middle"
                  formatter={(value) => <span className="text-sm text-gray-600">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Lead Sources</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={leadSources} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                <YAxis dataKey="name" type="category" stroke="#9ca3af" fontSize={12} width={100} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Percentage']}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {leadSources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Funnel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Lead Conversion</h2>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={12} />
                <YAxis stroke="#9ca3af" fontSize={12} />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="#0ea5e9" strokeWidth={2} dot={{ r: 4 }} name="Leads" />
                <Line type="monotone" dataKey="qualified" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} name="Qualified" />
                <Line type="monotone" dataKey="deals" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} name="Deals" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Team Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Team Performance</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Sales Rep
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Deals Won
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Revenue
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Conversion Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Deal Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teamPerformance.map((rep, index) => {
                const avgDealSize = rep.revenue / rep.deals
                const performance = (rep.conversion / 34) * 100
                return (
                  <tr key={rep.name} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-crm-100 flex items-center justify-center">
                          <span className="text-sm font-medium text-crm-600">
                            {rep.name.split(' ').map((n) => n[0]).join('')}
                          </span>
                        </div>
                        <span className="font-medium text-gray-900">{rep.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">{rep.deals}</td>
                    <td className="px-6 py-4 text-gray-900 font-medium">
                      ${rep.revenue.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${rep.conversion}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{rep.conversion}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      ${avgDealSize.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          index === 0
                            ? 'bg-green-100 text-green-700'
                            : index === 1
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {index === 0 ? 'Top Performer' : index === 1 ? 'Strong' : 'Average'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
