/**
 * HOJAI Analytics Dashboard
 */

import React from 'react';
import { TrendingUp, TrendingDown, Bot, DollarSign, Activity } from 'lucide-react';

export function Analytics() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Analytics</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        {[
          { label: 'Tasks Completed', value: '12,456', change: '+23%' },
          { label: 'Workflows Run', value: '3,456', change: '+12%' },
          { label: 'Cost (₹)', value: '₹45,678', change: '-8%' },
          { label: 'Success Rate', value: '94.5%', change: '+2%' },
        ].map((stat, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border">
            <p className="text-sm text-gray-500 mb-2">{stat.label}</p>
            <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
            <p className="text-sm text-green-500 mt-2">{stat.change} vs last month</p>
          </div>
        ))}
      </div>

      {/* Agent Performance */}
      <div className="bg-white p-6 rounded-xl border mb-6">
        <h2 className="font-semibold mb-4">Agent Performance</h2>
        <div className="space-y-4">
          {[
            { agent: 'SDR Agent', tasks: 345, rate: 96 },
            { agent: 'Support Agent', tasks: 289, rate: 91 },
            { agent: 'Finance Agent', tasks: 156, rate: 99 },
          ].map((a) => (
            <div key={a.agent} className="flex items-center gap-4">
              <Bot className="w-5 h-5 text-purple-500" />
              <span className="w-40">{a.agent}</span>
              <span className="text-gray-500">{a.tasks} tasks</span>
              <div className="flex-1 bg-gray-100 rounded-full h-2">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: `${a.rate}%` }} />
              </div>
              <span className="text-green-600">{a.rate}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* Cost Breakdown */}
      <div className="grid grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border">
          <h3 className="font-semibold mb-4">Cost Breakdown</h3>
          <div className="space-y-3">
            <div className="flex justify-between"><span>Claude API</span><span>₹12,500</span></div>
            <div className="flex justify-between"><span>Workflows</span><span>₹8,900</span></div>
            <div className="flex justify-between"><span>Storage</span><span>₹4,500</span></div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border">
          <h3 className="font-semibold mb-4">Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-green-500" />
              <span className="text-sm">5 agents running</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
