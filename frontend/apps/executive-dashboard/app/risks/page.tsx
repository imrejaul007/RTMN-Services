'use client';

import React, { useState } from 'react';
import { useRisks } from '@/hooks/useDashboard';
import { RiskAlerts, RiskFilters } from '@/components/RiskAlerts';
import { AlertTriangle, Filter, Download, Plus } from 'lucide-react';
import { clsx } from 'clsx';

export default function RisksPage() {
  const { risks, loading, error } = useRisks();
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredRisks = risks.filter(risk => {
    if (selectedSeverity && risk.severity !== selectedSeverity) return false;
    if (selectedCategory && risk.category !== selectedCategory) return false;
    return true;
  });

  const riskStats = {
    total: risks.length,
    critical: risks.filter(r => r.severity === 'critical').length,
    high: risks.filter(r => r.severity === 'high').length,
    medium: risks.filter(r => r.severity === 'medium').length,
    low: risks.filter(r => r.severity === 'low').length,
    active: risks.filter(r => r.status === 'active').length,
    mitigated: risks.filter(r => r.status === 'mitigated').length,
    monitoring: risks.filter(r => r.status === 'monitoring').length
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-500">Loading risks...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-danger-600 font-medium">Error loading risks</p>
          <p className="text-gray-500 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Risk Management</h1>
          <p className="text-gray-500 mt-1">Monitor and mitigate business risks</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium">
            <Download className="w-4 h-4" />
            Export
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-medium">
            <Plus className="w-4 h-4" />
            Add Risk
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Total Risks</p>
          <p className="text-2xl font-bold text-gray-900">{riskStats.total}</p>
        </div>
        <div className="bg-danger-50 rounded-xl border border-danger-200 p-4">
          <p className="text-xs text-danger-600 mb-1">Critical</p>
          <p className="text-2xl font-bold text-danger-700">{riskStats.critical}</p>
        </div>
        <div className="bg-warning-50 rounded-xl border border-warning-200 p-4">
          <p className="text-xs text-warning-600 mb-1">High</p>
          <p className="text-2xl font-bold text-warning-700">{riskStats.high}</p>
        </div>
        <div className="bg-primary-50 rounded-xl border border-primary-200 p-4">
          <p className="text-xs text-primary-600 mb-1">Medium</p>
          <p className="text-2xl font-bold text-primary-700">{riskStats.medium}</p>
        </div>
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-500 mb-1">Low</p>
          <p className="text-2xl font-bold text-gray-700">{riskStats.low}</p>
        </div>
        <div className="bg-danger-50 rounded-xl border border-danger-200 p-4">
          <p className="text-xs text-danger-600 mb-1">Active</p>
          <p className="text-2xl font-bold text-danger-700">{riskStats.active}</p>
        </div>
        <div className="bg-warning-50 rounded-xl border border-warning-200 p-4">
          <p className="text-xs text-warning-600 mb-1">Monitoring</p>
          <p className="text-2xl font-bold text-warning-700">{riskStats.monitoring}</p>
        </div>
        <div className="bg-success-50 rounded-xl border border-success-200 p-4">
          <p className="text-xs text-success-600 mb-1">Mitigated</p>
          <p className="text-2xl font-bold text-success-700">{riskStats.mitigated}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
        <RiskFilters
          selectedSeverity={selectedSeverity}
          selectedCategory={selectedCategory}
          onSeverityChange={setSelectedSeverity}
          onCategoryChange={setSelectedCategory}
        />
        <div className="flex items-center gap-4 text-sm text-gray-500">
          <span>Showing {filteredRisks.length} of {risks.length} risks</span>
          {(selectedSeverity || selectedCategory) && (
            <button
              onClick={() => {
                setSelectedSeverity(null);
                setSelectedCategory(null);
              }}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Risk List */}
      <RiskAlerts risks={filteredRisks} />

      {/* Risk Matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Impact Matrix</h3>
        <div className="grid grid-cols-10 gap-1">
          {/* Y-axis label */}
          <div className="col-span-1 flex items-center justify-center">
            <span className="text-xs text-gray-500 transform -rotate-90 whitespace-nowrap">Impact</span>
          </div>
          {/* Matrix grid */}
          <div className="col-span-9 grid grid-cols-10 gap-1">
            {/* Column headers */}
            <div></div>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((p) => (
              <div key={p} className="text-center text-xs text-gray-400">{p * 10}</div>
            ))}
            {/* Rows */}
            {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((impact) => (
              <React.Fragment key={impact}>
                <div className="text-center text-xs text-gray-400">{impact}</div>
                {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((prob) => {
                  const matchingRisks = risks.filter(r => r.impact === impact && r.probability >= prob && r.probability < prob + 10);
                  return (
                    <div
                      key={prob}
                      className={clsx(
                        'h-8 rounded flex items-center justify-center text-xs font-medium',
                        impact >= 8 && prob >= 60 ? 'bg-danger-200 text-danger-800' :
                        impact >= 6 && prob >= 50 ? 'bg-warning-200 text-warning-800' :
                        'bg-gray-100 text-gray-500'
                      )}
                    >
                      {matchingRisks.length > 0 && matchingRisks.length}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
          {/* X-axis label */}
          <div className="col-span-10 flex items-center justify-center mt-2">
            <span className="text-xs text-gray-500">Probability</span>
          </div>
        </div>
      </div>
    </div>
  );
}
