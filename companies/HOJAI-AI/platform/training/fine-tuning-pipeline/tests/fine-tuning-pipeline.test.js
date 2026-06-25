'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'ftp-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 22000;
function uniquePort() { portCounter += 1 + Math.floor(Math.random() * 200); if (portCounter > 60000) portCounter = 10000 + Math.floor(Math.random() * 100); return portCounter; }
function startService(env) {
  return new Promise((resolve, reject) => {
    const prev = setEnv(env);
    delete require.cache[require.resolve('../src/index.js')];
    const mod = require('../src/index.js');
    const app = mod.createApp();
    const server = app.listen(parseInt(env.PORT, 10), () => resolve({ server, port: parseInt(env.PORT, 10), prev }));
    server.once('error', (e) => { restoreEnv(prev); reject(e); });
  });
}
function stopService(handle) { return new Promise((resolve) => { handle.server.close(() => { delete require.cache[require.resolve('../src/index.js')]; restoreEnv(handle.prev); resolve(); }); }); }
function request(port, method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port, method, path: p,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...(token ? { 'X-Internal-Token': token } : {}) },
    }, (res) => { let chunks = ''; res.on('data', (c) => chunks += c); res.on('end', () => { try { resolve({ status: res.statusCode, body: chunks ? JSON.parse(chunks) : null }); } catch (e) { resolve({ status: res.statusCode, body: chunks }); } }); });
    req.on('error', reject); if (data) req.write(data); req.end();
  });
}

test('Health & ready', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r1 = await request(port, 'GET', '/health');
  const r2 = await request(port, 'GET', '/ready');
  assert.strictEqual(r1.body.service, 'fine-tuning-pipeline');
  assert.strictEqual(r2.body.ok, true);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required on write endpoints', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r1 = await request(port, 'POST', '/api/datasets', { name: 'test', rows: [{ prompt: 'a', completion: 'b' }] });
  const r2 = await request(port, 'POST', '/api/jobs', { name: 'j', datasetId: 'x', baseModel: 'llama-3-8b' });
  assert.strictEqual(r1.status, 401);
  assert.strictEqual(r2.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Dataset CRUD', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r1 = await request(port, 'POST', '/api/datasets', { name: 'test-ds', rows: [{ prompt: 'hello', completion: 'hi' }, { prompt: 'world', completion: 'earth' }] }, 'tok');
  assert.strictEqual(r1.status, 201);
  assert.ok(r1.body.id);
  assert.strictEqual(r1.body.name, 'test-ds');
  const r2 = await request(port, 'GET', '/api/datasets');
  assert.ok(r2.body.datasets.length >= 1);
  const r3 = await request(port, 'GET', `/api/datasets/${r1.body.id}`);
  assert.strictEqual(r3.body.dataset.name, 'test-ds');
  const r4 = await request(port, 'DELETE', `/api/datasets/${r1.body.id}`, null, 'tok');
  assert.strictEqual(r4.body.deleted, r1.body.id);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Dataset validation: missing name', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/datasets', { name: '', rows: [{ prompt: 'a', completion: 'b' }] }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Dataset validation: rows without prompt/completion', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/datasets', { name: 'bad', rows: [{ foo: 'bar' }] }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Job lifecycle: create → queued', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const ds = await request(port, 'POST', '/api/datasets', { name: 'train-ds', rows: [{ prompt: 'a', completion: 'b' }] }, 'tok');
  const r = await request(port, 'POST', '/api/jobs', {
    name: 'test-job', datasetId: ds.body.id, baseModel: 'llama-3-8b',
    method: 'lora', epochs: 1, maxSteps: 5, priority: 7,
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.status, 'queued');
  assert.strictEqual(r.body.name, 'test-job');
  assert.strictEqual(r.body.method, 'lora');
  // Job should auto-start (500ms delay)
  await new Promise((s) => setTimeout(s, 800));
  const r2 = await request(port, 'GET', `/api/jobs/${r.body.id}`);
  assert.ok(['queued', 'running', 'completed', 'cancelled'].includes(r2.body.job.status));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Job cancel', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const ds = await request(port, 'POST', '/api/datasets', { name: 'cancel-ds', rows: [{ prompt: 'a', completion: 'b' }] }, 'tok');
  const job = await request(port, 'POST', '/api/jobs', { name: 'cancel-me', datasetId: ds.body.id, baseModel: 'llama-3-8b', maxSteps: 50 }, 'tok');
  await request(port, 'POST', `/api/jobs/${job.body.id}/cancel`, null, 'tok');
  const r = await request(port, 'GET', `/api/jobs/${job.body.id}`);
  assert.ok(['cancelled', 'queued'].includes(r.body.job.status));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Job: dataset not found', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/jobs', { name: 'orphan', datasetId: 'nonexistent', baseModel: 'llama-3-8b' }, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('GPU queue management', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const ds = await request(port, 'POST', '/api/datasets', { name: 'q-ds', rows: [{ prompt: 'a', completion: 'b' }] }, 'tok');
  await request(port, 'POST', '/api/jobs', { name: 'q1', datasetId: ds.body.id, baseModel: 'llama-3-8b', priority: 1 }, 'tok');
  await request(port, 'POST', '/api/jobs', { name: 'q2', datasetId: ds.body.id, baseModel: 'llama-3-8b', priority: 10 }, 'tok');
  const r = await request(port, 'GET', '/api/queue');
  assert.ok(r.body.total >= 2);
  // Higher priority should be first
  const sorted = [...r.body.queue].sort((a, b) => b.priority - a.priority);
  assert.deepStrictEqual(r.body.queue, sorted);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Checkpoints: listed after job completes', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const ds = await request(port, 'POST', '/api/datasets', { name: 'cp-ds', rows: [{ prompt: 'a', completion: 'b' }] }, 'tok');
  const job = await request(port, 'POST', '/api/jobs', { name: 'cp-job', datasetId: ds.body.id, baseModel: 'llama-3-8b', maxSteps: 3 }, 'tok');
  // Wait for job to finish
  let status = 'queued';
  for (let i = 0; i < 20; i++) {
    await new Promise((s) => setTimeout(s, 300));
    const r = await request(port, 'GET', `/api/jobs/${job.body.id}`);
    status = r.body.job.status;
    if (status === 'completed' || status === 'cancelled') break;
  }
  assert.strictEqual(status, 'completed');
  const cps = await request(port, 'GET', `/api/checkpoints?jobId=${job.body.id}`);
  assert.ok(cps.body.checkpoints.length >= 1);
  assert.ok(cps.body.checkpoints[0].loss > 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Catalog: methods endpoint', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/methods');
  assert.ok(r.body.methods.length >= 5);
  assert.ok(r.body.methods.find((m) => m.id === 'lora'));
  assert.ok(r.body.methods.find((m) => m.id === 'qlora'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Catalog: base-models endpoint', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/base-models');
  assert.ok(r.body.models.length >= 5);
  assert.ok(r.body.models.find((m) => m.id === 'llama-3-8b'));
  assert.ok(r.body.models.find((m) => m.id === 'mistral-7b'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: datasets survive restart', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port, 'POST', '/api/datasets', { name: 'persist', rows: [{ prompt: 'a', completion: 'b' }] }, 'tok');
  await stopService(h);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port2, 'GET', '/api/datasets');
  assert.ok(r.body.datasets.find((d) => d.name === 'persist'));
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter jobs by status', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const ds = await request(port, 'POST', '/api/datasets', { name: 'f-ds', rows: [{ prompt: 'a', completion: 'b' }] }, 'tok');
  await request(port, 'POST', '/api/jobs', { name: 'f-job', datasetId: ds.body.id, baseModel: 'llama-3-8b', maxSteps: 2 }, 'tok');
  await new Promise((s) => setTimeout(s, 1500));
  const r = await request(port, 'GET', '/api/jobs?status=completed');
  assert.ok(r.body.jobs.every((j) => j.status === 'completed'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});