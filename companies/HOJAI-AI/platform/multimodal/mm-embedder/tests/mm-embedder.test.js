'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mm-embedder-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 27000;
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
  assert.strictEqual(r.body.service, 'mm-embedder');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/embeddings');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Embed: returns vector + modality', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/embed', { data: 'aGVsbG8=', modality: 'image' }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.modality, 'image');
  assert.strictEqual(r.body.dimensions, 8);
  assert.strictEqual(r.body.vector.length, 8);
  // Vector should be normalized (sum of squares ≈ 1)
  const sumSq = r.body.vector.reduce((s, x) => s + x * x, 0);
  assert.ok(Math.abs(sumSq - 1) < 0.001, `sumSq=${sumSq}`);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Embed: deterministic for same input', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/embed', { data: 'aGVsbG8=', modality: 'text' }, tok);
  const b = await request(port, 'POST', '/embed', { data: 'aGVsbG8=', modality: 'text' }, tok);
  assert.deepStrictEqual(a.body.vector, b.body.vector);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Embed: different input → different vector', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const a = await request(port, 'POST', '/embed', { data: 'aGVsbG8=', modality: 'image' }, 'tok');
  const b = await request(port, 'POST', '/embed', { data: 'd29ybGQ=', modality: 'image' }, 'tok');
  assert.notDeepStrictEqual(a.body.vector, b.body.vector);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Embed validation: missing data', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/embed', { modality: 'image' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Embed validation: bad modality', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/embed', { data: 'aA==', modality: 'BAD' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Embed: invalid dimensions', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r1 = await request(port, 'POST', '/embed', { data: 'aA==', modality: 'image', dimensions: 2 }, 'tok');
  assert.strictEqual(r1.status, 400);
  const r2 = await request(port, 'POST', '/embed', { data: 'aA==', modality: 'image', dimensions: 9999 }, 'tok');
  assert.strictEqual(r2.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Embed batch', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/embed/batch', {
    items: [
      { data: 'aGVsbG8=', modality: 'image' },
      { data: 'd29ybGQ=', modality: 'audio' },
      { data: 'aA==', modality: 'text' },
    ],
  }, 'tok');
  assert.strictEqual(r.body.count, 3);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Embed batch: skip invalid items', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/embed/batch', {
    items: [
      { data: 'aA==', modality: 'image' },
      { data: 'aA==' /* no modality */ },
    ],
  }, 'tok');
  assert.strictEqual(r.body.embeddings[0].modality, 'image');
  assert.ok(r.body.embeddings[1].error);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('List embeddings filter', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/embed', { data: 'aA==', modality: 'image', asset_id: 'ast_1' }, tok);
  await request(port, 'POST', '/embed', { data: 'aQ==', modality: 'audio', asset_id: 'ast_2' }, tok);
  const all = await request(port, 'GET', '/embeddings', null, tok);
  assert.strictEqual(all.body.count, 2);
  const imgs = await request(port, 'GET', '/embeddings?modality=image', null, tok);
  assert.strictEqual(imgs.body.count, 1);
  const a1 = await request(port, 'GET', '/embeddings?asset_id=ast_1', null, tok);
  assert.strictEqual(a1.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Delete embedding', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const r = await request(port, 'POST', '/embed', { data: 'aA==', modality: 'image' }, tok);
  const d = await request(port, 'DELETE', `/embeddings/${r.body.id}`, null, tok);
  assert.strictEqual(d.status, 200);
  const g = await request(port, 'GET', `/embeddings/${r.body.id}`, null, tok);
  assert.strictEqual(g.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Models endpoint', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/models');
  assert.ok(r.body.modalities.includes('image'));
  assert.ok(r.body.modalities.includes('audio'));
  assert.strictEqual(r.body.default_dimensions, 8);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port1, 'POST', '/embed', { data: 'aA==', modality: 'image' }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/embeddings/${r.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});