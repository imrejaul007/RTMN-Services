'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'memory-gdpr-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 58000;
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
  const r = await request(port, 'GET', '/health');
  assert.strictEqual(r.body.service, 'memory-gdpr');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/requests');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Request validation: requires subject_id', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/requests', { request_type: 'forget' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Request validation: bad request_type', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/requests', { subject_id: 'u1', request_type: 'INVALID' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Request CRUD', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/requests', { subject_id: 'u1', request_type: 'forget' }, tok);
  assert.strictEqual(c.status, 201);
  assert.strictEqual(c.body.status, 'pending');
  const rid = c.body.id;
  const g = await request(port, 'GET', `/requests/${rid}`, null, tok);
  assert.strictEqual(g.body.subject_id, 'u1');
  const l = await request(port, 'GET', '/requests', null, tok);
  assert.strictEqual(l.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Subject: add records', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const r = await request(port, 'POST', '/subjects/u1/records', { records: [{ memory_type: 'profile', data: 'foo' }] }, tok);
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.record_count, 1);
  const g = await request(port, 'GET', '/subjects/u1', null, tok);
  assert.strictEqual(g.body.records.length, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Process: right to be forgotten', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/subjects/u1/records', { records: [{ memory_type: 'profile', data: 'secret1' }, { memory_type: 'profile', data: 'secret2' }] }, tok);
  const c = await request(port, 'POST', '/requests', { subject_id: 'u1', request_type: 'forget' }, tok);
  const p = await request(port, 'POST', `/requests/${c.body.id}/process`, {}, tok);
  assert.strictEqual(p.body.status, 'completed');
  assert.strictEqual(p.body.result.action, 'anonymized');
  assert.strictEqual(p.body.result.records_affected, 2);
  const sub = await request(port, 'GET', '/subjects/u1', null, tok);
  assert.strictEqual(sub.body.forgotten, true);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Process: forget with no records', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port, 'POST', '/requests', { subject_id: 'unknown', request_type: 'forget' }, 'tok');
  const p = await request(port, 'POST', `/requests/${c.body.id}/process`, {}, 'tok');
  assert.strictEqual(p.body.result.action, 'no_records_found');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Process: export (data portability)', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/subjects/u1/records', { records: [{ memory_type: 'profile', data: 'x' }] }, tok);
  const c = await request(port, 'POST', '/requests', { subject_id: 'u1', request_type: 'export' }, tok);
  const p = await request(port, 'POST', `/requests/${c.body.id}/process`, {}, tok);
  assert.strictEqual(p.body.result.action, 'exported');
  assert.strictEqual(p.body.result.data.records.length, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Process: access (SAR)', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/subjects/u1/records', { records: [{ data: 'foo' }, { data: 'bar' }] }, tok);
  const c = await request(port, 'POST', '/requests', { subject_id: 'u1', request_type: 'access' }, tok);
  const p = await request(port, 'POST', `/requests/${c.body.id}/process`, {}, tok);
  assert.strictEqual(p.body.result.action, 'access_provided');
  assert.strictEqual(p.body.result.record_count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Process: withdraw_consent', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port, 'POST', '/requests', { subject_id: 'u1', request_type: 'withdraw_consent' }, 'tok');
  const p = await request(port, 'POST', `/requests/${c.body.id}/process`, {}, 'tok');
  assert.strictEqual(p.body.status, 'completed');
  assert.strictEqual(p.body.result.action, 'consent_withdrawal_logged');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Process: rectify', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/subjects/u1/records', { records: [{ name: 'Old' }] }, tok);
  const sub = await request(port, 'GET', '/subjects/u1', null, tok);
  const rid = sub.body.records[0].id;
  const c = await request(port, 'POST', '/requests', { subject_id: 'u1', request_type: 'rectify' }, tok);
  const p = await request(port, 'POST', `/requests/${c.body.id}/process`, { corrections: { record_id: rid, fields: { name: 'New' } } }, tok);
  assert.strictEqual(p.body.status, 'completed');
  assert.strictEqual(p.body.result.records_updated, 1);
  const sub2 = await request(port, 'GET', '/subjects/u1', null, tok);
  assert.strictEqual(sub2.body.records[0].name, 'New');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Process: cannot process twice', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port, 'POST', '/requests', { subject_id: 'u1', request_type: 'export' }, 'tok');
  await request(port, 'POST', `/requests/${c.body.id}/process`, {}, 'tok');
  const p2 = await request(port, 'POST', `/requests/${c.body.id}/process`, {}, 'tok');
  assert.strictEqual(p2.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter requests by status', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c1 = await request(port, 'POST', '/requests', { subject_id: 'u1', request_type: 'export' }, tok);
  await request(port, 'POST', '/requests', { subject_id: 'u2', request_type: 'forget' }, tok);
  await request(port, 'POST', `/requests/${c1.body.id}/process`, {}, tok);
  const r = await request(port, 'GET', '/requests?status=completed', null, tok);
  assert.strictEqual(r.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port1, 'POST', '/requests', { subject_id: 'u1', request_type: 'export' }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/requests/${c.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});