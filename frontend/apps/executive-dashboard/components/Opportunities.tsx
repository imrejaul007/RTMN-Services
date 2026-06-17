'use client';

import React from 'react';
import { TrendingUp, Target, Clock, ChevronRight, DollarSign, Users, Zap, Building, Handshake, Cpu } from 'lucide-react';
import type { Opportunity } from '@/lib/types';
import { clsx } from 'clsx';

interface OpportunitiesProps {
  opportunities: Opportunity[];
  className?: string;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const categoryConfig = {
  expansion: { icon: TrendingUp, color: 'text-primary-600', bg: 'bg-primary-50', label: 'Expansion' },
  new_market: { icon: Building, color: 'text-purple-600', bg: 'bg-purple-50', label: 'New Market' },
  efficiency: { icon: Zap, color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Efficiency' },
  partnership: { icon: Handshake, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Partnership' },
  technology: { icon: Cpu, color: 'text-cyan-600', bg: 'bg-cyan-50', label: 'Technology' }
};

const statusConfig = {
  identified: { label: 'Identified', color: 'bg-gray-500' },
  qualified: { label: 'Qualified', color: 'bg-blue-500' },
  pursuing: { label: 'Pursuing', color: 'bg-yellow-500' },
  won: { label: 'Won', color: 'bg-success-500' },
  lost: { label: 'Lost', color: 'bg-danger-500' }
};

function formatCurrency(value: number): string {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

function ProbabilityBar({ probability }: { probability: number }) {
  return (
    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
      <div
        className={clsx(
          'h-full rounded-full transition-all',
          probability >= 75 ? 'bg-success-500' : probability >= 50 ? 'bg-yellow-500' : 'bg-primary-500'
        )}
        style={{ width: `${probability}%` }}
      />
    </div>
  );
}

export function Opportunities({ opportunities, className, maxItems, showViewAll, onViewAll }: OpportunitiesProps) {
  const displayOpps = maxItems ? opportunities.slice(0, maxItems) : opportunities;
  const totalValue = opportunities.reduce((sum, opp) => sum + (opp.status !== 'lost' && opp.status !== 'won' ? opp.value : 0), 0);

  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-100', className)}>
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900">Opportunities</h3>
            <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs font-medium rounded-full">
              {opportunities.filter(o => o.status === 'pursuing' || o.status === 'qualified').length} Active
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
        <div className="mt-2 flex items-center gap-4 text-sm">
          <span className="text-gray-500">Pipeline Value:</span>
          <span className="font-semibold text-gray-900">{formatCurrency(totalValue)}</span>
        </div>
      </div>

      <div className="divide-y divide-gray-100">
        {displayOpps.map((opp) => {
          const catConfig = categoryConfig[opp.category];
          const CatIcon = catConfig.icon;
          const statusInfo = statusConfig[opp.status];

          return (
            <div
              key={opp.id}
              className="p-4 hover:bg-gray-50 transition-colors cursor-pointer"
            >
              <div className="flex items-start gap-3">
                <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', catConfig.bg)}>
                  <CatIcon className={clsx('w-5 h-5', catConfig.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-gray-900 truncate">{opp.title}</h4>
                    <span className={clsx(
                      'px-2 py-0.5 text-xs font-medium rounded-full',
                      catConfig.bg,
                      catConfig.color
                    )}>
                      {catConfig.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-2 line-clamp-2">{opp.description}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span className="flex items-center gap-1 text-gray-500">
                      <DollarSign className="w-3 h-3" />
                      <span className="font-medium text-gray-700">{formatCurrency(opp.value)}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="w-3 h-3 text-gray-400" />
                      <ProbabilityBar probability={opp.probability} />
                      <span className="text-gray-500 ml-1">{opp.probability}%</span>
                    </span>
                    <span className="flex items-center gap-1 text-gray-500">
                      <Clock className="w-3 h-3" />
                      {opp.timeline}
                    </span>
                    <span className={clsx(
                      'px-2 py-0.5 rounded-full text-white',
                      statusInfo.color
                    )}>
                      {statusInfo.label}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {displayOpps.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <Target className="w-12 h-12 mx-auto mb-2 text-gray-400" />
          <p>No opportunities to display</p>
        </div>
      )}
    </div>
  );
}

interface OpportunityStatsProps {
  opportunities: Opportunity[];
  className?: string;
}

export function OpportunityStats({ opportunities, className }: OpportunityStatsProps) {
  const activeOpps = opportunities.filter(o => o.status !== 'lost' && o.status !== 'won');
  const totalValue = activeOpps.reduce((sum, o) => sum + o.value, 0);
  const weightedValue = activeOpps.reduce((sum, o) => sum + o.value * (o.probability / 100), 0);
  const avgProbability = activeOpps.length > 0
    ? activeOpps.reduce((sum, o) => sum + o.probability, 0) / activeOpps.length
    : 0;

  const stats = [
    { label: 'Active Opportunities', value: activeOpps.length.toString(), icon: Target },
    { label: 'Total Pipeline', value: formatCurrency(totalValue), icon: DollarSign },
    { label: 'Weighted Value', value: formatCurrency(weightedValue), icon: TrendingUp },
    { label: 'Avg Probability', value: `${avgProbability.toFixed(0)}%`, icon: Users }
  ];

  return (
    <div className={clsx('grid grid-cols-4 gap-4', className)}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div key={stat.label} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                <Icon className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">{stat.label}</p>
                <p className="text-lg font-semibold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default Opportunities;
