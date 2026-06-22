import { useState, useEffect } from 'react';
import {
  BookOpen,
  FileText,
  HelpCircle,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import apiService from '../services/api';
import type { DashboardStats } from '../types';

const StatCard = ({
  title,
  value,
  icon: Icon,
  trend,
  trendValue,
  color,
}: {
  title: string;
  value: string | number;
  icon: React.ElementType;
  trend?: 'up' | 'down';
  trendValue?: string;
  color: string;
}) => (
  <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</p>
        <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
      </div>
      <div className={`p-3 rounded-lg ${color}`}>
        <Icon className="h-6 w-6 text-white" />
      </div>
    </div>
    {trend && trendValue && (
      <div className="mt-4 flex items-center gap-1">
        {trend === 'up' ? (
          <TrendingUp className="h-4 w-4 text-green-500" />
        ) : (
          <TrendingDown className="h-4 w-4 text-red-500" />
        )}
        <span className={`text-sm font-medium ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          {trendValue}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">vs last month</span>
      </div>
    )}
  </div>
);

// Mock data for demonstration
const mockConversationTrend = [
  { date: 'Mon', conversations: 45, messages: 180 },
  { date: 'Tue', conversations: 52, messages: 210 },
  { date: 'Wed', conversations: 48, messages: 195 },
  { date: 'Thu', conversations: 61, messages: 250 },
  { date: 'Fri', conversations: 55, messages: 220 },
  { date: 'Sat', conversations: 38, messages: 150 },
  { date: 'Sun', conversations: 32, messages: 125 },
];

const mockConversationStatus = [
  { name: 'Completed', value: 65, color: '#22c55e' },
  { name: 'Abandoned', value: 25, color: '#ef4444' },
  { name: 'Active', value: 10, color: '#3b82f6' },
];

const mockRecentActivity = [
  { id: '1', type: 'faq_added', description: 'New FAQ added: "How to reset password?"', timestamp: '2 minutes ago', user: 'Admin' },
  { id: '2', type: 'document_uploaded', description: 'PDF uploaded: Restaurant Menu 2024.pdf', timestamp: '15 minutes ago', user: 'Admin' },
  { id: '3', type: 'knowledge_updated', description: 'Merchant "Pizza Palace" info updated', timestamp: '1 hour ago', user: 'Admin' },
  { id: '4', type: 'conversation', description: 'High priority conversation resolved', timestamp: '2 hours ago' },
  { id: '5', type: 'faq_added', description: 'New FAQ category "Billing" created', timestamp: '3 hours ago', user: 'Admin' },
];

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // In production, this would call the actual API
        // const data = await apiService.getDashboardStats();
        // setStats(data);

        // Mock data for demonstration
        setStats({
          knowledgeEntries: 1247,
          trainingDocuments: 89,
          faqs: 342,
          merchants: 56,
          recentActivity: mockRecentActivity,
        });
      } catch (error) {
        console.error('Failed to fetch dashboard stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-8 w-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Overview of your AI training system
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Knowledge Entries"
          value={stats?.knowledgeEntries ?? 0}
          icon={BookOpen}
          trend="up"
          trendValue="12.5%"
          color="bg-blue-500"
        />
        <StatCard
          title="Training Documents"
          value={stats?.trainingDocuments ?? 0}
          icon={FileText}
          trend="up"
          trendValue="8.2%"
          color="bg-purple-500"
        />
        <StatCard
          title="Active FAQs"
          value={stats?.faqs ?? 0}
          icon={HelpCircle}
          trend="up"
          trendValue="5.1%"
          color="bg-green-500"
        />
        <StatCard
          title="Merchants"
          value={stats?.merchants ?? 0}
          icon={Users}
          trend="down"
          trendValue="2.0%"
          color="bg-orange-500"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Conversation Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Conversation Trend
            </h3>
            <select className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-dark-200 text-gray-900 dark:text-white text-sm">
              <option>Last 7 days</option>
              <option>Last 30 days</option>
              <option>Last 90 days</option>
            </select>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockConversationTrend}>
                <defs>
                  <linearGradient id="colorConversations" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorMessages" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
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
                <Area
                  type="monotone"
                  dataKey="conversations"
                  stroke="#3b82f6"
                  fillOpacity={1}
                  fill="url(#colorConversations)"
                  name="Conversations"
                />
                <Area
                  type="monotone"
                  dataKey="messages"
                  stroke="#8b5cf6"
                  fillOpacity={1}
                  fill="url(#colorMessages)"
                  name="Messages"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Conversation Status */}
        <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Conversation Status
          </h3>
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockConversationStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={70}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mockConversationStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
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
          <div className="mt-4 space-y-2">
            {mockConversationStatus.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-sm text-gray-600 dark:text-gray-400">{item.name}</span>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-dark-100 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h3>
        <div className="space-y-4">
          {mockRecentActivity.map((activity) => (
            <div key={activity.id} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-dark-200 rounded-lg">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Activity className="h-5 w-5 text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {activity.description}
                </p>
                <div className="mt-1 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="h-3 w-3" />
                  <span>{activity.timestamp}</span>
                  {activity.user && (
                    <>
                      <span>•</span>
                      <span>{activity.user}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
