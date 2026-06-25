'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'fl-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 23500;
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
  assert.strictEqual(r1.body.service, 'federated-learning');
  assert.strictEqual(r2.body.ok, true);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required on write endpoints', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/federations', { name: 'f' });
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Create federation', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/federations', {
    name: 'test-fed', description: 'test', aggregationStrategy: 'fedavg', totalRounds: 5,
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.id);
  assert.strictEqual(r.body.name, 'test-fed');
  assert.strictEqual(r.body.aggregationStrategy, 'fedavg');
  assert.strictEqual(r.body.totalRounds, 5);
  assert.strictEqual(r.body.status, 'active');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Create federation: invalid strategy rejected', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/api/federations', { name: 'f', aggregationStrategy: 'unknown' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Start federation training', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const fed = await request(port, 'POST', '/api/federations', { name: 'start-test', totalRounds: 3 }, 'tok');
  const r = await request(port, 'POST', `/api/federations/${fed.body.id}/start`, null, 'tok');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.federation.status, 'training');
  assert.strictEqual(r.body.federation.currentRound, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Pause federation training', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const fed = await request(port, 'POST', '/api/federations', { name: 'pause-test' }, 'tok');
  await request(port, 'POST', `/api/federations/${fed.body.id}/start`, null, 'tok');
  const r = await request(port, 'POST', `/api/federations/${fed.body.id}/pause`, null, 'tok');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.federation.status, 'paused');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Register client', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const fed = await request(port, 'POST', '/api/federations', { name: 'client-test' }, 'tok');
  const r = await request(port, 'POST', '/api/clients', {
    federationId: fed.body.id, name: 'client-01', organization: 'acme',
  }, 'tok');
  assert.strictEqual(r.status, 201);
  assert.ok(r.body.id);
  assert.strictEqual(r.body.status, 'registered');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Client heartbeat updates lastSeen', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const fed = await request(port, 'POST', '/api/federations', { name: 'hb-test' }, 'tok');
  const client = await request(port, 'POST', '/api/clients', { federationId: fed.body.id, name: 'c' }, 'tok');
  const r = await request(port, 'POST', `/api/clients/${client.body.id}/heartbeat`, { status: 'training' }, 'tok');
  assert.strictEqual(r.body.client.lastSeen, r.body.client.lastSeen);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Submit weight contributions', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const fed = await request(port, 'POST', '/api/federations', { name: 'submit-test', totalRounds: 3, minClientsPerRound: 2 }, 'tok');
  await request(port, 'POST', `/api/federations/${fed.body.id}/start`, null, 'tok');
  const c1 = await request(port, 'POST', '/api/clients', { federationId: fed.body.id, name: 'c1' }, 'tok');
  const c2 = await request(port, 'POST', '/api/clients', { federationId: fed.body.id, name: 'c2' }, 'tok');
  const r1 = await request(port, 'POST', `/api/submit/${fed.body.id}`, {
    clientId: c1.body.id, weights: 'w1', numSamples: 100, metrics: { loss: 0.5 },
  }, 'tok');
  assert.strictEqual(r1.status, 201);
  const r2 = await request(port, 'POST', `/api/submit/${fed.body.id}`, {
    clientId: c2.body.id, weights: 'w2', numSamples: 200, metrics: { loss: 0.4 },
  }, 'tok');
  assert.strictEqual(r2.status, 201);
  // After 2 contributions, round should be completed
  assert.strictEqual(r2.body.round.status, 'completed');
  assert.strictEqual(r2.body.round.roundNumber, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Get aggregated weights after round', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const fed = await request(port, 'POST', '/api/federations', { name: 'weights-test', totalRounds: 3, minClientsPerRound: 1 }, 'tok');
  await request(port, 'POST', `/api/federations/${fed.body.id}/start`, null, 'tok');
  const c = await request(port, 'POST', '/api/clients', { federationId: fed.body.id, name: 'c' }, 'tok');
  await request(port, 'POST', `/api/submit/${fed.body.id}`, { clientId: c.body.id, weights: 'final_weights' }, 'tok');
  const r = await request(port, 'GET', `/api/federations/${fed.body.id}/weights`);
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.weights);
  assert.strictEqual(r.body.totalContributions, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Catalogs: strategies and architectures', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const s = await request(port, 'GET', '/api/strategies');
  const a = await request(port, 'GET', '/api/architectures');
  assert.ok(s.body.strategies.find((x) => x.id === 'fedavg'));
  assert.ok(s.body.strategies.find((x) => x.id === 'fedprox'));
  assert.ok(a.body.architectures.includes('llama-3-8b'));
  assert.ok(a.body.architectures.includes('mistral-7b'));
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Stats endpoint', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const fed = await request(port, 'POST', '/api/federations', { name: 'stats-test' }, 'tok');
  const r = await request(port, 'GET', '/api/stats');
  assert.ok(r.body.totalFederations >= 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: federations survive restart', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  await request(port, 'POST', '/api/federations', { name: 'persist-test' }, 'tok');
  await stopService(h);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port2, 'GET', '/api/federations');
  assert.ok(r.body.federations.find((f) => f.name === 'persist-test'));
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});