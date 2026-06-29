/**
 * PolicyOS — Monitoring Service Tests (Phase P3)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const svc = await import('/Users/rejaulkarim/Documents/RTMN/companies/HOJAI-AI/platform/flow/policy-os/src/services/monitoring.js');

const { metrics, slaTracker, checkHealth, events } = svc;
metrics._counters = new Map();
metrics._gauges = new Map();
metrics._histograms = new Map();

describe('metrics', () => {
  it('increments counter', () => {
    metrics.increment('t1');
    assert.strictEqual(metrics.getCounter('t1'), 1);
  });

  it('records histogram', () => {
    metrics.observe('h1', 50);
    const h = metrics.getHistogram('h1');
    assert.strictEqual(h.count, 1);
    assert.strictEqual(h.min, 50);
    assert.strictEqual(h.max, 50);
  });

  it('records SLA result', () => {
    slaTracker.recordResult(true, 100, true);
    const sla = slaTracker.getSLA('hourly');
    assert.strictEqual(typeof sla.totalRequests, 'number');
  });

  it('sets alert', () => {
    const a = slaTracker.setAlert('test', 'msg', 'warning');
    assert.strictEqual(a.id > 0, true);
    slaTracker.resolveAlert(a.id);
  });
});

describe('checkHealth', () => {
  it('returns health object', () => {
    const h = checkHealth();
    assert.strictEqual(typeof h.healthy, 'boolean');
    assert.strictEqual(typeof h.checks, 'object');
    assert.strictEqual(typeof h.ts, 'number');
    assert.strictEqual(h.checks.memory.status, 'healthy');
    assert.strictEqual(h.checks.eventLoop.status, 'healthy');
  });
});
