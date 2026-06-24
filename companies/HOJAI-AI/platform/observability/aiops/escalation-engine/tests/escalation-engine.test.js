'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'escalation-engine-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 16000;
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
  assert.strictEqual(r.body.service, 'escalation-engine');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/policies');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Policy CRUD', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/policies', {
    name: 'Critical Path',
    levels: [
      { level: 1, targets: [{ type: 'user', id: 'alice' }], timeout_seconds: 300 },
      { level: 2, targets: [{ type: 'rotation', id: 'primary' }] },
    ],
  }, tok);
  assert.strictEqual(c.status, 201);
  const pid = c.body.id;
  const g = await request(port, 'GET', `/policies/${pid}`, null, tok);
  assert.strictEqual(g.body.levels.length, 2);
  const u = await request(port, 'PUT', `/policies/${pid}`, { description: 'Updated' }, tok);
  assert.strictEqual(u.body.description, 'Updated');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Policy validation: missing name', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/policies', { levels: [{ level: 1, targets: [{ type: 'user', id: 'x' }] }] }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Policy validation: missing levels', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/policies', { name: 'X' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Policy validation: bad target type', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/policies', {
    name: 'X',
    levels: [{ level: 1, targets: [{ type: 'INVALID' }] }],
  }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Escalation: starts at first level', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const p = await request(port, 'POST', '/policies', {
    name: 'X',
    levels: [
      { level: 1, targets: [{ type: 'user', id: 'alice' }], timeout_seconds: 60 },
      { level: 2, targets: [{ type: 'user', id: 'bob' }] },
    ],
  }, tok);
  const e = await request(port, 'POST', '/escalations', {
    policy_id: p.body.id, incident_id: 'inc_1', severity: 'critical',
  }, tok);
  assert.strictEqual(e.body.current_level, 1);
  assert.ok(e.body.level_expires_at);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Escalation: severity_filter rejects', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const p = await request(port, 'POST', '/policies', {
    name: 'X',
    severity_filter: ['critical'],
    levels: [{ level: 1, targets: [{ type: 'user', id: 'a' }] }],
  }, tok);
  const e = await request(port, 'POST', '/escalations', {
    policy_id: p.body.id, incident_id: 'inc_1', severity: 'low',
  }, tok);
  assert.strictEqual(e.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Escalation: ack stops escalation', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const p = await request(port, 'POST', '/policies', {
    name: 'X',
    levels: [{ level: 1, targets: [{ type: 'user', id: 'a' }] }],
  }, tok);
  const e = await request(port, 'POST', '/escalations', {
    policy_id: p.body.id, incident_id: 'inc_1',
  }, tok);
  const a = await request(port, 'POST', `/escalations/${e.body.id}/ack`, { user_id: 'alice' }, tok);
  assert.strictEqual(a.body.status, 'acknowledged');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Escalation: manual escalate jumps levels', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const p = await request(port, 'POST', '/policies', {
    name: 'X',
    levels: [
      { level: 1, targets: [{ type: 'user', id: 'a' }] },
      { level: 2, targets: [{ type: 'user', id: 'b' }] },
      { level: 3, targets: [{ type: 'user', id: 'c' }] },
    ],
  }, tok);
  const e = await request(port, 'POST', '/escalations', { policy_id: p.body.id, incident_id: 'i' }, tok);
  assert.strictEqual(e.body.current_level, 1);
  const e2 = await request(port, 'POST', `/escalations/${e.body.id}/escalate`, {}, tok);
  assert.strictEqual(e2.body.current_level, 2);
  const e3 = await request(port, 'POST', `/escalations/${e.body.id}/escalate`, {}, tok);
  assert.strictEqual(e3.body.current_level, 3);
  const e4 = await request(port, 'POST', `/escalations/${e.body.id}/escalate`, {}, tok);
  assert.strictEqual(e4.status, 400);  // already at top
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Escalation: resolve terminates', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const p = await request(port, 'POST', '/policies', {
    name: 'X',
    levels: [{ level: 1, targets: [{ type: 'user', id: 'a' }] }],
  }, tok);
  const e = await request(port, 'POST', '/escalations', { policy_id: p.body.id, incident_id: 'i' }, tok);
  const r = await request(port, 'POST', `/escalations/${e.body.id}/resolve`, {}, tok);
  assert.strictEqual(r.body.status, 'resolved');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Escalation: cancel', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const p = await request(port, 'POST', '/policies', {
    name: 'X',
    levels: [{ level: 1, targets: [{ type: 'user', id: 'a' }] }],
  }, tok);
  const e = await request(port, 'POST', '/escalations', { policy_id: p.body.id, incident_id: 'i' }, tok);
  const r = await request(port, 'POST', `/escalations/${e.body.id}/cancel`, {}, tok);
  assert.strictEqual(r.body.status, 'cancelled');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Escalation: ack non-active fails', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const p = await request(port, 'POST', '/policies', {
    name: 'X',
    levels: [{ level: 1, targets: [{ type: 'user', id: 'a' }] }],
  }, tok);
  const e = await request(port, 'POST', '/escalations', { policy_id: p.body.id, incident_id: 'i' }, tok);
  await request(port, 'POST', `/escalations/${e.body.id}/resolve`, {}, tok);
  const a = await request(port, 'POST', `/escalations/${e.body.id}/ack`, {}, tok);
  assert.strictEqual(a.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter escalations', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const p = await request(port, 'POST', '/policies', {
    name: 'X',
    levels: [{ level: 1, targets: [{ type: 'user', id: 'a' }] }],
  }, tok);
  await request(port, 'POST', '/escalations', { policy_id: p.body.id, incident_id: 'i1' }, tok);
  await request(port, 'POST', '/escalations', { policy_id: p.body.id, incident_id: 'i2' }, tok);
  const r = await request(port, 'GET', `/escalations?policy_id=${p.body.id}`, null, tok);
  assert.strictEqual(r.body.count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Escalation: 404 unknown policy', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/escalations', { policy_id: 'pol_unknown', incident_id: 'i' }, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port1, 'POST', '/policies', {
    name: 'P',
    levels: [{ level: 1, targets: [{ type: 'user', id: 'a' }] }],
  }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/policies/${c.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});