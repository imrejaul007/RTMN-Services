/**
 * PolicyOS — Monitoring Service Tests (Phase P3)
 * Uses reset() to isolate ESM module state between tests.
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

const {
  metrics,
  slaTracker,
  checkHealth,
  events,
} = await import('../../src/services/monitoring.js');

beforeEach(() => {
  // Reset singleton state to avoid ESM module cache pollution
  if (metrics.reset) metrics.reset();
});

// ── MetricsCollector ──────────────────────────────────────────────────

describe('metrics — counters', () => {
  it('increments counter', () => {
    metrics.increment('mctr1');
    assert.strictEqual(metrics.getCounter('mctr1'), 1);
  });

  it('increments by delta', () => {
    metrics.increment('mctr2', 5);
    assert.strictEqual(metrics.getCounter('mctr2'), 5);
  });
});

describe('metrics — gauges', () => {
  it('records gauge', () => {
    metrics.gauge('gtest1', 42);
    const g = metrics.getGauge('gtest1');
    // Gauge value format: { value, ts } or raw number
    const val = typeof g === 'object' ? g.value : g;
    assert.strictEqual(val, 42);
  });

  it('records multiple gauges', () => {
    metrics.gauge('gtest2', 100);
    metrics.gauge('gtest2', 200);
    const g = metrics.getGauge('gtest2');
    const val = typeof g === 'object' ? g.value : g;
    assert.strictEqual(typeof val, 'number');
  });
});

describe('metrics — histograms', () => {
  it('observes values and computes stats', () => {
    metrics.observe('mhist1', 50);
    metrics.observe('mhist1', 100);
    metrics.observe('mhist1', 150);
    const h = metrics.getHistogram('mhist1');
    assert.strictEqual(h.count, 3);
    assert.strictEqual(h.min, 50);
    assert.strictEqual(h.max, 150);
  });

  it('calculates percentiles', () => {
    for (let i = 1; i <= 100; i++) metrics.observe('mpct1', i);
    const h = metrics.getHistogram('mpct1');
    assert.ok(h.p50 >= 49 && h.p50 <= 51);
    assert.ok(h.p95 >= 94 && h.p95 <= 96);
    assert.ok(h.p99 >= 98 && h.p99 <= 100);
  });

  it('returns null for unknown histogram', () => {
    assert.strictEqual(metrics.getHistogram('mhist-unknown'), null);
  });
});

describe('metrics — recordEval', () => {
  it('records evaluation metrics', () => {
    metrics.recordEval(25, true, false, 'pol-test');
    assert.strictEqual(metrics.getCounter('policy.eval.total'), 1);
  });
});

describe('metrics — getAll', () => {
  it('returns all metric types', () => {
    const all = metrics.getAll();
    assert.strictEqual(typeof all.counters, 'object');
    assert.strictEqual(typeof all.gauges, 'object');
    assert.strictEqual(typeof all.uptime, 'number');
    assert.strictEqual(typeof all.ts, 'number');
  });
});

// ── SLATracker ──────────────────────────────────────────────────────

describe('slaTracker', () => {
  it('records results', () => {
    slaTracker.recordResult(true, 50, true);
    slaTracker.recordResult(false, 100, false);
    const sla = slaTracker.getSLA('hourly');
    assert.strictEqual(typeof sla.totalRequests, 'number');
  });

  it('sets and resolves alerts', () => {
    const alert = slaTracker.setAlert('test-alert', 'Test alert', 'error');
    assert.strictEqual(alert.id > 0, true);
    slaTracker.resolveAlert(alert.id);
    const resolved = slaTracker.getAlerts(false);
    assert.ok(resolved.some(a => a.id === alert.id));
  });
});

// ── checkHealth ───────────────────────────────────────────────────

describe('checkHealth', () => {
  it('returns health object with checks', () => {
    const health = checkHealth();
    assert.strictEqual(typeof health.healthy, 'boolean');
    assert.strictEqual(typeof health.checks, 'object');
    assert.strictEqual(typeof health.ts, 'number');
  });

  it('includes memory check', () => {
    const health = checkHealth();
    assert.ok(['healthy', 'degraded', 'unhealthy'].includes(health.checks.memory.status));
  });
});

// ── events ────────────────────────────────────────────────────────

describe('events', () => {
  it('emits metric events', (done) => {
    events.once('metric', (data) => {
      assert.strictEqual(data.name, 'mevt1');
      done();
    });
    metrics.increment('mevt1');
  });
});
