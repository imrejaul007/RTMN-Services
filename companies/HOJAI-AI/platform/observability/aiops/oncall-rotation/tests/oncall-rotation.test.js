'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'oncall-rotation-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 14000;
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
  assert.strictEqual(r.body.service, 'oncall-rotation');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/rotations');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Rotation CRUD', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const c = await request(port, 'POST', '/rotations', {
    name: 'Primary', period: 'weekly', members: ['alice', 'bob'], starts_at: start,
  }, tok);
  assert.strictEqual(c.status, 201);
  const rid = c.body.id;
  const g = await request(port, 'GET', `/rotations/${rid}`, null, tok);
  assert.strictEqual(g.body.name, 'Primary');
  const u = await request(port, 'PUT', `/rotations/${rid}`, { description: 'Updated' }, tok);
  assert.strictEqual(u.body.description, 'Updated');
  const d = await request(port, 'DELETE', `/rotations/${rid}`, null, tok);
  assert.strictEqual(d.status, 200);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: missing name', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/rotations', { period: 'daily', members: ['x'], starts_at: '2024-01-01' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: bad period', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/rotations', { name: 'X', period: 'monthly', members: ['x'], starts_at: '2024-01-01' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: empty members', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/rotations', { name: 'X', period: 'daily', members: [], starts_at: '2024-01-01' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Now: returns first member when started', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const start = new Date(Date.now() - 1000).toISOString();
  const c = await request(port, 'POST', '/rotations', {
    name: 'X', period: 'daily', members: ['alice', 'bob'], starts_at: start,
  }, tok);
  const r = await request(port, 'GET', `/rotations/${c.body.id}/now`, null, tok);
  assert.strictEqual(r.body.current.user, 'alice');
  assert.strictEqual(r.body.current.override, false);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Now: rotates to second member after shift', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const start = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(); // 25h ago
  const c = await request(port, 'POST', '/rotations', {
    name: 'X', period: 'daily', members: ['alice', 'bob'], starts_at: start,
  }, tok);
  const r = await request(port, 'GET', `/rotations/${c.body.id}/now`, null, tok);
  assert.strictEqual(r.body.current.user, 'bob');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Now: returns null when rotation not started yet', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const c = await request(port, 'POST', '/rotations', {
    name: 'X', period: 'daily', members: ['alice'], starts_at: future,
  }, tok);
  const r = await request(port, 'GET', `/rotations/${c.body.id}/now`, null, tok);
  assert.strictEqual(r.body.current, null);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Override: takes precedence', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const start = new Date(Date.now() - 1000).toISOString();
  const c = await request(port, 'POST', '/rotations', {
    name: 'X', period: 'daily', members: ['alice'], starts_at: start,
  }, tok);
  await request(port, 'POST', `/rotations/${c.body.id}/overrides`, {
    user_id: 'carol',
    start_at: new Date(Date.now() - 60 * 1000).toISOString(),
    end_at: new Date(Date.now() + 60 * 1000).toISOString(),
    reason: 'PTO',
  }, tok);
  const r = await request(port, 'GET', `/rotations/${c.body.id}/now`, null, tok);
  assert.strictEqual(r.body.current.user, 'carol');
  assert.strictEqual(r.body.current.override, true);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Override validation', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const start = new Date().toISOString();
  const c = await request(port, 'POST', '/rotations', {
    name: 'X', period: 'daily', members: ['alice'], starts_at: start,
  }, tok);
  const r = await request(port, 'POST', `/rotations/${c.body.id}/overrides`, { user_id: 'x' }, tok);
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('List overrides for rotation', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/rotations', {
    name: 'X', period: 'daily', members: ['alice'], starts_at: new Date().toISOString(),
  }, tok);
  await request(port, 'POST', `/rotations/${c.body.id}/overrides`, {
    user_id: 'carol', start_at: '2025-01-01T00:00:00Z', end_at: '2025-01-02T00:00:00Z',
  }, tok);
  const r = await request(port, 'GET', `/rotations/${c.body.id}/overrides`, null, tok);
  assert.strictEqual(r.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Delete rotation removes its overrides', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/rotations', {
    name: 'X', period: 'daily', members: ['alice'], starts_at: new Date().toISOString(),
  }, tok);
  await request(port, 'POST', `/rotations/${c.body.id}/overrides`, {
    user_id: 'carol', start_at: '2025-01-01T00:00:00Z', end_at: '2025-01-02T00:00:00Z',
  }, tok);
  await request(port, 'DELETE', `/rotations/${c.body.id}`, null, tok);
  // Overrides for that rotation are now gone (cascade delete)
  const ovs = await request(port, 'GET', `/rotations/${c.body.id}/overrides`, null, tok);
  assert.strictEqual(ovs.body.count, 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port1, 'POST', '/rotations', {
    name: 'P', period: 'daily', members: ['alice'], starts_at: new Date().toISOString(),
  }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/rotations/${c.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});