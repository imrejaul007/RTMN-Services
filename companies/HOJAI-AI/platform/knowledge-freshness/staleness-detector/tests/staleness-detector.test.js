'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'staleness-detector-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 19000;
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
  assert.strictEqual(r.body.service, 'staleness-detector');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/rules');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Rule CRUD', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/rules', { name: 'Old data', type: 'max_age_days', threshold: 30, severity: 'high' }, tok);
  assert.strictEqual(c.status, 201);
  const rid = c.body.id;
  const g = await request(port, 'GET', `/rules/${rid}`, null, tok);
  assert.strictEqual(g.body.name, 'Old data');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Rule validation: bad type', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/rules', { name: 'X', type: 'BAD', threshold: 30 }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Rule validation: threshold required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/rules', { name: 'X', type: 'max_age_days' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Fact CRUD', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/facts', { fact_id: 'f_1', content: 'hello', freshness_score: 0.9 }, tok);
  assert.strictEqual(c.status, 201);
  const u = await request(port, 'PUT', '/facts/f_1', { freshness_score: 0.5 }, tok);
  assert.strictEqual(u.body.freshness_score, 0.5);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Fact validation: requires fact_id', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/facts', {}, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Scan: max_age_days triggers alert', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/rules', { name: 'Old', type: 'max_age_days', threshold: 30 }, tok);
  await request(port, 'POST', '/facts', {
    fact_id: 'f_old',
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
  }, tok);
  const s = await request(port, 'POST', '/scan', {}, tok);
  assert.strictEqual(s.body.new_alerts, 1);
  const a = await request(port, 'GET', '/alerts', null, tok);
  assert.strictEqual(a.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Scan: min_freshness_score triggers alert', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/rules', { name: 'Low', type: 'min_freshness_score', threshold: 0.5 }, tok);
  await request(port, 'POST', '/facts', { fact_id: 'f_low', freshness_score: 0.3 }, tok);
  await request(port, 'POST', '/facts', { fact_id: 'f_ok', freshness_score: 0.8 }, tok);
  const s = await request(port, 'POST', '/scan', {}, tok);
  assert.strictEqual(s.body.new_alerts, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Scan: dedup creates only one alert per fact+rule', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/rules', { name: 'Old', type: 'max_age_days', threshold: 30 }, tok);
  await request(port, 'POST', '/facts', {
    fact_id: 'f_old',
    created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
  }, tok);
  await request(port, 'POST', '/scan', {}, tok);
  const s2 = await request(port, 'POST', '/scan', {}, tok);
  assert.strictEqual(s2.body.new_alerts, 0);  // already alerted
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Scan: applies_to filter limits scope', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/rules', { name: 'KB only', type: 'min_freshness_score', threshold: 0.5, applies_to: ['kb'] }, tok);
  await request(port, 'POST', '/facts', { fact_id: 'f_kb', source: 'kb', freshness_score: 0.1 }, tok);
  await request(port, 'POST', '/facts', { fact_id: 'f_wiki', source: 'wiki', freshness_score: 0.1 }, tok);
  await request(port, 'POST', '/scan', {}, tok);
  const a = await request(port, 'GET', '/alerts', null, tok);
  assert.strictEqual(a.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Alert ack/resolve', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/rules', { name: 'X', type: 'min_freshness_score', threshold: 0.5 }, tok);
  await request(port, 'POST', '/facts', { fact_id: 'f', freshness_score: 0.1 }, tok);
  await request(port, 'POST', '/scan', {}, tok);
  const a = await request(port, 'GET', '/alerts', null, tok);
  const aid = a.body.alerts[0].id;
  const ack = await request(port, 'POST', `/alerts/${aid}/ack`, {}, tok);
  assert.strictEqual(ack.body.status, 'acknowledged');
  const r = await request(port, 'POST', `/alerts/${aid}/resolve`, {}, tok);
  assert.strictEqual(r.body.status, 'resolved');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter alerts by status', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/rules', { name: 'X', type: 'min_freshness_score', threshold: 0.5 }, tok);
  await request(port, 'POST', '/facts', { fact_id: 'f', freshness_score: 0.1 }, tok);
  await request(port, 'POST', '/scan', {}, tok);
  const a = await request(port, 'GET', '/alerts', null, tok);
  await request(port, 'POST', `/alerts/${a.body.alerts[0].id}/resolve`, {}, tok);
  const open = await request(port, 'GET', '/alerts?status=open', null, tok);
  assert.strictEqual(open.body.count, 0);
  const resolved = await request(port, 'GET', '/alerts?status=resolved', null, tok);
  assert.strictEqual(resolved.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port1, 'POST', '/rules', { name: 'P', type: 'max_age_days', threshold: 30 }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/rules/${c.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});