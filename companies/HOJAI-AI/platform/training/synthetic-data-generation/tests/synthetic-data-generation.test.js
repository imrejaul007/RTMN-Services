'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'sdg-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 22500;
function uniquePort() { portCounter += 1 + Math.floor(Math.random() * 200); if (portCounter > 60000) portCounter = 10000 + Math.floor(Math.random() * 100); return portCounter; }
function startService(env) {
  return new Promise((resolve, reject) => {
    const prev = setEnv(env);
    delete require.cache[require.resolve('../src/index.js')];
    const mod = require('../src/index.js');
    const app = mod.createApp();
    const server = app.listen(parseInt(env.PORT, 10), () => resolve({ server, port: parseInt(env.PORT, 10), prev }));
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
  const r1 = await request(port, 'GET', '/health');
  const r2 = await request(port, 'GET', '/ready');
  assert.strictEqual(r1.body.service, 'synthetic-data-generation');
  assert.strictEqual(r2.body.ok, true);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/generate', { domain: 'general', count: 5 });
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Generate from domain: returns rows', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/generate', { domain: 'customer_support', count: 10, name: 'test-gen' }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.rowCount, 10);
  assert.ok(typeof r.body.sampleRow.prompt === 'string');
  assert.ok(typeof r.body.sampleRow.completion === 'string');
  assert.strictEqual(r.body.domain, 'customer_support');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Generate from domain: all 5 domains work', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  for (const domain of ['customer_support', 'ecommerce', 'healthcare', 'finance', 'general']) {
    const r = await request(port, 'POST', '/api/generate', { domain, count: 3 }, 'tok');
    assert.strictEqual(r.status, 201, `${domain} should work`);
    assert.strictEqual(r.body.rowCount, 3);
  }
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Generate from schema: builds rows matching schema', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/generate', {
    count: 5,
    schema: { name: 'string', age: 'number', active: 'boolean', joined: 'date' },
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.rowCount, 5);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Generate from seedSet: uses seed prompts', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/generate', {
    count: 3,
    seedSet: [{ prompt: 'What is the capital of France?', completion: 'Paris.' }],
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.rowCount, 3);
  assert.strictEqual(r.body.sampleRow.prompt, 'What is the capital of France?');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Generate: count limits enforced', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r1 = await request(port, 'POST', '/api/generate', { domain: 'general', count: 0 }, 'tok');
  const r2 = await request(port, 'POST', '/api/generate', { domain: 'general', count: 10001 }, 'tok');
  assert.strictEqual(r1.status, 400);
  assert.strictEqual(r2.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Generate: invalid domain rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/generate', { domain: 'nonexistent-domain', count: 5 }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Dataset list and get', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port, 'POST', '/api/generate', { domain: 'general', count: 2, name: 'ds1' }, 'tok');
  await request(port, 'POST', '/api/generate', { domain: 'ecommerce', count: 3, name: 'ds2' }, 'tok');
  const list = await request(port, 'GET', '/api/datasets');
  assert.ok(list.body.datasets.length >= 2);
  const first = await request(port, 'GET', `/api/datasets/${list.body.datasets[0].id}`);
  assert.ok(first.body.dataset);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Dataset delete', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const gen = await request(port, 'POST', '/api/generate', { domain: 'general', count: 2 }, 'tok');
  const del = await request(port, 'DELETE', `/api/datasets/${gen.body.id}`, null, 'tok');
  assert.strictEqual(del.body.deleted, gen.body.id);
  const r = await request(port, 'GET', `/api/datasets/${gen.body.id}`);
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Domains catalog', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/domains');
  assert.ok(r.body.domains.includes('customer_support'));
  assert.ok(r.body.domains.includes('ecommerce'));
  assert.ok(r.body.domains.includes('healthcare'));
  assert.ok(r.body.domains.includes('finance'));
  assert.ok(r.body.domains.includes('general'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: datasets survive restart', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port, 'POST', '/api/generate', { domain: 'finance', count: 5, name: 'persist-test' }, 'tok');
  await stopService(h);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port2, 'GET', '/api/datasets');
  assert.ok(r.body.datasets.find((d) => d.name === 'persist-test'));
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});