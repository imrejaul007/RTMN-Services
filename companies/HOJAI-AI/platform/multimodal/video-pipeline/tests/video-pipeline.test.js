'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'video-pipeline-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 26000;
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

// MP4: ftyp at offset 4
const MP4_B64 = Buffer.concat([Buffer.from([0,0,0,0]), Buffer.from('ftyp')]).toString('base64');
// WebM: EBML 1A 45 DF A3
const WEBM_B64 = Buffer.from([0x1A, 0x45, 0xDF, 0xA3, 0x01, 0x02, 0x03]).toString('base64');

test('Health & ready', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/health');
  assert.strictEqual(r.body.service, 'video-pipeline');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/jobs');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Probe MP4', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/probe', { data: MP4_B64, duration_seconds: 60 }, 'tok');
  assert.strictEqual(r.body.result.format, 'mp4');
  assert.strictEqual(r.body.result.duration_seconds, 60);
  assert.strictEqual(r.body.result.width, 1920);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Probe WebM by magic bytes', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/probe', { data: WEBM_B64 }, 'tok');
  assert.strictEqual(r.body.result.format, 'webm');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Probe by MIME', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/probe', { data: 'aGVsbG8=', mime_type: 'video/quicktime' }, 'tok');
  assert.strictEqual(r.body.result.format, 'mov');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Probe unknown → 415', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/probe', { data: 'aGVsbG8=' }, 'tok');
  assert.strictEqual(r.status, 415);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Extract frames at fps', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/extract/frames', { data: MP4_B64, fps: 2, duration_seconds: 10 }, 'tok');
  assert.strictEqual(r.body.result.frame_count, 20);
  assert.strictEqual(r.body.result.frames[0].timestamp_seconds, 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Extract frames invalid fps', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/extract/frames', { data: MP4_B64, fps: 100 }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Keyframes at 5s intervals for 30s video → 6 keyframes', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/extract/keyframes', { data: MP4_B64, duration_seconds: 30, keyframe_interval_seconds: 5 }, 'tok');
  assert.strictEqual(r.body.result.keyframe_count, 6);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Split audio', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/split/audio', { data: MP4_B64, duration_seconds: 10 }, 'tok');
  assert.strictEqual(r.body.result.audio_track_present, true);
  assert.strictEqual(r.body.result.sample_rate, 44100);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Thumbnail at time', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/thumbnail', { data: MP4_B64, at_seconds: 5, duration_seconds: 30 }, 'tok');
  assert.strictEqual(r.body.result.at_seconds, 5);
  assert.strictEqual(r.body.result.width, 320);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Thumbnail out of bounds', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/thumbnail', { data: MP4_B64, at_seconds: 100, duration_seconds: 30 }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Jobs filter by type', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/probe', { data: MP4_B64 }, tok);
  await request(port, 'POST', '/split/audio', { data: MP4_B64 }, tok);
  await request(port, 'POST', '/thumbnail', { data: MP4_B64 }, tok);
  const r = await request(port, 'GET', '/jobs?type=probe', null, tok);
  assert.strictEqual(r.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: missing data', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/probe', {}, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const j = await request(port1, 'POST', '/probe', { data: MP4_B64 }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/jobs/${j.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});