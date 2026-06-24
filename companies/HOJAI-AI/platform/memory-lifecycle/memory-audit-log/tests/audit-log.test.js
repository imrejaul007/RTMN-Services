'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'memory-audit-log-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 60000;
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
  assert.strictEqual(r.body.service, 'memory-audit-log');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/entries');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Append entry', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const r = await request(port, 'POST', '/entries', { action: 'memory.create', actor: 'alice', subject_id: 'u1' }, tok);
  assert.strictEqual(r.status, 201);
  assert.strictEqual(typeof r.body.hash, 'string');
  assert.strictEqual(r.body.hash.length, 64);
  assert.strictEqual(r.body.prev_hash, '0'.repeat(64));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Entry validation: bad action', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/entries', { action: 'INVALID' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Chain links consecutive entries', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const e1 = await request(port, 'POST', '/entries', { action: 'memory.create' }, tok);
  const e2 = await request(port, 'POST', '/entries', { action: 'memory.update' }, tok);
  assert.strictEqual(e2.body.prev_hash, e1.body.hash);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Verify chain integrity returns ok', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  for (let i = 0; i < 5; i++) {
    await request(port, 'POST', '/entries', { action: 'memory.create' }, tok);
  }
  const v = await request(port, 'GET', '/verify', null, tok);
  assert.strictEqual(v.body.ok, true);
  assert.strictEqual(v.body.total_entries, 5);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Verify detects tampering', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/entries', { action: 'memory.create', actor: 'alice' }, tok);
  await request(port, 'POST', '/entries', { action: 'memory.create', actor: 'bob' }, tok);
  // Tamper with file
  const file = path.join(tmp, 'audit.json');
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  data.entries[1].actor = 'mallory';
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
  const v = await request(port, 'GET', '/verify', null, tok);
  assert.strictEqual(v.body.ok, false);
  assert.ok(v.body.broken_entries.length > 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter by action and actor', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/entries', { action: 'memory.create', actor: 'alice' }, tok);
  await request(port, 'POST', '/entries', { action: 'memory.update', actor: 'alice' }, tok);
  await request(port, 'POST', '/entries', { action: 'memory.create', actor: 'bob' }, tok);
  const r1 = await request(port, 'GET', '/entries?action=memory.create', null, tok);
  assert.strictEqual(r1.body.count, 2);
  const r2 = await request(port, 'GET', '/entries?actor=alice', null, tok);
  assert.strictEqual(r2.body.count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter by subject_id and time range', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/entries', { action: 'memory.create', subject_id: 'u1' }, tok);
  await request(port, 'POST', '/entries', { action: 'memory.create', subject_id: 'u2' }, tok);
  await request(port, 'POST', '/entries', { action: 'memory.create', subject_id: 'u3' }, tok);
  const r = await request(port, 'GET', '/entries?subject_id=u1', null, tok);
  assert.strictEqual(r.body.count, 1);
  const r2 = await request(port, 'GET', '/entries?since=2099-01-01', null, tok);
  assert.strictEqual(r2.body.count, 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Get entry by id', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port, 'POST', '/entries', { action: 'memory.create' }, 'tok');
  const g = await request(port, 'GET', `/entries/${c.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  assert.strictEqual(g.body.action, 'memory.create');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Stats endpoint', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/entries', { action: 'memory.create' }, tok);
  await request(port, 'POST', '/entries', { action: 'memory.create' }, tok);
  await request(port, 'POST', '/entries', { action: 'memory.delete' }, tok);
  const r = await request(port, 'GET', '/stats', null, tok);
  assert.strictEqual(r.body.total, 3);
  assert.strictEqual(r.body.by_action['memory.create'], 2);
  assert.strictEqual(r.body.by_action['memory.delete'], 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence with chain intact', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port1, 'POST', '/entries', { action: 'memory.create' }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const v = await request(port2, 'GET', '/verify', null, 'tok');
  assert.strictEqual(v.body.ok, true);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});