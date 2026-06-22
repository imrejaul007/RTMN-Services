'use client';

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
} from 'recharts';

interface ServiceStatsChartProps {
  requestTrends: Array<{
    date: string;
    requests: number;
    quotes: number;
    orders: number;
    revenue: number;
  }>;
  requestsByCategory: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  revenueByServiceType: Array<{
    serviceType: string;
    revenue: number;
    orders: number;
  }>;
  budgetVsActual: Array<{
    category: string;
    budget: number;
    actual: number;
    variance: number;
  }>;
}

const COLORS = ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-lg p-3 shadow-xl">
        <p className="text-white font-medium mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {typeof entry.value === 'number'
              ? entry.name.toLowerCase().includes('revenue')
                ? `₹${(entry.value / 1000).toFixed(1)}K`
                : entry.value.toLocaleString()
              : entry.value
            }
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value}`;
};

export default function ServiceStatsChart({
  requestTrends,
  requestsByCategory,
  revenueByServiceType,
  budgetVsActual,
}: ServiceStatsChartProps) {
  return (
    <div className="space-y-6">
      {/* Request Trends - Area Chart */}
      <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-white">Request Trends</h3>
            <p className="text-sm text-gray-400 mt-1">Service requests over time</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-violet-500" />
              <span className="text-gray-400">Requests</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-gray-400">Orders</span>
            </div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={requestTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
              <XAxis
                dataKey="date"
                stroke="#6B7280"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#2d2d44' }}
              />
              <YAxis
                stroke="#6B7280"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#2d2d44' }}
                axisLine={{ stroke: '#2d2d44' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="#7C3AED"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorRequests)"
                name="Requests"
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="#10B981"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorOrders)"
                name="Orders"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Revenue Trends - Line Chart */}
      <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">Revenue Trends</h3>
          <p className="text-sm text-gray-400 mt-1">Monthly revenue from services</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={requestTrends} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
              <XAxis
                dataKey="date"
                stroke="#6B7280"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#2d2d44' }}
              />
              <YAxis
                stroke="#6B7280"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#2d2d44' }}
                axisLine={{ stroke: '#2d2d44' }}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#8B5CF6"
                strokeWidth={3}
                dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, fill: '#7C3AED' }}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Two Column Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Requests by Category - Pie Chart */}
        <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Requests by Category</h3>
            <p className="text-sm text-gray-400 mt-1">Distribution of service requests</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative w-48 h-48 flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={requestsByCategory}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="count"
                    nameKey="category"
                  >
                    {requestsByCategory.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">
                    {requestsByCategory.reduce((sum, item) => sum + item.count, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400">Total</p>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-3">
              {requestsByCategory.map((item, index) => (
                <div key={item.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-sm"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-sm text-gray-300 truncate max-w-[120px]">{item.category}</span>
                  </div>
                  <span className="text-sm font-medium text-white">
                    {item.count.toLocaleString()} ({item.percentage}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Revenue by Service Type - Bar Chart */}
        <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-6">
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white">Revenue by Service Type</h3>
            <p className="text-sm text-gray-400 mt-1">Top revenue generating services</p>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={revenueByServiceType}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 80, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" horizontal={false} />
                <XAxis
                  type="number"
                  stroke="#6B7280"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  tickFormatter={formatCurrency}
                />
                <YAxis
                  type="category"
                  dataKey="serviceType"
                  stroke="#6B7280"
                  tick={{ fill: '#9CA3AF', fontSize: 12 }}
                  width={75}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="revenue" fill="#7C3AED" radius={[0, 4, 4, 0]} name="Revenue" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Budget vs Actual - Grouped Bar Chart */}
      <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-2xl p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-white">Budget vs Actual</h3>
          <p className="text-sm text-gray-400 mt-1">Spending against allocated budgets</p>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={budgetVsActual} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2d2d44" />
              <XAxis
                dataKey="category"
                stroke="#6B7280"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#2d2d44' }}
              />
              <YAxis
                stroke="#6B7280"
                tick={{ fill: '#9CA3AF', fontSize: 12 }}
                tickLine={{ stroke: '#2d2d44' }}
                axisLine={{ stroke: '#2d2d44' }}
                tickFormatter={formatCurrency}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: '20px' }}
                formatter={(value) => <span className="text-gray-300">{value}</span>}
              />
              <Bar dataKey="budget" fill="#4B5563" radius={[4, 4, 0, 0]} name="Budget" />
              <Bar dataKey="actual" fill="#7C3AED" radius={[4, 4, 0, 0]} name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
