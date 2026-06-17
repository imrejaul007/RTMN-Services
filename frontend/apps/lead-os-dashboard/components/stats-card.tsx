'use client';

import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative';
  color?: 'blue' | 'green' | 'red' | 'purple' | 'yellow';
}

export default function StatsCard({
  label,
  value,
  icon: Icon,
  change,
  changeType = 'positive',
  color = 'blue',
}: StatsCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600',
  };

  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <div className={clsx('p-3 rounded-xl', colorClasses[color])}>
          <Icon className="w-6 h-6" />
        </div>
        {change && (
          <span
            className={clsx(
              'text-sm font-medium',
              changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            )}
          >
            {change}
          </span>
        )}
      </div>
      <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
      <div className="text-sm text-gray-500">{label}</div>
    </div>
  );
}
