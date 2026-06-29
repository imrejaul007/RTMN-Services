/**
 * PolicyOS — Monitoring Service Tests (Phase P3)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const svc = await import('../../src/services/monitoring.js');
const { metrics, slaTracker, checkHealth, events } = svc;
metrics._counters = new Map();
metrics._gauges = new Map();
metrics._histograms = new Map();
slaTracker._windows = { hourly: [], daily: [], weekly: [] };

describe('metrics', () => {
  it('increments counter', () => {
    metrics.increment('ctr1');
    assert.strictEqual(metrics.getCounter('ctr1'), 1);
  });
  it('records histogram', () => {
    metrics.observe('h1', 50);
    const h = metrics.getHistogram('h1');
    assert.strictEqual(h.count, 1);
    assert.strictEqual(h.min, 50);
  });
});

describe('slaTracker', () => {
  slaTracker._alerts = [];
  slaTracker._alertId = 0;
  slaTracker._windows = { hourly: [], daily: [], weekly: [] };

  it('sets alert', () => {
    const a = slaTracker.setAlert('t1', 'msg', 'info');
    assert.strictEqual(a.id > 0, true);
  });
});

describe('checkHealth', () => {
  it('returns health', () => {
    const h = checkHealth();
    assert.strictEqual(typeof h.healthy, 'boolean');
    assert.strictEqual(typeof h.checks, 'object');
    assert.strictEqual(typeof h.ts, 'number');
  });
});
