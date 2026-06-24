'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'incident-detector-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 12000;
function uniquePort() { portCounter += 1 + Math.floor(Math.random() * 200); if (portCounter > 60000) portCounter = 10000 + Math.floor(Math.random() * 100); return portCounter; }
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
  const r = await request(port, 'GET', '/health');
  assert.strictEqual(r.body.service, 'incident-detector');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/incidents');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Default thresholds', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/thresholds', null, 'tok');
  assert.strictEqual(r.body.latency_ms, 1000);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Update thresholds', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'PUT', '/thresholds', { latency_ms: 500 }, 'tok');
  assert.strictEqual(r.body.latency_ms, 500);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Update thresholds rejects non-number', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'PUT', '/thresholds', { latency_ms: 'X' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Event: non-anomalous returns anomaly=false', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/events', { metric: 'latency_ms', value: 100, source: 'api' }, 'tok');
  assert.strictEqual(r.body.anomaly, false);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Event: anomalous creates incident', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/events', { metric: 'latency_ms', value: 5000, source: 'api' }, 'tok');
  assert.strictEqual(r.body.anomaly, true);
  assert.strictEqual(r.body.dedup, false);
  assert.strictEqual(r.body.incident.severity, 'critical');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Event: dedup same fingerprint increments count', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  // Bucket rounds to 1 decimal: 95.1 -> 95.1, 95.15 -> 95.1
  const r1 = await request(port, 'POST', '/events', { metric: 'cpu_pct', value: 95.1, source: 'host-1' }, tok);
  assert.strictEqual(r1.body.dedup, false);
  const r2 = await request(port, 'POST', '/events', { metric: 'cpu_pct', value: 95.15, source: 'host-1' }, tok);
  assert.strictEqual(r2.body.dedup, true);
  assert.strictEqual(r2.body.incident.event_count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Event: dedup same source different metric creates new', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/events', { metric: 'cpu_pct', value: 95, source: 'host-1' }, tok);
  const r = await request(port, 'POST', '/events', { metric: 'memory_pct', value: 95, source: 'host-1' }, tok);
  assert.strictEqual(r.body.dedup, false);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Event: validation', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/events', { metric: 'x' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Incident: update status', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/events', { metric: 'cpu_pct', value: 95, source: 'h' }, tok);
  const u = await request(port, 'PUT', `/incidents/${c.body.incident.id}`, { status: 'triaged', assigned_to: 'alice' }, tok);
  assert.strictEqual(u.body.status, 'triaged');
  assert.strictEqual(u.body.assigned_to, 'alice');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Incident: resolved sets resolved_at', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/events', { metric: 'cpu_pct', value: 95, source: 'h' }, tok);
  const u = await request(port, 'PUT', `/incidents/${c.body.incident.id}`, { status: 'resolved' }, tok);
  assert.ok(u.body.resolved_at);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Incident: rejects bad status', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/events', { metric: 'cpu_pct', value: 95, source: 'h' }, tok);
  const u = await request(port, 'PUT', `/incidents/${c.body.incident.id}`, { status: 'BAD' }, tok);
  assert.strictEqual(u.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter incidents', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c1 = await request(port, 'POST', '/events', { metric: 'cpu_pct', value: 95, source: 'h1' }, tok);
  await request(port, 'POST', '/events', { metric: 'memory_pct', value: 95, source: 'h2' }, tok);
  await request(port, 'PUT', `/incidents/${c1.body.incident.id}`, { status: 'resolved' }, tok);
  const r1 = await request(port, 'GET', '/incidents?status=resolved', null, tok);
  assert.strictEqual(r1.body.count, 1);
  const r2 = await request(port, 'GET', '/incidents?source=h1', null, tok);
  assert.strictEqual(r2.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Stats endpoint', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/events', { metric: 'cpu_pct', value: 95, source: 'h1' }, tok);
  await request(port, 'POST', '/events', { metric: 'cpu_pct', value: 95, source: 'h2' }, tok);
  const r = await request(port, 'GET', '/stats', null, tok);
  assert.strictEqual(r.body.total, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port1, 'POST', '/events', { metric: 'cpu_pct', value: 95, source: 'h' }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/incidents/${c.body.incident.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});