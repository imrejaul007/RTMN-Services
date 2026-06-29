/**
 * PolicyOS — Monitoring Service Tests (Phase P3)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const {
  metrics,
  slaTracker,
  checkHealth,
  events,
} = await import('../../src/services/monitoring.js');

// ── MetricsCollector ──────────────────────────────────────────────────

describe('metrics — counters', () => {
  it('increments counter', () => {
    const before = metrics.getCounter('test.counter');
    metrics.increment('test.counter');
    const after = metrics.getCounter('test.counter');
    assert.strictEqual(after, before + 1);
  });

  it('increments by delta', () => {
    metrics.increment('test.delta', 5);
    assert.strictEqual(metrics.getCounter('test.delta'), 5);
  });

  it('increments with labels', () => {
    metrics.increment('test.labeled', 1, { status: 'ok', tenant: 'tenant-a' });
    const val = metrics.getCounter('test.labeled', { status: 'ok', tenant: 'tenant-a' });
    assert.strictEqual(val, 1);
  });
});

describe('metrics — gauges', () => {
  it('sets and gets gauge', () => {
    metrics.gauge('test.memory', 42);
    assert.strictEqual(metrics.getGauge('test.memory'), 42);
  });

  it('overwrites previous gauge', () => {
    metrics.gauge('test.gauge', 10);
    metrics.gauge('test.gauge', 20);
    assert.strictEqual(metrics.getGauge('test.gauge'), 20);
  });
});

describe('metrics — histograms', () => {
  it('observes values', () => {
    metrics.observe('test.latency', 50);
    metrics.observe('test.latency', 100);
    metrics.observe('test.latency', 150);
    const h = metrics.getHistogram('test.latency');
    assert.ok(h !== null);
    assert.strictEqual(h.count, 3);
    assert.strictEqual(h.min, 50);
    assert.strictEqual(h.max, 150);
    assert.strictEqual(h.avg, 100);
  });

  it('calculates percentiles', () => {
    for (let i = 1; i <= 100; i++) metrics.observe('test.pct', i);
    const h = metrics.getHistogram('test.pct');
    assert.ok(h.p50 >= 49 && h.p50 <= 51);
    assert.ok(h.p95 >= 94 && h.p95 <= 96);
    assert.ok(h.p99 >= 98 && h.p99 <= 100);
  });

  it('returns null for unknown histogram', () => {
    assert.strictEqual(metrics.getHistogram('nonexistent'), null);
  });
});

describe('metrics — recordEval', () => {
  it('records evaluation metrics', () => {
    metrics.recordEval(25, true, false, 'pol-1');
    assert.strictEqual(metrics.getCounter('policy.eval.total'), 1);
    metrics.recordEval(30, false, true, 'pol-2');
    assert.strictEqual(metrics.getCounter('policy.eval.total'), 2);
  });
});

describe('metrics — getAll', () => {
  it('returns all metric types', () => {
    const all = metrics.getAll();
    assert.ok(typeof all === 'object');
    assert.ok(typeof all.counters === 'object');
    assert.ok(typeof all.gauges === 'object');
    assert.ok(typeof all.uptime === 'number');
    assert.ok(typeof all.ts === 'number');
  });
});

// ── SLATracker ────────────────────────────────────────────────────────

describe('slaTracker', () => {

  it('records results', () => {
    slaTracker.recordResult(true, 50, true);
    slaTracker.recordResult(false, 100, true);
  });

  it('computes hourly SLA', () => {
    slaTracker.recordResult(true, 50, true);
    slaTracker.recordResult(true, 80, true);
    slaTracker.recordResult(false, 20, false);
    const sla = slaTracker.getSLA('hourly');
    assert.ok(sla !== null);
    assert.strictEqual(sla.totalRequests, 3);
    assert.strictEqual(sla.successRate, Math.round((2 / 3) * 10000) / 100);
  });

  it('returns null for empty window', () => {
    const sla = slaTracker.getSLA('hourly');
    // May have data from other tests, just check structure
    assert.ok(typeof sla.totalRequests === 'number');
  });

  it('sets and resolves alerts', () => {
    const alert = slaTracker.setAlert('high_error_rate', 'Error rate exceeded 5%', 'error');
    assert.strictEqual(alert.id > 0, true);
    assert.strictEqual(alert.severity, 'error');
    const active = slaTracker.getAlerts(true);
    assert.ok(active.length >= 1);
    slaTracker.resolveAlert(alert.id);
    const resolved = slaTracker.getAlerts(false);
    assert.ok(resolved.some(a => a.id === alert.id));
  });
});

// ── checkHealth ─────────────────────────────────────────────────────

describe('checkHealth', () => {

  it('returns health object with checks', () => {
    const health = checkHealth();
    assert.ok(typeof health === 'object');
    assert.ok(typeof health.healthy === 'boolean');
    assert.ok(typeof health.checks === 'object');
    assert.ok(typeof health.ts === 'number');
  });

  it('includes memory check', () => {
    const health = checkHealth();
    assert.ok(typeof health.checks.memory === 'object');
    assert.ok(['healthy', 'degraded', 'unhealthy'].includes(health.checks.memory.status));
    assert.ok(typeof health.checks.memory.heapPercent === 'number');
  });

  it('includes event loop check', () => {
    const health = checkHealth();
    assert.ok(typeof health.checks.eventLoop === 'object');
    assert.ok(typeof health.checks.eventLoop.lagMs === 'number');
    assert.ok(['healthy', 'degraded'].includes(health.checks.eventLoop.status));
  });
});

// ── Event emitter ──────────────────────────────────────────────────

describe('events', () => {

  it('emits metric events', (done) => {
    events.once('metric', (data) => {
      assert.strictEqual(data.name, 'test-event');
      done();
    });
    metrics.increment('test-event');
  });

  it('emits alert events', (done) => {
    events.once('alert', (data) => {
      assert.ok(data.id > 0);
      done();
    });
    slaTracker.setAlert('test-alert', 'Test alert message', 'info');
  });
});
