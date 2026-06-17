'use client';

import React from 'react';
import { useDashboard } from '@/hooks/useDashboard';
import { MetricGrid } from '@/components/MetricCard';
import { RevenueChart, ExpensesBreakdown } from '@/components/Charts';
import { HealthScore } from '@/components/HealthScore';
import { RiskAlerts } from '@/components/RiskAlerts';
import { Opportunities } from '@/components/Opportunities';
import { Calendar, Clock, Lightbulb, TrendingUp, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function DashboardPage() {
  const { metrics, revenue, healthScore, risks, opportunities, briefing, loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-danger-600 font-medium">Error loading dashboard</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const criticalRisks = risks.filter(r => r.severity === 'critical' || r.severity === 'high').slice(0, 3);
  const topOpportunities = opportunities.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Executive Overview</h1>
          <p className="text-gray-500 mt-1">Real-time business intelligence and key metrics</p>
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span className="flex items-center gap-1">
            <Calendar className="w-4 h-4" />
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            Last updated: {new Date().toLocaleTimeString()}
          </span>
        </div>
      </div>

      {/* Key Metrics */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h2>
        <MetricGrid metrics={metrics} />
      </section>

      {/* Charts Row */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RevenueChart data={revenue} />
        </div>
        <div>
          <HealthScore healthScore={healthScore!} />
        </div>
      </section>

      {/* Risks and Opportunities */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RiskAlerts
          risks={criticalRisks}
          maxItems={3}
          showViewAll
          onViewAll={() => {}}
        />
        <Opportunities
          opportunities={topOpportunities}
          maxItems={3}
          showViewAll
          onViewAll={() => {}}
        />
      </section>

      {/* AI Insights & Daily Briefing */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Recommendations */}
        <div className="lg:col-span-2 bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-6 border border-primary-200">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center">
              <Lightbulb className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">AI Recommendations</h3>
              <p className="text-xs text-primary-700">Based on current data analysis</p>
            </div>
          </div>
          <div className="space-y-3">
            {briefing?.recommendations.slice(0, 3).map((rec) => (
              <div key={rec.id} className="bg-white rounded-lg p-4 shadow-sm">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx(
                        'px-2 py-0.5 text-xs font-medium rounded-full',
                        rec.impact === 'high' ? 'bg-success-100 text-success-700' :
                        rec.impact === 'medium' ? 'bg-warning-100 text-warning-700' :
                        'bg-gray-100 text-gray-700'
                      )}>
                        {rec.impact} impact
                      </span>
                      <span className="text-xs text-gray-400">{rec.confidence}% confidence</span>
                    </div>
                    <h4 className="font-medium text-gray-900">{rec.title}</h4>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{rec.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/ai-briefing"
            className="flex items-center justify-center gap-2 mt-4 text-sm font-medium text-primary-700 hover:text-primary-800"
          >
            View Full AI Briefing <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-primary-600" />
            Quick Stats
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Active Risks</span>
              <span className="font-semibold text-danger-600">{risks.filter(r => r.status === 'active').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Pipeline Value</span>
              <span className="font-semibold text-primary-600">
                ${(opportunities.reduce((s, o) => s + o.value * o.probability / 100, 0) / 1000000).toFixed(1)}M
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">Health Score</span>
              <span className="font-semibold text-success-600">{healthScore?.overall}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span className="text-sm text-gray-600">YoY Growth</span>
              <span className="font-semibold text-success-600">+18.2%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Alerts Section */}
      {briefing?.alerts && briefing.alerts.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Today's Alerts</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {briefing.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={clsx(
                  'p-4 rounded-lg border',
                  alert.type === 'critical' ? 'bg-danger-50 border-danger-200' :
                  alert.type === 'warning' ? 'bg-warning-50 border-warning-200' :
                  alert.type === 'success' ? 'bg-success-50 border-success-200' :
                  'bg-primary-50 border-primary-200'
                )}
              >
                <p className={clsx(
                  'text-sm font-medium mb-1',
                  alert.type === 'critical' ? 'text-danger-700' :
                  alert.type === 'warning' ? 'text-warning-700' :
                  alert.type === 'success' ? 'text-success-700' :
                  'text-primary-700'
                )}>
                  {alert.title}
                </p>
                <p className="text-sm text-gray-600">{alert.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
