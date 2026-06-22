'use client';

import { useEffect, useState } from 'react';
import { useInboxStore } from '@/stores/inboxStore';
import { MessageSquare, Clock, CheckCircle, AlertTriangle } from 'lucide-react';

export function StatsCards() {
  const { analytics, fetchAnalytics } = useInboxStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  if (!mounted || !analytics) {
    return (
      <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white p-4 rounded-lg border animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
            <div className="h-8 bg-gray-200 rounded w-3/4" />
          </div>
        ))}
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${Math.round(seconds / 3600)}h`;
  };

  const stats = [
    {
      label: 'Open Tickets',
      value: analytics.openConversations,
      icon: MessageSquare,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
    },
    {
      label: 'Resolved Today',
      value: analytics.resolvedToday,
      icon: CheckCircle,
      color: 'text-green-500',
      bg: 'bg-green-50',
    },
    {
      label: 'Avg Response',
      value: formatTime(analytics.avgResponseTime),
      icon: Clock,
      color: 'text-orange-500',
      bg: 'bg-orange-50',
    },
    {
      label: 'Avg Resolution',
      value: formatTime(analytics.avgResolutionTime),
      icon: Clock,
      color: 'text-purple-500',
      bg: 'bg-purple-50',
    },
    {
      label: 'SLA Breach Rate',
      value: `${(analytics.slaStats.breachRate * 100).toFixed(1)}%`,
      icon: AlertTriangle,
      color: analytics.slaStats.breachRate > 0.1 ? 'text-red-500' : 'text-green-500',
      bg: analytics.slaStats.breachRate > 0.1 ? 'bg-red-50' : 'bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-5 gap-4 p-4 bg-gray-50">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-white p-4 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${stat.bg}`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <span className="text-sm text-gray-500">{stat.label}</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}
