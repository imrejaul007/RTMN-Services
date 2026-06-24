'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'memory-retention-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 57000;
function uniquePort() { portCounter += 1 + Math.floor(Math.random() * 50); return portCounter; }
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
  assert.strictEqual(r.body.service, 'memory-retention');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/rules');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Default rule available', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/default', null, 'tok');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(typeof r.body.retention_days, 'number');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Update default rule', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'PUT', '/default', { retention_days: 90, policy: 'purge' }, 'tok');
  assert.strictEqual(r.body.retention_days, 90);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Rule CRUD', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/rules', { memory_type: 'profile', retention_days: 30, policy: 'purge' }, tok);
  assert.strictEqual(c.status, 201);
  const g = await request(port, 'GET', '/rules/profile', null, tok);
  assert.strictEqual(g.body.retention_days, 30);
  const u = await request(port, 'PUT', '/rules/profile', { retention_days: 60 }, tok);
  assert.strictEqual(u.body.retention_days, 60);
  const d = await request(port, 'DELETE', '/rules/profile', null, tok);
  assert.strictEqual(d.status, 200);
  const g2 = await request(port, 'GET', '/rules/profile', null, tok);
  assert.strictEqual(g2.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Rule validation: bad policy', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/rules', { memory_type: 'x', policy: 'BAD' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Rule validation: negative retention_days', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/rules', { memory_type: 'x', retention_days: -5 }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Evaluate: uses default rule when no specific rule', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port, 'PUT', '/default', { retention_days: 30, policy: 'purge' }, 'tok');
  const old = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
  const r = await request(port, 'POST', '/evaluate', { memory_type: 'unknown', created_at: old }, 'tok');
  assert.strictEqual(r.body.is_expired, true);
  assert.strictEqual(r.body.action, 'purge');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Evaluate: not expired when within retention window', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const recent = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const r = await request(port, 'POST', '/evaluate', { memory_type: 'unknown', created_at: recent }, 'tok');
  assert.strictEqual(r.body.is_expired, false);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Evaluate: uses specific rule when present', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/rules', { memory_type: 'session', retention_days: 1, on_expire: 'purge' }, tok);
  const old = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
  const r = await request(port, 'POST', '/evaluate', { memory_type: 'session', created_at: old }, tok);
  assert.strictEqual(r.body.is_expired, true);
  assert.strictEqual(r.body.rule.retention_days, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Evaluate-bulk', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port, 'PUT', '/default', { retention_days: 30, policy: 'purge' }, 'tok');
  const items = [
    { memory_type: 'profile', created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() },
    { memory_type: 'profile', created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() },
  ];
  const r = await request(port, 'POST', '/evaluate-bulk', { items }, 'tok');
  assert.strictEqual(r.body.count, 2);
  assert.strictEqual(r.body.results[0].is_expired, true);
  assert.strictEqual(r.body.results[1].is_expired, false);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Evaluate-bulk rejects non-array', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/evaluate-bulk', { items: 'not-array' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: rules survive restart', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port1, 'POST', '/rules', { memory_type: 'profile', retention_days: 7 }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', '/rules/profile', null, 'tok');
  assert.strictEqual(g.status, 200);
  assert.strictEqual(g.body.retention_days, 7);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});