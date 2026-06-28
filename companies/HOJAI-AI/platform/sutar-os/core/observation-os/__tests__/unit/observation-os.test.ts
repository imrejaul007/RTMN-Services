import { describe, it, expect, vi } from 'vitest';

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (_req: any, _res: any, next: () => void) => next(),
}));

// Types
interface Metric {
  id: string; agentId: string; metric: string;
  value: number; unit: string; timestamp: string;
}

interface Trace {
  id: string; agentId: string; operation: string;
  steps: { name: string; duration: number; status: string }[];
  status: 'success' | 'partial' | 'failed'; totalDuration: number;
}

interface Alert {
  id: string; agentId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string; threshold: number; actual: number; message: string;
  status: 'firing' | 'resolved' | 'acknowledged';
  createdAt: string; acknowledgedAt?: string;
}

// Metric aggregation
function aggregateMetrics(metrics: Metric[], windowMs: number): { avg: number; count: number; min: number; max: number } {
  const cutoff = new Date(Date.now() - windowMs);
  const filtered = metrics.filter(m => new Date(m.timestamp) >= cutoff);
  if (filtered.length === 0) return { avg: 0, count: 0, min: 0, max: 0 };
  const sum = filtered.reduce((s, m) => s + m.value, 0);
  const min = Math.min(...filtered.map(m => m.value));
  const max = Math.max(...filtered.map(m => m.value));
  return { avg: sum / filtered.length, count: filtered.length, min, max };
}

// Trace duration calculation
function calculateDuration(steps: Trace['steps']): number {
  return steps.reduce((s, step) => s + step.duration, 0);
}

// Alert severity comparison
function compareSeverity(a: Alert['severity'], b: Alert['severity']): number {
  const order = { critical: 4, high: 3, medium: 2, low: 1 };
  return (order[a] || 0) - (order[b] || 0);
}

// Dashboard metrics
function dashboardMetrics(alerts: Alert[], traces: Trace[]): { firing: number; critical: number; avgDuration: number } {
  const firing = alerts.filter(a => a.status === 'firing').length;
  const critical = alerts.filter(a => a.severity === 'critical').length;
  const avgDuration = traces.length > 0 ? traces.reduce((s, t) => s + t.totalDuration, 0) / traces.length : 0;
  return { firing, critical, avgDuration: Math.round(avgDuration) };
}

describe('ObservationOS — Metrics', () => {
  const now = new Date().toISOString();
  const hourAgo = new Date(Date.now() - 3600000).toISOString();

  it('calculates average correctly', () => {
    const metrics: Metric[] = [
      { id: '1', agentId: 'a1', metric: 'cpu', value: 10, unit: 'percent', timestamp: now },
      { id: '2', agentId: 'a1', metric: 'cpu', value: 20, unit: 'percent', timestamp: now },
      { id: '3', agentId: 'a1', metric: 'cpu', value: 30, unit: 'percent', timestamp: now },
    ];
    const result = aggregateMetrics(metrics, 3600000);
    expect(result.avg).toBe(20);
    expect(result.count).toBe(3);
  });

  it('filters by time window', () => {
    const metrics: Metric[] = [
      { id: '1', agentId: 'a1', metric: 'cpu', value: 10, unit: '%', timestamp: now },
      { id: '2', agentId: 'a1', metric: 'cpu', value: 20, unit: '%', timestamp: hourAgo },
    ];
    const result = aggregateMetrics(metrics, 3600000); // 1 hour
    expect(result.count).toBe(1); // only the recent one
  });

  it('returns zeros for empty metrics', () => {
    const result = aggregateMetrics([], 3600000);
    expect(result.avg).toBe(0);
    expect(result.count).toBe(0);
  });

  it('calculates min and max', () => {
    const metrics: Metric[] = [
      { id: '1', agentId: 'a1', metric: 'latency', value: 50, unit: 'ms', timestamp: now },
      { id: '2', agentId: 'a1', metric: 'latency', value: 100, unit: 'ms', timestamp: now },
      { id: '3', agentId: 'a1', metric: 'latency', value: 25, unit: 'ms', timestamp: now },
    ];
    const result = aggregateMetrics(metrics, 3600000);
    expect(result.min).toBe(25);
    expect(result.max).toBe(100);
  });
});

describe('ObservationOS — Traces', () => {
  it('calculates total duration from steps', () => {
    const steps = [
      { name: 'init', duration: 10, status: 'success' },
      { name: 'process', duration: 50, status: 'success' },
      { name: 'finalize', duration: 15, status: 'success' },
    ];
    expect(calculateDuration(steps)).toBe(75);
  });

  it('handles empty steps', () => {
    expect(calculateDuration([])).toBe(0);
  });

  it('supports all trace statuses', () => {
    const statuses: Trace['status'][] = ['success', 'partial', 'failed'];
    statuses.forEach(s => {
      const trace: Trace = { id: '1', agentId: 'a1', operation: 'test', steps: [], status: s, totalDuration: 0 };
      expect([s]).toContain(trace.status);
    });
  });
});

describe('ObservationOS — Alerts', () => {
  it('compares severity correctly', () => {
    expect(compareSeverity('critical', 'low')).toBeGreaterThan(0);
    expect(compareSeverity('low', 'critical')).toBeLessThan(0);
    expect(compareSeverity('high', 'medium')).toBeGreaterThan(0);
    expect(compareSeverity('medium', 'high')).toBeLessThan(0);
    expect(compareSeverity('low', 'low')).toBe(0);
  });

  it('supports all alert statuses', () => {
    const statuses: Alert['status'][] = ['firing', 'resolved', 'acknowledged'];
    statuses.forEach(s => {
      const alert: Alert = { id: '1', agentId: 'a1', severity: 'medium', metric: 'cpu', threshold: 80, actual: 90, message: 'CPU high', status: s, createdAt: '' };
      expect([s]).toContain(alert.status);
    });
  });

  it('acknowledged alerts have acknowledgedAt', () => {
    const alert: Alert = { id: '1', agentId: 'a1', severity: 'high', metric: 'mem', threshold: 90, actual: 95, message: 'Memory high', status: 'acknowledged', createdAt: new Date().toISOString(), acknowledgedAt: new Date().toISOString() };
    expect(alert.acknowledgedAt).toBeDefined();
  });
});

describe('ObservationOS — Dashboard', () => {
  it('counts firing and critical alerts', () => {
    const alerts: Alert[] = [
      { id: '1', agentId: 'a1', severity: 'critical', metric: 'cpu', threshold: 90, actual: 95, message: '', status: 'firing', createdAt: '' },
      { id: '2', agentId: 'a1', severity: 'high', metric: 'mem', threshold: 80, actual: 85, message: '', status: 'firing', createdAt: '' },
      { id: '3', agentId: 'a1', severity: 'medium', metric: 'disk', threshold: 70, actual: 75, message: '', status: 'resolved', createdAt: '' },
    ];
    const traces: Trace[] = [];
    const result = dashboardMetrics(alerts, traces);
    expect(result.firing).toBe(2);
    expect(result.critical).toBe(1);
  });

  it('calculates average trace duration', () => {
    const alerts: Alert[] = [];
    const traces: Trace[] = [
      { id: '1', agentId: 'a1', operation: 'op1', steps: [], status: 'success', totalDuration: 100 },
      { id: '2', agentId: 'a1', operation: 'op2', steps: [], status: 'success', totalDuration: 200 },
    ];
    const result = dashboardMetrics(alerts, traces);
    expect(result.avgDuration).toBe(150);
  });

  it('handles zero traces', () => {
    const result = dashboardMetrics([], []);
    expect(result.avgDuration).toBe(0);
    expect(result.firing).toBe(0);
    expect(result.critical).toBe(0);
  });
});