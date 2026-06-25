'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mm-xmodal-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 34000;
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
  assert.strictEqual(r.body.service, 'mm-cross-modal-reasoner');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/jobs');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('caption-retrieve: image → caption + ranked candidates', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/caption-retrieve', {
    data: Buffer.from('fake-image-bytes').toString('base64'),
    candidates: [
      { id: 'c1', caption: 'a photo of a car on the road' },
      { id: 'c2', caption: 'a person walking in the park' },
      { id: 'c3', caption: 'food on a plate at a restaurant' },
    ],
    top_k: 2,
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(typeof r.body.result.caption === 'string' && r.body.result.caption.length > 0);
  assert.strictEqual(r.body.result.ranked.length, 2);
  assert.ok(r.body.result.ranked[0].score >= r.body.result.ranked[1].score); // sorted desc
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('caption-retrieve: missing data rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/caption-retrieve', { candidates: [] }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('audio-to-image: ranks images by audio transcript', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/audio-to-image', {
    audio_text: 'a beautiful sunset over the ocean',
    images: [
      { id: 'i1', caption: 'a sunset over the ocean waves' },
      { id: 'i2', caption: 'people walking in a city' },
      { id: 'i3', caption: 'a sunset in the desert' },
    ],
    top_k: 3,
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.result.ranked.length, 3);
  // The sunset over ocean should rank above the city one
  const topIdx = r.body.result.ranked[0].index;
  assert.ok(topIdx === 0 || topIdx === 2, 'expected sunset image to rank first');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('audio-to-image: missing audio_text rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/audio-to-image', { images: [] }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('fuse: combines multiple modalities', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/fuse', {
    modalities: [
      { modality: 'image', data: 'abc', weight: 1 },
      { modality: 'audio', data: 'defgh', weight: 0.5 },
      { modality: 'text', data: 'hello world', weight: 1 },
    ],
    strategy: 'weighted-average',
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.result.modalities_count, 3);
  assert.strictEqual(r.body.result.strategy, 'weighted-average');
  assert.ok(r.body.result.unified_score > 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('fuse: invalid strategy rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/fuse', {
    modalities: [{ modality: 'image', data: 'a' }],
    strategy: 'unknown',
  }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('fuse: invalid modality rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/fuse', {
    modalities: [{ modality: 'smell', data: 'a' }],
    strategy: 'concat',
  }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('query: multimodal QA returns answer with evidence', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/query', {
    question: 'what color is the car',
    evidence: [
      { modality: 'text', text: 'the car is red' },
      { modality: 'image', text: 'unrelated picture' },
      { modality: 'audio', text: 'background music playing' },
    ],
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(typeof r.body.result.answer === 'string');
  assert.strictEqual(r.body.result.evidence_scores.length, 3);
  // The text evidence about red car should rank highest
  assert.strictEqual(r.body.result.evidence_scores[0].modality, 'text');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('query: insufficient evidence', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/query', {
    question: 'something completely unrelated',
    evidence: [{ modality: 'text', text: 'zzz qqq' }],
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.result.answer.includes('insufficient'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Catalog endpoints: strategies, modalities', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const s = await request(port, 'GET', '/strategies', null, 'tok');
  const m = await request(port, 'GET', '/modalities', null, 'tok');
  assert.ok(s.body.strategies.length >= 3);
  assert.ok(m.body.modalities.includes('image'));
  assert.ok(m.body.modalities.includes('audio'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Jobs filter by type + persistence (restart on new port)', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port, 'POST', '/fuse', {
    modalities: [{ modality: 'image', data: 'a' }, { modality: 'text', data: 'b' }],
  }, 'tok');
  await request(port, 'POST', '/query', {
    question: 'q', evidence: [{ modality: 'text', text: 'a' }],
  }, 'tok');
  const filtered = await request(port, 'GET', '/jobs?type=fuse', null, 'tok');
  assert.ok(filtered.body.count >= 1);
  assert.ok(filtered.body.jobs.every((j) => j.type === 'fuse'));
  await stopService(h);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const all = await request(port2, 'GET', '/jobs', null, 'tok');
  assert.ok(all.body.count >= 2);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});