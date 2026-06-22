'use client';

import { useState, useEffect } from 'react';

interface AnalyticsData {
  totalCalls: number;
  completedCalls: number;
  avgDuration: number;
  avgSentiment: number;
  topIntents: Array<{ intent: string; count: number; percentage: number }>;
  callsByHour: Array<{ hour: number; count: number }>;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('7d');

  useEffect(() => {
    setTimeout(() => {
      setData({
        totalCalls: 1247,
        completedCalls: 1098,
        avgDuration: 195,
        avgSentiment: 0.72,
        topIntents: [
          { intent: 'greeting', count: 423, percentage: 34 },
          { intent: 'faq', count: 287, percentage: 23 },
          { intent: 'order_status', count: 198, percentage: 16 },
          { intent: 'complaint', count: 156, percentage: 12 },
          { intent: 'goodbye', count: 183, percentage: 15 },
        ],
        callsByHour: [
          { hour: 0, count: 12 }, { hour: 1, count: 8 }, { hour: 2, count: 5 },
          { hour: 3, count: 3 }, { hour: 4, count: 2 }, { hour: 5, count: 4 },
          { hour: 6, count: 15 }, { hour: 7, count: 28 }, { hour: 8, count: 52 },
          { hour: 9, count: 78 }, { hour: 10, count: 95 }, { hour: 11, count: 102 },
          { hour: 12, count: 88 }, { hour: 13, count: 76 }, { hour: 14, count: 92 },
          { hour: 15, count: 85 }, { hour: 16, count: 78 }, { hour: 17, count: 65 },
          { hour: 18, count: 58 }, { hour: 19, count: 45 }, { hour: 20, count: 35 },
          { hour: 21, count: 28 }, { hour: 22, count: 18 }, { hour: 23, count: 14 },
        ],
      });
      setLoading(false);
    }, 1000);
  }, [dateRange]);

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const maxCalls = Math.max(...data.callsByHour.map(h => h.count));

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-500 mt-1">Voice agent performance and insights</p>
        </div>
        <select
          className="input w-auto"
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value)}
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="90d">Last 90 days</option>
        </select>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <p className="text-sm text-gray-500">Total Calls</p>
          <p className="text-3xl font-bold mt-1">{data.totalCalls.toLocaleString()}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Completion Rate</p>
          <p className="text-3xl font-bold mt-1">{((data.completedCalls / data.totalCalls) * 100).toFixed(1)}%</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Avg. Duration</p>
          <p className="text-3xl font-bold mt-1">{Math.floor(data.avgDuration / 60)}m {data.avgDuration % 60}s</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Avg. Sentiment</p>
          <p className="text-3xl font-bold mt-1">{(data.avgSentiment * 100).toFixed(0)}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calls by Hour */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Calls by Hour</h2>
          <div className="h-64 flex items-end gap-1">
            {data.callsByHour.map((hour) => (
              <div key={hour.hour} className="flex-1 flex flex-col items-center">
                <div
                  className="w-full bg-blue-500 rounded-t transition-all hover:bg-blue-600"
                  style={{ height: `${(hour.count / maxCalls) * 200}px` }}
                  title={`${hour.hour}:00 - ${hour.count} calls`}
                />
                <span className="text-xs text-gray-500 mt-2">{hour.hour}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top Intents */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Top Intents</h2>
          <div className="space-y-4">
            {data.topIntents.map((intent) => (
              <div key={intent.intent}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="capitalize">{intent.intent.replace('_', ' ')}</span>
                  <span className="text-gray-500">{intent.count} ({intent.percentage}%)</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${intent.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Calls */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-4">Recent Calls</h2>
        <table className="w-full">
          <thead>
            <tr className="text-left text-sm text-gray-500 border-b">
              <th className="pb-3 font-medium">Call ID</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium">Duration</th>
              <th className="pb-3 font-medium">Intent</th>
              <th className="pb-3 font-medium">Sentiment</th>
              <th className="pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {[1, 2, 3, 4, 5].map((i) => (
              <tr key={i} className="border-b last:border-0">
                <td className="py-3 font-mono text-sm">CALL-{Date.now().toString(36).slice(-6).toUpperCase()}</td>
                <td className="py-3 text-gray-500">{new Date(Date.now() - i * 3600000).toLocaleString()}</td>
                <td className="py-3">{Math.floor(Math.random() * 300) + 60}s</td>
                <td className="py-3 capitalize">{['greeting', 'faq', 'order_status'][i % 3]?.replace('_', ' ')}</td>
                <td className="py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    Math.random() > 0.3 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {['positive', 'neutral', 'negative'][i % 3]}
                  </span>
                </td>
                <td className="py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                    completed
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
