'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'memory-purge-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 59000;
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
  assert.strictEqual(r.body.service, 'memory-purge');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/records');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Record CRUD', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/records', { subject_id: 'u1', memory_type: 'profile', content: 'secret' }, tok);
  assert.strictEqual(c.status, 201);
  assert.strictEqual(c.body.purged, false);
  const rid = c.body.id;
  const g = await request(port, 'GET', `/records/${rid}`, null, tok);
  assert.strictEqual(g.body.content, 'secret');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Record validation', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/records', { subject_id: 'u1' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Soft delete: tombstones record', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/records', { subject_id: 'u1', memory_type: 'profile', content: 'secret' }, tok);
  const p = await request(port, 'POST', `/records/${c.body.id}/purge`, { reason: 'gdpr_request' }, tok);
  assert.strictEqual(p.status, 200);
  assert.strictEqual(p.body.purged, true);
  assert.strictEqual(p.body.content, null);
  assert.strictEqual(p.body.purge_reason, 'gdpr_request');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Soft delete: cannot purge twice', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/records', { subject_id: 'u1', memory_type: 'profile', content: 'x' }, tok);
  await request(port, 'POST', `/records/${c.body.id}/purge`, {}, tok);
  const p2 = await request(port, 'POST', `/records/${c.body.id}/purge`, {}, tok);
  assert.strictEqual(p2.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Hard delete: requires soft delete first', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/records', { subject_id: 'u1', memory_type: 'profile', content: 'x' }, tok);
  const d = await request(port, 'DELETE', `/records/${c.body.id}`, null, tok);
  assert.strictEqual(d.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Hard delete: tombstones record', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/records', { subject_id: 'u1', memory_type: 'profile', content: 'x' }, tok);
  await request(port, 'POST', `/records/${c.body.id}/purge`, {}, tok);
  const d = await request(port, 'DELETE', `/records/${c.body.id}`, null, tok);
  assert.strictEqual(d.status, 200);
  assert.strictEqual(d.body.hard_deleted, true);
  const g = await request(port, 'GET', `/records/${c.body.id}`, null, tok);
  assert.strictEqual(g.body.hard_deleted, true);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Sweep: bulk purge', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c1 = await request(port, 'POST', '/records', { subject_id: 'u1', memory_type: 'profile', content: 'a' }, tok);
  const c2 = await request(port, 'POST', '/records', { subject_id: 'u2', memory_type: 'profile', content: 'b' }, tok);
  const c3 = await request(port, 'POST', '/records', { subject_id: 'u3', memory_type: 'profile', content: 'c' }, tok);
  const sw = await request(port, 'POST', '/sweep', {
    items: [
      { record_id: c1.body.id, reason: 'expired' },
      { record_id: c2.body.id, reason: 'expired' },
      { record_id: 'mem_unknown', reason: 'expired' },
    ]
  }, tok);
  assert.strictEqual(sw.body.total, 3);
  assert.strictEqual(sw.body.purged, 2);
  assert.strictEqual(sw.body.failed, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Sweep: skips already purged', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/records', { subject_id: 'u1', memory_type: 'profile', content: 'x' }, tok);
  await request(port, 'POST', `/records/${c.body.id}/purge`, {}, tok);
  const sw = await request(port, 'POST', '/sweep', { items: [{ record_id: c.body.id }] }, tok);
  assert.strictEqual(sw.body.skipped, 1);
  assert.strictEqual(sw.body.purged, 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Sweep: requires items array', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/sweep', {}, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter records by subject_id, purged', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c1 = await request(port, 'POST', '/records', { subject_id: 'u1', memory_type: 'profile', content: 'x' }, tok);
  const c2 = await request(port, 'POST', '/records', { subject_id: 'u2', memory_type: 'profile', content: 'y' }, tok);
  await request(port, 'POST', `/records/${c1.body.id}/purge`, {}, tok);
  const r1 = await request(port, 'GET', '/records?subject_id=u1', null, tok);
  assert.strictEqual(r1.body.count, 1);
  const r2 = await request(port, 'GET', '/records?purged=true', null, tok);
  assert.strictEqual(r2.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port1, 'POST', '/records', { subject_id: 'u1', memory_type: 'profile', content: 'x' }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/records/${c.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});