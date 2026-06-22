'use client';

import { useState, useEffect, useCallback } from 'react'

// Secure random number for placeholder data
function secureRandom(): number {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return array[0] / (0xFFFFFFFF + 1);
}

interface AnalyticsData {
  totalSpend: number;
  ordersThisMonth: number;
  topSupplier: { supplierId: string; supplierName: string; spend: number } | null;
  avgOrderValue: number;
  spendByCategory: Array<{ category: string; spend: number }>;
  spendBySupplier: Array<{ supplierId: string; supplierName: string; spend: number }>;
  orderTrends: Array<{ date: string; count: number; value: number }>;
  topReorderedItems: Array<{ productId: string; productName: string; count: number }>;
}

type DateRange = '7d' | '30d' | '90d' | '1y';

// Mock data
const mockAnalyticsData: AnalyticsData = {
  totalSpend: 485000,
  ordersThisMonth: 24,
  topSupplier: {
    supplierId: 'sup-1',
    supplierName: 'Fresh Foods Distributors',
    spend: 156000,
  },
  avgOrderValue: 20208,
  spendByCategory: [
    { category: 'Grains & Rice', spend: 125000 },
    { category: 'Spices & Masalas', spend: 98000 },
    { category: 'Oils & Ghee', spend: 85000 },
    { category: 'Pulses & Legumes', spend: 72000 },
    { category: 'Dairy', spend: 55000 },
    { category: 'Other', spend: 50000 },
  ],
  spendBySupplier: [
    { supplierId: 'sup-1', supplierName: 'Fresh Foods Distributors', spend: 156000 },
    { supplierId: 'sup-2', supplierName: 'Premium Spices Co.', spend: 142000 },
    { supplierId: 'sup-3', supplierName: 'Quality Provisions Ltd.', spend: 187000 },
  ],
  orderTrends: [
    { date: '2024-01', count: 18, value: 320000 },
    { date: '2024-02', count: 22, value: 385000 },
    { date: '2024-03', count: 20, value: 360000 },
    { date: '2024-04', count: 24, value: 485000 },
  ],
  topReorderedItems: [
    { productId: 'prod-1', productName: 'Basmati Rice - Premium', count: 12 },
    { productId: 'prod-3', productName: 'Tur Dal (Arhar)', count: 10 },
    { productId: 'prod-5', productName: 'Turmeric Powder', count: 9 },
    { productId: 'prod-2', productName: 'Refined Sunflower Oil', count: 8 },
    { productId: 'prod-7', productName: 'Besan (Gram Flour)', count: 7 },
  ],
};

const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
];

export default function AnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      // In production, this would call the API with the date range
      setAnalyticsData(mockAnalyticsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-28 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-gray-200 rounded-xl animate-pulse" />
          <div className="h-80 bg-gray-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium">{error}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (!analyticsData) return null;

  const maxCategorySpend = Math.max(...analyticsData.spendByCategory.map(c => c.spend));
  const maxSupplierSpend = Math.max(...analyticsData.spendBySupplier.map(s => s.spend));

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Procurement Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">
            Insights into your purchasing patterns
          </p>
        </div>
        <div className="flex gap-2">
          {dateRangeOptions.map(option => (
            <button
              key={option.value}
              onClick={() => setDateRange(option.value)}
              className={`
                px-3 py-1.5 text-sm font-medium rounded-lg transition-colors
                ${dateRange === option.value
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}
              `}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Spend</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₹{analyticsData.totalSpend.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Orders This Month</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {analyticsData.ordersThisMonth}
              </p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Top Supplier</p>
              <p className="text-lg font-bold text-gray-900 mt-1 truncate max-w-[150px]">
                {analyticsData.topSupplier?.supplierName || 'N/A'}
              </p>
            </div>
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
          {analyticsData.topSupplier && (
            <p className="text-xs text-gray-500 mt-1">
              ₹{analyticsData.topSupplier.spend.toLocaleString('en-IN')}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Order Value</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                ₹{analyticsData.avgOrderValue.toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Spend by Category - Pie Chart Placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Spend by Category</h3>
          <div className="flex items-center gap-8">
            {/* Pie Chart Placeholder */}
            <div className="relative w-40 h-40 flex-shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                {(() => {
                  let currentAngle = 0;
                  return analyticsData.spendByCategory.map((item, index) => {
                    const percentage = item.spend / analyticsData.totalSpend;
                    const angle = percentage * 360;
                    const startAngle = currentAngle;
                    currentAngle += angle;

                    const x1 = 50 + 45 * Math.cos((startAngle * Math.PI) / 180);
                    const y1 = 50 + 45 * Math.sin((startAngle * Math.PI) / 180);
                    const x2 = 50 + 45 * Math.cos(((startAngle + angle) * Math.PI) / 180);
                    const y2 = 50 + 45 * Math.sin(((startAngle + angle) * Math.PI) / 180);

                    const largeArc = angle > 180 ? 1 : 0;

                    const colors = ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'];
                    const color = colors[index % colors.length];

                    return (
                      <path
                        key={item.category}
                        d={`M 50 50 L ${x1} ${y1} A 45 45 0 ${largeArc} 1 ${x2} ${y2} Z`}
                        fill={color}
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    );
                  });
                })()}
                <circle cx="50" cy="50" r="25" fill="white" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-gray-600">
                  ₹{(analyticsData.totalSpend / 100000).toFixed(1)}L
                </span>
              </div>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-2">
              {analyticsData.spendByCategory.map((item, index) => {
                const colors = ['#7C3AED', '#8B5CF6', '#A78BFA', '#C4B5FD', '#DDD6FE', '#EDE9FE'];
                return (
                  <div key={item.category} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-sm"
                        style={{ backgroundColor: colors[index % colors.length] }}
                      />
                      <span className="text-gray-600 truncate max-w-[120px]">{item.category}</span>
                    </div>
                    <span className="font-medium text-gray-900">
                      ₹{(item.spend / 1000).toFixed(0)}K
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Spend by Supplier - Bar Chart Placeholder */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Spend by Supplier</h3>
          <div className="space-y-4">
            {analyticsData.spendBySupplier.map((supplier, index) => {
              const width = (supplier.spend / maxSupplierSpend) * 100;
              const colors = ['#7C3AED', '#10B981', '#F59E0B'];
              return (
                <div key={supplier.supplierId}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-600 truncate">{supplier.supplierName}</span>
                    <span className="font-medium text-gray-900">
                      ₹{(supplier.spend / 1000).toFixed(0)}K
                    </span>
                  </div>
                  <div className="h-6 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${width}%`,
                        backgroundColor: colors[index % colors.length],
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order Trends - Line Chart Placeholder */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Order Trends</h3>
        <div className="h-64 flex items-end justify-between gap-4">
          {analyticsData.orderTrends.map((trend, index) => {
            const maxValue = Math.max(...analyticsData.orderTrends.map(t => t.value));
            const height = (trend.value / maxValue) * 100;
            return (
              <div key={trend.date} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-gradient-to-t from-[#7C3AED] to-[#8B5CF6] rounded-t-lg transition-all duration-500 hover:opacity-80 cursor-pointer"
                  style={{ height: `${height}%`, minHeight: '20px' }}
                />
                <div className="mt-2 text-xs text-gray-500">{trend.date}</div>
                <div className="text-xs font-medium text-gray-700">
                  {trend.count} orders
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Reordered Items */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Top Reordered Items</h3>
          <div className="space-y-3">
            {analyticsData.topReorderedItems.map((item, index) => (
              <div key={item.productId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center text-xs font-medium text-gray-600">
                    {index + 1}
                  </span>
                  <span className="text-sm text-gray-900">{item.productName}</span>
                </div>
                <span className="text-sm font-medium text-gray-600">
                  {item.count} orders
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Supplier Comparison */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Supplier Comparison</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="pb-3">Supplier</th>
                  <th className="pb-3 text-right">Orders</th>
                  <th className="pb-3 text-right">Spend</th>
                  <th className="pb-3 text-right">Avg Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analyticsData.spendBySupplier.map(supplier => {
                  // Statistical simulation: placeholder order count 5-14 for demo
                  const orders = Math.floor(secureRandom() * 10) + 5;
                  return (
                    <tr key={supplier.supplierId}>
                      <td className="py-3 text-sm text-gray-900">{supplier.supplierName}</td>
                      <td className="py-3 text-sm text-gray-600 text-right">{orders}</td>
                      <td className="py-3 text-sm font-medium text-gray-900 text-right">
                        ₹{(supplier.spend / 1000).toFixed(0)}K
                      </td>
                      <td className="py-3 text-sm text-gray-600 text-right">
                        ₹{Math.round(supplier.spend / orders).toLocaleString('en-IN')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Chart Coming Soon Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-amber-900 mb-1">Enhanced Analytics Coming Soon</h3>
        <p className="text-sm text-amber-700 max-w-md mx-auto">
          We are working on adding more detailed charts, budget tracking, and predictive analytics.
        </p>
      </div>
    </div>
  );
}
