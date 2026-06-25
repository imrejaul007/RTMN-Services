'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'mr-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 24000;
function uniquePort() { portCounter += 1 + Math.floor(Math.random() * 200); if (portCounter > 60000) portCounter = 10000 + Math.floor(Math.random() * 100); return portCounter; }
function startService(env) {
  return new Promise((resolve, reject) => {
    const prev = setEnv(env);
    // Bootstrap AFTER env vars are set so DATA_DIR() resolves to the right path.
    delete require.cache[require.resolve('../src/index.js')];
    const mod = require('../src/index.js');
    mod.bootstrap(); // seeds data if DATA_DIR is empty — synchronous, writes to disk before server starts
    const server = mod.createApp().listen(parseInt(env.PORT, 10), () => resolve({ server, port: parseInt(env.PORT, 10), prev }));
    server.once('error', (e) => { restoreEnv(prev); reject(e); });
  });
}
function stopService(handle) {
  return new Promise((resolve) => {
    handle.server.close(() => { restoreEnv(handle.prev); resolve(); });
  });
}
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
  assert.strictEqual(r1.body.status, 'healthy');
  assert.strictEqual(r1.body.service, 'model-registry');
  assert.strictEqual(r2.body.ready, true);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required on write endpoints', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/models', { displayName: 'm', owner: 'o', type: 'llm' });
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Seed data: 8 models present on first start', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/models');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.count >= 8);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Create model', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/models', { displayName: 'TestModel', owner: 'test-owner', type: 'llm', capabilities: ['chat'], tags: ['test'] }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.id);
  assert.strictEqual(r.body.slug, 'testmodel');
  assert.strictEqual(r.body.owner, 'test-owner');
  assert.strictEqual(r.body.status, 'stable');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Create model: missing fields rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/models', { displayName: 'No Owner' }, 'tok');
  assert.strictEqual(r.status, 400);
  assert.strictEqual(r.body.error, 'MISSING_FIELDS');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Get model by slug', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/models/gpt-4o');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.slug, 'gpt-4o');
  assert.ok(Array.isArray(r.body.versions));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Get model by id', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const list = await request(port, 'GET', '/api/models');
  const id = list.body.models[0].id;
  const r = await request(port, 'GET', `/api/models/${id}`);
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.id, id);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter models by type, owner, capability', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r1 = await request(port, 'GET', '/api/models?type=llm');
  assert.ok(r1.body.count >= 6);
  const r2 = await request(port, 'GET', '/api/models?owner=anthropic');
  assert.ok(r2.body.count >= 2);
  const r3 = await request(port, 'GET', '/api/models?capability=vision');
  assert.ok(r3.body.count >= 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Patch model', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const create = await request(port, 'POST', '/api/models', { displayName: 'PatchMe', owner: 'o', type: 'llm' }, 'tok');
  const r = await request(port, 'PATCH', `/api/models/${create.body.id}`, { status: 'beta', tags: ['patched'] }, 'tok');
  assert.strictEqual(r.body.status, 'beta');
  assert.deepStrictEqual(r.body.tags, ['patched']);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Delete model', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const create = await request(port, 'POST', '/api/models', { displayName: 'DeleteMe', owner: 'o', type: 'llm' }, 'tok');
  const r = await request(port, 'DELETE', `/api/models/${create.body.id}`, null, 'tok');
  assert.strictEqual(r.body.deleted, true);
  const gone = await request(port, 'GET', `/api/models/${create.body.id}`);
  assert.strictEqual(gone.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Add and get version', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const create = await request(port, 'POST', '/api/models', { displayName: 'VerTest', owner: 'o', type: 'llm' }, 'tok');
  const v = await request(port, 'POST', `/api/models/${create.body.id}/versions`, { version: 'v1.0.0', deployment: { provider: 'test', endpoint: 'http://test', replicas: 1, costPer1kInput: 0.001, costPer1kOutput: 0.002, avgLatencyMs: 100 }, performance: { accuracy: 0.9 }, safety: { guardrailsLevel: 'medium' } }, 'tok');
  assert.strictEqual(v.status, 201);
  assert.ok(v.body.id);
  assert.strictEqual(v.body.version, 'v1.0.0');
  const list = await request(port, 'GET', `/api/models/${create.body.id}/versions`);
  assert.strictEqual(list.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Duplicate version rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const create = await request(port, 'POST', '/api/models', { displayName: 'DupVer', owner: 'o', type: 'llm' }, 'tok');
  await request(port, 'POST', `/api/models/${create.body.id}/versions`, { version: 'dup', deployment: { provider: 't', replicas: 1 }, performance: {}, safety: {} }, 'tok');
  const r = await request(port, 'POST', `/api/models/${create.body.id}/versions`, { version: 'dup', deployment: { provider: 't', replicas: 1 }, performance: {}, safety: {} }, 'tok');
  assert.strictEqual(r.status, 409);
  assert.strictEqual(r.body.error, 'DUPLICATE_VERSION');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Deploy version', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const create = await request(port, 'POST', '/api/models', { displayName: 'DeployTest', owner: 'o', type: 'llm' }, 'tok');
  await request(port, 'POST', `/api/models/${create.body.id}/versions`, { version: 'v1', deployment: { provider: 't', replicas: 1, costPer1kInput: 0.01, costPer1kOutput: 0.01, avgLatencyMs: 100 }, performance: { accuracy: 0.5 }, safety: { guardrailsLevel: 'low' } }, 'tok');
  await request(port, 'POST', `/api/models/${create.body.id}/versions`, { version: 'v2', deployment: { provider: 't', replicas: 1, costPer1kInput: 0.01, costPer1kOutput: 0.01, avgLatencyMs: 100 }, performance: { accuracy: 0.9 }, safety: { guardrailsLevel: 'medium' } }, 'tok');
  const r = await request(port, 'POST', `/api/models/${create.body.id}/versions/v2/deploy`, null, 'tok');
  assert.strictEqual(r.body.deployed, true);
  assert.strictEqual(r.body.version, 'v2');
  assert.ok(r.body.demoted); // v1 was demoted
  const live = await request(port, 'GET', `/api/models/${create.body.id}/live`);
  assert.strictEqual(live.body.liveVersion.version, 'v2');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Get live version', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/models/claude-3-5-sonnet/live');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.liveVersion);
  assert.strictEqual(r.body.liveVersion.version, '20241022');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Search models', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/search?q=anthropic');
  assert.ok(r.body.count >= 2);
  assert.ok(r.body.results.every((m) => m.owner === 'anthropic'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Capability lookup', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/capabilities/vision');
  assert.ok(r.body.count >= 2);
  r.body.models.forEach((m) => assert.ok(m.capabilities.includes('vision')));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Recommend models by criteria', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/recommend', { requiredCapabilities: ['vision'], maxCost: 0.02, minContextWindow: 50000 }, 'tok');
  assert.ok(r.body.count >= 1);
  r.body.recommendations.forEach((m) => {
    assert.ok(m.capabilities.includes('vision'));
    assert.ok(m.contextWindow >= 50000);
  });
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Compare models', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/compare', { modelIds: ['gpt-4o', 'claude-3-haiku'] }, 'tok');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.count, 2);
  assert.ok(r.body.compared.every((m) => !m.error));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Stats endpoint', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/stats');
  assert.ok(r.body.totalModels >= 8);
  assert.ok(r.body.totalVersions >= 8);
  assert.ok(r.body.deployed >= 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Owners and types catalogs', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const o = await request(port, 'GET', '/api/owners');
  assert.ok(o.body.owners.includes('anthropic'));
  assert.ok(o.body.owners.includes('openai'));
  assert.ok(o.body.owners.includes('google'));
  const t = await request(port, 'GET', '/api/types');
  assert.ok(t.body.types.includes('llm'));
  assert.ok(t.body.types.includes('embedding'));
  assert.ok(t.body.types.includes('speech'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Base models catalog', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/api/catalog/base-models');
  assert.ok(r.body.count >= 8);
  r.body.models.forEach((m) => { assert.ok(m.id); assert.ok(m.slug); assert.ok(m.displayName); });
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: models survive restart', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port, 'POST', '/api/models', { displayName: 'PersistTest', owner: 'o', type: 'llm' }, 'tok');
  await stopService(h);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port2, 'GET', '/api/models');
  assert.ok(r.body.models.find((m) => m.displayName === 'PersistTest'));
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});
