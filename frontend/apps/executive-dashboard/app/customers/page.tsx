'use client';

import React from 'react';
import { BarChart3, Users, TrendingUp, TrendingDown, Star, ThumbsUp, Heart, RefreshCw, Download, Filter } from 'lucide-react';
import { clsx } from 'clsx';

// Mock customer data
const customerMetrics = [
  { id: 'nps', label: 'NPS Score', value: 72, change: 5, target: 75, trend: 'up' },
  { id: 'csat', label: 'CSAT', value: 94, change: 2.3, target: 95, trend: 'up' },
  { id: 'ces', label: 'CES', value: 4.2, change: 0.3, target: 4.5, trend: 'up' },
  { id: 'retention', label: 'Retention Rate', value: 97.9, change: 1.2, target: 98, trend: 'up' },
  { id: 'churn', label: 'Churn Rate', value: 2.1, change: -0.5, target: 1.5, trend: 'down' },
  { id: 'ltv', label: 'Customer LTV', value: 4200, change: 12, target: 5000, trend: 'up', format: 'currency' }
];

const customerSegments = [
  { name: 'Enterprise', count: 45, revenue: 1800000, growth: 15, color: 'bg-primary-500' },
  { name: 'Mid-Market', count: 180, revenue: 540000, growth: 22, color: 'bg-success-500' },
  { name: 'SMB', count: 420, revenue: 168000, growth: 8, color: 'bg-warning-500' },
  { name: 'Startup', count: 280, revenue: 84000, growth: 35, color: 'bg-purple-500' }
];

const topCustomers = [
  { id: 1, name: 'TechCorp Industries', segment: 'Enterprise', arr: 450000, health: 92, lastActivity: '2 hours ago' },
  { id: 2, name: 'Global Solutions Ltd', segment: 'Enterprise', arr: 380000, health: 88, lastActivity: '5 hours ago' },
  { id: 3, name: 'InnovateTech', segment: 'Mid-Market', arr: 120000, health: 95, lastActivity: '1 day ago' },
  { id: 4, name: 'DataDriven Inc', segment: 'Mid-Market', arr: 95000, health: 82, lastActivity: '3 days ago' },
  { id: 5, name: 'CloudFirst', segment: 'Startup', arr: 48000, health: 90, lastActivity: '6 hours ago' }
];

const satisfactionBreakdown = [
  { label: 'Very Satisfied', value: 58, color: 'bg-success-500' },
  { label: 'Satisfied', value: 31, color: 'bg-primary-500' },
  { label: 'Neutral', value: 7, color: 'bg-warning-500' },
  { label: 'Dissatisfied', value: 3, color: 'bg-danger-500' },
  { label: 'Very Dissatisfied', value: 1, color: 'bg-danger-600' }
];

export default function CustomersPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Insights</h1>
          <p className="text-gray-500 mt-1">Monitor customer health, satisfaction, and engagement</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            <Download className="w-4 h-4" />
            Export Report
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
            <Users className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Key Customer Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {customerMetrics.map((metric) => (
          <div key={metric.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{metric.label}</span>
              <span className={clsx(
                'flex items-center gap-0.5 text-xs font-medium',
                metric.trend === 'up' ? 'text-success-600' : 'text-success-600'
              )}>
                {metric.trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {metric.change > 0 ? '+' : ''}{metric.change}
              </span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {metric.format === 'currency' ? `$${(metric.value / 1000).toFixed(0)}K` : metric.value}
              {metric.format === 'percent' ? '%' : metric.id === 'nps' || metric.id === 'ces' ? '' : '%'}
            </p>
            <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
              <span>Target:</span>
              <span className="text-gray-600">{metric.target}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* NPS Trend */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">NPS Score</h3>
            <span className="text-xs text-gray-500">Last 12 months</span>
          </div>
          <div className="relative">
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-danger-500 via-warning-500 to-success-500 rounded-full" />
            </div>
            <div className="mt-4 flex justify-between text-xs text-gray-500">
              <span>Detractors (0-30)</span>
              <span>Passive (31-70)</span>
              <span>Promoters (71-100)</span>
            </div>
          </div>
          <div className="mt-6 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold text-primary-600">72</div>
              <div className="text-sm text-gray-500 mt-1">Current NPS</div>
            </div>
          </div>
        </div>

        {/* Customer Satisfaction */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Satisfaction Breakdown</h3>
          <div className="space-y-3">
            {satisfactionBreakdown.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">{item.label}</span>
                  <span className="font-medium text-gray-900">{item.value}%</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={clsx('h-full rounded-full', item.color)}
                    style={{ width: `${item.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Health Score */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Health Score Distribution</h3>
          <div className="flex items-center justify-center h-40">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#f3f4f6"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#22c55e"
                  strokeWidth="3"
                  strokeDasharray="87, 100"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-gray-900">87</span>
                <span className="text-xs text-gray-500">Average</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 text-center text-xs">
            <div>
              <div className="text-lg font-bold text-success-600">45%</div>
              <div className="text-gray-500">Healthy</div>
            </div>
            <div>
              <div className="text-lg font-bold text-warning-600">35%</div>
              <div className="text-gray-500">At Risk</div>
            </div>
            <div>
              <div className="text-lg font-bold text-danger-600">20%</div>
              <div className="text-gray-500">Critical</div>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Segments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Segments</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {customerSegments.map((segment) => (
            <div key={segment.name} className="p-4 bg-gray-50 rounded-xl">
              <div className="flex items-center gap-2 mb-3">
                <div className={clsx('w-3 h-3 rounded-full', segment.color)} />
                <span className="font-medium text-gray-900">{segment.name}</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Customers</span>
                  <span className="font-medium">{segment.count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Revenue</span>
                  <span className="font-medium">${(segment.revenue / 1000).toFixed(0)}K</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Growth</span>
                  <span className="font-medium text-success-600">+{segment.growth}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Top Customers by ARR</h3>
          <button className="text-sm text-primary-600 hover:text-primary-700 font-medium">View All</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-gray-500 border-b border-gray-100">
                <th className="pb-3 font-medium">Customer</th>
                <th className="pb-3 font-medium">Segment</th>
                <th className="pb-3 font-medium">ARR</th>
                <th className="pb-3 font-medium">Health</th>
                <th className="pb-3 font-medium">Last Activity</th>
              </tr>
            </thead>
            <tbody>
              {topCustomers.map((customer) => (
                <tr key={customer.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-700">
                          {customer.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">{customer.name}</span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                      {customer.segment}
                    </span>
                  </td>
                  <td className="py-4 font-medium text-gray-900">${(customer.arr / 1000).toFixed(0)}K</td>
                  <td className="py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={clsx(
                            'h-full rounded-full',
                            customer.health >= 80 ? 'bg-success-500' :
                            customer.health >= 60 ? 'bg-warning-500' : 'bg-danger-500'
                          )}
                          style={{ width: `${customer.health}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{customer.health}</span>
                    </div>
                  </td>
                  <td className="py-4 text-sm text-gray-500">{customer.lastActivity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
