'use client';

import { useState, useEffect } from 'react';
import { Users, Target, TrendingUp, MessageSquare } from 'lucide-react';
import StatsCard from '@/components/stats-card';
import PipelineChart from '@/components/pipeline-chart';
import ActivityFeed from '@/components/activity-feed';
import LeadTable from '@/components/lead-table';
import { leadOS } from '@/lib/api';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [pipeline, setPipeline] = useState<any>(null);
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    async function fetchData() {
      try {
        const [overviewData, pipelineData, leadsData] = await Promise.all([
          leadOS.overview(),
          leadOS.pipeline(),
          leadOS.getLeads(),
        ]);
        setStats(overviewData);
        setPipeline(pipelineData);
        setLeads(leadsData.slice(0, 5));
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const statsData = [
    { label: 'Total Leads', value: stats?.totalLeads?.toLocaleString() || '1,247', icon: Users, change: `+${stats?.changes?.leads || 12}%`, color: 'blue' as const },
    { label: 'Qualified', value: stats?.qualified?.toLocaleString() || '342', icon: Target, change: `+${stats?.changes?.qualified || 8}%`, color: 'green' as const },
    { label: 'Hot Leads', value: stats?.hotLeads?.toLocaleString() || '89', icon: TrendingUp, change: `+${stats?.changes?.hot || 23}%`, color: 'red' as const },
    { label: 'Active Outreach', value: stats?.activeOutreach?.toLocaleString() || '156', icon: MessageSquare, change: `+${stats?.changes?.outreach || 5}%`, color: 'purple' as const },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back! Here&apos;s your lead pipeline overview.</p>
        </div>
        <div className="text-sm text-gray-500">
          Last updated: {new Date().toLocaleString()}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
          <StatsCard
            key={stat.label}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            change={stat.change}
            color={stat.color}
          />
        ))}
      </div>

      {/* Pipeline Chart */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Pipeline Overview</h2>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-2">
              <span className="w-3 h-3 bg-blue-500 rounded-full" />
              Lead Count
            </span>
          </div>
        </div>
        <PipelineChart data={pipeline} />
      </div>

      {/* Recent Leads & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Leads</h2>
            <a href="/leads" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              View All
            </a>
          </div>
          <LeadTable leads={leads} loading={loading} />
        </div>
        <ActivityFeed maxItems={8} />
      </div>
    </div>
  );
}
