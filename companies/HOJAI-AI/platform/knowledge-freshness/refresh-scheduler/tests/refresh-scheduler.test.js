'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'refresh-scheduler-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 20000;
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

test('Health & ready', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/health');
  assert.strictEqual(r.body.service, 'refresh-scheduler');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/schedules');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Schedule CRUD: periodic', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/schedules', {
    name: 'Hourly doc refresh', target: 'doc_1', trigger: 'periodic', interval_seconds: 3600,
  }, tok);
  assert.strictEqual(c.status, 201);
  assert.ok(c.body.next_run_at);
  const sid = c.body.id;
  const g = await request(port, 'GET', `/schedules/${sid}`, null, tok);
  assert.strictEqual(g.body.name, 'Hourly doc refresh');
  const u = await request(port, 'PUT', `/schedules/${sid}`, { interval_seconds: 7200 }, tok);
  assert.strictEqual(u.body.interval_seconds, 7200);
  const d = await request(port, 'DELETE', `/schedules/${sid}`, null, tok);
  assert.strictEqual(d.status, 200);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Schedule: on_demand has no next_run_at', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/schedules', {
    name: 'On demand', target: 'doc_2', trigger: 'on_demand',
  }, 'tok');
  assert.strictEqual(r.body.next_run_at, null);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Schedule validation: bad trigger', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/schedules', { name: 'X', target: 't', trigger: 'BAD' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Schedule validation: periodic requires interval', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/schedules', { name: 'X', target: 't', trigger: 'periodic' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Trigger: creates run and updates schedule', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/schedules', {
    name: 'X', target: 'doc_1', trigger: 'periodic', interval_seconds: 3600,
  }, tok);
  const t = await request(port, 'POST', `/schedules/${c.body.id}/trigger`, { triggered_by: 'alice' }, tok);
  assert.strictEqual(t.body.run.status, 'completed');
  assert.strictEqual(t.body.run.triggered_by, 'alice');
  assert.ok(t.body.schedule.last_run_at);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Trigger: 404 unknown schedule', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/schedules/sch_unknown/trigger', {}, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Runs: filter by schedule_id', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/schedules', {
    name: 'X', target: 'd', trigger: 'periodic', interval_seconds: 60,
  }, tok);
  await request(port, 'POST', `/schedules/${c.body.id}/trigger`, {}, tok);
  await request(port, 'POST', `/schedules/${c.body.id}/trigger`, {}, tok);
  const r = await request(port, 'GET', `/runs?schedule_id=${c.body.id}`, null, tok);
  assert.strictEqual(r.body.count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Schedule: disable', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/schedules', {
    name: 'X', target: 'd', trigger: 'periodic', interval_seconds: 60,
  }, tok);
  const u = await request(port, 'PUT', `/schedules/${c.body.id}`, { enabled: false }, tok);
  assert.strictEqual(u.body.enabled, false);
  const r = await request(port, 'GET', '/schedules?enabled=false', null, tok);
  assert.strictEqual(r.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port1, 'POST', '/schedules', {
    name: 'P', target: 'd', trigger: 'periodic', interval_seconds: 60,
  }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/schedules/${c.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});