/**
 * ObservationOS - Port: 4861
 *
 * Live monitoring, logs, metrics, traces, cost tracking
 * Think: Datadog for AI agents
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = parseInt(process.env.PORT || '4861', 10);
app.use(express.json());

// Types
interface Metric {
  id: string; agentId: string; metric: string;
  value: number; unit: string;
  timestamp: string;
}

interface Trace {
  id: string; agentId: string; operation: string;
  steps: { name: string; duration: number; status: string }[];
  status: 'success' | 'partial' | 'failed';
  totalDuration: number;
}

interface Alert {
  id: string; agentId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string; threshold: number;
  actual: number; message: string;
  status: 'firing' | 'resolved' | 'acknowledged';
  createdAt: string; acknowledgedAt?: string;
}

interface CostRecord {
  agentId: string; date: string;
  tokens: number; apiCost: number;
  storageCost: number; totalCost: number;
}

const metrics: Metric[] = [];
const traces: Trace[] = [];
const alerts: Alert[] = [];
const costs: CostRecord[] = [];

app.get('/health', (_r, res) => res.json({ status: 'healthy', service: 'observation-os' }));
app.get('/ready', (_r, res) => res.json({ ready: true }));

// Metrics
app.post('/metrics', (req, res) => {
  const { agentId, metric, value, unit } = req.body;
  metrics.push({ id: uuidv4(), agentId, metric, value, unit: unit || 'count', timestamp: new Date().toISOString() });
  if (metrics.length > 100000) metrics.splice(0, 50000);
  res.status(201).json({ success: true });
});

app.get('/api/agents/:agentId/metrics', (req, res) => {
  const agentMetrics = metrics.filter(m => m.agentId === req.params.agentId).slice(-100);
  res.json({ success: true, data: { metrics: agentMetrics } });
});

app.get('/api/metrics/aggregate', (req, res) => {
  const { agentId, metric, window = '1h' } = req.query;
  const cutoff = new Date(Date.now() - (window === '1h' ? 3600000 : 86400000);
  let filtered = metrics.filter(m => new Date(m.timestamp) >= cutoff);
  if (agentId) filtered = filtered.filter(m => m.agentId === agentId);
  const avg = filtered.reduce((sum, m) => sum + m.value, 0) / Math.max(1, filtered.length);
  res.json({ success: true, data: { avg, count: filtered.length, window } });
});

// Traces
app.post('/traces', (req, res) => {
  const { agentId, operation, steps } = req.body;
  const trace: Trace = {
    id: uuidv4(), agentId, operation,
    steps: steps || [],
    status: 'success',
    totalDuration: (steps || []).reduce((s, step: any) => s + step.duration, 0)
  };
  traces.push(trace);
  if (traces.length > 10000) traces.splice(0, 5000);
  res.status(201).json({ success: true, traceId: trace.id });
});

app.get('/api/agents/:agentId/traces', (req, res) => {
  const { status } = req.query;
  let agentTraces = traces.filter(t => t.agentId === req.params.agentId);
  if (status) agentTraces = agentTraces.filter(t => t.status === status);
  res.json({ success: true, data: { traces: agentTraces.slice(-50) } });
});

// Alerts
app.post('/alerts', (req, res) => {
  const { agentId, severity, metric, threshold, actual, message } = req.body;
  const alert: Alert = {
    id: uuidv4(), agentId, severity: severity || 'medium',
    metric, threshold: threshold || 0, actual: actual || 0,
    message: message || `${metric} threshold breached`,
    status: 'firing', createdAt: new Date().toISOString()
  };
  alerts.push(alert);
  res.status(201).json({ success: true, alert });
});

app.get('/alerts', (req, res) => {
  const { agentId, status } = req.query;
  let all = alerts;
  if (agentId) all = all.filter(a => a.agentId === agentId);
  if (status) all = all.filter(a => a.status === status);
  res.json({ success: true, data: { alerts: all.slice(-100) } });
});

app.patch('/alerts/:id/acknowledge', (req, res) => {
  const alert = alerts.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ success: false });
  alert.status = 'acknowledged';
  alert.acknowledgedAt = new Date().toISOString();
  res.json({ success: true, alert });
});

// Costs
app.get('/costs', (req, res) => {
  const { agentId, period = '7d' } = req.query;
  const days = period === '30d' ? 30 : 7;
  const cutoff = new Date(Date.now() - days * 86400000);
  let agentCosts = costs.filter(c => new Date(c.date) >= cutoff);
  if (agentId) agentCosts = agentCosts.filter(c => c.agentId === agentId);
  const total = agentCosts.reduce((s, c) => s + c.totalCost, 0);
  res.json({ success: true, data: { totalCost: total, period, count: agentCosts.length } });
});

// Dashboard
app.get('/dashboard', (_req, res) => {
  const firing = alerts.filter(a => a.status === 'firing').length;
  const critical = alerts.filter(a => a.severity === 'critical').length;
  const avgDuration = traces.length > 0 ? traces.reduce((s, t) => s + t.totalDuration, 0) / traces.length : 0;
  res.json({
    success: true,
    data: {
      overview: {
        activeAgents: 0, // Would come from RuntimeOS
        firingAlerts: firing,
        criticalAlerts: critical,
        avgLatency: Math.round(avgDuration),
        totalCost: 0
      }
    }
  });
});

app.listen(PORT, () => console.log(`ObservationOS - Port ${PORT}`));
process.on('SIGTERM', () => server.close());
const server = app.listen(PORT, () => console.log(`ObservationOS - Port ${PORT}`));
export default app;
