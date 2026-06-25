'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mm-chunker-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 29000;
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
  assert.strictEqual(r.body.service, 'mm-chunker');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/jobs');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Text chunk: 1000 chars into 200-char chunks', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const text = 'a'.repeat(1000);
  const r = await request(port, 'POST', '/chunk', { modality: 'text', text, chunk_size: 200, overlap: 0 }, 'tok');
  assert.strictEqual(r.body.chunk_count, 5);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Text chunk: overlap', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const text = 'a'.repeat(300);
  const r = await request(port, 'POST', '/chunk', { modality: 'text', text, chunk_size: 100, overlap: 20 }, 'tok');
  // First chunk: [0,100]. Next start at 80, end at 180. Etc. 300 chars / (100-20) ≈ 3.25 → 4 chunks
  assert.ok(r.body.chunk_count >= 3);
  // Verify overlap by checking chunk 1 starts before chunk 0 ends
  assert.ok(r.body.result.chunks[1].start < r.body.result.chunks[0].end);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Text chunk validation: overlap >= size', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/chunk', { modality: 'text', text: 'hello', chunk_size: 10, overlap: 10 }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Audio chunk: 60s audio in 10s chunks', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/chunk', { modality: 'audio', duration_seconds: 60, chunk_seconds: 10, overlap_seconds: 0 }, 'tok');
  assert.strictEqual(r.body.chunk_count, 6);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Video chunk: scene-based', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/chunk', { modality: 'video', duration_seconds: 120, chunk_seconds: 30, overlap_seconds: 5 }, 'tok');
  assert.ok(r.body.chunk_count >= 4);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('OCR chunk: 10 lines into chunks of 3', async () => {
  const lines = ['L1', 'L2', 'L3', 'L4', 'L5', 'L6', 'L7', 'L8', 'L9', 'L10'];
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/chunk', { modality: 'ocr', lines, lines_per_chunk: 3 }, 'tok');
  assert.strictEqual(r.body.chunk_count, 4);
  assert.strictEqual(r.body.result.chunks[0].lines.length, 3);
  assert.strictEqual(r.body.result.chunks[3].lines.length, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: missing modality', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/chunk', { text: 'hi' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: bad modality', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/chunk', { modality: 'BAD' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Batch chunking', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/chunk/batch', {
    items: [
      { modality: 'text', text: 'a'.repeat(100), chunk_size: 50, overlap: 0 },
      { modality: 'audio', duration_seconds: 30, chunk_seconds: 10, overlap_seconds: 0 },
    ],
  }, 'tok');
  assert.strictEqual(r.body.count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Strategies endpoint', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/strategies');
  assert.ok(r.body.strategies.text);
  assert.ok(r.body.strategies.audio);
  assert.ok(r.body.strategies.video);
  assert.ok(r.body.strategies.ocr);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Jobs filter by modality', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/chunk', { modality: 'text', text: 'hi' }, tok);
  await request(port, 'POST', '/chunk', { modality: 'audio', duration_seconds: 10, chunk_seconds: 5, overlap_seconds: 0 }, tok);
  const r = await request(port, 'GET', '/jobs?modality=audio', null, tok);
  assert.strictEqual(r.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const j = await request(port1, 'POST', '/chunk', { modality: 'text', text: 'hello world' }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/jobs/${j.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});