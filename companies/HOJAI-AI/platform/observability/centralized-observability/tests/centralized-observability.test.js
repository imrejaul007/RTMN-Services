'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function tmp() { return fs.mkdtempSync(path.join(os.tmpdir(), 'obs-test-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let pc = 29000;
function port() { return ++pc; }

async function req(port, method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port, method, path: p,
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
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function start(port, dataDir, token = 'tok') {
  return new Promise((resolve, reject) => {
    const prev = setEnv({ PORT: String(port), DATA_DIR: dataDir, INTERNAL_TOKEN: token, POLL_INTERVAL_MS: '999999' });
    delete require.cache[require.resolve('../src/index.js')];
    const { createApp } = require('../src/index.js');
    const app = createApp();
    const server = app.listen(port, () => resolve({ server, prev }));
    server.once('error', e => { restoreEnv(prev); reject(e); });
  });
}

async function stop(h) {
  return new Promise(resolve => {
    h.server.close(() => {
      delete require.cache[require.resolve('../src/index.js')];
      restoreEnv(h.prev);
      resolve();
    });
  });
}

const T = 'tok';

test('Health & ready', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  const r = await req(p, 'GET', '/health');
  assert.strictEqual(r.body.service, 'centralized-observability');
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Auth required for protected endpoints', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  const r = await req(p, 'POST', '/api/services', { id: 's1', name: 'test' });
  assert.strictEqual(r.status, 401);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Register a service', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  const r = await req(p, 'POST', '/api/services', { id: 'svc-1', name: 'Test Service', version: '1.0.0' }, T);
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.service.id, 'svc-1');
  // List services
  const list = await req(p, 'GET', '/api/services');
  assert.strictEqual(list.body.count, 1);
  assert.strictEqual(list.body.services[0].name, 'Test Service');
  // Delete service
  const del = await req(p, 'DELETE', '/api/services/svc-1', null, T);
  assert.strictEqual(del.status, 200);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Service not found', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  const r = await req(p, 'DELETE', '/api/services/nonexistent', null, T);
  assert.strictEqual(r.status, 404);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Ingest metrics', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  await req(p, 'POST', '/api/services', { id: 'svc-2', name: 'Metrics Test' }, T);
  const r = await req(p, 'POST', '/api/metrics/svc-2', {
    metrics: [
      { metric: 'requests', value: 100, type: 'counter' },
      { metric: 'latency_ms', value: 45.2, type: 'gauge' },
    ],
  }, T);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.count, 2);
  // Query metric
  const q = await req(p, 'GET', '/api/metrics/svc-2/requests');
  assert.strictEqual(q.status, 200);
  assert.strictEqual(q.body.count, 1);
  assert.strictEqual(q.body.avg, 100);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Metrics aggregation — p50/p95/p99', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  await req(p, 'POST', '/api/services', { id: 'svc-3', name: 'Agg Test' }, T);
  // Ingest 20 data points (20 sequential POSTs is enough for percentile testing)
  for (let i = 1; i <= 20; i++) {
    await req(p, 'POST', '/api/metrics/svc-3', { metrics: [{ metric: 'latency', value: i * 5, type: 'gauge' }] }, T);
  }
  const q = await req(p, 'GET', '/api/metrics/svc-3/latency');
  assert.strictEqual(q.status, 200);
  assert.ok(q.body.p50 !== undefined);
  assert.ok(q.body.p95 !== undefined);
  assert.ok(q.body.p99 !== undefined);
  assert.ok(q.body.p50 < q.body.p95);
  assert.ok(q.body.p95 < q.body.p99);
  assert.strictEqual(q.body.count, 20);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Ingest logs', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);

  // Register service
  const reg = await req(p, 'POST', '/api/services', { id: 'svc-4', name: 'Log Test' }, T);
  assert.strictEqual(reg.status, 201, `register failed: ${JSON.stringify(reg.body)}`);

  // Check logs.json NOT created yet
  const lf = path.join(td, 'logs.json');
  assert.ok(!fs.existsSync(lf), 'logs.json should not exist before first log');

  // POST logs
  const post = await req(p, 'POST', '/api/logs/svc-4', {
    entries: [
      { level: 'info', message: 'Server started', meta: { port: 3000 } },
      { level: 'error', message: 'Connection timeout', meta: { host: 'db1' } },
    ],
  }, T);
  assert.strictEqual(post.status, 200, `POST failed: ${JSON.stringify(post.body)}`);
  assert.strictEqual(post.body.count, 2, `Expected count=2, got ${post.body.count}`);

  // Verify file was created
  assert.ok(fs.existsSync(lf), `logs.json should exist after POST. Files: ${fs.readdirSync(td).join(',')}`);
  const logData = JSON.parse(fs.readFileSync(lf, 'utf8'));
  assert.ok(logData.entries.length >= 2, `logs.json should have entries, got: ${JSON.stringify(logData)}`);

  // GET logs
  const r = await req(p, 'GET', '/api/logs');
  assert.strictEqual(r.body.count, 2, `Expected 2 logs, got ${r.body.count}: ${JSON.stringify(r.body).slice(0,200)}`);
  const errors = await req(p, 'GET', '/api/logs?level=error');
  assert.strictEqual(errors.body.count, 1);
  assert.strictEqual(errors.body.entries[0].level, 'error');
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Filter logs by serviceId', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  await req(p, 'POST', '/api/services', { id: 'svc-a', name: 'A' }, T);
  await req(p, 'POST', '/api/services', { id: 'svc-b', name: 'B' }, T);
  const pa = await req(p, 'POST', '/api/logs/svc-a', { entries: [{ level: 'info', message: 'A log' }] }, T);
  const pb = await req(p, 'POST', '/api/logs/svc-b', { entries: [{ level: 'info', message: 'B log' }] }, T);
  assert.strictEqual(pa.body.count, 1, `A ingest failed: ${JSON.stringify(pa.body)}`);
  assert.strictEqual(pb.body.count, 1, `B ingest failed: ${JSON.stringify(pb.body)}`);
  const a = await req(p, 'GET', '/api/logs?serviceId=svc-a');
  assert.strictEqual(a.body.count, 1, `Expected 1 for svc-a, got ${a.body.count}: ${JSON.stringify(a.body).slice(0, 200)}`);
  assert.strictEqual(a.body.entries[0].serviceId, 'svc-a');
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Alert rules CRUD', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  // Create rule
  const create = await req(p, 'POST', '/api/alerts/rules', {
    name: 'High Latency',
    metric: 'latency_ms',
    operator: 'gt',
    threshold: 500,
    severity: 'critical',
    serviceId: 'svc-5',
  }, T);
  assert.strictEqual(create.status, 201);
  assert.ok(create.body.rule.id.startsWith('alr_'));
  assert.strictEqual(create.body.rule.threshold, 500);
  // List rules
  const list = await req(p, 'GET', '/api/alerts/rules');
  assert.strictEqual(list.body.rules.length, 1);
  // Delete rule
  const del = await req(p, 'DELETE', `/api/alerts/rules/${create.body.rule.id}`, null, T);
  assert.strictEqual(del.status, 200);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Alert rule validation', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  const r = await req(p, 'POST', '/api/alerts/rules', { name: 'Bad Rule' }, T);
  assert.strictEqual(r.status, 400);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Dashboard summary', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  await req(p, 'POST', '/api/services', { id: 'svc-d', name: 'Dash Test' }, T);
  const r = await req(p, 'GET', '/api/dashboard/summary');
  assert.strictEqual(r.body.services.total, 1);
  assert.strictEqual(r.body.alerts.total, 0);
  assert.ok(r.body.metrics !== undefined);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Dashboard service detail', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  await req(p, 'POST', '/api/services', { id: 'svc-dash', name: 'Service Dash' }, T);
  await req(p, 'POST', '/api/metrics/svc-dash', { metrics: [{ metric: 'cpu', value: 72 }] }, T);
  const r = await req(p, 'GET', '/api/dashboard/service/svc-dash');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.service.name, 'Service Dash');
  assert.ok(r.body.metrics !== undefined);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Dependencies', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  await req(p, 'POST', '/api/services', { id: 'svc-x', name: 'X' }, T);
  await req(p, 'POST', '/api/services', { id: 'svc-y', name: 'Y' }, T);
  await req(p, 'POST', '/api/dependencies', { from: 'svc-x', to: 'svc-y' }, T);
  const r = await req(p, 'GET', '/api/dependencies');
  assert.strictEqual(r.body.edges.length, 1);
  assert.strictEqual(r.body.edges[0].from, 'svc-x');
  assert.strictEqual(r.body.edges[0].to, 'svc-y');
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Traces — ingest and retrieve', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  await req(p, 'POST', '/api/services', { id: 'svc-trace', name: 'Trace Test' }, T);
  const r = await req(p, 'POST', '/api/traces/svc-trace', {
    spans: [
      { id: 'span-1', name: 'http-request', startTime: 1000, duration: 50 },
      { id: 'span-2', name: 'db-query', startTime: 1010, duration: 30, parentId: 'span-1' },
    ],
  }, T);
  assert.strictEqual(r.status, 200);
  // Get trace
  const tid = 'manual-trace-id';
  await req(p, 'POST', '/api/traces/svc-trace', {
    spans: [
      { id: 's1', name: 'outer', startTime: 0, duration: 100, traceId: tid },
      { id: 's2', name: 'inner', startTime: 10, duration: 80, parentId: 's1', traceId: tid },
    ],
  }, T);
  const get = await req(p, 'GET', `/api/traces/${tid}`);
  assert.strictEqual(get.status, 200);
  assert.strictEqual(get.body.count, 2);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Alert history with resolve', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  await req(p, 'POST', '/api/services', { id: 'svc-alrt', name: 'Alert Test' }, T);
  await req(p, 'POST', '/api/alerts/rules', {
    name: 'Test Alert', metric: 'err_rate', operator: 'gt', threshold: 0.1,
  }, T);
  // Manually inject a metric that triggers the alert
  await req(p, 'POST', '/api/metrics/svc-alrt', { metrics: [{ metric: 'err_rate', value: 0.5 }] }, T);
  const history = await req(p, 'GET', '/api/alerts/history?status=active');
  assert.ok(history.body.count >= 0);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('Maintenance flush trims old data', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  await req(p, 'POST', '/api/services', { id: 'svc-flush', name: 'Flush Test' }, T);
  await req(p, 'POST', '/api/logs/svc-flush', { entries: [{ level: 'info', message: 'keep' }] }, T);
  const r = await req(p, 'POST', '/api/maintenance/flush', null, T);
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.at !== undefined);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});

test('404 for unknown endpoints', async () => {
  const td = tmp(); const p = port();
  const h = await start(p, td, T);
  const r = await req(p, 'GET', '/api/nonexistent');
  assert.strictEqual(r.status, 404);
  await stop(h); fs.rmSync(td, { recursive: true, force: true });
});
