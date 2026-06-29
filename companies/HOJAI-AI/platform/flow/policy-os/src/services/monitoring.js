/**
 * PolicyOS — Real-time Monitoring Service (Phase P3)
 *
 * Metrics collection, health checks, SLA tracking, and real-time events.
 */

import { EventEmitter } from 'events';
import crypto from 'crypto';

// ── Metrics Collector ───────────────────────────────────────────────────────────

const events = new EventEmitter();

const METRIC_WINDOWS = {
  '1m':  60 * 1000,
  '5m':  5 * 60 * 1000,
  '1h':  60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
};

class MetricsCollector {
  constructor() {
    // Circular buffer per metric: [{ timestamp, value }]
    this._counters = new Map();    // cumulative counts
    this._gauges = new Map();       // point-in-time values
    this._histograms = new Map();  // distribution buckets
    this._timers = new Map();      // durations
    this._windows = {
      '1m': new Map(),
      '5m': new Map(),
      '1h': new Map(),
      '24h': new Map(),
    };
    this._startTime = Date.now();
  }

  // ── Counters ────────────────────────────────────────────────────────────────

  increment(name, delta = 1, labels = {}) {
    const key = metricKey(name, labels);
    const val = (this._counters.get(key) || 0) + delta;
    this._counters.set(key, val);
    this._recordWindow('1m', name, delta, labels);
    this._recordWindow('5m', name, delta, labels);
    this._recordWindow('1h', name, delta, labels);
    this._recordWindow('24h', name, delta, labels);
    events.emit('metric', { name, delta, labels, type: 'counter', ts: Date.now() });
  }

  // ── Gauges ────────────────────────────────────────────────────────────────

  gauge(name, value, labels = {}) {
    const key = metricKey(name, labels);
    this._gauges.set(key, { value, ts: Date.now() });
    events.emit('metric', { name, value, labels, type: 'gauge', ts: Date.now() });
  }

  // ── Histograms ──────────────────────────────────────────────────────────

  observe(name, value, labels = {}) {
    const key = metricKey(name, labels);
    if (!this._histograms.has(key)) {
      this._histograms.set(key, []);
    }
    const buckets = this._histograms.get(key);
    buckets.push({ value, ts: Date.now() });
    // Keep last 10000 samples
    if (buckets.length > 10000) buckets.shift();
    events.emit('metric', { name, value, labels, type: 'histogram', ts: Date.now() });
  }

  // ── Timers ──────────────────────────────────────────────────────────────

  startTimer(name, labels = {}) {
    const key = metricKey(name, labels);
    this._timers.set(key, Date.now());
  }

  stopTimer(name, labels = {}) {
    const key = metricKey(name, labels);
    const start = this._timers.get(key);
    if (start !== undefined) {
      const duration = Date.now() - start;
      this._timers.delete(key);
      this.observe(name, duration, labels);
      return duration;
    }
    return null;
  }

  // ── Predefined Metrics ──────────────────────────────────────────────────

  recordEval(durationMs, allowed, cached, policyId) {
    this.increment('policy.eval.total', 1);
    this.increment(`policy.eval.allowed.${allowed}`, 1);
    if (cached) this.increment('policy.eval.cache.hit', 1);
    else this.increment('policy.eval.cache.miss', 1);
    this.observe('policy.eval.duration_ms', durationMs);
    this.gauge('policy.eval.last_timestamp', Date.now());
    if (policyId) {
      this.increment('policy.eval.by_id', 1, { policyId });
    }
  }

  recordAuth(success, method) {
    this.increment('auth.total', 1);
    this.increment(`auth.${success ? 'success' : 'failure'}`, 1);
    this.increment(`auth.method.${method}`, 1);
  }

  recordPolicyChange(action, category, tenant) {
    this.increment('policy.change.total', 1);
    this.increment(`policy.change.${action}`, 1);
    if (category) this.increment('policy.change.by_category', 1, { category });
    if (tenant) this.increment('policy.change.by_tenant', 1, { tenant });
  }

  recordCacheHit(driver) {
    this.increment('cache.hit', 1);
    this.increment(`cache.driver.${driver}`, 1);
  }

  recordCacheMiss(driver) {
    this.increment('cache.miss', 1);
    this.increment(`cache.driver.${driver}`, 1);
  }

  recordRateLimit(allowed, tenant, endpoint) {
    this.increment('ratelimit.total', 1);
    this.increment(`ratelimit.${allowed ? 'allowed' : 'blocked'}`, 1);
    if (tenant) this.increment('ratelimit.by_tenant', 1, { tenant });
  }

  // ── Query API ──────────────────────────────────────────────────────────────

  getCounter(name, labels = {}) {
    const key = metricKey(name, labels);
    return this._counters.get(key) || 0;
  }

  getGauge(name, labels = {}) {
    const key = metricKey(name, labels);
    return this._gauges.get(key) || null;
  }

  getHistogram(name, labels = {}) {
    const key = metricKey(name, labels);
    const samples = this._histograms.get(key) || [];
    if (samples.length === 0) return null;
    const values = samples.map(s => s.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    const count = values.length;
    return {
      count,
      sum,
      min: values[0],
      max: values[count - 1],
      avg: sum / count,
      p50: percentile(values, 0.5),
      p95: percentile(values, 0.95),
      p99: percentile(values, 0.99),
    };
  }

  getWindow(window, name, labels = {}) {
    if (!this._windows[window]) return [];
    const key = metricKey(name, labels);
    const data = this._windows[window].get(key) || [];
    const cutoff = Date.now() - METRIC_WINDOWS[window];
    return data.filter(d => d.ts >= cutoff);
  }

  getAll(limit = 50) {
    const result = {
      counters: {},
      gauges: {},
      histograms: {},
      uptime: Date.now() - this._startTime,
      ts: Date.now(),
    };

    for (const [key, val] of this._counters.entries()) {
      const parsed = parseKey(key);
      if (Object.keys(result.counters).length < limit) {
        result.counters[key] = val;
      }
    }

    for (const [key, { value }] of this._gauges.entries()) {
      const parsed = parseKey(key);
      if (Object.keys(result.gauges).length < limit) {
        result.gauges[key] = value;
      }
    }

    return result;
  }

  // ── Internal ─────────────────────────────────────────────────────────────

  _recordWindow(windowName, name, delta, labels) {
    const window = this._windows[windowName];
    if (!window) return;
    const key = metricKey(name, labels);
    if (!window.has(key)) window.set(key, []);
    const data = window.get(key);
    data.push({ ts: Date.now(), value: delta });
    // Prune old entries
    const cutoff = Date.now() - METRIC_WINDOWS[windowName];
    while (data.length > 0 && data[0].ts < cutoff) data.shift();
  }
}

function percentile(sorted, p) {
  if (sorted.length === 0) return null;
  const idx = Math.ceil(sorted.length * p) - 1;
  return sorted[Math.max(0, idx)];
}

function metricKey(name, labels) {
  const labelStr = Object.entries(labels).sort().map(([k, v]) => `${k}=${v}`).join(',');
  return labelStr ? `${name}{${labelStr}}` : name;
}

function parseKey(key) {
  const match = key.match(/^([^,{]+)(?:{(.*)})?$/);
  if (!match) return { name: key, labels: {} };
  const labels = {};
  if (match[2]) {
    for (const pair of match[2].split(',')) {
      const [k, v] = pair.split('=');
      if (k) labels[k] = v;
    }
  }
  return { name: match[1], labels };
}

// ── Health Checker ────────────────────────────────────────────────────────────────

export function checkHealth() {
  const checks = {};
  let healthy = true;

  // Memory check
  const memUsage = process.memoryUsage();
  const memUsed = Math.round(memUsage.heapUsed / 1024 / 1024);
  const memTotal = Math.round(memUsage.heapTotal / 1024 / 1024);
  const memPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
  checks.memory = {
    status: memPercent > 90 ? 'unhealthy' : memPercent > 75 ? 'degraded' : 'healthy',
    heapUsedMB: memUsed,
    heapTotalMB: memTotal,
    heapPercent: memPercent,
    rssMB: Math.round(memUsage.rss / 1024 / 1024),
  };
  if (checks.memory.status !== 'healthy') healthy = false;

  // Event loop lag
  const start = Date.now();
  setImmediate(() => {});
  const loopLag = Date.now() - start;
  checks.eventLoop = {
    status: loopLag > 100 ? 'degraded' : 'healthy',
    lagMs: loopLag,
  };

  return { healthy, checks, ts: Date.now() };
}

// ── SLA Tracker ────────────────────────────────────────────────────────────────

const SLA_WINDOWS = {
  hourly: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

class SLATracker {
  constructor() {
    this._windows = {
      hourly: [],
      daily: [],
      weekly: [],
    };
    this._alerts = [];
    this._alertId = 0;
  }

  recordResult(allowed, durationMs, success = true) {
    const entry = {
      ts: Date.now(),
      allowed,
      durationMs,
      success,
      slaOk: allowed || success, // Eval succeeded within SLA
    };
    for (const w of ['hourly', 'daily', 'weekly']) {
      this._windows[w].push(entry);
    }
    this._prune();
  }

  getSLA(window = 'hourly') {
    const cutoff = Date.now() - SLA_WINDOWS[window];
    const entries = this._windows[window].filter(e => e.ts >= cutoff);
    if (entries.length === 0) return null;

    const durations = entries.map(e => e.durationMs).filter(d => d != null).sort((a, b) => a - b);
    const successRate = entries.filter(e => e.slaOk).length / entries.length;
    const p50 = percentile(durations, 0.5) || 0;
    const p99 = percentile(durations, 0.99) || 0;

    const targets = {
      availability: 0.999,    // 99.9%
      p99Latency: 200,          // 200ms
      errorRate: 0.01,        // 1%
    };

    return {
      window,
      totalRequests: entries.length,
      successRate: Math.round(successRate * 10000) / 100,
      availability: Math.round(successRate * 10000) / 100,
      latencyP50: Math.round(p50),
      latencyP99: Math.round(p99),
      meetsAvailability: successRate >= targets.availability,
      meetsLatency: p99 <= targets.p99Latency,
      meetsErrorRate: (1 - successRate) <= targets.errorRate,
      target: targets,
    };
  }

  setAlert(condition, message, severity = 'warning') {
    const alert = { id: ++this._alertId, condition, message, severity, ts: Date.now(), resolved: false };
    this._alerts.push(alert);
    events.emit('alert', alert);
    return alert;
  }

  resolveAlert(id) {
    const alert = this._alerts.find(a => a.id === id);
    if (alert) {
      alert.resolved = true;
      alert.resolvedAt = Date.now();
      events.emit('alert:resolved', alert);
    }
  }

  getAlerts(active = true) {
    return active ? this._alerts.filter(a => !a.resolved) : this._alerts;
  }

  _prune() {
    const cutoff = Date.now() - SLA_WINDOWS.weekly;
    for (const w of ['hourly', 'daily', 'weekly']) {
      this._windows[w] = this._windows[w].filter(e => e.ts >= cutoff);
    }
    this._alerts = this._alerts.filter(a => !a.resolved || (Date.now() - a.ts) < 7 * 24 * 60 * 60 * 1000);
  }
}

// ── Singleton instances ──────────────────────────────────────────────────────────

export const metrics = new MetricsCollector();
export const slaTracker = new SLATracker();

export { events, METRIC_WINDOWS };

export default { metrics, slaTracker, events, checkHealth };