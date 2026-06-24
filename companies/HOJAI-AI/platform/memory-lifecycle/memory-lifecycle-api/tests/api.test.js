'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'memory-lifecycle-api-'));
}

function setEnv(obj) {
  const prev = {};
  for (const k of Object.keys(obj)) {
    prev[k] = process.env[k];
    process.env[k] = obj[k];
  }
  return prev;
}

function restoreEnv(prev) {
  for (const k of Object.keys(prev)) {
    if (prev[k] === undefined) delete process.env[k];
    else process.env[k] = prev[k];
  }
}

let portCounter = 55000;
function uniquePort() {
  const net = require('node:net');
  for (let attempt = 0; attempt < 50; attempt++) {
    portCounter += 1 + Math.floor(Math.random() * 50);
    // Verify port is not in use (cheap check: try listen on 0)
    // Skip; just return. If clash, retry.
    return portCounter;
  }
  return ++portCounter;
}

function startService(env) {
  return new Promise((resolve, reject) => {
    const prev = setEnv(env);
    delete require.cache[require.resolve('../src/index.js')];
    const mod = require('../src/index.js');
    const app = mod.createApp();
    const server = app.listen(parseInt(env.PORT, 10), () => {
      resolve({ mod, server, port: parseInt(env.PORT, 10), prev });
    });
    server.once('error', (e) => { restoreEnv(prev); reject(e); });
  });
}

function stopService(handle) {
  return new Promise((resolve) => {
    handle.server.close(() => {
      delete require.cache[require.resolve('../src/index.js')];
      restoreEnv(handle.prev);
      resolve();
    });
  });
}

function request(port, method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port, method, path: p,
      headers: {
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
        ...(token ? { 'X-Internal-Token': token } : {}),
      },
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: chunks ? JSON.parse(chunks) : null }); }
        catch (e) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('Health and ready endpoints', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const h = await request(port, 'GET', '/health');
  assert.strictEqual(h.status, 200);
  assert.strictEqual(h.body.ok, true);
  assert.strictEqual(h.body.service, 'memory-lifecycle-api');
  const r = await request(port, 'GET', '/ready');
  assert.strictEqual(r.status, 200);
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth: requires X-Internal-Token', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/policies');
  assert.strictEqual(r.status, 401);
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Policy CRUD: create, list, get, update, delete', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';

  // Create
  const c = await request(port, 'POST', '/policies', {
    name: 'GDPR-30day', action: 'purge', retention_days: 30, memory_types: ['user_profile', 'session']
  }, tok);
  assert.strictEqual(c.status, 201);
  assert.ok(c.body.id.startsWith('pol_'));
  const pid = c.body.id;

  // List
  const l = await request(port, 'GET', '/policies', null, tok);
  assert.strictEqual(l.status, 200);
  assert.strictEqual(l.body.count, 1);

  // Get
  const g = await request(port, 'GET', `/policies/${pid}`, null, tok);
  assert.strictEqual(g.status, 200);
  assert.strictEqual(g.body.name, 'GDPR-30day');

  // Update
  const u = await request(port, 'PUT', `/policies/${pid}`, { retention_days: 60 }, tok);
  assert.strictEqual(u.status, 200);
  assert.strictEqual(u.body.retention_days, 60);

  // Delete
  const d = await request(port, 'DELETE', `/policies/${pid}`, null, tok);
  assert.strictEqual(d.status, 200);
  const g2 = await request(port, 'GET', `/policies/${pid}`, null, tok);
  assert.strictEqual(g2.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Policy validation: rejects invalid action', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/policies', { name: 'X', action: 'INVALID' }, 'tok');
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.body.error, 'validation');
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Policy validation: requires name', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/policies', { action: 'purge' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Policy validation: retention_days must be non-negative', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/policies', { name: 'X', action: 'purge', retention_days: -1 }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Policy filter by status and action', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/policies', { name: 'A', action: 'purge', status: 'active' }, tok);
  await request(port, 'POST', '/policies', { name: 'B', action: 'retain', status: 'paused' }, tok);
  await request(port, 'POST', '/policies', { name: 'C', action: 'purge', status: 'paused' }, tok);
  const r1 = await request(port, 'GET', '/policies?action=purge', null, tok);
  assert.strictEqual(r1.body.count, 2);
  const r2 = await request(port, 'GET', '/policies?status=paused', null, tok);
  assert.strictEqual(r2.body.count, 2);
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Bindings: bind policy to memory type', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';

  const c = await request(port, 'POST', '/policies', { name: 'P', action: 'purge' }, tok);
  const pid = c.body.id;

  const b = await request(port, 'POST', '/bindings', { memory_type: 'user_profile', policy_id: pid }, tok);
  assert.strictEqual(b.status, 201);
  const bid = b.body.id;

  const l = await request(port, 'GET', '/bindings', null, tok);
  assert.strictEqual(l.body.count, 1);

  const d = await request(port, 'DELETE', `/bindings/${bid}`, null, tok);
  assert.strictEqual(d.status, 200);

  const l2 = await request(port, 'GET', '/bindings', null, tok);
  assert.strictEqual(l2.body.count, 0);
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Bindings: rejects unknown policy_id', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/bindings', { memory_type: 'X', policy_id: 'pol_unknown' }, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Delete policy nulls binding references', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';

  const c = await request(port, 'POST', '/policies', { name: 'P', action: 'purge' }, tok);
  const b = await request(port, 'POST', '/bindings', { memory_type: 'X', policy_id: c.body.id }, tok);
  await request(port, 'DELETE', `/policies/${c.body.id}`, null, tok);
  const lb = await request(port, 'GET', '/bindings', null, tok);
  assert.strictEqual(lb.body.bindings[0].policy_id, null);
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Service catalog endpoint', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/services', null, 'tok');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.services.governance);
  assert.strictEqual(r.body.services.governance.port, 5326);
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Health aggregation: returns ok=false when no services running', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/services/health', null, 'tok');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.results.governance.ok, false);
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Proxy: forwards GET to governance sub-service', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const stubPort = uniquePort();
  // Start a stub upstream on a high port for this test
  const stubServer = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ stub: true, path: req.url }));
  });
  await new Promise((r) => stubServer.listen(stubPort, r));

  // Patch SUB_SERVICES for this run to point at our stub
  const prev = setEnv({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  delete require.cache[require.resolve('../src/index.js')];
  const mod = require('../src/index.js');
  mod.SUB_SERVICES.governance.port = stubPort;
  const app = mod.createApp();
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(port, () => resolve(s));
    s.once('error', reject);
  });

  const r = await request(port, 'GET', '/governance/policies', null, 'tok');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.stub, true);
  assert.strictEqual(r.body.path, '/governance/policies');

  await new Promise((rr) => server.close(rr));
  await new Promise((rr) => stubServer.close(rr));
  delete require.cache[require.resolve('../src/index.js')];
  restoreEnv(prev);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Proxy: returns 502 when upstream not reachable', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  // Use a guaranteed-unbound port for stub expectation: 1 (privileged & unbound)
  // We point the gateway at port 1 (will fail connect) for this test
  const prev = setEnv({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  delete require.cache[require.resolve('../src/index.js')];
  const mod = require('../src/index.js');
  mod.SUB_SERVICES.governance.port = 1;  // always unbound
  const app = mod.createApp();
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(port, () => resolve(s));
    s.once('error', reject);
  });

  const r = await request(port, 'GET', '/governance/policies', null, 'tok');
  assert.strictEqual(r.status, 502);

  await new Promise((rr) => server.close(rr));
  delete require.cache[require.resolve('../src/index.js')];
  restoreEnv(prev);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Proxy: POST forwards body', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const stubPort = uniquePort();
  let received = null;
  const stubServer = http.createServer((req, res) => {
    let chunks = '';
    req.on('data', (c) => chunks += c);
    req.on('end', () => {
      received = chunks;
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, got: chunks }));
    });
  });
  await new Promise((r) => stubServer.listen(stubPort, r));

  const prev = setEnv({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  delete require.cache[require.resolve('../src/index.js')];
  const mod = require('../src/index.js');
  mod.SUB_SERVICES.governance.port = stubPort;
  const app = mod.createApp();
  const server = await new Promise((resolve, reject) => {
    const s = app.listen(port, () => resolve(s));
    s.once('error', reject);
  });

  const r = await request(port, 'POST', '/governance/policies', { name: 'X' }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(received, JSON.stringify({ name: 'X' }));

  await new Promise((rr) => server.close(rr));
  await new Promise((rr) => stubServer.close(rr));
  delete require.cache[require.resolve('../src/index.js')];
  restoreEnv(prev);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: data survives restart', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port1, 'POST', '/policies', { name: 'P', action: 'purge' }, 'tok');
  await stopService(h1);

  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/policies/${c.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  assert.strictEqual(g.body.name, 'P');
  await stopService(h2);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Unknown route returns 404', async () => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/no-such-thing', null, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});