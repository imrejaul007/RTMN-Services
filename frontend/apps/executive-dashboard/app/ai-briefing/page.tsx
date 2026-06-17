'use client';

import React from 'react';
import { useBriefing } from '@/hooks/useDashboard';
import {
  Newspaper,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Target,
  Clock,
  CheckCircle,
  DollarSign,
  Bot,
  ChevronRight,
  RefreshCw,
  Download,
  Calendar
} from 'lucide-react';
import { clsx } from 'clsx';

export default function AIBriefingPage() {
  const { briefing, loading, error } = useBriefing();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading AI briefing...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-danger-600 font-medium">Error loading briefing</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  if (!briefing) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-gray-500">No briefing data available</p>
        </div>
      </div>
    );
  }

  const recommendationsByCategory = briefing.recommendations.reduce((acc, rec) => {
    if (!acc[rec.category]) acc[rec.category] = [];
    acc[rec.category].push(rec);
    return acc;
  }, {} as Record<string, typeof briefing.recommendations>);

  const categoryConfig = {
    growth: { icon: TrendingUp, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Growth' },
    efficiency: { icon: Target, color: 'text-success-600', bg: 'bg-success-50', label: 'Efficiency' },
    risk_mitigation: { icon: AlertTriangle, color: 'text-warning-600', bg: 'bg-warning-50', label: 'Risk Mitigation' },
    customer: { icon: Bot, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Customer' },
    operations: { icon: CheckCircle, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Operations' }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
              <Newspaper className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Daily AI Briefing</h1>
              <p className="text-gray-500">Executive intelligence and recommendations</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            <Calendar className="w-4 h-4" />
            {new Date(briefing.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Banner */}
      <div className="bg-gradient-to-r from-primary-600 via-primary-500 to-primary-400 rounded-2xl p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-xl font-semibold mb-2">Executive Summary</h2>
            <p className="text-primary-100 leading-relaxed">{briefing.summary}</p>
          </div>
          <div className="flex items-center gap-2 text-primary-100">
            <Clock className="w-4 h-4" />
            <span className="text-sm">Updated {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {briefing.alerts.length > 0 && (
        <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning-600" />
            Priority Alerts
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {briefing.alerts.map((alert, idx) => (
              <div
                key={idx}
                className={clsx(
                  'p-4 rounded-xl border-2',
                  alert.type === 'critical' ? 'bg-danger-50 border-danger-200' :
                  alert.type === 'warning' ? 'bg-warning-50 border-warning-200' :
                  alert.type === 'success' ? 'bg-success-50 border-success-200' :
                  'bg-primary-50 border-primary-200'
                )}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className={clsx(
                    'w-2 h-2 rounded-full',
                    alert.type === 'critical' ? 'bg-danger-500' :
                    alert.type === 'warning' ? 'bg-warning-500' :
                    alert.type === 'success' ? 'bg-success-500' : 'bg-primary-500'
                  )} />
                  <span className={clsx(
                    'text-xs font-medium uppercase',
                    alert.type === 'critical' ? 'text-danger-700' :
                    alert.type === 'warning' ? 'text-warning-700' :
                    alert.type === 'success' ? 'text-success-700' : 'text-primary-700'
                  )}>
                    {alert.type}
                  </span>
                </div>
                <h4 className="font-medium text-gray-900 mb-1">{alert.title}</h4>
                <p className="text-sm text-gray-600">{alert.message}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key Highlights */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-success-600" />
          Key Highlights Today
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {briefing.keyHighlights.map((highlight, idx) => (
            <div key={idx} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="w-8 h-8 rounded-lg bg-success-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-4 h-4 text-success-600" />
              </div>
              <p className="text-sm text-gray-700">{highlight}</p>
            </div>
          ))}
        </div>
      </section>

      {/* AI Recommendations */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary-600" />
            AI Recommendations
          </h3>
          <span className="text-sm text-gray-500">
            {briefing.recommendations.length} recommendations
          </span>
        </div>

        {/* Priority Sort */}
        <div className="flex gap-3 mb-6">
          {['All', 'High Impact', 'Quick Wins', 'Strategic'].map((filter) => (
            <button
              key={filter}
              className={clsx(
                'px-4 py-2 text-sm font-medium rounded-lg transition-colors',
                filter === 'All' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* Recommendations by Category */}
        <div className="space-y-6">
          {Object.entries(recommendationsByCategory).map(([category, recs]) => {
            const config = categoryConfig[category as keyof typeof categoryConfig] || categoryConfig.operations;
            const Icon = config.icon;

            return (
              <div key={category} className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', config.bg)}>
                    <Icon className={clsx('w-4 h-4', config.color)} />
                  </div>
                  <h4 className="font-medium text-gray-900">{config.label}</h4>
                  <span className="text-xs text-gray-400">({recs.length})</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {recs.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-5 bg-gray-50 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50/30 transition-colors cursor-pointer"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={clsx(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            rec.impact === 'high' ? 'bg-success-100 text-success-700' :
                            rec.impact === 'medium' ? 'bg-warning-100 text-warning-700' :
                            'bg-gray-100 text-gray-700'
                          )}>
                            {rec.impact} impact
                          </span>
                          <span className={clsx(
                            'px-2 py-0.5 text-xs font-medium rounded-full',
                            rec.effort === 'low' ? 'bg-primary-100 text-primary-700' :
                            rec.effort === 'medium' ? 'bg-warning-100 text-warning-700' :
                            'bg-danger-100 text-danger-700'
                          )}>
                            {rec.effort} effort
                          </span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <span className="font-medium">{rec.confidence}%</span>
                          <span>confidence</span>
                        </div>
                      </div>

                      <h4 className="font-semibold text-gray-900 mb-2">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mb-4">{rec.description}</p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            {rec.category.replace('_', ' ')}
                          </span>
                        </div>
                        <button className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium">
                          Details <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Metrics */}
      <section className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary-600" />
          Quick Metrics
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {briefing.metrics.map((metric) => (
            <div key={metric.id} className="p-4 bg-gray-50 rounded-xl text-center">
              <p className="text-xs text-gray-500 mb-1">{metric.label}</p>
              <p className="text-xl font-bold text-gray-900">{metric.value}</p>
              <p className={clsx(
                'text-xs mt-1',
                metric.change >= 0 ? 'text-success-600' : 'text-danger-600'
              )}>
                {metric.change >= 0 ? '+' : ''}{metric.change}%
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Action Items */}
      <section className="bg-gradient-to-br from-warning-50 to-warning-100 rounded-xl border border-warning-200 p-6">
        <h3 className="text-lg font-semibold text-warning-800 mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          Action Items
        </h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
            <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Review SOC 2 audit requirements</p>
              <p className="text-xs text-gray-500">Due in 14 days</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
            <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Approve TechCorp partnership proposal</p>
              <p className="text-xs text-gray-500">$3.6M value - 75% probability</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 bg-white rounded-lg">
            <input type="checkbox" className="w-5 h-5 text-primary-600 rounded" />
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Schedule supplier diversification meeting</p>
              <p className="text-xs text-gray-500">Risk mitigation initiative</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
