'use client';

import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { Metric } from '@/lib/types';
import { clsx } from 'clsx';

interface MetricCardProps {
  metric: Metric;
  className?: string;
}

export function MetricCard({ metric, className }: MetricCardProps) {
  const formatValue = (value: string | number, format?: string): string => {
    if (typeof value === 'string') return value;
    switch (format) {
      case 'currency':
        return `$${(value / 1000).toFixed(1)}K`;
      case 'percent':
        return `${value}%`;
      case 'days':
        return `${value}d`;
      default:
        return value.toString();
    }
  };

  const TrendIcon = metric.trend === 'up' ? TrendingUp : metric.trend === 'down' ? TrendingDown : Minus;
  const trendColor = metric.trend === 'up' ? 'text-success-600' : metric.trend === 'down' ? 'text-danger-600' : 'text-gray-500';

  return (
    <div className={clsx(
      'bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow',
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{metric.label}</p>
          <p className="text-2xl font-bold text-gray-900">
            {formatValue(metric.value, metric.format)}
          </p>
          <div className="flex items-center mt-2">
            <TrendIcon className={clsx('w-4 h-4 mr-1', trendColor)} />
            <span className={clsx('text-sm font-medium', trendColor)}>
              {metric.change > 0 ? '+' : ''}{metric.change}%
            </span>
            <span className="text-xs text-gray-400 ml-2">vs last period</span>
          </div>
        </div>
      </div>
    </div>
  );
}

interface MetricGridProps {
  metrics: Metric[];
  className?: string;
}

export function MetricGrid({ metrics, className }: MetricGridProps) {
  return (
    <div className={clsx('grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4', className)}>
      {metrics.map((metric) => (
        <MetricCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}

export default MetricCard;
