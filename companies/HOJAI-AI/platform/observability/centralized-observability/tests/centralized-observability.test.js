'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const os = require('os');
const http = require('http');

// ---------------------------------------------------------------------------
// Shared server — one instance for all tests so in-memory state is shared
// ---------------------------------------------------------------------------

let _port = 29100;
let _server, _app, _baseUrl;

function nextPort() { return ++_port; }

async function req(method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req2 = http.request({
      hostname: '127.0.0.1', port: _app._port, method, path: p,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'X-Internal-Token': token } : {}),
      },
    }, (res) => {
      let chunks = '';
      res.on('data', c => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch (_) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req2.on('error', reject);
    if (data) req2.write(data);
    req2.end();
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

test('Health & ready', async () => {
  const r = await req('GET', '/health');
  assert.strictEqual(r.body.service, 'centralized-observability');
});

test('Auth required for protected endpoints', async () => {
  const r = await req('POST', '/api/services', { id: 's1', name: 'test' });
  assert.strictEqual(r.status, 401);
});

test('Register a service', async () => {
  const r = await req('POST', '/api/services', { id: 'svc-reg', name: 'Test Service', version: '1.0.0' }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.service.id, 'svc-reg');
  const list = await req('GET', '/api/services');
  assert.strictEqual(list.body.count, 1);
  assert.strictEqual(list.body.services[0].name, 'Test Service');
  const del = await req('DELETE', '/api/services/svc-reg', null, 'tok');
  assert.strictEqual(del.status, 200);
});

test('Service not found', async () => {
  const r = await req('DELETE', '/api/services/nonexistent', null, 'tok');
  assert.strictEqual(r.status, 404);
});

test('Ingest metrics', async () => {
  await req('POST', '/api/services', { id: 'svc-m1', name: 'Metrics Test' }, 'tok');
  const r = await req('POST', '/api/metrics/svc-m1', {
    metrics: [
      { metric: 'requests', value: 100, type: 'counter' },
      { metric: 'latency_ms', value: 45.2, type: 'gauge' },
    ],
  }, 'tok');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.count, 2);
  const q = await req('GET', '/api/metrics/svc-m1/requests');
  assert.strictEqual(q.status, 200);
  assert.strictEqual(q.body.count, 1);
  assert.strictEqual(q.body.avg, 100);
});

test('Metrics aggregation — p50/p95/p99', async () => {
  await req('POST', '/api/services', { id: 'svc-m2', name: 'Agg Test' }, 'tok');
  // 20 values spanning 10–200 — enough to distinguish p50, p95, p99
  for (let i = 1; i <= 20; i++) {
    await req('POST', '/api/metrics/svc-m2', { metrics: [{ metric: 'latency', value: i * 10, type: 'gauge' }] }, 'tok');
  }
  const q = await req('GET', '/api/metrics/svc-m2/latency');
  assert.strictEqual(q.status, 200);
  assert.ok(q.body.p50 !== undefined);
  assert.ok(q.body.p95 !== undefined);
  assert.ok(q.body.p99 !== undefined);
  assert.ok(q.body.p50 < q.body.p95, `p50 (${q.body.p50}) should be < p95 (${q.body.p95})`);
  assert.ok(q.body.p95 < q.body.p99, `p95 (${q.body.p95}) should be < p99 (${q.body.p99})`);
  assert.strictEqual(q.body.count, 20);
});

test('Ingest logs', async () => {
  await req('POST', '/api/services', { id: 'svc-log1', name: 'Log Test' }, 'tok');
  const post = await req('POST', '/api/logs/svc-log1', {
    entries: [
      { level: 'info', message: 'Server started', meta: { port: 3000 } },
      { level: 'error', message: 'Connection timeout', meta: { host: 'db1' } },
    ],
  }, 'tok');
  assert.strictEqual(post.status, 200);
  assert.strictEqual(post.body.count, 2);
  const r = await req('GET', '/api/logs');
  assert.strictEqual(r.body.count, 2);
  const errors = await req('GET', '/api/logs?level=error');
  assert.strictEqual(errors.body.count, 1);
  assert.strictEqual(errors.body.entries[0].level, 'error');
});

test('Filter logs by serviceId', async () => {
  await req('POST', '/api/services', { id: 'svc-log-a', name: 'A' }, 'tok');
  await req('POST', '/api/services', { id: 'svc-log-b', name: 'B' }, 'tok');
  await req('POST', '/api/logs/svc-log-a', { entries: [{ level: 'info', message: 'A log' }] }, 'tok');
  await req('POST', '/api/logs/svc-log-b', { entries: [{ level: 'info', message: 'B log' }] }, 'tok');
  const a = await req('GET', '/api/logs?serviceId=svc-log-a');
  assert.strictEqual(a.body.count, 1);
  assert.strictEqual(a.body.entries[0].serviceId, 'svc-log-a');
});

test('Alert rules CRUD', async () => {
  await req('POST', '/api/services', { id: 'svc-alrt', name: 'Alert Test' }, 'tok');
  const create = await req('POST', '/api/alerts/rules', {
    name: 'High Latency',
    metric: 'latency_ms',
    operator: 'gt',
    threshold: 500,
    severity: 'critical',
    serviceId: 'svc-alrt',
  }, 'tok');
  assert.strictEqual(create.status, 201);
  assert.ok(create.body.rule.id.startsWith('alr_'));
  assert.strictEqual(create.body.rule.threshold, 500);
  const list = await req('GET', '/api/alerts/rules');
  assert.ok(list.body.rules.length >= 1);
  const del = await req('DELETE', `/api/alerts/rules/${create.body.rule.id}`, null, 'tok');
  assert.strictEqual(del.status, 200);
});

test('Alert rule validation — missing fields', async () => {
  const r = await req('POST', '/api/alerts/rules', { name: 'Bad Rule' }, 'tok');
  assert.strictEqual(r.status, 400);
});

test('Dashboard summary', async () => {
  const r = await req('GET', '/api/dashboard/summary');
  assert.ok(typeof r.body.services === 'object');
  assert.ok(typeof r.body.alerts === 'object');
  assert.ok(typeof r.body.metrics === 'object');
});

test('Dashboard service detail', async () => {
  await req('POST', '/api/services', { id: 'svc-dash', name: 'Service Dash' }, 'tok');
  await req('POST', '/api/metrics/svc-dash', { metrics: [{ metric: 'cpu', value: 72 }] }, 'tok');
  const r = await req('GET', '/api/dashboard/service/svc-dash');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.service.name, 'Service Dash');
  assert.ok(r.body.metrics !== undefined);
});

test('Dependencies', async () => {
  await req('POST', '/api/services', { id: 'svc-dep-x', name: 'X' }, 'tok');
  await req('POST', '/api/services', { id: 'svc-dep-y', name: 'Y' }, 'tok');
  await req('POST', '/api/dependencies', { from: 'svc-dep-x', to: 'svc-dep-y' }, 'tok');
  const r = await req('GET', '/api/dependencies');
  const edge = r.body.edges.find(e => e.from === 'svc-dep-x' && e.to === 'svc-dep-y');
  assert.ok(edge, 'edge svc-dep-x → svc-dep-y should exist');
});

test('Traces — ingest and retrieve', async () => {
  await req('POST', '/api/services', { id: 'svc-trace', name: 'Trace Test' }, 'tok');
  const tid = 'trace-test-001';
  const ingest = await req('POST', '/api/traces/svc-trace', {
    spans: [
      { id: 's1', name: 'outer', startTime: 0, duration: 100, traceId: tid },
      { id: 's2', name: 'inner', startTime: 10, duration: 80, parentId: 's1', traceId: tid },
    ],
  }, 'tok');
  assert.strictEqual(ingest.status, 200);
  const get = await req('GET', `/api/traces/${tid}`);
  assert.strictEqual(get.status, 200);
  assert.strictEqual(get.body.count, 2);
});

test('Alert history', async () => {
  const history = await req('GET', '/api/alerts/history');
  assert.ok(Array.isArray(history.body.entries));
  assert.ok(typeof history.body.count === 'number');
});

test('Maintenance flush', async () => {
  const r = await req('POST', '/api/maintenance/flush', null, 'tok');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.at !== undefined);
});

test('404 for unknown endpoints', async () => {
  const r = await req('GET', '/api/nonexistent');
  assert.strictEqual(r.status, 404);
});

// ---------------------------------------------------------------------------
// Bootstrap — start server once before all tests
// ---------------------------------------------------------------------------

test.before(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'obs-test-'));
  process.env.PORT = String(nextPort());
  process.env.DATA_DIR = tmp;
  process.env.INTERNAL_TOKEN = 'tok';
  process.env.POLL_INTERVAL_MS = '999999';
  process.env.NO_PERSIST = 'true';

  const { createApp } = require('../src/index.js');
  _app = createApp();
  _app._port = parseInt(process.env.PORT, 10);
  _server = _app.listen(_app._port, () => {
    _baseUrl = `http://127.0.0.1:${_app._port}`;
  });
  // Give the server a moment to bind
  await new Promise(r => setTimeout(r, 50));
});

test.after(async () => {
  if (_server) {
    _server.closeAllConnections();
    _server.close();
  }
});
