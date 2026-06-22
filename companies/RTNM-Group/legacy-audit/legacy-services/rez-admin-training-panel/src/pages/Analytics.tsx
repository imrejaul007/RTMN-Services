import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { TrendingUp, TrendingDown, Download, AlertTriangle, Eye } from 'lucide-react';
import { fetchDashboardStats, fetchConversationTrends, fetchTopIntents, fetchFailedQueries, fetchIntentDistribution, fetchKnowledgeStats } from '../services/analyticsApi';

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function Analytics() {
  const [stats, setStats] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [topIntents, setTopIntents] = useState<any[]>([]);
  const [failedQueries, setFailedQueries] = useState<any[]>([]);
  const [intentDist, setIntentDist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  useEffect(() => {
    async function loadData() {
      try {
        const days = dateRange === '7' ? 7 : dateRange === '30' ? 30 : 90;
        const [statsData, trendsData, intentsData, failedData, distData] = await Promise.all([
          fetchDashboardStats(),
          fetchConversationTrends(days),
          fetchTopIntents(10),
          fetchFailedQueries(10),
          fetchIntentDistribution()
        ]);

        setStats(statsData);
        setTrends(trendsData);
        setTopIntents(intentsData);
        setFailedQueries(failedData);
        setIntentDist(distData);
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [dateRange]);

  const handleExportReport = () => {
    const report = {
      generatedAt: new Date().toISOString(),
      dateRange,
      summary: stats,
      trends,
      topIntents,
      failedQueries,
      intentDistribution: intentDist
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-report-${dateRange}d-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Copilot Analytics</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Usage statistics and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-100 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-100 rounded-lg transition-colors"
          >
            <Download className="h-4 w-4" />
            Export Report
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Conversations</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats?.totalConversations || 0}</p>
          <div className="mt-2 flex items-center gap-1 text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">12.3%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Resolution Rate</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats?.resolutionRate || 0}%</p>
          <div className="mt-2 flex items-center gap-1 text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">3.2%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Response Time</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats?.avgResponseTime || 0}s</p>
          <div className="mt-2 flex items-center gap-1 text-green-600">
            <TrendingDown className="h-4 w-4" />
            <span className="text-sm">8.5%</span>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Users</p>
          <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{stats?.activeUsers || 0}</p>
          <div className="mt-2 flex items-center gap-1 text-green-600">
            <TrendingUp className="h-4 w-4" />
            <span className="text-sm">5.1%</span>
          </div>
        </div>
      </div>

      {/* Conversation Trend Chart */}
      <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Conversation Trends ({dateRange === '7' ? '7 Days' : dateRange === '30' ? '30 Days' : '90 Days'})
        </h2>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trends}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
              }}
            />
            <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Intents */}
        <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Intents</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topIntents} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
              <XAxis type="number" stroke="#9ca3af" fontSize={12} />
              <YAxis dataKey="intent" type="category" width={100} stroke="#9ca3af" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
              <Bar dataKey="count" fill="#10B981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Intent Distribution */}
        <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Intent Distribution</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={intentDist}
                dataKey="count"
                nameKey="intent"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {intentDist.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Failed Queries */}
      <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Failed Queries (Needs Training)
          </h2>
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            Needs attention
          </span>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="text-left py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Query</th>
              <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Fail Count</th>
              <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Last Failed</th>
              <th className="text-right py-3 text-sm font-medium text-gray-500 dark:text-gray-400">Action</th>
            </tr>
          </thead>
          <tbody>
            {failedQueries.map((query, i) => (
              <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-dark-200">
                <td className="py-3 text-sm text-gray-900 dark:text-white">{query.query}</td>
                <td className="py-3 text-right text-sm text-red-500 font-medium">{query.count}</td>
                <td className="py-3 text-right text-sm text-gray-500">{new Date(query.lastFailed).toLocaleDateString()}</td>
                <td className="py-3 text-right">
                  <button className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                    <Eye className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
