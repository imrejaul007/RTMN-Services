import React, { useState, useEffect } from 'react';
import { api, AgentSession, ServiceHealth } from '../api/inspector';
import {
  Activity,
  Brain,
  MemoryStick,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Zap,
  DollarSign,
  TrendingUp,
  Server,
  Eye,
  MessageSquare,
  Boxes,
  Workflow
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [health, setHealth] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [s, h] = await Promise.all([
        api.getSessions(20),
        api.getServiceHealth()
      ]);
      setSessions(s);
      setHealth(h);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const running = sessions.filter(s => s.status === 'running').length;
  const completed = sessions.filter(s => s.status === 'completed').length;
  const errors = sessions.filter(s => s.status === 'error').length;
  const healthyServices = health.filter(h => h.status === 'healthy').length;

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="w-6 h-6" />}
          label="Active Sessions"
          value={running}
          color="blue"
        />
        <StatCard
          icon={<CheckCircle className="w-6 h-6" />}
          label="Completed"
          value={completed}
          color="green"
        />
        <StatCard
          icon={<AlertTriangle className="w-6 h-6" />}
          label="Errors"
          value={errors}
          color="red"
        />
        <StatCard
          icon={<Server className="w-6 h-6" />}
          label="Services Healthy"
          value={`${healthyServices}/${health.length}`}
          color="purple"
        />
      </div>

      {/* Service Health Grid */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Server className="w-5 h-5" />
          Service Health
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {health.map(svc => (
            <ServiceCard key={svc.name} service={svc} />
          ))}
        </div>
      </div>

      {/* Sessions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Brain className="w-5 h-5" />
            Agent Sessions
          </h3>
          <button
            onClick={loadData}
            className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
          >
            Refresh
          </button>
        </div>
        <div className="divide-y">
          {sessions.slice(0, 10).map(session => (
            <SessionRow key={session.id} session={session} />
          ))}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}> = ({ icon, label, value, color }) => {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    red: 'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    yellow: 'bg-yellow-50 text-yellow-600'
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className={`w-12 h-12 rounded-full ${colors[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-gray-500 text-sm">{label}</div>
    </div>
  );
};

const ServiceCard: React.FC<{ service: ServiceHealth }> = ({ service }) => {
  const statusColors = {
    healthy: 'bg-green-100 text-green-800',
    degraded: 'bg-yellow-100 text-yellow-800',
    down: 'bg-red-100 text-red-800'
  };

  return (
    <div className={`p-3 rounded-lg ${service.status === 'healthy' ? 'bg-green-50' : service.status === 'degraded' ? 'bg-yellow-50' : 'bg-red-50'}`}>
      <div className="font-medium text-sm truncate">{service.name}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className={`px-2 py-0.5 rounded text-xs ${statusColors[service.status]}`}>
          {service.status}
        </span>
        <span className="text-xs text-gray-500">{service.latency}ms</span>
      </div>
    </div>
  );
};

const SessionRow: React.FC<{ session: AgentSession }> = ({ session }) => {
  const statusColors = {
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    paused: 'bg-yellow-100 text-yellow-800'
  };

  return (
    <div className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between">
      <div className="flex items-center gap-4">
        <div className={`px-2 py-1 rounded text-xs font-medium ${statusColors[session.status]}`}>
          {session.status}
        </div>
        <div>
          <div className="font-medium">{session.agentName}</div>
          <div className="text-sm text-gray-500">
            {session.id} • {new Date(session.startedAt).toLocaleTimeString()}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4 text-gray-400" />
          {session.metrics.latency}ms
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-4 h-4 text-gray-400" />
          {session.metrics.steps} steps
        </div>
        <div className="flex items-center gap-1">
          <DollarSign className="w-4 h-4 text-gray-400" />
          ${session.metrics.cost.toFixed(3)}
        </div>
        <div className="flex items-center gap-1">
          <Boxes className="w-4 h-4 text-gray-400" />
          {session.tokens.total} tokens
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
