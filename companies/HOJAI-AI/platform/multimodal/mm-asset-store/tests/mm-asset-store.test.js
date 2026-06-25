'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mm-asset-store-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 22000;
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

const TINY_PNG_B64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const TINY_WAV_B64 = Buffer.from('RIFF').toString('base64');

test('Health & ready', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/health');
  assert.strictEqual(r.body.service, 'mm-asset-store');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/assets');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Store image asset', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/assets', {
    data: TINY_PNG_B64, modality: 'image', mime_type: 'image/png', source: 'upload',
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.modality, 'image');
  assert.ok(r.body.content_hash);
  assert.ok(r.body.byte_size > 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: missing data', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/assets', { modality: 'image' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: bad modality', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'BAD' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Dedup on identical content_hash', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image' }, tok);
  const b = await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image', source: 'dup' }, tok);
  assert.strictEqual(b.body.id, a.body.id);
  assert.strictEqual(b.body.ref_count, 2);
  assert.strictEqual(b.body.dedup, true);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Lookup by content hash', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image' }, tok);
  const r = await request(port, 'GET', `/hash/${a.body.content_hash}`, null, tok);
  assert.strictEqual(r.body.id, a.body.id);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('List with filters', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image', source: 'upload', tags: ['avatar'] }, tok);
  await request(port, 'POST', '/assets', { data: TINY_WAV_B64, modality: 'audio', source: 'mic', tags: ['intro'] }, tok);
  const all = await request(port, 'GET', '/assets', null, tok);
  assert.strictEqual(all.body.count, 2);
  const imgs = await request(port, 'GET', '/assets?modality=image', null, tok);
  assert.strictEqual(imgs.body.count, 1);
  const audioSrc = await request(port, 'GET', '/assets?source=mic', null, tok);
  assert.strictEqual(audioSrc.body.count, 1);
  const tagged = await request(port, 'GET', '/assets?tag=avatar', null, tok);
  assert.strictEqual(tagged.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Get raw bytes', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image', mime_type: 'image/png' }, tok);
  const r = await new Promise((resolve, reject) => {
    const req = http.request({ hostname: '127.0.0.1', port, method: 'GET', path: `/assets/${a.body.id}/bytes`, headers: { 'X-Internal-Token': tok } }, (res) => {
      let chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, contentType: res.headers['content-type'], body: Buffer.concat(chunks).toString('base64') }));
    });
    req.on('error', reject); req.end();
  });
  assert.strictEqual(r.contentType, 'image/png');
  assert.strictEqual(r.body, TINY_PNG_B64);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Update metadata (no bytes)', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image' }, tok);
  const u = await request(port, 'PUT', `/assets/${a.body.id}`, { source: 'updated', metadata: { author: 'alice' } }, tok);
  assert.strictEqual(u.body.source, 'updated');
  assert.strictEqual(u.body.metadata.author, 'alice');
  assert.strictEqual(u.body.bytes, a.body.bytes);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Tags add and remove', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image', tags: ['x'] }, tok);
  const add = await request(port, 'POST', `/assets/${a.body.id}/tags`, { tags: ['y', 'z'] }, tok);
  assert.deepStrictEqual(add.body.tags.sort(), ['x', 'y', 'z']);
  const rem = await request(port, 'DELETE', `/assets/${a.body.id}/tags/y`, null, tok);
  assert.strictEqual(rem.body.removed, 1);
  assert.deepStrictEqual(rem.body.tags.sort(), ['x', 'z']);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Delete asset', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const a = await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image' }, tok);
  const d = await request(port, 'DELETE', `/assets/${a.body.id}`, null, tok);
  assert.strictEqual(d.status, 200);
  const g = await request(port, 'GET', `/assets/${a.body.id}`, null, tok);
  assert.strictEqual(g.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Stats', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image', source: 'upload' }, tok);
  await request(port, 'POST', '/assets', { data: TINY_WAV_B64, modality: 'audio', source: 'mic' }, tok);
  const r = await request(port, 'GET', '/stats', null, tok);
  assert.strictEqual(r.body.asset_count, 2);
  assert.strictEqual(r.body.by_modality.image, 1);
  assert.strictEqual(r.body.by_modality.audio, 1);
  assert.strictEqual(r.body.by_source.upload, 1);
  assert.strictEqual(r.body.total_bytes > 0, true);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Search by metadata query', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image', metadata: { label: 'invoice-A' } }, tok);
  await request(port, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image', metadata: { label: 'receipt-B' } }, tok);
  const r = await request(port, 'GET', '/assets?q=invoice', null, tok);
  assert.strictEqual(r.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const a = await request(port1, 'POST', '/assets', { data: TINY_PNG_B64, modality: 'image' }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/assets/${a.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});