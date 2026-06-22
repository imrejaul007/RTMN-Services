'use client';

import { useState, useEffect, useCallback } from 'react';
import ServiceStatsChart from '@/components/ServiceStatsChart';
import TopServicesTable from '@/components/TopServicesTable';
import type { ServiceAnalyticsData } from '@/app/api/analytics/services/route';

type DateRange = '7d' | '30d' | '90d' | '1y';

const dateRangeOptions: { value: DateRange; label: string }[] = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '1y', label: 'Last year' },
];

const formatCurrency = (value: number) => {
  if (value >= 1000000) return `₹${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `₹${(value / 1000).toFixed(0)}K`;
  return `₹${value.toLocaleString()}`;
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendLabel,
  accentColor = 'violet',
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: number;
  trendLabel?: string;
  accentColor?: 'violet' | 'emerald' | 'amber' | 'blue' | 'pink';
}) => {
  const colors = {
    violet: 'from-violet-500/20 to-violet-600/10 border-violet-500/30',
    emerald: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    pink: 'from-pink-500/20 to-pink-600/10 border-pink-500/30',
  };

  const iconColors = {
    violet: 'bg-violet-500/20 text-violet-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
    amber: 'bg-amber-500/20 text-amber-400',
    blue: 'bg-blue-500/20 text-blue-400',
    pink: 'bg-pink-500/20 text-pink-400',
  };

  return (
    <div className={`bg-gradient-to-br ${colors[accentColor]} border rounded-2xl p-6`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-white mt-2">{value}</p>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
          {trend !== undefined && (
            <div className="flex items-center gap-1.5 mt-3">
              <span
                className={`text-sm font-medium ${
                  trend >= 0 ? 'text-emerald-400' : 'text-red-400'
                }`}
              >
                {trend >= 0 ? '+' : ''}
                {trend}%
              </span>
              {trendLabel && (
                <span className="text-xs text-gray-500">{trendLabel}</span>
              )}
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconColors[accentColor]}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export default function ServiceAnalyticsPage() {
  const [analyticsData, setAnalyticsData] = useState<ServiceAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/analytics/services?dateRange=${dateRange}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch analytics: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to fetch analytics data');
      }

      setAnalyticsData(result.data);
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
      <div className="min-h-screen bg-[#0f0f1a]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Loading Header */}
          <div className="mb-8">
            <div className="h-8 bg-[#1a1a2e] rounded-lg w-64 animate-pulse" />
            <div className="h-4 bg-[#1a1a2e] rounded w-96 mt-2 animate-pulse" />
          </div>

          {/* Loading Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-[#1a1a2e] rounded-2xl animate-pulse" />
            ))}
          </div>

          {/* Loading Charts */}
          <div className="space-y-6">
            <div className="h-80 bg-[#1a1a2e] rounded-2xl animate-pulse" />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 bg-[#1a1a2e] rounded-2xl animate-pulse" />
              <div className="h-80 bg-[#1a1a2e] rounded-2xl animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0f0f1a] flex items-center justify-center">
        <div className="bg-[#1a1a2e] border border-red-500/30 rounded-2xl p-8 max-w-md text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Failed to Load Analytics</h3>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={fetchAnalytics}
            className="px-6 py-3 bg-violet-600 text-white font-medium rounded-xl hover:bg-violet-500 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!analyticsData) return null;

  return (
    <div className="min-h-screen bg-[#0f0f1a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h1 className="text-2xl font-bold text-white">Service Analytics</h1>
              </div>
              <p className="text-gray-400">
                Track performance metrics and insights for your service marketplace
              </p>
            </div>

            {/* Date Range Selector */}
            <div className="flex items-center gap-2 p-1 bg-[#1a1a2e] rounded-xl border border-[#2d2d44]">
              {dateRangeOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => setDateRange(option.value)}
                  className={`
                    px-4 py-2 text-sm font-medium rounded-lg transition-all
                    ${dateRange === option.value
                      ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/25'
                      : 'text-gray-400 hover:text-white hover:bg-[#2d2d44]'
                    }
                  `}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Total Requests"
            value={analyticsData.totalRequests.toLocaleString()}
            subtitle="Service requests received"
            trend={analyticsData.summary.requestsGrowth}
            trendLabel="vs last period"
            accentColor="violet"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          />
          <StatCard
            title="Total Revenue"
            value={formatCurrency(analyticsData.summary.totalRevenue)}
            subtitle="From completed orders"
            trend={analyticsData.summary.revenueGrowth}
            trendLabel="vs last period"
            accentColor="emerald"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
          <StatCard
            title="Conversion Rate"
            value={`${analyticsData.conversionRate.toFixed(1)}%`}
            subtitle="Quotes to orders"
            accentColor="amber"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            }
          />
          <StatCard
            title="Avg Response Time"
            value={`${analyticsData.avgResponseTime}h`}
            subtitle="Vendor response time"
            accentColor="blue"
            icon={
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
          />
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Quotes</p>
            <p className="text-xl font-bold text-white">{analyticsData.summary.totalQuotes.toLocaleString()}</p>
          </div>
          <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Orders</p>
            <p className="text-xl font-bold text-white">{analyticsData.summary.totalOrders.toLocaleString()}</p>
          </div>
          <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Order Value</p>
            <p className="text-xl font-bold text-white">{formatCurrency(analyticsData.summary.avgOrderValue)}</p>
          </div>
          <div className="bg-[#1a1a2e] border border-[#2d2d44] rounded-xl p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-1">Active Vendors</p>
            <p className="text-xl font-bold text-white">{analyticsData.topVendors.length}</p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="mb-8">
          <ServiceStatsChart
            requestTrends={analyticsData.requestTrends}
            requestsByCategory={analyticsData.requestsByCategory}
            revenueByServiceType={analyticsData.revenueByServiceType}
            budgetVsActual={analyticsData.budgetVsActual}
          />
        </div>

        {/* Tables Section */}
        <TopServicesTable
          topVendors={analyticsData.topVendors}
          revenueByServiceType={analyticsData.revenueByServiceType}
        />

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-[#2d2d44]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-gray-500">
              Last updated: {new Date().toLocaleString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            <div className="flex items-center gap-4">
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-400 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Export Report
              </button>
              <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
