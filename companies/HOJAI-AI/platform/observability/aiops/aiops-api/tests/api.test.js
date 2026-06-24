'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'aiops-api-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 11000;
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

test('Health and ready endpoints', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/health');
  assert.strictEqual(r.body.service, 'aiops-api');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
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
  assert.strictEqual(r.body.services.incidents.port, 5332);
  assert.strictEqual(r.body.services.runbooks.port, 5333);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Health aggregation ok=false when sub-services down', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/services/health', null, 'tok');
  assert.strictEqual(r.body.results.incidents.ok, false);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Health aggregation ok=true with stubs', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const stubPort = uniquePort();
  const stubServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'stub' }));
  });
  await new Promise((r) => stubServer.listen(stubPort, r));

  const prev = setEnv({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  delete require.cache[require.resolve('../src/index.js')];
  const mod = require('../src/index.js');
  mod.SUB_SERVICES.incidents.port = stubPort;
  const app = mod.createApp();
  const server = await new Promise((resolve, reject) => { const s = app.listen(port, () => resolve(s)); s.once('error', reject); });

  const r = await request(port, 'GET', '/services/health', null, 'tok');
  assert.strictEqual(r.body.results.incidents.ok, true);

  await new Promise((r) => server.close(r));
  await new Promise((r) => stubServer.close(r));
  delete require.cache[require.resolve('../src/index.js')];
  restoreEnv(prev);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Dashboard endpoint', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/dashboard', null, 'tok');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.sections.includes('active_incidents'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Pin and unpin', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const p = await request(port, 'POST', '/pinned', { item_type: 'incident', item_id: 'inc_123', label: 'DB outage' }, tok);
  assert.strictEqual(p.status, 201);
  const l = await request(port, 'GET', '/pinned', null, tok);
  assert.strictEqual(l.body.count, 1);
  const d = await request(port, 'DELETE', '/pinned/incident/inc_123', null, tok);
  assert.strictEqual(d.status, 200);
  const l2 = await request(port, 'GET', '/pinned', null, tok);
  assert.strictEqual(l2.body.count, 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Pin validation', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/pinned', {}, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Proxy GET forwards to stub', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const stubPort = uniquePort();
  const stubServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stub: true, path: req.url }));
  });
  await new Promise((r) => stubServer.listen(stubPort, r));
  const prev = setEnv({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  delete require.cache[require.resolve('../src/index.js')];
  const mod = require('../src/index.js');
  mod.SUB_SERVICES.incidents.port = stubPort;
  const app = mod.createApp();
  const server = await new Promise((resolve, reject) => { const s = app.listen(port, () => resolve(s)); s.once('error', reject); });

  const r = await request(port, 'GET', '/incidents', null, 'tok');
  assert.strictEqual(r.body.stub, true);

  await new Promise((r) => server.close(r));
  await new Promise((r) => stubServer.close(r));
  delete require.cache[require.resolve('../src/index.js')];
  restoreEnv(prev);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Proxy returns 502 when upstream down', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const prev = setEnv({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  delete require.cache[require.resolve('../src/index.js')];
  const mod = require('../src/index.js');
  mod.SUB_SERVICES.incidents.port = 1;
  const app = mod.createApp();
  const server = await new Promise((resolve, reject) => { const s = app.listen(port, () => resolve(s)); s.once('error', reject); });

  const r = await request(port, 'GET', '/incidents', null, 'tok');
  assert.strictEqual(r.status, 502);

  await new Promise((r) => server.close(r));
  delete require.cache[require.resolve('../src/index.js')];
  restoreEnv(prev);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Proxy POST forwards body', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const stubPort = uniquePort();
  let received = null;
  const stubServer = http.createServer((req, res) => {
    let chunks = '';
    req.on('data', (c) => chunks += c);
    req.on('end', () => {
      received = chunks;
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });
  await new Promise((r) => stubServer.listen(stubPort, r));
  const prev = setEnv({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  delete require.cache[require.resolve('../src/index.js')];
  const mod = require('../src/index.js');
  mod.SUB_SERVICES.incidents.port = stubPort;
  const app = mod.createApp();
  const server = await new Promise((resolve, reject) => { const s = app.listen(port, () => resolve(s)); s.once('error', reject); });

  const r = await request(port, 'POST', '/incidents', { title: 'X' }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(received, JSON.stringify({ title: 'X' }));

  await new Promise((r) => server.close(r));
  await new Promise((r) => stubServer.close(r));
  delete require.cache[require.resolve('../src/index.js')];
  restoreEnv(prev);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: pinned survives restart', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port1, 'POST', '/pinned', { item_type: 'incident', item_id: 'inc_X' }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const l = await request(port2, 'GET', '/pinned', null, 'tok');
  assert.strictEqual(l.body.count, 1);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Unknown route returns 404', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/unknown', null, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});