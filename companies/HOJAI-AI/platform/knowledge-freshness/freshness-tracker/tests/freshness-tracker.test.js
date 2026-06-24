'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'freshness-tracker-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 18000;
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
  assert.strictEqual(r.body.service, 'freshness-tracker');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/documents');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Default TTL available', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/default-ttl', null, 'tok');
  assert.strictEqual(r.body.default_ttl, 7 * 24 * 60 * 60);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Update default TTL', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'PUT', '/default-ttl', { default_ttl: 3600 }, 'tok');
  assert.strictEqual(r.body.default_ttl, 3600);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Update default TTL rejects bad input', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'PUT', '/default-ttl', { default_ttl: 'X' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Track: creates document with freshness=1.0', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/track', { doc_id: 'doc_1', source: 'kb' }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.freshness, 1.0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Track: refresh existing resets freshness', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/track', { doc_id: 'doc_1' }, tok);
  // Simulate time passing by manipulating file (alternative: just refresh)
  const r2 = await request(port, 'POST', '/track', { doc_id: 'doc_1' }, tok);
  assert.strictEqual(r2.status, 200);  // update path
  assert.strictEqual(r2.body.freshness, 1.0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Track validation: requires doc_id', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/track', {}, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Freshness decays linearly', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  // Create doc with very short TTL (1 second)
  await request(port, 'POST', '/track', { doc_id: 'd', ttl_seconds: 1 }, 'tok');
  // Wait > 1 second to be safe
  await new Promise((r) => setTimeout(r, 1100));
  const r = await request(port, 'GET', '/documents/d', null, 'tok');
  assert.strictEqual(r.body.freshness, 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Access: increments count', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/track', { doc_id: 'd' }, tok);
  await request(port, 'POST', '/documents/d/access', {}, tok);
  await request(port, 'POST', '/documents/d/access', {}, tok);
  const r = await request(port, 'GET', '/documents/d', null, tok);
  assert.strictEqual(r.body.access_count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter by source', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/track', { doc_id: 'a', source: 'kb' }, tok);
  await request(port, 'POST', '/track', { doc_id: 'b', source: 'wiki' }, tok);
  const r = await request(port, 'GET', '/documents?source=kb', null, tok);
  assert.strictEqual(r.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter by min_freshness', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/track', { doc_id: 'fresh', ttl_seconds: 3600 }, tok);
  await request(port, 'POST', '/track', { doc_id: 'soon_stale', ttl_seconds: 1 }, tok);
  await new Promise((r) => setTimeout(r, 1100));
  const r = await request(port, 'GET', '/documents?min_freshness=0.5', null, tok);
  assert.strictEqual(r.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Stats endpoint', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/track', { doc_id: 'a' }, tok);
  await request(port, 'POST', '/track', { doc_id: 'b', ttl_seconds: 1 }, tok);
  await new Promise((r) => setTimeout(r, 1100));
  const r = await request(port, 'GET', '/stats', null, tok);
  assert.strictEqual(r.body.total, 2);
  assert.strictEqual(r.body.by_freshness.expired, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Delete document', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/track', { doc_id: 'd' }, tok);
  const d = await request(port, 'DELETE', '/documents/d', null, tok);
  assert.strictEqual(d.status, 200);
  const g = await request(port, 'GET', '/documents/d', null, tok);
  assert.strictEqual(g.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port1, 'POST', '/track', { doc_id: 'persist' }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', '/documents/persist', null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});