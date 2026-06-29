import React from 'react';
import { TrendingUp, TrendingDown, BarChart3, PieChart } from 'lucide-react';

function Analytics() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-500">Platform performance and insights</p>
      </div>

      {/* Charts placeholder */}
      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl p-6 border">
          <h3 className="font-semibold mb-4">Message Volume</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <BarChart3 className="w-12 h-12 mr-2" />
            Chart coming soon
          </div>
        </div>
        <div className="bg-white rounded-xl p-6 border">
          <h3 className="font-semibold mb-4">Revenue Impact</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <PieChart className="w-12 h-12 mr-2" />
            Chart coming soon
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-4 gap-6">
        {[
          { label: 'Total Savings', value: '₹12.5L', change: '+23%', up: true },
          { label: 'Time Saved', value: '1,240 hrs', change: '+45%', up: true },
          { label: 'Resolution Rate', value: '94%', change: '+5%', up: true },
          { label: 'Avg Response', value: '1.2s', change: '-15%', up: true },
        ].map((metric, i) => (
          <div key={i} className="bg-white rounded-xl p-6 border">
            <p className="text-sm text-gray-500">{metric.label}</p>
            <p className="text-2xl font-bold mt-1">{metric.value}</p>
            <div className="flex items-center gap-1 mt-2 text-sm">
              {metric.up ? (
                <TrendingUp className="w-4 h-4 text-green-500" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-500" />
              )}
              <span className={metric.up ? 'text-green-500' : 'text-red-500'}>
                {metric.change}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Analytics;
