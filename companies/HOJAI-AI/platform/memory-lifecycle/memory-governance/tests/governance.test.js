'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'memory-governance-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }

let portCounter = 56000;
function uniquePort() { portCounter += 1 + Math.floor(Math.random() * 50); return portCounter; }

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
function stopService(handle) {
  return new Promise((resolve) => {
    handle.server.close(() => { delete require.cache[require.resolve('../src/index.js')]; restoreEnv(handle.prev); resolve(); });
  });
}
function request(port, method, p, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: '127.0.0.1', port, method, path: p,
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...(token ? { 'X-Internal-Token': token } : {}) },
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => { try { resolve({ status: res.statusCode, body: chunks ? JSON.parse(chunks) : null }); } catch (e) { resolve({ status: res.statusCode, body: chunks }); } });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('Health & ready', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r1 = await request(port, 'GET', '/health');
  assert.strictEqual(r1.body.service, 'memory-governance');
  const r2 = await request(port, 'GET', '/ready');
  assert.strictEqual(r2.status, 200);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth: requires X-Internal-Token', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/consents');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Consent CRUD: create, list, get', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/consents', {
    subject_id: 'user_1', memory_type: 'profile', lawful_basis: 'consent', purpose: 'personalization'
  }, tok);
  assert.strictEqual(c.status, 201);
  const cid = c.body.id;
  const g = await request(port, 'GET', `/consents/${cid}`, null, tok);
  assert.strictEqual(g.body.subject_id, 'user_1');
  const l = await request(port, 'GET', '/consents', null, tok);
  assert.strictEqual(l.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Consent validation: rejects bad lawful_basis', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/consents', { subject_id: 'x', memory_type: 'y', lawful_basis: 'INVALID', purpose: 'z' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Consent: replaces existing for same subject+type', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/consents', { subject_id: 'u1', memory_type: 'profile', lawful_basis: 'consent', purpose: 'marketing' }, tok);
  const r2 = await request(port, 'POST', '/consents', { subject_id: 'u1', memory_type: 'profile', lawful_basis: 'contract', purpose: 'service' }, tok);
  assert.strictEqual(r2.status, 200);  // Update path
  const l = await request(port, 'GET', '/consents', null, tok);
  assert.strictEqual(l.body.count, 1);
  assert.strictEqual(l.body.consents[0].lawful_basis, 'contract');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Withdraw consent', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/consents', { subject_id: 'u1', memory_type: 'profile', lawful_basis: 'consent', purpose: 'p' }, tok);
  const w = await request(port, 'POST', `/consents/${c.body.id}/withdraw`, { reason: 'user_request' }, tok);
  assert.strictEqual(w.status, 200);
  assert.strictEqual(w.body.status, 'withdrawn');
  assert.strictEqual(w.body.withdrawal_reason, 'user_request');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Withdraw: 404 for unknown id', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/consents/cns_unknown/withdraw', {}, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter by subject_id and memory_type', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/consents', { subject_id: 'a', memory_type: 'profile', lawful_basis: 'consent', purpose: 'p' }, tok);
  await request(port, 'POST', '/consents', { subject_id: 'a', memory_type: 'session', lawful_basis: 'consent', purpose: 'p' }, tok);
  await request(port, 'POST', '/consents', { subject_id: 'b', memory_type: 'profile', lawful_basis: 'consent', purpose: 'p' }, tok);
  const r1 = await request(port, 'GET', '/consents?subject_id=a', null, tok);
  assert.strictEqual(r1.body.count, 2);
  const r2 = await request(port, 'GET', '/consents?memory_type=profile', null, tok);
  assert.strictEqual(r2.body.count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Check: deny if no consent', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/check', { subject_id: 'u1', memory_type: 'profile', purpose: 'p' }, 'tok');
  assert.strictEqual(r.body.decision, 'deny');
  assert.strictEqual(r.body.reason, 'no_consent_record');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Check: allow when consent valid and purpose matches', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/consents', { subject_id: 'u1', memory_type: 'profile', lawful_basis: 'consent', purpose: 'marketing' }, tok);
  const r = await request(port, 'POST', '/check', { subject_id: 'u1', memory_type: 'profile', purpose: 'marketing' }, tok);
  assert.strictEqual(r.body.decision, 'allow');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Check: deny when consent withdrawn', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/consents', { subject_id: 'u1', memory_type: 'profile', lawful_basis: 'consent', purpose: 'marketing' }, tok);
  await request(port, 'POST', `/consents/${c.body.id}/withdraw`, {}, tok);
  const r = await request(port, 'POST', '/check', { subject_id: 'u1', memory_type: 'profile', purpose: 'marketing' }, tok);
  assert.strictEqual(r.body.decision, 'deny');
  assert.strictEqual(r.body.reason, 'consent_withdrawn');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Check: deny when consent expired by date', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/consents', {
    subject_id: 'u1', memory_type: 'profile', lawful_basis: 'consent', purpose: 'p',
    expires_at: '2020-01-01T00:00:00.000Z',
  }, tok);
  const r = await request(port, 'POST', '/check', { subject_id: 'u1', memory_type: 'profile', purpose: 'p' }, tok);
  assert.strictEqual(r.body.decision, 'deny');
  assert.strictEqual(r.body.reason, 'consent_expired_by_date');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Check: flag when purpose mismatch', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/consents', { subject_id: 'u1', memory_type: 'profile', lawful_basis: 'consent', purpose: 'marketing' }, tok);
  const r = await request(port, 'POST', '/check', { subject_id: 'u1', memory_type: 'profile', purpose: 'analytics' }, tok);
  assert.strictEqual(r.body.decision, 'flag');
  assert.strictEqual(r.body.reason, 'purpose_mismatch');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Decisions are recorded', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/check', { subject_id: 'u1', memory_type: 'profile', purpose: 'p' }, tok);
  await request(port, 'POST', '/check', { subject_id: 'u2', memory_type: 'profile', purpose: 'p' }, tok);
  const r = await request(port, 'GET', '/decisions', null, tok);
  assert.strictEqual(r.body.count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: survives restart', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port1, 'POST', '/consents', { subject_id: 'u1', memory_type: 'profile', lawful_basis: 'consent', purpose: 'p' }, 'tok');
  await stopService(h1);

  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/consents/${c.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});