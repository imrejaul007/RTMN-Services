'use client';

import { useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('7d');

  // Mock data
  const stats = {
    totalUsers: 24853,
    activeUsers: 18420,
    pointsIssued: 4528000,
    pointsRedeemed: 3215000,
  };

  const pointsFlowData = [
    { date: 'May 1', issued: 145000, redeemed: 98000 },
    { date: 'May 2', issued: 168000, redeemed: 112000 },
    { date: 'May 3', issued: 132000, redeemed: 89000 },
    { date: 'May 4', issued: 189000, redeemed: 134000 },
    { date: 'May 5', issued: 201000, redeemed: 156000 },
    { date: 'May 6', issued: 178000, redeemed: 123000 },
    { date: 'May 7', issued: 195000, redeemed: 142000 },
  ];

  const tierDistribution = [
    { name: 'Bronze', value: 12420, color: '#cd7f32' },
    { name: 'Silver', value: 7840, color: '#c0c0c0' },
    { name: 'Gold', value: 3420, color: '#ffd700' },
    { name: 'Platinum', value: 1173, color: '#e5e4e2' },
  ];

  const topPerformers = [
    { rank: 1, name: 'Sarah Mitchell', points: 245000, tier: 'Platinum', growth: '+12.4%' },
    { rank: 2, name: 'James Wilson', points: 228500, tier: 'Platinum', growth: '+8.7%' },
    { rank: 3, name: 'Emily Chen', points: 195000, tier: 'Gold', growth: '+15.2%' },
    { rank: 4, name: 'Michael Brown', points: 187200, tier: 'Gold', growth: '+6.1%' },
    { rank: 5, name: 'Lisa Anderson', points: 172800, tier: 'Gold', growth: '+9.3%' },
  ];

  const recentActivity = [
    { id: 1, user: 'Alex Thompson', action: 'Redeemed 5000 points for $50 voucher', time: '2 min ago', points: -5000 },
    { id: 2, user: 'Jennifer Lee', action: 'Earned 250 points from purchase', time: '5 min ago', points: 250 },
    { id: 3, user: 'David Martinez', action: 'Tier upgrade to Gold', time: '12 min ago', points: 0 },
    { id: 4, user: 'Rachel Green', action: 'Earned 1000 points from referral', time: '18 min ago', points: 1000 },
    { id: 5, user: 'Kevin Nguyen', action: 'Redeemed 10000 points for free meal', time: '25 min ago', points: -10000 },
  ];

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('en-US').format(num);
  };

  const formatCurrency = (num: number) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num / 100);
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          <p className="text-slate-500 mt-1">Welcome back! Here&apos;s your loyalty program summary.</p>
        </div>
        <div className="flex gap-2">
          {['24h', '7d', '30d', '90d'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Total Users"
          value={formatNumber(stats.totalUsers)}
          change="+12.5%"
          positive={true}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          }
        />
        <StatCard
          title="Active Users"
          value={formatNumber(stats.activeUsers)}
          change="+8.2%"
          positive={true}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          title="Points Issued"
          value={formatNumber(stats.pointsIssued)}
          change="+15.3%"
          positive={true}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          title="Points Redeemed"
          value={formatNumber(stats.pointsRedeemed)}
          change="+22.1%"
          positive={true}
          icon={
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          }
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Points Flow Chart */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Points Flow</h2>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={pointsFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} tickFormatter={(v) => `${v / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => [formatNumber(value), '']}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="issued"
                  stroke="#0ea5e9"
                  strokeWidth={2}
                  dot={{ fill: '#0ea5e9', strokeWidth: 2 }}
                  name="Points Issued"
                />
                <Line
                  type="monotone"
                  dataKey="redeemed"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={{ fill: '#10b981', strokeWidth: 2 }}
                  name="Points Redeemed"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tier Distribution */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Tier Distribution</h2>
          <div className="h-72 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={tierDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {tierDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => formatNumber(value)}
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-40 space-y-3">
              {tierDistribution.map((tier) => (
                <div key={tier.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tier.color }}
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{tier.name}</p>
                    <p className="text-xs text-slate-500">{formatNumber(tier.value)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Top Performers</h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {topPerformers.map((performer) => (
              <div
                key={performer.rank}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-semibold text-slate-600">
                    {performer.rank}
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">{performer.name}</p>
                    <p className="text-sm text-slate-500">{performer.tier} - {formatNumber(performer.points)} pts</p>
                  </div>
                </div>
                <span className="text-sm font-medium text-emerald-600">{performer.growth}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
            <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    activity.points > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                  }`}
                >
                  {activity.points > 0 ? (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-900">{activity.user}</p>
                  <p className="text-sm text-slate-500 truncate">{activity.action}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={`text-sm font-medium ${activity.points > 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                    {activity.points > 0 ? '+' : ''}{formatNumber(activity.points)}
                  </p>
                  <p className="text-xs text-slate-400">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  change,
  positive,
  icon,
}: {
  title: string;
  value: string;
  change: string;
  positive: boolean;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-primary-50 rounded-lg text-primary-600">{icon}</div>
        <span
          className={`text-sm font-medium px-2 py-1 rounded-full ${
            positive ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
          }`}
        >
          {change}
        </span>
      </div>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      <p className="text-slate-500 text-sm mt-1">{title}</p>
    </div>
  );
}
