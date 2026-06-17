'use client';

import { useState } from 'react';
import { BarChart3, TrendingUp, Users, Target, MousePointer, DollarSign, Calendar, Download } from 'lucide-react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const monthlyData = [
  { month: 'Jan', leads: 145, qualified: 42, converted: 12 },
  { month: 'Feb', leads: 189, qualified: 56, converted: 18 },
  { month: 'Mar', leads: 234, qualified: 78, converted: 24 },
  { month: 'Apr', leads: 198, qualified: 62, converted: 19 },
  { month: 'May', leads: 267, qualified: 89, converted: 31 },
  { month: 'Jun', leads: 312, qualified: 102, converted: 38 },
];

const sourceData = [
  { name: 'Google', value: 35, color: '#4285F4' },
  { name: 'LinkedIn', value: 28, color: '#0077B5' },
  { name: 'Referral', value: 18, color: '#10B981' },
  { name: 'Apollo', value: 12, color: '#F59E0B' },
  { name: 'Other', value: 7, color: '#6B7280' },
];

const conversionData = [
  { stage: 'New → Contacted', rate: 68 },
  { stage: 'Contacted → Qualified', rate: 45 },
  { stage: 'Qualified → Proposal', rate: 62 },
  { stage: 'Proposal → Negotiation', rate: 58 },
  { stage: 'Negotiation → Closed', rate: 72 },
];

const weeklyActivity = [
  { day: 'Mon', emails: 45, calls: 12, meetings: 3 },
  { day: 'Tue', emails: 52, calls: 18, meetings: 5 },
  { day: 'Wed', emails: 38, calls: 15, meetings: 4 },
  { day: 'Thu', emails: 61, calls: 22, meetings: 7 },
  { day: 'Fri', emails: 34, calls: 14, meetings: 6 },
];

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');

  const kpiCards = [
    { label: 'Total Leads', value: '1,247', change: '+12%', icon: Users, color: 'blue' },
    { label: 'Conversion Rate', value: '3.2%', change: '+0.8%', icon: Target, color: 'green' },
    { label: 'Avg. Deal Size', value: '$12.5K', change: '+15%', icon: DollarSign, color: 'purple' },
    { label: 'Response Rate', value: '24%', change: '+5%', icon: MousePointer, color: 'yellow' },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Track your lead generation performance</p>
        </div>
        <div className="flex gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="input-field w-auto"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="ytd">Year to date</option>
          </select>
          <button className="btn-secondary">
            <Download className="w-4 h-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-${kpi.color}-50`}>
                <kpi.icon className={`w-6 h-6 text-${kpi.color}-600`} />
              </div>
              <span className="text-green-600 text-sm font-medium">{kpi.change}</span>
            </div>
            <div className="text-3xl font-bold text-gray-900">{kpi.value}</div>
            <div className="text-sm text-gray-500">{kpi.label}</div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lead Trends */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Trends</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Line type="monotone" dataKey="leads" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6' }} />
                <Line type="monotone" dataKey="qualified" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
                <Line type="monotone" dataKey="converted" stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Lead Sources */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">Lead Sources</h3>
          <div className="h-72 flex items-center">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 space-y-3">
              {sourceData.map((source) => (
                <div key={source.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: source.color }}
                    />
                    <span className="text-sm text-gray-700">{source.name}</span>
                  </div>
                  <span className="text-sm font-medium">{source.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Conversion Funnel */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">Conversion Rates</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={conversionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fill: '#6b7280', fontSize: 12 }} tickFormatter={(v) => `${v}%`} />
                <YAxis type="category" dataKey="stage" tick={{ fill: '#6b7280', fontSize: 11 }} width={140} />
                <Tooltip formatter={(value) => [`${value}%`, 'Conversion Rate']} />
                <Bar dataKey="rate" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold mb-4">Weekly Activity</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyActivity}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="day" tick={{ fill: '#6b7280', fontSize: 12 }} />
                <YAxis tick={{ fill: '#6b7280', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="emails" name="Emails" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="calls" name="Calls" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="meetings" name="Meetings" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Performing Campaigns */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold mb-4">Top Performing Campaigns</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Channel</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Sent</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Open Rate</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Reply Rate</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-500 uppercase">Conversion</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              <tr>
                <td className="py-3 px-4 font-medium">Tech Industry Q2 Push</td>
                <td className="py-3 px-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Email</span></td>
                <td className="py-3 px-4 text-right">1,245</td>
                <td className="py-3 px-4 text-right text-green-600">45.5%</td>
                <td className="py-3 px-4 text-right">10.8%</td>
                <td className="py-3 px-4 text-right">2.2%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Healthcare Decision Makers</td>
                <td className="py-3 px-4"><span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">Email</span></td>
                <td className="py-3 px-4 text-right">890</td>
                <td className="py-3 px-4 text-right text-green-600">47.5%</td>
                <td className="py-3 px-4 text-right">10.0%</td>
                <td className="py-3 px-4 text-right">1.7%</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-medium">Enterprise Outreach</td>
                <td className="py-3 px-4"><span className="px-2 py-1 bg-[#0077b5]/10 text-[#0077b5] rounded text-xs">LinkedIn</span></td>
                <td className="py-3 px-4 text-right">2,341</td>
                <td className="py-3 px-4 text-right text-green-600">47.1%</td>
                <td className="py-3 px-4 text-right">10.0%</td>
                <td className="py-3 px-4 text-right">1.9%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
