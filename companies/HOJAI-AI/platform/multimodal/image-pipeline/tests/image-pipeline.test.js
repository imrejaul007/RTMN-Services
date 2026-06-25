'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'image-pipeline-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 24000;
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

// PNG magic bytes 89 50 4E 47
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
const PNG_B64 = PNG_HEADER.toString('base64');
// JPEG magic bytes FF D8 FF
const JPG_HEADER = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]);
const JPG_B64 = JPG_HEADER.toString('base64');
const RIFF_B64 = Buffer.from('RIFFxxxxWEBP').toString('base64');

test('Health & ready', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/health');
  assert.strictEqual(r.body.service, 'image-pipeline');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/jobs');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Decode PNG by magic bytes', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/decode', { data: PNG_B64 }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.result.format, 'png');
  assert.ok(r.body.result.width > 0);
  assert.ok(r.body.result.height > 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Decode JPEG by magic bytes', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/decode', { data: JPG_B64 }, 'tok');
  assert.strictEqual(r.body.result.format, 'jpeg');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Decode WEBP by magic bytes', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/decode', { data: RIFF_B64 }, 'tok');
  assert.strictEqual(r.body.result.format, 'webp');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Decode by MIME type', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/decode', { data: 'AA==', mime_type: 'image/gif' }, 'tok');
  assert.strictEqual(r.body.result.format, 'gif');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Decode unknown format → 415', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/decode', { data: 'aGVsbG8=' }, 'tok');
  assert.strictEqual(r.status, 415);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Resize: returns target dimensions', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/resize', { data: PNG_B64, width: 800, height: 600 }, 'tok');
  assert.strictEqual(r.body.result.target_width, 800);
  assert.strictEqual(r.body.result.target_height, 600);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Resize: invalid dimensions', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/resize', { data: PNG_B64, width: 99999 }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Thumbnail: defaults 256x256', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/thumbnail', { data: PNG_B64 }, 'tok');
  assert.strictEqual(r.body.result.width, 256);
  assert.strictEqual(r.body.result.height, 256);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Normalize: returns normalization params', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/normalize', { data: PNG_B64 }, 'tok');
  assert.strictEqual(r.body.result.color_space, 'srgb');
  assert.ok(Array.isArray(r.body.result.mean));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('EXIF strip: lists stripped tags', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/exif/strip', { data: JPG_B64 }, 'tok');
  assert.ok(r.body.result.stripped_tags.length > 0);
  assert.ok(r.body.result.stripped_tags.includes('GPS'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Jobs filter by type', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/decode', { data: PNG_B64 }, tok);
  await request(port, 'POST', '/thumbnail', { data: PNG_B64 }, tok);
  await request(port, 'POST', '/thumbnail', { data: JPG_B64 }, tok);
  const r = await request(port, 'GET', '/jobs?type=thumbnail', null, tok);
  assert.strictEqual(r.body.count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: missing data', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/decode', {}, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const j = await request(port1, 'POST', '/decode', { data: PNG_B64 }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/jobs/${j.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});