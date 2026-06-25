'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'audio-pipeline-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 25000;
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

// WAV magic: RIFF + (4 bytes) + WAVE
const WAV_B64 = Buffer.concat([Buffer.from('RIFF'), Buffer.from('xxxx'), Buffer.from('WAVE')]).toString('base64');
const FLAC_B64 = Buffer.from('fLaC').toString('base64');
const OGG_B64 = Buffer.from('OggS').toString('base64');

test('Health & ready', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/health');
  assert.strictEqual(r.body.service, 'audio-pipeline');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/jobs');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Decode WAV by magic bytes', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/decode', { data: WAV_B64 }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.result.format, 'wav');
  assert.strictEqual(r.body.result.sample_rate, 16000);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Decode FLAC by magic bytes', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/decode', { data: FLAC_B64 }, 'tok');
  assert.strictEqual(r.body.result.format, 'flac');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Decode by MIME type', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/decode', { data: 'AA==', mime_type: 'audio/mpeg' }, 'tok');
  assert.strictEqual(r.body.result.format, 'mp3');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Decode unknown → 415', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/decode', { data: 'aGVsbG8=' }, 'tok');
  assert.strictEqual(r.status, 415);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Resample: target rate', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/resample', { data: WAV_B64, sample_rate: 44100 }, 'tok');
  assert.strictEqual(r.body.result.target_sample_rate, 44100);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Resample: invalid rate', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/resample', { data: WAV_B64, sample_rate: 11025 }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('VAD: returns speech segment for non-trivial input', async () => {
  // 32000 bytes = 1 second @ 16kHz mono 16-bit
  const audio = Buffer.alloc(32000);
  const audio_b64 = audio.toString('base64');
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/vad', { data: audio_b64 }, 'tok');
  assert.strictEqual(r.body.result.segments.length, 1);
  assert.ok(r.body.result.segments[0].is_speech);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Chunk: 1-second audio into 5-second chunks → 1 chunk', async () => {
  const audio = Buffer.alloc(32000);
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/chunk', { data: audio.toString('base64'), chunk_seconds: 5 }, 'tok');
  assert.strictEqual(r.body.result.chunk_count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Chunk: 6-second audio into 2-second chunks → 3 chunks', async () => {
  const audio = Buffer.alloc(192000); // 6 seconds
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/chunk', { data: audio.toString('base64'), chunk_seconds: 2 }, 'tok');
  assert.strictEqual(r.body.result.chunk_count, 3);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Chunk: invalid range', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/chunk', { data: 'aGVsbG8=', chunk_seconds: 0 }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Jobs filter', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/decode', { data: WAV_B64 }, tok);
  await request(port, 'POST', '/vad', { data: WAV_B64 }, tok);
  await request(port, 'POST', '/vad', { data: OGG_B64 }, tok);
  const r = await request(port, 'GET', '/jobs?type=vad', null, tok);
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
  const j = await request(port1, 'POST', '/decode', { data: WAV_B64 }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/jobs/${j.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});