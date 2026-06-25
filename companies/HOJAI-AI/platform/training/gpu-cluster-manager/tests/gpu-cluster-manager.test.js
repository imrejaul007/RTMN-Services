'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'gpu-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 23000;
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
  assert.strictEqual(r1.body.service, 'gpu-cluster-manager');
  assert.strictEqual(r2.body.ok, true);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required on write endpoints', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r1 = await request(port, 'POST', '/api/nodes', { name: 'n1', gpuModel: 'A100-40GB' });
  const r2 = await request(port, 'POST', '/api/allocate', { jobId: 'j1', vramNeeded: 40 });
  assert.strictEqual(r1.status, 401);
  assert.strictEqual(r2.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Register node', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/nodes', { name: 'test-node', gpuModel: 'A100-40GB', gpuCount: 2, region: 'us-east-1', labels: ['training'] }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.id);
  assert.strictEqual(r.body.gpuModel, 'A100-40GB');
  assert.strictEqual(r.body.gpuCount, 2);
  assert.strictEqual(r.body.vram, 80);
  assert.strictEqual(r.body.status, 'idle');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Register node: invalid gpuModel rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/nodes', { name: 'bad', gpuModel: 'FAKE-GPU' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('List nodes with filters', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  // Seeded nodes are present; filter by region
  const r1 = await request(port, 'GET', '/api/nodes?region=us-east-1');
  assert.ok(r1.body.nodes.length >= 2);
  const r2 = await request(port, 'GET', '/api/nodes?status=idle');
  assert.ok(r2.body.nodes.every((n) => n.status === 'idle'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Allocate GPU to job', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const nodes = await request(port, 'GET', '/api/nodes');
  const idleNode = nodes.body.nodes.find((n) => n.status === 'idle');
  const beforeFree = idleNode ? idleNode.vram - idleNode.usedVram : 0;
  const r = await request(port, 'POST', '/api/allocate', { jobId: 'job-abc', vramNeeded: 10 }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.allocation.id);
  assert.ok(r.body.allocation.jobId, 'job-abc');
  const updated = await request(port, 'GET', `/api/nodes/${idleNode.id}`);
  assert.strictEqual(updated.body.node.currentJob, 'job-abc');
  assert.strictEqual(updated.body.node.status, 'busy');
  // Release
  await request(port, 'POST', `/api/release/${r.body.allocation.id}`, null, 'tok');
  const afterFree = await request(port, 'GET', `/api/nodes/${idleNode.id}`);
  assert.strictEqual(afterFree.body.node.currentJob, null);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Allocate: no capacity returns 503', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/allocate', { jobId: 'j1', vramNeeded: 99999 }, 'tok');
  assert.strictEqual(r.status, 503);
  assert.strictEqual(r.body.error, 'no_capacity');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Release: unknown allocation returns 404', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/release/nonexistent', null, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Cluster stats', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/cluster/stats');
  assert.ok(r.body.totalNodes >= 4);
  assert.ok(typeof r.body.totalVramGb === 'number');
  assert.ok(typeof r.body.freeVramGb === 'number');
  assert.ok(typeof r.body.avgGpuUtilization === 'number');
  assert.strictEqual(r.body.totalVramGb, r.body.usedVramGb + r.body.freeVramGb);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('GPU models catalog', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/gpu-models');
  assert.ok(r.body.models['A100-40GB']);
  assert.ok(r.body.models['H100-80GB']);
  assert.ok(r.body.models['RTX-4090']);
  assert.strictEqual(r.body.models['A100-40GB'].vram, 40);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Node heartbeat updates utilization', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/nodes', { name: 'hb-node', gpuModel: 'T4-16GB' }, 'tok');
  const r2 = await request(port, 'POST', `/api/nodes/${r.body.id}/heartbeat`, { gpu: 0.8, memory: 0.6, temperature: 72 }, 'tok');
  assert.strictEqual(r2.body.node.utilization.gpu, 0.8);
  assert.strictEqual(r2.body.node.utilization.memory, 0.6);
  assert.strictEqual(r2.body.node.utilization.temperature, 72);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Delete node while busy fails', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const nodes = await request(port, 'GET', '/api/nodes');
  const idleNode = nodes.body.nodes.find((n) => n.status === 'idle');
  await request(port, 'POST', '/api/allocate', { jobId: 'busy-job', vramNeeded: 10 }, 'tok');
  const r = await request(port, 'DELETE', `/api/nodes/${idleNode.id}`, null, 'tok');
  assert.strictEqual(r.status, 409);
  // cleanup
  const allocs = await request(port, 'GET', '/api/cluster/stats');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: nodes survive restart', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port, 'POST', '/api/nodes', { name: 'persist-node', gpuModel: 'RTX-4090' }, 'tok');
  await stopService(h);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port2, 'GET', '/api/nodes');
  assert.ok(r.body.nodes.find((n) => n.name === 'persist-node'));
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});