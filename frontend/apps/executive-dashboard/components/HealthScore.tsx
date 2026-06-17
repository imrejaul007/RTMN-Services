'use client';

import React from 'react';
import type { HealthScore as HealthScoreType } from '@/lib/types';
import { clsx } from 'clsx';

interface HealthScoreProps {
  healthScore: HealthScoreType;
  className?: string;
}

function GaugeChart({ value, maxValue = 100, size = 120, strokeWidth = 12 }: {
  value: number;
  maxValue?: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * Math.PI;
  const percentage = (value / maxValue) * 100;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const getColor = (val: number): string => {
    if (val >= 80) return '#22c55e';
    if (val >= 60) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
      {/* Background arc */}
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
      {/* Value arc */}
      <path
        d={`M ${strokeWidth / 2} ${size / 2} A ${radius} ${radius} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
        fill="none"
        stroke={getColor(value)}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        style={{ transition: 'stroke-dashoffset 0.5s ease-in-out' }}
      />
      {/* Value text */}
      <text
        x={size / 2}
        y={size / 2 + 10}
        textAnchor="middle"
        className="fill-gray-900"
        style={{ fontSize: '24px', fontWeight: 'bold' }}
      >
        {value}
      </text>
    </svg>
  );
}

export function HealthScore({ healthScore, className }: HealthScoreProps) {
  const categories = [
    { key: 'financial', label: 'Financial' },
    { key: 'operational', label: 'Operational' },
    { key: 'customer', label: 'Customer' },
    { key: 'growth', label: 'Growth' },
    { key: 'risk', label: 'Risk' }
  ] as const;

  const getStatusColor = (value: number): string => {
    if (value >= 80) return 'bg-success-100 text-success-700';
    if (value >= 60) return 'bg-warning-100 text-warning-700';
    return 'bg-danger-100 text-danger-700';
  };

  const getStatusLabel = (value: number): string => {
    if (value >= 80) return 'Excellent';
    if (value >= 60) return 'Good';
    if (value >= 40) return 'Fair';
    return 'Critical';
  };

  return (
    <div className={clsx('bg-white rounded-xl shadow-sm border border-gray-100 p-6', className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Business Health Score</h3>
          <p className="text-sm text-gray-500 mt-1">Overall company performance</p>
        </div>
        <div className={clsx('px-3 py-1 rounded-full text-sm font-medium', getStatusColor(healthScore.overall))}>
          {getStatusLabel(healthScore.overall)}
        </div>
      </div>

      <div className="flex flex-col items-center">
        <GaugeChart value={healthScore.overall} size={160} strokeWidth={14} />
        <p className="text-gray-500 text-sm mt-2">Overall Health</p>
      </div>

      <div className="grid grid-cols-5 gap-3 mt-6">
        {categories.map((cat) => (
          <div key={cat.key} className="text-center">
            <div className="relative w-12 h-12 mx-auto mb-2">
              <svg className="w-12 h-12 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="3"
                />
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke={healthScore[cat.key] >= 80 ? '#22c55e' : healthScore[cat.key] >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="3"
                  strokeDasharray={`${healthScore[cat.key]}, 100`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold">
                {healthScore[cat.key]}
              </span>
            </div>
            <p className="text-xs text-gray-500">{cat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default HealthScore;
