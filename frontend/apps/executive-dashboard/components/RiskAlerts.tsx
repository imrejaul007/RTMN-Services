'use client';

import React from 'react';
import { AlertTriangle, AlertCircle, Info, CheckCircle, ChevronRight, Filter } from 'lucide-react';
import type { Risk } from '@/lib/types';
import { clsx } from 'clsx';

interface RiskAlertsProps {
  risks: Risk[];
  className?: string;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const severityConfig = {
  critical: {
    icon: AlertCircle,
    color: 'text-danger-600',
    bg: 'bg-danger-50 border-danger-200',
    label: 'Critical'
  },
  high: {
    icon: AlertTriangle,
    color: 'text-warning-600',
    bg: 'bg-warning-50 border-warning-200',
    label: 'High'
  },
  medium: {
    icon: Info,
    color: 'text-primary-600',
    bg: 'bg-primary-50 border-primary-200',
    label: 'Medium'
  },
  low: {
    icon: CheckCircle,
    color: 'text-success-600',
    bg: 'bg-success-50 border-success-200',
    label: 'Low'
  }
};

const statusConfig = {
  active: { label: 'Active', color: 'bg-danger-500' },
  mitigated: { label: 'Mitigated', color: 'bg-success-500' },
  monitoring: { label: 'Monitoring', color: 'bg-warning-500' }
};

const categoryLabels = {
  financial: 'Financial',
  operational: 'Operational',
  market: 'Market',
  regulatory: 'Regulatory',
  technical: 'Technical'
};

export function RiskAlerts({ risks, className, maxItems, showViewAll, onViewAll }: RiskAlertsProps) {
  const displayRisks = maxItems ? risks.slice(0, maxItems) : risks;

  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-100', className)}>
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Risk Alerts</h3>
            <span className="px-2 py-0.5 bg-danger-100 text-danger-700 text-xs font-medium rounded-full">
              {risks.filter(r => r.status === 'active').length} Active
            </span>
          </div>
          {showViewAll && (
            <button
              onClick={onViewAll}
              className="flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              View All <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {displayRisks.map((risk) => {
          const config = severityConfig[risk.severity];
          const Icon = config.icon;
          const statusInfo = statusConfig[risk.status];

          return (
            <div
              key={risk.id}
              className={clsx('p-4 hover:bg-gray-50 transition-colors cursor-pointer', config.bg)}
            >
              <div className="flex items-start gap-3">
                <div className={clsx('mt-0.5', config.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">{risk.title}</h4>
                    <span className={clsx(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      config.color.replace('text-', 'bg-').replace('-600', '-100'),
                      config.color.replace('text-', 'text-')
                    )}>
                      {config.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{risk.description}</p>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <span className={clsx('w-2 h-2 rounded-full', statusInfo.color)} />
                      {statusInfo.label}
                    </span>
                    <span>{categoryLabels[risk.category]}</span>
                    <span>P: {risk.probability}%</span>
                    <span>Impact: {risk.impact}/10</span>
                    {risk.owner && <span>Owner: {risk.owner}</span>}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayRisks.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <CheckCircle className="w-12 h-12 mx-auto mb-2 text-success-400" />
          <p>No active risks to display</p>
        </div>
      )}
    </div>
  );
}

interface RiskFiltersProps {
  selectedSeverity: string | null;
  selectedCategory: string | null;
  onSeverityChange: (severity: string | null) => void;
  onCategoryChange: (category: string | null) => void;
}

export function RiskFilters({
  selectedSeverity,
  selectedCategory,
  onSeverityChange,
  onCategoryChange
}: RiskFiltersProps) {
  return (
    <div className="flex items-center gap-4 mb-4">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">Filters:</span>
      </div>
      <div className="flex gap-2">
        {['critical', 'high', 'medium', 'low'].map((severity) => (
          <button
            key={severity}
            onClick={() => onSeverityChange(selectedSeverity === severity ? null : severity)}
            className={clsx(
              'px-3 py-1 text-xs font-medium rounded-full transition-colors',
              selectedSeverity === severity
                ? severityConfig[severity as keyof typeof severityConfig].bg +
                  ' ' + severityConfig[severity as keyof typeof severityConfig].color
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {severityConfig[severity as keyof typeof severityConfig].label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default RiskAlerts;
