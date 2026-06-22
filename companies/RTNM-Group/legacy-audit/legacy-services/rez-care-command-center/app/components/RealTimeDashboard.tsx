'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

// Types
interface Alert {
  id: string;
  type: 'payment_failed' | 'qr_scan_failed' | 'app_error' | 'order_issue' | 'booking_issue' | 'delivery_delay';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  customerId: string;
  customerPhone: string;
  merchantId?: string;
  platform: string;
  detectedAt: string;
  status: 'active' | 'acknowledged' | 'resolved';
}

interface Ticket {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'assigned' | 'in_progress' | 'resolved';
  assignedTo?: string;
  createdAt: string;
  platform: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
}

interface Agent {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'busy' | 'break';
  activeTickets: number;
  currentTicket?: string;
}

interface Metrics {
  openTickets: number;
  resolvedToday: number;
  avgResponseTime: number;
  csatScore: number;
  activeAlerts: number;
  onlineAgents: number;
}

interface MerchantCommunication {
  id: string;
  partnerId: string;
  partnerName: string;
  type: 'issue_alert' | 'complaint_escalation' | 'urgent_action';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'acknowledged' | 'in_progress' | 'resolved';
  message: string;
  receivedAt: string;
  responseTime?: number;
}

// Socket.IO connection hook
function useSocket(url: string, agentId?: string, token?: string) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const newSocket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      setConnected(true);
      if (agentId && token) {
        newSocket.emit('authenticate', { agentId, token });
      }
    });

    newSocket.on('authenticated', (data: { success: boolean }) => {
      if (data.success) {
        console.log('[Socket] Authenticated with REZ Care');
      }
    });

    newSocket.on('disconnect', () => {
      setConnected(false);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [url, agentId, token]);

  return { socket, connected };
}

// API helper
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4058';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

async function fetchAPI(endpoint: string) {
  const res = await fetch(`${API_BASE}${endpoint}`);
  const data = await res.json();
  return data.data;
}

// Components
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-gray-400',
    busy: 'bg-red-500',
    break: 'bg-yellow-500',
    open: 'bg-blue-500',
    assigned: 'bg-purple-500',
    in_progress: 'bg-orange-500',
    resolved: 'bg-green-500',
    active: 'bg-red-500',
    acknowledged: 'bg-yellow-500',
    pending: 'bg-yellow-500',
    critical: 'bg-red-600',
    high: 'bg-orange-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium text-white ${colors[status] || 'bg-gray-400'}`}>
      {status.replace('_', ' ').toUpperCase()}
    </span>
  );
}

function MetricCard({ title, value, subtitle, icon, trend }: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
}) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-500 text-sm">{title}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-gray-400 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${trend === 'up' ? 'bg-green-100' : trend === 'down' ? 'bg-red-100' : 'bg-gray-100'}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

function AlertPanel({ alerts, onAcknowledge, onResolve }: {
  alerts: Alert[];
  onAcknowledge: (id: string) => void;
  onResolve: (id: string) => void;
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'border-l-red-600 bg-red-50';
      case 'high': return 'border-l-orange-500 bg-orange-50';
      case 'medium': return 'border-l-yellow-500 bg-yellow-50';
      default: return 'border-l-green-500 bg-white';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Live Alerts</h2>
        <span className="px-2 py-1 bg-red-100 text-red-600 rounded-full text-sm">
          {alerts.filter(a => a.status === 'active').length} Active
        </span>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No active alerts
          </div>
        ) : (
          alerts.map(alert => (
            <div
              key={alert.id}
              className={`p-4 border-l-4 ${getSeverityColor(alert.severity)} border-b hover:bg-gray-50`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={alert.severity} />
                    <span className="text-sm text-gray-500">{alert.platform}</span>
                  </div>
                  <p className="mt-2 font-medium">{alert.message}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {alert.customerPhone} • {new Date(alert.detectedAt).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  {alert.status === 'active' && (
                    <button
                      onClick={() => onAcknowledge(alert.id)}
                      className="px-3 py-1 bg-yellow-500 text-white rounded text-sm hover:bg-yellow-600"
                    >
                      Ack
                    </button>
                  )}
                  <button
                    onClick={() => onResolve(alert.id)}
                    className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function TicketList({ tickets, onSelect }: {
  tickets: Ticket[];
  onSelect: (ticket: Ticket) => void;
}) {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      default: return 'text-green-500';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Open Tickets</h2>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {tickets.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No open tickets
          </div>
        ) : (
          tickets.map(ticket => (
            <div
              key={ticket.id}
              onClick={() => onSelect(ticket)}
              className="p-4 border-b hover:bg-gray-50 cursor-pointer"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`font-medium ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority.toUpperCase()}
                    </span>
                    <span className="text-sm text-gray-500">{ticket.platform}</span>
                    {ticket.sentiment && (
                      <span className={`text-xs ${ticket.sentiment === 'negative' ? 'text-red-500' : ticket.sentiment === 'positive' ? 'text-green-500' : 'text-gray-500'}`}>
                        {ticket.sentiment === 'negative' ? '😠' : ticket.sentiment === 'positive' ? '😊' : '😐'}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 font-medium">{ticket.category}</p>
                  <p className="text-sm text-gray-500">
                    {ticket.customerName} • {ticket.customerPhone}
                  </p>
                </div>
                <StatusBadge status={ticket.status} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function AgentRoster({ agents, onStatusChange }: {
  agents: Agent[];
  onStatusChange: (id: string, status: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-lg font-semibold">Agent Roster</h2>
        <span className="text-green-500 font-medium">
          {agents.filter(a => a.status === 'online').length} Online
        </span>
      </div>
      <div className="divide-y">
        {agents.map(agent => (
          <div key={agent.id} className="p-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${agent.status === 'online' ? 'bg-green-500' : 'bg-gray-400'}`} />
              <div>
                <p className="font-medium">{agent.name}</p>
                <p className="text-sm text-gray-500">
                  {agent.activeTickets} active tickets
                </p>
              </div>
            </div>
            <select
              value={agent.status}
              onChange={(e) => onStatusChange(agent.id, e.target.value)}
              className="text-sm border rounded px-2 py-1"
            >
              <option value="online">Online</option>
              <option value="busy">Busy</option>
              <option value="break">Break</option>
              <option value="offline">Offline</option>
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function MerchantCommunications({ communications, onRespond }: {
  communications: MerchantCommunication[];
  onRespond: (id: string) => void;
}) {
  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">Merchant Responses</h2>
      </div>
      <div className="max-h-64 overflow-y-auto">
        {communications.length === 0 ? (
          <div className="p-8 text-center text-gray-400">
            No pending responses
          </div>
        ) : (
          communications.map(comm => (
            <div key={comm.id} className="p-4 border-b hover:bg-gray-50">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={comm.priority} />
                    <span className="text-sm font-medium">{comm.partnerName}</span>
                  </div>
                  <p className="text-sm mt-1">{comm.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {comm.receivedAt ? `Response in ${comm.responseTime}min` : 'Awaiting response'}
                  </p>
                </div>
                {comm.status === 'pending' && (
                  <button
                    onClick={() => onRespond(comm.id)}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
                  >
                    View
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function CSATGauge({ score }: { score: number }) {
  const percentage = (score / 5) * 100;
  const color = score >= 4.5 ? 'text-green-500' : score >= 4 ? 'text-yellow-500' : 'text-red-500';

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-lg font-semibold mb-4">CSAT Score</h2>
      <div className="relative w-32 h-32 mx-auto">
        <svg className="w-32 h-32 transform -rotate-90">
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke="#e5e7eb"
            strokeWidth="12"
            fill="none"
          />
          <circle
            cx="64"
            cy="64"
            r="56"
            stroke={score >= 4.5 ? '#22c55e' : score >= 4 ? '#eab308' : '#ef4444'}
            strokeWidth="12"
            fill="none"
            strokeDasharray={`${(percentage * 352) / 100} 352`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-3xl font-bold ${color}`}>{score.toFixed(1)}</span>
        </div>
      </div>
      <p className="text-center text-gray-500 text-sm mt-2">out of 5.0</p>
    </div>
  );
}

// Main Dashboard Component
export default function RealTimeDashboard() {
  const [agentId] = useState('agent-1');
  const [metrics, setMetrics] = useState<Metrics>({
    openTickets: 0,
    resolvedToday: 0,
    avgResponseTime: 0,
    csatScore: 4.3,
    activeAlerts: 0,
    onlineAgents: 0,
  });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [communications, setCommunications] = useState<MerchantCommunication[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected'>('disconnected');

  const { socket, connected } = useSocket(API_BASE.replace('http', 'ws'), agentId);

  useEffect(() => {
    setConnectionStatus(connected ? 'connected' : 'disconnected');
  }, [connected]);

  // Load initial data
  useEffect(() => {
    async function loadData() {
      try {
        // Load metrics
        const metricsData = await fetchAPI('/api/metrics/dashboard');
        if (metricsData) {
          setMetrics({
            openTickets: metricsData.openTickets || 0,
            resolvedToday: metricsData.resolvedToday || 0,
            avgResponseTime: metricsData.avgResponseTime || 0,
            csatScore: metricsData.csatScore || 4.3,
            activeAlerts: metricsData.activeAlerts || 0,
            onlineAgents: metricsData.onlineAgents || 0,
          });
        }

        // Load agents
        const agentsData = await fetchAPI('/api/agents');
        if (agentsData) {
          setAgents(agentsData.slice(0, 10).map((a: any) => ({
            id: a.agentId,
            name: a.name,
            status: a.status,
            activeTickets: a.currentTicketCount || 0,
          })));
        }

        // Load alerts
        const alertsData = await fetchAPI('/api/alerts/active');
        if (alertsData) {
          setAlerts(alertsData.slice(0, 20).map((a: any) => ({
            id: a.alertId,
            type: a.type,
            severity: a.severity,
            message: a.message || a.description,
            customerId: a.customerId,
            customerPhone: a.customerPhone || a.affectedUsers?.[0] || '',
            merchantId: a.partnerId,
            platform: a.platform || 'other',
            detectedAt: a.detectedAt,
            status: a.status,
          })));
        }

        // Load tickets
        const ticketsData = await fetchAPI('/api/auto-tickets?status=open&limit=20');
        if (ticketsData) {
          setTickets(ticketsData.slice(0, 20).map((t: any) => ({
            id: t.ticketId,
            customerId: t.customerId,
            customerName: 'Customer',
            customerPhone: t.customerId,
            category: t.category || t.issue?.category || 'General',
            priority: t.severity || 'medium',
            status: t.status === 'resolved' ? 'resolved' : 'open',
            assignedTo: t.assignedTo,
            createdAt: t.detectedAt || t.createdAt,
            platform: t.platform?.type || 'other',
            sentiment: t.sentiment,
          })));
        }

        // Load merchant communications
        const commsData = await fetchAPI('/api/merchant/dashboard');
        if (commsData) {
          setCommunications([]);
        }
      } catch (error) {
        console.error('Failed to load data:', error);
        // Use mock data for demo
        setMetrics({
          openTickets: 23,
          resolvedToday: 156,
          avgResponseTime: 38,
          csatScore: 4.3,
          activeAlerts: 5,
          onlineAgents: 8,
        });
        setAgents([
          { id: '1', name: 'Priya S.', status: 'online', activeTickets: 3 },
          { id: '2', name: 'Rahul K.', status: 'online', activeTickets: 2 },
          { id: '3', name: 'Aisha M.', status: 'busy', activeTickets: 4 },
          { id: '4', name: 'Vikram J.', status: 'online', activeTickets: 1 },
        ]);
        setAlerts([
          {
            id: '1',
            type: 'payment_failed',
            severity: 'high',
            message: 'Payment declined for order #12345',
            customerId: 'cust-1',
            customerPhone: '+91 98765 43210',
            platform: 'restaurant',
            detectedAt: new Date().toISOString(),
            status: 'active',
          },
          {
            id: '2',
            type: 'delivery_delay',
            severity: 'medium',
            message: 'Delivery delayed by 45 minutes',
            customerId: 'cust-2',
            customerPhone: '+91 98765 11111',
            platform: 'restaurant',
            detectedAt: new Date().toISOString(),
            status: 'active',
          },
        ]);
        setTickets([
          {
            id: 'T-001',
            customerId: 'cust-1',
            customerName: 'Rahul Sharma',
            customerPhone: '+91 98765 43210',
            category: 'Payment Issue',
            priority: 'high',
            status: 'open',
            createdAt: new Date().toISOString(),
            platform: 'restaurant',
            sentiment: 'negative',
          },
        ]);
      }
    }

    loadData();
  }, []);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('alert:new', (alert: Alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 20));
      setMetrics(prev => ({ ...prev, activeAlerts: prev.activeAlerts + 1 }));
    });

    socket.on('alert:resolved', (alert: Alert) => {
      setAlerts(prev => prev.filter(a => a.id !== alert.id));
      setMetrics(prev => ({ ...prev, activeAlerts: Math.max(0, prev.activeAlerts - 1) }));
    });

    socket.on('ticket:update', (ticket: Ticket) => {
      setTickets(prev => prev.map(t => t.id === ticket.id ? ticket : t));
    });

    socket.on('ticket:new', (ticket: Ticket) => {
      setTickets(prev => [ticket, ...prev].slice(0, 50));
      setMetrics(prev => ({ ...prev, openTickets: prev.openTickets + 1 }));
    });

    socket.on('metrics:update', (newMetrics: Partial<Metrics>) => {
      setMetrics(prev => ({ ...prev, ...newMetrics }));
    });

    return () => {
      socket.off('alert:new');
      socket.off('alert:resolved');
      socket.off('ticket:update');
      socket.off('ticket:new');
      socket.off('metrics:update');
    };
  }, [socket]);

  const handleAcknowledge = useCallback(async (alertId: string) => {
    // Update local state
    setAlerts(prev => prev.map(a => a.id === alertId ? { ...a, status: 'acknowledged' } : a));

    // Send to API
    try {
      await fetch(`${API_BASE}/api/alerts/${alertId}/acknowledge`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to acknowledge alert');
    }
  }, []);

  const handleResolve = useCallback(async (alertId: string) => {
    // Update local state
    setAlerts(prev => prev.filter(a => a.id !== alertId));
    setMetrics(prev => ({ ...prev, activeAlerts: Math.max(0, prev.activeAlerts - 1) }));

    // Send to API
    try {
      await fetch(`${API_BASE}/api/alerts/${alertId}/resolve`, { method: 'POST' });
    } catch (error) {
      console.error('Failed to resolve alert');
    }
  }, []);

  const handleAgentStatusChange = useCallback(async (agentId: string, status: string) => {
    setAgents(prev => prev.map(a => a.id === agentId ? { ...a, status: status as any } : a));

    try {
      await fetch(`${API_BASE}/api/agents/${agentId}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
    } catch (error) {
      console.error('Failed to update agent status');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">REZ Care Command Center</h1>
            <p className="text-gray-500 text-sm">Real-time Support Operations Dashboard</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${connectionStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className="text-sm text-gray-600">
                {connectionStatus === 'connected' ? 'Live' : 'Disconnected'}
              </span>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium">{new Date().toLocaleDateString()}</p>
              <p className="text-xs text-gray-500">{new Date().toLocaleTimeString()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Metrics */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <MetricCard
            title="Open Tickets"
            value={metrics.openTickets}
            subtitle="Requiring attention"
            icon={<span className="text-2xl">🎫</span>}
          />
          <MetricCard
            title="Resolved Today"
            value={metrics.resolvedToday}
            subtitle="+12% from yesterday"
            icon={<span className="text-2xl">✅</span>}
            trend="up"
          />
          <MetricCard
            title="Avg Response"
            value={`${metrics.avgResponseTime}m`}
            subtitle="First response time"
            icon={<span className="text-2xl">⏱️</span>}
          />
          <MetricCard
            title="CSAT Score"
            value={metrics.csatScore.toFixed(1)}
            subtitle="+0.2 this week"
            icon={<span className="text-2xl">⭐</span>}
            trend="up"
          />
          <MetricCard
            title="Active Alerts"
            value={metrics.activeAlerts}
            subtitle="Needs attention"
            icon={<span className="text-2xl">🚨</span>}
          />
          <MetricCard
            title="Online Agents"
            value={`${metrics.onlineAgents}/${agents.length}`}
            subtitle="Available now"
            icon={<span className="text-2xl">👥</span>}
          />
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column - Alerts & Tickets */}
          <div className="lg:col-span-2 space-y-6">
            <AlertPanel
              alerts={alerts}
              onAcknowledge={handleAcknowledge}
              onResolve={handleResolve}
            />
            <TicketList
              tickets={tickets.filter(t => t.status !== 'resolved')}
              onSelect={setSelectedTicket}
            />
          </div>

          {/* Right Column - Agents & CSAT */}
          <div className="space-y-6">
            <CSATGauge score={metrics.csatScore} />
            <AgentRoster
              agents={agents}
              onStatusChange={handleAgentStatusChange}
            />
            <MerchantCommunications
              communications={communications}
              onRespond={(id) => console.log('Respond to:', id)}
            />
          </div>
        </div>

        {/* Selected Ticket Detail */}
        {selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-96 overflow-y-auto">
              <div className="p-4 border-b flex justify-between items-center">
                <h3 className="text-lg font-semibold">Ticket Details</h3>
                <button
                  onClick={() => setSelectedTicket(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-500 text-sm">Customer</p>
                    <p className="font-medium">{selectedTicket.customerName}</p>
                    <p className="text-sm text-gray-600">{selectedTicket.customerPhone}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Platform</p>
                    <p className="font-medium capitalize">{selectedTicket.platform}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Category</p>
                    <p className="font-medium">{selectedTicket.category}</p>
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Priority</p>
                    <StatusBadge status={selectedTicket.priority} />
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Status</p>
                    <StatusBadge status={selectedTicket.status} />
                  </div>
                  <div>
                    <p className="text-gray-500 text-sm">Created</p>
                    <p className="font-medium">
                      {new Date(selectedTicket.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mt-6 flex gap-4">
                  <button className="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                    Assign to Me
                  </button>
                  <button className="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600">
                    Resolve
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
