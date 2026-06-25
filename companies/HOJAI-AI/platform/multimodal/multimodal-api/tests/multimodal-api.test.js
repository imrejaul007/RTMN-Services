'use strict';

const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mm-api-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 30000;
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

// Stub servers for sub-services
function startStub(port, name) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', (c) => body += c);
      req.on('end', () => {
        if (req.url === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, service: name }));
          return;
        }
        // Default: respond with method+path + parsed body
        let parsed = null;
        try { parsed = JSON.parse(body); } catch (_) { /* */ }
        const id = name + '_' + Math.random().toString(16).slice(2, 8);
        if (req.url === '/assets') {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id, ...(parsed || {}) }));
        } else if (req.url === '/decode') {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ result: { format: 'stub', width: 100, height: 100 } }));
        } else if (req.url === '/embed') {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id: name + '_emb', dimensions: 8 }));
        } else {
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ id, ok: true }));
        }
      });
    });
    server.listen(port, () => resolve(server));
    server.once('error', reject);
  });
}
function stopStub(server) { return new Promise((resolve) => server.close(resolve)); }

const STUB_PORTS = {};

test('Health & ready (no stubs)', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/health');
  assert.strictEqual(r.body.service, 'multimodal-api');
  const ready = await request(port, 'GET', '/ready');
  assert.strictEqual(ready.body.ok, false); // all downstream unreachable
  assert.strictEqual(ready.body.services.length, 8);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required for protected endpoints', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/services');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Service catalog', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/services', null, 'tok');
  assert.strictEqual(r.body.count, 8);
  assert.ok(r.body.services.find((s) => s.name === 'mm-asset-store'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Single service info', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/services/mm-asset-store', null, 'tok');
  assert.strictEqual(r.body.port, 5343);
  assert.ok(Array.isArray(r.body.modalities));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Service not found', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/services/foo', null, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Capabilities map', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/capabilities', null, 'tok');
  assert.ok(r.body.count > 10);
  assert.ok(r.body.capabilities.decode_image);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Single capability lookup', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/capabilities/embed', null, 'tok');
  assert.deepStrictEqual(r.body.services, ['mm-embedder']);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Unknown capability', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/capabilities/foo', null, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Pipeline analyze routes through sub-services (with stubs)', async () => {
  // Start 3 stubs at canonical ports
  const stubs = [];
  for (const name of ['mm-asset-store', 'image-pipeline', 'mm-embedder']) {
    const port = ({ 'mm-asset-store': 5343, 'image-pipeline': 5344, 'mm-embedder': 5347 })[name];
    stubs.push({ name, port, server: await startStub(port, name) });
  }
  try {
    const tmp = makeTmpDir(); const port = uniquePort();
    const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
    const tok = 'tok';
    const r = await request(port, 'POST', '/pipeline/analyze', {
      modality: 'image',
      data: 'aGVsbG8=',
      mime_type: 'image/png',
    }, tok);
    assert.strictEqual(r.status, 201);
    assert.strictEqual(r.body.modality, 'image');
    assert.ok(r.body.asset_id);
    assert.ok(r.body.embedding_id);
    assert.strictEqual(r.body.steps.length, 3);
    assert.strictEqual(r.body.steps[0].step, 'store');
    assert.strictEqual(r.body.steps[1].step, 'decode');
    assert.strictEqual(r.body.steps[2].step, 'embed');
    await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
  } finally {
    for (const s of stubs) await stopStub(s.server);
  }
});

test('Pipeline analyze: missing modality', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/pipeline/analyze', { data: 'aA==' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Stats', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/stats', null, 'tok');
  assert.strictEqual(r.body.service_count, 8);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});