/**
 * HOJAI Studio - Dashboard Page
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bot,
  Workflow,
  TrendingUp,
  Users,
  Zap,
  ArrowUpRight,
  Activity,
  Clock,
  CheckCircle2
} from 'lucide-react';

interface StatsCard {
  label: string;
  value: string;
  change: string;
  changeType: 'up' | 'down' | 'neutral';
  icon: React.ElementType;
}

const stats: StatsCard[] = [
  { label: 'Active Agents', value: '12', change: '+3 this week', changeType: 'up', icon: Bot },
  { label: 'Workflows Running', value: '47', change: '+12 today', changeType: 'up', icon: Workflow },
  { label: 'Tasks Completed', value: '1,234', change: '+89 today', changeType: 'up', icon: CheckCircle2 },
  { label: 'Team Members', value: '8', change: '2 AI agents', changeType: 'neutral', icon: Users },
];

const recentActivity = [
  { id: 1, action: 'Lead qualified by SDR Agent', time: '2 min ago', status: 'success' },
  { id: 2, action: 'Invoice approved by Finance Agent', time: '5 min ago', status: 'success' },
  { id: 3, action: 'Support ticket resolved automatically', time: '8 min ago', status: 'success' },
  { id: 4, action: 'New workflow deployed: Lead Nurture', time: '15 min ago', status: 'info' },
  { id: 5, action: 'Daily briefing sent to team', time: '30 min ago', status: 'success' },
];

const quickActions = [
  { label: 'Create Workflow', icon: Workflow, color: 'bg-purple-500' },
  { label: 'Add Agent', icon: Bot, color: 'bg-blue-500' },
  { label: 'Browse Templates', icon: TrendingUp, color: 'bg-green-500' },
  { label: 'View Analytics', icon: Activity, color: 'bg-orange-500' },
];

export function Dashboard() {
  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Welcome back! Here's what's happening with your AI company.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${stat.icon === Bot ? 'bg-purple-100 text-purple-600' : stat.icon === Workflow ? 'bg-blue-100 text-blue-600' : stat.icon === CheckCircle2 ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}>
                <stat.icon className="w-5 h-5" />
              </div>
              <span className={`text-xs px-2 py-1 rounded-full ${stat.changeType === 'up' ? 'bg-green-100 text-green-700' : stat.changeType === 'down' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                {stat.change}
              </span>
            </div>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-gray-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <button
                key={action.label}
                className="flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all"
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center`}>
                  <action.icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{action.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <button className="text-sm text-purple-600 hover:text-purple-700 flex items-center gap-1">
              View all <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-4">
                <div className={`w-2 h-2 rounded-full ${item.status === 'success' ? 'bg-green-500' : 'bg-blue-500'}`} />
                <div className="flex-1">
                  <p className="text-sm text-gray-900">{item.action}</p>
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {item.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Department Overview */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {['Sales', 'Marketing', 'Support', 'Finance', 'HR'].map((dept) => (
            <div key={dept} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:border-purple-300 transition-all cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4 text-purple-600" />
                </div>
                <span className="font-medium text-gray-900">{dept}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>5 agents</span>
                <span>•</span>
                <span>10 workflows</span>
              </div>
              <div className="mt-2 h-1 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: '75%' }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
