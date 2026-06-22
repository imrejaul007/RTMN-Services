'use client';

import { useState } from 'react';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
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
  FunnelChart,
  Funnel,
  LabelList,
} from 'recharts';

const monthlyData = [
  { month: 'Jan', pointsIssued: 1250000, pointsRedeemed: 890000, newMembers: 1842, activeMembers: 15200 },
  { month: 'Feb', pointsIssued: 1380000, pointsRedeemed: 920000, newMembers: 1654, activeMembers: 15800 },
  { month: 'Mar', pointsIssued: 1420000, pointsRedeemed: 1050000, newMembers: 1890, activeMembers: 16200 },
  { month: 'Apr', pointsIssued: 1560000, pointsRedeemed: 1180000, newMembers: 2105, activeMembers: 17100 },
  { month: 'May', pointsIssued: 1680000, pointsRedeemed: 1250000, newMembers: 2340, activeMembers: 18420 },
];

const weeklyData = [
  { day: 'Mon', engagement: 65, transactions: 1245, conversion: 3.2 },
  { day: 'Tue', engagement: 72, transactions: 1480, conversion: 3.8 },
  { day: 'Wed', engagement: 68, transactions: 1320, conversion: 3.5 },
  { day: 'Thu', engagement: 75, transactions: 1650, conversion: 4.1 },
  { day: 'Fri', engagement: 82, transactions: 1890, conversion: 4.5 },
  { day: 'Sat', engagement: 88, transactions: 2150, conversion: 5.2 },
  { day: 'Sun', engagement: 78, transactions: 1780, conversion: 4.3 },
];

const activityBreakdown = [
  { name: 'Purchases', value: 45, color: '#0ea5e9' },
  { name: 'Referrals', value: 25, color: '#10b981' },
  { name: 'Promotions', value: 20, color: '#f59e0b' },
  { name: 'Other', value: 10, color: '#64748b' },
];

const conversionFunnel = [
  { name: 'Visited', value: 10000 },
  { name: 'Signed Up', value: 7500 },
  { name: 'Made Purchase', value: 4500 },
  { name: 'Redeemed Points', value: 2800 },
];

const topRewards = [
  { name: '$10 Voucher', redemptions: 3420, pointsUsed: 34200000 },
  { name: '$25 Voucher', redemptions: 2180, pointsUsed: 54500000 },
  { name: '$50 Voucher', redemptions: 1450, pointsUsed: 72500000 },
  { name: 'Free Product', redemptions: 890, pointsUsed: 44500000 },
  { name: 'Store Discount', redemptions: 680, pointsUsed: 13600000 },
];

const engagementMetrics = [
  { metric: 'Daily Active Users', value: '18,420', change: '+8.2%', trend: 'up' },
  { metric: 'Avg. Session Duration', value: '4m 32s', change: '+12.5%', trend: 'up' },
  { metric: 'Points per Transaction', value: '285', change: '+5.1%', trend: 'up' },
  { metric: 'Redemption Rate', value: '71%', change: '+3.2%', trend: 'up' },
  { metric: 'Churn Rate', value: '2.4%', change: '-0.8%', trend: 'down' },
  { metric: 'NPS Score', value: '68', change: '+4.0', trend: 'up' },
];

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#64748b'];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState<'overview' | 'engagement' | 'rewards'>('overview');

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Analytics</h1>
          <p className="text-slate-500 mt-1">Track loyalty program performance and member engagement.</p>
        </div>
        <div className="flex gap-2">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                timeRange === range
                  ? 'bg-primary-500 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-8 border-b border-slate-200">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'engagement', label: 'Engagement' },
          { id: 'rewards', label: 'Rewards' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`pb-4 px-2 text-sm font-medium transition-colors relative ${
              activeTab === tab.id
                ? 'text-primary-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary-500" />
            )}
          </button>
        ))}
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {engagementMetrics.map((metric, index) => (
          <div key={index} className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-slate-500 mb-1">{metric.metric}</p>
            <p className="text-xl font-bold text-slate-900">{metric.value}</p>
            <p className={`text-sm font-medium ${metric.trend === 'up' ? 'text-emerald-600' : 'text-red-500'}`}>
              {metric.change}
            </p>
          </div>
        ))}
      </div>

      {activeTab === 'overview' && (
        <>
          {/* Points Flow Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Points Flow</h2>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyData}>
                    <defs>
                      <linearGradient id="colorIssued" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="colorRedeemed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} tickFormatter={formatNumber} />
                    <Tooltip
                      formatter={(value: number) => formatNumber(value)}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="pointsIssued"
                      stroke="#0ea5e9"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorIssued)"
                      name="Points Issued"
                    />
                    <Area
                      type="monotone"
                      dataKey="pointsRedeemed"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRedeemed)"
                      name="Points Redeemed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Activity Breakdown */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Activity Breakdown</h2>
              <div className="h-72 flex items-center">
                <ResponsiveContainer width="60%" height="100%">
                  <PieChart>
                    <Pie
                      data={activityBreakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {activityBreakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => `${value}%`}
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="w-40 space-y-3">
                  {activityBreakdown.map((item) => (
                    <div key={item.name} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.name}</p>
                        <p className="text-xs text-slate-500">{item.value}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Member Growth */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Member Growth</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" stroke="#64748b" fontSize={12} />
                  <YAxis stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="newMembers" fill="#0ea5e9" name="New Members" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="activeMembers" fill="#10b981" name="Active Members" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}

      {activeTab === 'engagement' && (
        <>
          {/* Engagement by Day */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Weekly Engagement</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                  <YAxis yAxisId="left" stroke="#64748b" fontSize={12} />
                  <YAxis yAxisId="right" orientation="right" stroke="#64748b" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                    }}
                  />
                  <Legend />
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="engagement"
                    stroke="#0ea5e9"
                    strokeWidth={2}
                    name="Engagement Score"
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="conversion"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Conversion Rate %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Conversion Funnel */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-6">Conversion Funnel</h2>
            <div className="flex items-center justify-between max-w-3xl mx-auto">
              {conversionFunnel.map((stage, index) => (
                <div key={stage.name} className="flex-1 text-center relative">
                  {index > 0 && (
                    <div className="absolute top-6 left-0 w-full h-1 bg-slate-200 -z-10" />
                  )}
                  <div
                    className="w-24 h-12 mx-auto rounded-lg flex items-center justify-center text-white font-semibold shadow-lg"
                    style={{
                      backgroundColor: COLORS[index],
                    }}
                  >
                    {formatNumber(stage.value)}
                  </div>
                  <p className="mt-4 font-medium text-slate-900">{stage.name}</p>
                  <p className="text-sm text-slate-500">
                    {index > 0
                      ? `${((conversionFunnel[index].value / conversionFunnel[index - 1].value) * 100).toFixed(0)}%`
                      : '100%'}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {activeTab === 'rewards' && (
        <>
          {/* Top Rewards */}
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Redeemed Rewards</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-slate-500 border-b border-slate-200">
                    <th className="pb-3 font-medium">Reward</th>
                    <th className="pb-3 font-medium text-right">Redemptions</th>
                    <th className="pb-3 font-medium text-right">Points Used</th>
                    <th className="pb-3 font-medium text-right">% of Total</th>
                  </tr>
                </thead>
                <tbody>
                  {topRewards.map((reward, index) => {
                    const total = topRewards.reduce((sum, r) => sum + r.pointsUsed, 0);
                    const percentage = ((reward.pointsUsed / total) * 100).toFixed(1);
                    return (
                      <tr key={reward.name} className="border-b border-slate-100 last:border-0">
                        <td className="py-4 font-medium text-slate-900">{reward.name}</td>
                        <td className="py-4 text-right text-slate-700">{formatNumber(reward.redemptions)}</td>
                        <td className="py-4 text-right text-slate-700">{formatNumber(reward.pointsUsed)}</td>
                        <td className="py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-24 h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-primary-500 rounded-full"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                            <span className="text-sm text-slate-600 w-12">{percentage}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Redemption Trends */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Daily Transactions</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="day" stroke="#64748b" fontSize={12} />
                    <YAxis stroke="#64748b" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="transactions" fill="#0ea5e9" name="Transactions" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Points by Tier */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Average Points Balance by Tier</h2>
              <div className="space-y-4">
                {[
                  { name: 'Platinum', value: 24500, color: '#e5e4e2' },
                  { name: 'Gold', value: 18200, color: '#ffd700' },
                  { name: 'Silver', value: 7600, color: '#c0c0c0' },
                  { name: 'Bronze', value: 2800, color: '#cd7f32' },
                ].map((tier) => (
                  <div key={tier.name}>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-slate-700">{tier.name}</span>
                      <span className="text-sm text-slate-500">{formatNumber(tier.value)} pts</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${(tier.value / 25000) * 100}%`,
                          backgroundColor: tier.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Export Button */}
      <div className="mt-8 flex justify-end">
        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Report
        </button>
      </div>
    </div>
  );
}
