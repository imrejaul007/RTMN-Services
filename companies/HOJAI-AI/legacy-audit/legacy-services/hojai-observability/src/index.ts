/**
 * HOJAI Observability
 * Token, latency, cost, failure tracking - Vellum equivalent
 * Port: 4592
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4592;

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ============================================
// TYPES
// ============================================

interface RequestLog {
  id: string;
  agentId: string;
  promptId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latency: number;
  cost: number;
  status: 'success' | 'failed' | 'timeout';
  error?: string;
  metadata: Record<string, unknown>;
  timestamp: Date;
}

interface AgentMetrics {
  agentId: string;
  name: string;
  requests: number;
  avgLatency: number;
  avgTokens: number;
  avgCost: number;
  successRate: number;
  errorRate: number;
  totalCost: number;
  lastRequest?: Date;
}

interface Alert {
  id: string;
  type: 'latency' | 'cost' | 'error' | 'quality';
  severity: 'low' | 'medium' | 'high' | 'critical';
  agentId?: string;
  message: string;
  metric?: string;
  threshold?: number;
  currentValue?: number;
  createdAt: Date;
  acknowledged: boolean;
}

interface DashboardMetrics {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  avgLatency: number;
  successRate: number;
  errorRate: number;
  topAgents: AgentMetrics[];
  recentAlerts: Alert[];
  costByDay: { date: string; cost: number }[];
  requestsByModel: { model: string; requests: number }[];
}

const logs = new Map();
const agents = new Map();
const alerts = new Map();
const alertsQueue: Alert[] = [];

// Seed demo data
function seed() {
  const demoAgents = [
    { agentId: 'agent-support', name: 'AI Support Agent', avgLatency: 1.5, avgTokens: 200, avgCost: 0.004 },
    { agentId: 'agent-sales', name: 'AI Sales Agent', avgLatency: 2.1, avgTokens: 350, avgCost: 0.007 },
    { agentId: 'agent-restaurant', name: 'Restaurant AI', avgLatency: 1.2, avgTokens: 150, avgCost: 0.003 },
    { agentId: 'agent-crm', name: 'CRM Agent', avgLatency: 1.8, avgTokens: 280, avgCost: 0.005 },
  ];

  demoAgents.forEach(a => {
    const metrics: AgentMetrics = {
      ...a,
      requests: Math.round(Math.random() * 10000 + 1000),
      successRate: 85 + Math.random() * 10,
      errorRate: Math.random() * 5,
      totalCost: Math.round(Math.random() * 10000 + 1000)
    };
    agents.set(a.agentId, metrics);
  });

  console.log(`HOJAI Observability seeded ${agents.size} agents`);
}

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-observability',
  status: 'healthy',
  port: PORT,
  tagline: 'AI Observability - Datadog for AI agents'
}));

// ============================================
// LOGGING
// ============================================

app.post('/api/logs', (req, res) => {
  const { agentId, promptId, model, inputTokens, outputTokens, latency, cost, status, error, metadata } = req.body;

  const log: RequestLog = {
    id: uuidv4().slice(0, 8),
    agentId,
    promptId,
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    latency,
    cost,
    status,
    error,
    metadata: metadata || {},
    timestamp: new Date()
  };

  logs.set(log.id, log);

  // Update agent metrics
  const agentMetrics = agents.get(agentId) || {
    agentId,
    name: agentId,
    requests: 0,
    avgLatency: 0,
    avgTokens: 0,
    avgCost: 0,
    successRate: 0,
    errorRate: 0,
    totalCost: 0
  };

  agentMetrics.requests++;
  agentMetrics.avgLatency = (agentMetrics.avgLatency * (agentMetrics.requests - 1) + latency) / agentMetrics.requests;
  agentMetrics.avgTokens = (agentMetrics.avgTokens * (agentMetrics.requests - 1) + (inputTokens + outputTokens)) / agentMetrics.requests;
  agentMetrics.avgCost = (agentMetrics.avgCost * (agentMetrics.requests - 1) + cost) / agentMetrics.requests;
  agentMetrics.totalCost += cost;
  agentMetrics.lastRequest = new Date();

  if (status === 'failed') {
    agentMetrics.errorRate = (agentMetrics.errorRate * (agentMetrics.requests - 1) + 1) / agentMetrics.requests;
    agentMetrics.successRate = 1 - agentMetrics.errorRate;
  }

  agents.set(agentId, agentMetrics);

  // Check for alerts
  if (latency > 5) {
    createAlert('latency', latency > 10 ? 'critical' : latency > 7 ? 'high' : 'medium', agentId, `High latency detected`, 'latency', 5, latency);
  }

  if (cost > 0.01) {
    createAlert('cost', cost > 0.05 ? 'high' : 'medium', agentId, `High cost per request`, 'cost', 0.01, cost);
  }

  if (status === 'failed') {
    createAlert('error', 'medium', agentId, `Request failed: ${error || 'Unknown error'}`, 'error');
  }

  res.status(201).json({ success: true, logId: log.id });
});

function createAlert(
  type: Alert['type'],
  severity: Alert['severity'],
  agentId: string | undefined,
  message: string,
  metric?: string,
  threshold?: number,
  currentValue?: number
) {
  const alert: Alert = {
    id: uuidv4().slice(0, 8),
    type,
    severity,
    agentId,
    message,
    metric,
    threshold,
    currentValue,
    createdAt: new Date(),
    acknowledged: false
  };
  alerts.set(alert.id, alert);
  alertsQueue.push(alert);
  if (alertsQueue.length > 100) alertsQueue.shift();
}

// ============================================
// METRICS
// ============================================

app.get('/api/metrics', (req, res) => {
  const { agentId, startDate, endDate } = req.query;

  let filteredLogs = Array.from(logs.values());

  if (agentId) filteredLogs = filteredLogs.filter(l => l.agentId === agentId);
  if (startDate) filteredLogs = filteredLogs.filter(l => l.timestamp >= new Date(startDate as string));
  if (endDate) filteredLogs = filteredLogs.filter(l => l.timestamp <= new Date(endDate as string));

  const totalTokens = filteredLogs.reduce((s, l) => s + l.totalTokens, 0);
  const totalCost = filteredLogs.reduce((s, l) => s + l.cost, 0);
  const totalLatency = filteredLogs.reduce((s, l) => s + l.latency, 0);
  const failedCount = filteredLogs.filter(l => l.status === 'failed').length;

  const metrics: DashboardMetrics = {
    totalRequests: filteredLogs.length,
    totalTokens,
    totalCost,
    avgLatency: filteredLogs.length > 0 ? totalLatency / filteredLogs.length : 0,
    successRate: filteredLogs.length > 0 ? ((filteredLogs.length - failedCount) / filteredLogs.length) * 100 : 0,
    errorRate: filteredLogs.length > 0 ? (failedCount / filteredLogs.length) * 100 : 0,
    topAgents: Array.from(agents.values()).sort((a, b) => b.requests - a.requests).slice(0, 5),
    recentAlerts: alertsQueue.slice(-5).reverse(),
    costByDay: getCostByDay(filteredLogs),
    requestsByModel: getRequestsByModel(filteredLogs)
  };

  res.json({ success: true, data: metrics });
});

function getCostByDay(logs: RequestLog[]) {
  const byDay: Record<string, number> = {};
  logs.forEach(log => {
    const date = log.timestamp.toISOString().split('T')[0];
    byDay[date] = (byDay[date] || 0) + log.cost;
  });
  return Object.entries(byDay).map(([date, cost]) => ({ date, cost: Math.round(cost * 100) / 100 }));
}

function getRequestsByModel(logs: RequestLog[]) {
  const byModel: Record<string, number> = {};
  logs.forEach(log => {
    byModel[log.model] = (byModel[log.model] || 0) + 1;
  });
  return Object.entries(byModel).map(([model, requests]) => ({ model, requests }));
}

// ============================================
// AGENT METRICS
// ============================================

app.get('/api/agents', (_, res) => {
  const allAgents = Array.from(agents.values());
  res.json({ success: true, data: allAgents });
});

app.get('/api/agents/:agentId', (req, res) => {
  const metrics = agents.get(req.params.agentId);
  if (!metrics) return res.status(404).json({ error: 'Agent not found' });
  res.json({ success: true, data: metrics });
});

app.get('/api/agents/:agentId/logs', (req, res) => {
  const agentLogs = Array.from(logs.values())
    .filter(l => l.agentId === req.params.agentId)
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 100);
  res.json({ success: true, data: agentLogs });
});

// ============================================
// ALERTS
// ============================================

app.get('/api/alerts', (req, res) => {
  const { severity, acknowledged } = req.query;
  let result = Array.from(alerts.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  if (severity) result = result.filter(a => a.severity === severity);
  if (acknowledged !== undefined) result = result.filter(a => a.acknowledged === acknowledged);
  res.json({ success: true, data: result });
});

app.patch('/api/alerts/:id/acknowledge', (req, res) => {
  const alert = alerts.get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  alert.acknowledged = true;
  alerts.set(alert.id, alert);
  res.json({ success: true, data: alert });
});

// ============================================
// COST TRACKING
// ============================================

app.get('/api/cost', (req, res) => {
  const { period = 'day' } = req.query;

  const logsArr = Array.from(logs.values());
  let groupedCost = 0;
  const now = new Date();

  logsArr.forEach(log => {
    const diff = now.getTime() - log.timestamp.getTime();
    const hoursDiff = diff / (1000 * 60 * 60);

    if (period === 'day' && hoursDiff <= 24) groupedCost += log.cost;
    else if (period === 'week' && hoursDiff <= 168) groupedCost += log.cost;
    else if (period === 'month' && hoursDiff <= 720) groupedCost += log.cost;
    else if (period === 'all') groupedCost += log.cost;
  });

  const costByAgent: Record<string, number> = {};
  logsArr.forEach(log => {
    costByAgent[log.agentId] = (costByAgent[log.agentId] || 0) + log.cost;
  });

  res.json({
    success: true,
    data: {
      totalCost: Math.round(groupedCost * 10000) / 10000,
      byAgent: Object.entries(costByAgent).map(([agentId, cost]) => ({ agentId, cost: Math.round(cost * 10000) / 10000 })),
      period
    }
  });
});

// ============================================
// TOKEN TRACKING
// ============================================

app.get('/api/tokens', (req, res) => {
  const { period = 'day' } = req.query;

  const logsArr = Array.from(logs.values());
  let totalInput = 0;
  let totalOutput = 0;
  const now = new Date();

  logsArr.forEach(log => {
    const diff = now.getTime() - log.timestamp.getTime();
    const hoursDiff = diff / (1000 * 60 * 60);

    if (period === 'day' && hoursDiff <= 24) {
      totalInput += log.inputTokens;
      totalOutput += log.outputTokens;
    } else if (period === 'week' && hoursDiff <= 168) {
      totalInput += log.inputTokens;
      totalOutput += log.outputTokens;
    } else if (period === 'month' && hoursDiff <= 720) {
      totalInput += log.inputTokens;
      totalOutput += log.outputTokens;
    } else if (period === 'all') {
      totalInput += log.inputTokens;
      totalOutput += log.outputTokens;
    }
  });

  res.json({
    success: true,
    data: {
      totalInputTokens: totalInput,
      totalOutputTokens: totalOutput,
      totalTokens: totalInput + totalOutput,
      period
    }
  });
});

// ============================================
// PERFORMANCE
// ============================================

app.get('/api/performance', (req, res) => {
  const logsArr = Array.from(logs.values());

  const latencyP50 = percentile(logsArr.map(l => l.latency), 50);
  const latencyP95 = percentile(logsArr.map(l => l.latency), 95);
  const latencyP99 = percentile(logsArr.map(l => l.latency), 99);

  const successRate = logsArr.filter(l => l.status === 'success').length / logsArr.length * 100;
  const errorRate = 100 - successRate;

  res.json({
    success: true,
    data: {
      latency: {
        p50: Math.round(latencyP50 * 100) / 100,
        p95: Math.round(latencyP95 * 100) / 100,
        p99: Math.round(latencyP99 * 100) / 100
      },
      successRate: Math.round(successRate * 100) / 100,
      errorRate: Math.round(errorRate * 100) / 100,
      totalRequests: logsArr.length
    }
  });
});

function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = arr.sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

seed();
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI OBSERVABILITY                          ║
║   AI Agent Monitoring                          ║
║   Port: ${PORT}                                   ║
║                                                   ║
║   Features:                                       ║
║   • Token tracking                              ║
║   • Latency monitoring                          ║
║   • Cost tracking                              ║
║   • Error tracking                             ║
║   • Alerts & notifications                     ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
