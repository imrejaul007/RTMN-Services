'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'studio-eval-')); }

function setEnv(obj) {
  const prev = {};
  for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; }
  return prev;
}
function restoreEnv(prev) {
  for (const k of Object.keys(prev)) {
    if (prev[k] === undefined) delete process.env[k];
    else process.env[k] = prev[k];
  }
}

function startService(env) {
  return new Promise((resolve, reject) => {
    const prev = setEnv(env);
    delete require.cache[require.resolve('../src/index.js')];
    const mod = require('../src/index.js');
    const app = mod.createApp();
    const server = app.listen(parseInt(env.PORT, 10), () => resolve({ mod, server, port: parseInt(env.PORT, 10), prev }));
    server.once('error', (e) => { restoreEnv(prev); reject(e); });
  });
}

function stopService(handle) {
  return new Promise((resolve) => {
    handle.server.close(() => { delete require.cache[require.resolve('../src/index.js')]; restoreEnv(handle.prev); resolve(); });
  });
}

function request(port, method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port, method, path: p,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...(token ? { 'X-Internal-Token': token } : {}) }
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch (e) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let testCounter = 0;
function uniquePort() { testCounter += 1; return 30000 + (testCounter * 29) % 1000; }

function simpleDataset(name = 'qa-dataset') {
  return {
    name,
    description: 'Sample QA dataset',
    project_id: 'p1',
    user_id: 'alice',
    cases: [
      { input: 'What is 2+2?', expected_output: '4' },
      { input: 'Capital of France?', expected_output: 'Paris' },
      { input: 'Who wrote Hamlet?', expected_output: 'Shakespeare' }
    ]
  };
}

function accuracyMetric(name = 'accuracy') {
  return {
    name,
    type: 'accuracy',
    description: 'Strict equality',
    project_id: 'p1',
    user_id: 'alice'
  };
}

test('Capabilities: returns valid types', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'GET', '/capabilities', null, 'tkn');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.metric_types.includes('accuracy'));
  assert.ok(r.body.metric_types.includes('exact_match'));
  assert.ok(r.body.alert_ops.includes('lt'));
  assert.ok(r.body.alert_ops.includes('gte'));

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CRUD dataset', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port, 'POST', '/datasets', simpleDataset(), 'tkn');
  assert.strictEqual(c1.status, 201);
  assert.ok(c1.body.id.startsWith('ds_'));
  assert.strictEqual(c1.body.case_count, 3);
  const did = c1.body.id;

  // Read by id
  const r1 = await request(port, 'GET', `/datasets/${did}`, null, 'tkn');
  assert.strictEqual(r1.status, 200);
  // Read by name
  const r2 = await request(port, 'GET', '/datasets/qa-dataset', null, 'tkn');
  assert.strictEqual(r2.body.id, did);

  // Update
  const u1 = await request(port, 'PUT', `/datasets/${did}`, {
    description: 'Updated',
    cases: [
      { input: 'Q1', expected_output: 'A1' },
      { input: 'Q2', expected_output: 'A2' }
    ]
  }, 'tkn');
  assert.strictEqual(u1.body.description, 'Updated');
  assert.strictEqual(u1.body.case_count, 2);

  // Delete
  const d1 = await request(port, 'DELETE', `/datasets/${did}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);
  const d2 = await request(port, 'DELETE', `/datasets/${did}`, null, 'tkn');
  assert.strictEqual(d2.status, 404);

  // Validation
  const e1 = await request(port, 'POST', '/datasets', { name: 'x' }, 'tkn');
  assert.strictEqual(e1.status, 400); // missing project_id, user_id
  const e2 = await request(port, 'POST', '/datasets', { project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e2.status, 400); // missing name
  const e3 = await request(port, 'POST', '/datasets', simpleDataset(), 'tkn');
  assert.strictEqual(e3.status, 201);
  const e4 = await request(port, 'POST', '/datasets', simpleDataset(), 'tkn');
  assert.strictEqual(e4.status, 409);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CRUD metric', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port, 'POST', '/metrics', accuracyMetric(), 'tkn');
  assert.strictEqual(c1.status, 201);
  assert.ok(c1.body.id.startsWith('mt_'));
  const mid = c1.body.id;

  const r1 = await request(port, 'GET', `/metrics/${mid}`, null, 'tkn');
  assert.strictEqual(r1.status, 200);
  const r2 = await request(port, 'GET', '/metrics/accuracy', null, 'tkn');
  assert.strictEqual(r2.body.id, mid);

  // Bad type
  const e1 = await request(port, 'POST', '/metrics', { name: 'x', type: 'magic', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  // Missing name
  const e2 = await request(port, 'POST', '/metrics', { type: 'accuracy', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e2.status, 400);
  // Duplicate
  const e3 = await request(port, 'POST', '/metrics', accuracyMetric(), 'tkn');
  assert.strictEqual(e3.status, 409);

  // Delete
  const d1 = await request(port, 'DELETE', `/metrics/${mid}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);
  const d2 = await request(port, 'DELETE', `/metrics/${mid}`, null, 'tkn');
  assert.strictEqual(d2.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Run: executes dataset against target, computes metric scores', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const ds = await request(port, 'POST', '/datasets', simpleDataset(), 'tkn');
  const m = await request(port, 'POST', '/metrics', accuracyMetric(), 'tkn');

  const r1 = await request(port, 'POST', '/runs', {
    dataset_id: ds.body.id,
    metric_ids: [m.body.id],
    target_type: 'model',
    target_id: 'gpt-4'
  }, 'tkn');
  assert.strictEqual(r1.status, 201);
  assert.ok(r1.body.run.id.startsWith('run_'));
  assert.strictEqual(r1.body.run.status, 'completed');
  assert.strictEqual(r1.body.run.case_count, 3);
  assert.strictEqual(r1.body.run.case_results.length, 3);
  // Mock output is "Output for case N: <expected>" so accuracy (===) always 0
  assert.strictEqual(r1.body.run.summary[m.body.id].count, 3);
  assert.ok(r1.body.run.duration_ms > 0);
  assert.deepStrictEqual(r1.body.triggered_alerts, []); // no alerts yet

  // Validation
  const e1 = await request(port, 'POST', '/runs', {}, 'tkn');
  assert.strictEqual(e1.status, 400);
  const e2 = await request(port, 'POST', '/runs', { dataset_id: ds.body.id, target_type: 'model', target_id: 'gpt-4' }, 'tkn');
  assert.strictEqual(e2.status, 400); // no metrics
  const e3 = await request(port, 'POST', '/runs', { dataset_id: 'ds_ghost', metric_ids: [m.body.id], target_type: 'model', target_id: 'gpt-4' }, 'tkn');
  assert.strictEqual(e3.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Alerts: CRUD and triggering on run', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const ds = await request(port, 'POST', '/datasets', simpleDataset(), 'tkn');
  const m = await request(port, 'POST', '/metrics', accuracyMetric(), 'tkn');

  // Create alert: accuracy < 0.5 (will trigger since mock always returns 0)
  const a1 = await request(port, 'POST', '/alerts', {
    name: 'low-acc',
    description: 'Low accuracy alert',
    metric_id: m.body.id,
    op: 'lt',
    threshold: 0.5,
    project_id: 'p1',
    user_id: 'alice'
  }, 'tkn');
  assert.strictEqual(a1.status, 201);
  const aid = a1.body.id;

  // Validation
  const e1 = await request(port, 'POST', '/alerts', { name: 'x' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  const e2 = await request(port, 'POST', '/alerts', { name: 'x', metric_id: m.body.id, op: 'weird', threshold: 0.5, project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e2.status, 400);
  const e3 = await request(port, 'POST', '/alerts', { name: 'x', metric_id: 'mt_ghost', op: 'lt', threshold: 0.5, project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e3.status, 400);
  const e4 = await request(port, 'POST', '/alerts', { name: 'x', metric_id: m.body.id, op: 'lt', threshold: '0.5', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e4.status, 400);

  // Run and check alert triggers
  const r1 = await request(port, 'POST', '/runs', {
    dataset_id: ds.body.id,
    metric_ids: [m.body.id],
    target_type: 'model',
    target_id: 'gpt-4'
  }, 'tkn');
  assert.strictEqual(r1.body.triggered_alerts.length, 1);
  assert.strictEqual(r1.body.triggered_alerts[0].alert_id, aid);

  // Update alert threshold to 0 (won't trigger now since avg=0)
  const u1 = await request(port, 'PUT', `/alerts/${aid}`, { threshold: 0 }, 'tkn');
  assert.strictEqual(u1.body.threshold, 0);

  const r2 = await request(port, 'POST', '/runs', {
    dataset_id: ds.body.id,
    metric_ids: [m.body.id],
    target_type: 'model',
    target_id: 'gpt-4'
  }, 'tkn');
  assert.strictEqual(r2.body.triggered_alerts.length, 0);

  // Update with bad op
  const u2 = await request(port, 'PUT', `/alerts/${aid}`, { op: 'weird' }, 'tkn');
  assert.strictEqual(u2.status, 400);

  // Read alerts
  const l1 = await request(port, 'GET', '/alerts', null, 'tkn');
  assert.strictEqual(l1.body.count, 1);
  const g1 = await request(port, 'GET', `/alerts/${aid}`, null, 'tkn');
  assert.strictEqual(g1.status, 200);
  const g2 = await request(port, 'GET', '/alerts/low-acc', null, 'tkn');
  assert.strictEqual(g2.body.id, aid);

  // Delete
  const d1 = await request(port, 'DELETE', `/alerts/${aid}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);
  const d2 = await request(port, 'DELETE', `/alerts/${aid}`, null, 'tkn');
  assert.strictEqual(d2.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('List, filter, get, 404, auth, health', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  // Create 2 datasets, 2 metrics
  await request(port, 'POST', '/datasets', simpleDataset('a'), 'tkn');
  await request(port, 'POST', '/datasets', simpleDataset('b'), 'tkn');
  await request(port, 'POST', '/metrics', accuracyMetric('a'), 'tkn');
  await request(port, 'POST', '/metrics', accuracyMetric('b'), 'tkn');

  // List
  const l1 = await request(port, 'GET', '/datasets', null, 'tkn');
  assert.strictEqual(l1.body.count, 2);
  const l2 = await request(port, 'GET', '/datasets?project_id=p1', null, 'tkn');
  assert.strictEqual(l2.body.count, 2);
  const l3 = await request(port, 'GET', '/metrics', null, 'tkn');
  assert.strictEqual(l3.body.count, 2);

  // 404
  const g1 = await request(port, 'GET', '/datasets/ds_ghost', null, 'tkn');
  assert.strictEqual(g1.status, 404);
  const g2 = await request(port, 'GET', '/metrics/mt_ghost', null, 'tkn');
  assert.strictEqual(g2.status, 404);
  const u1 = await request(port, 'PUT', '/datasets/ds_ghost', { description: 'X' }, 'tkn');
  assert.strictEqual(u1.status, 404);

  // Auth
  const a1 = await request(port, 'GET', '/datasets', null, null);
  assert.strictEqual(a1.status, 401);
  const a2 = await request(port, 'GET', '/capabilities', null, 'wrong');
  assert.strictEqual(a2.status, 401);

  // Health
  const h = await request(port, 'GET', '/health', null, null);
  assert.strictEqual(h.status, 200);
  assert.strictEqual(h.body.service, 'studio-eval');

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('List runs: filter by dataset/project/user/status', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const ds = await request(port, 'POST', '/datasets', simpleDataset(), 'tkn');
  const m = await request(port, 'POST', '/metrics', accuracyMetric(), 'tkn');

  await request(port, 'POST', '/runs', { dataset_id: ds.body.id, metric_ids: [m.body.id], target_type: 'model', target_id: 'gpt-4', user_id: 'alice' }, 'tkn');
  await request(port, 'POST', '/runs', { dataset_id: ds.body.id, metric_ids: [m.body.id], target_type: 'model', target_id: 'gpt-4', user_id: 'alice' }, 'tkn');
  await request(port, 'POST', '/runs', { dataset_id: ds.body.id, metric_ids: [m.body.id], target_type: 'model', target_id: 'gpt-4', user_id: 'bob' }, 'tkn');

  const l1 = await request(port, 'GET', '/runs', null, 'tkn');
  assert.strictEqual(l1.body.count, 3);
  const l2 = await request(port, 'GET', '/runs?user_id=alice', null, 'tkn');
  assert.strictEqual(l2.body.count, 2);
  const l3 = await request(port, 'GET', `/runs?dataset_id=${ds.body.id}`, null, 'tkn');
  assert.strictEqual(l3.body.count, 3);
  const l4 = await request(port, 'GET', '/runs?status=completed', null, 'tkn');
  assert.strictEqual(l4.body.count, 3);

  // Get specific
  const g1 = await request(port, 'GET', `/runs/${l1.body.runs[0].id}`, null, 'tkn');
  assert.strictEqual(g1.status, 200);
  const g2 = await request(port, 'GET', '/runs/run_ghost', null, 'tkn');
  assert.strictEqual(g2.status, 404);

  // Delete
  const d1 = await request(port, 'DELETE', `/runs/${l1.body.runs[0].id}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: datasets, metrics, runs, alerts survive restart', async (t) => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const ds = await request(port1, 'POST', '/datasets', simpleDataset(), 'tkn');
  const m = await request(port1, 'POST', '/metrics', accuracyMetric(), 'tkn');
  await request(port1, 'POST', '/alerts', {
    name: 'a1', metric_id: m.body.id, op: 'lt', threshold: 0.5, project_id: 'p1', user_id: 'alice'
  }, 'tkn');
  await request(port1, 'POST', '/runs', {
    dataset_id: ds.body.id, metric_ids: [m.body.id], target_type: 'model', target_id: 'gpt-4'
  }, 'tkn');

  await stopService(h1);

  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const l1 = await request(port2, 'GET', '/datasets', null, 'tkn');
  assert.strictEqual(l1.body.count, 1);
  const l2 = await request(port2, 'GET', '/metrics', null, 'tkn');
  assert.strictEqual(l2.body.count, 1);
  const l3 = await request(port2, 'GET', '/runs', null, 'tkn');
  assert.strictEqual(l3.body.count, 1);
  const l4 = await request(port2, 'GET', '/alerts', null, 'tkn');
  assert.strictEqual(l4.body.count, 1);

  await stopService(h2);
  fs.rmSync(tmp, { recursive: true, force: true });
});
