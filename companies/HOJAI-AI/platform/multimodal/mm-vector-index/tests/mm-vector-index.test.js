'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mm-vector-index-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 28000;
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

// Unit vector for testing
function vec(arr) { return arr.slice(); }

test('Health & ready', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/health');
  assert.strictEqual(r.body.service, 'mm-vector-index');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/buckets');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Create bucket', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/buckets', { modality: 'image', dimensions: 8 }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.modality, 'image');
  assert.strictEqual(r.body.dimensions, 8);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Create bucket: missing dimensions', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/buckets', { modality: 'image' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Create bucket: invalid modality', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/buckets', { modality: 'BAD', dimensions: 4 }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Create bucket: duplicate returns 409', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/buckets', { modality: 'image', dimensions: 4 }, tok);
  const r = await request(port, 'POST', '/buckets', { modality: 'image', dimensions: 4 }, tok);
  assert.strictEqual(r.status, 409);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Add vector to bucket', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/buckets', { modality: 'image', dimensions: 3 }, tok);
  const r = await request(port, 'POST', '/buckets/image/vectors', { vector: [1, 0, 0], asset_id: 'ast_1' }, tok);
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.asset_id, 'ast_1');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Add vector: dimension mismatch', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/buckets', { modality: 'image', dimensions: 3 }, tok);
  const r = await request(port, 'POST', '/buckets/image/vectors', { vector: [1, 0] }, tok);
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.body.expected, 3);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Add vector: missing bucket → 404', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/buckets/text/vectors', { vector: [1, 0, 0] }, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Search returns top-K by cosine similarity', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/buckets', { modality: 'image', dimensions: 3 }, tok);
  await request(port, 'POST', '/buckets/image/vectors', { vector: [1, 0, 0], asset_id: 'a' }, tok);
  await request(port, 'POST', '/buckets/image/vectors', { vector: [0, 1, 0], asset_id: 'b' }, tok);
  await request(port, 'POST', '/buckets/image/vectors', { vector: [0.9, 0.1, 0], asset_id: 'c' }, tok);
  // Query similar to [1,0,0]
  const r = await request(port, 'POST', '/buckets/image/search', { vector: [1, 0, 0], k: 2 }, tok);
  assert.strictEqual(r.body.count, 2);
  assert.strictEqual(r.body.results[0].asset_id, 'a'); // exact match → top score
  assert.ok(r.body.results[0].score > r.body.results[1].score);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Search: min_score filter', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/buckets', { modality: 'image', dimensions: 3 }, tok);
  await request(port, 'POST', '/buckets/image/vectors', { vector: [1, 0, 0], asset_id: 'a' }, tok);
  await request(port, 'POST', '/buckets/image/vectors', { vector: [-1, 0, 0], asset_id: 'b' }, tok);
  const r = await request(port, 'POST', '/buckets/image/search', { vector: [1, 0, 0], min_score: 0.5 }, tok);
  assert.strictEqual(r.body.count, 1);
  assert.strictEqual(r.body.results[0].asset_id, 'a');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Delete vector', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/buckets', { modality: 'image', dimensions: 3 }, tok);
  const v = await request(port, 'POST', '/buckets/image/vectors', { vector: [1, 0, 0] }, tok);
  const d = await request(port, 'DELETE', `/buckets/image/vectors/${v.body.id}`, null, tok);
  assert.strictEqual(d.status, 200);
  const r = await request(port, 'POST', '/buckets/image/search', { vector: [1, 0, 0] }, tok);
  assert.strictEqual(r.body.count, 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Delete bucket', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/buckets', { modality: 'image', dimensions: 3 }, tok);
  const d = await request(port, 'DELETE', '/buckets/image', null, tok);
  assert.strictEqual(d.status, 200);
  const g = await request(port, 'GET', '/buckets/image', null, tok);
  assert.strictEqual(g.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Stats across buckets', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/buckets', { modality: 'image', dimensions: 3 }, tok);
  await request(port, 'POST', '/buckets', { modality: 'audio', dimensions: 3 }, tok);
  await request(port, 'POST', '/buckets/image/vectors', { vector: [1, 0, 0] }, tok);
  await request(port, 'POST', '/buckets/audio/vectors', { vector: [0, 1, 0] }, tok);
  await request(port, 'POST', '/buckets/audio/vectors', { vector: [0, 0, 1] }, tok);
  const r = await request(port, 'GET', '/stats', null, tok);
  assert.strictEqual(r.body.bucket_count, 2);
  assert.strictEqual(r.body.total_vectors, 3);
  assert.strictEqual(r.body.by_modality.image, 1);
  assert.strictEqual(r.body.by_modality.audio, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port1, 'POST', '/buckets', { modality: 'image', dimensions: 3 }, 'tok');
  await request(port1, 'POST', '/buckets/image/vectors', { vector: [1, 0, 0] }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const s = await request(port2, 'GET', '/stats', null, 'tok');
  assert.strictEqual(s.body.total_vectors, 1);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});