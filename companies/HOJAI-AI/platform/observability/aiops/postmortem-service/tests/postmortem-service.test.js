'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'postmortem-service-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 15000;
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
  assert.strictEqual(r.body.service, 'postmortem-service');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/postmortems');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Default template exists', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/templates/default', null, 'tok');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.sections.length >= 5);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Postmortem CRUD', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/postmortems', {
    title: 'DB outage 2024-01-15',
    incident_id: 'inc_1',
    summary: 'Database connection pool exhausted due to slow queries',
    timeline: [{ time: '14:00', event: 'Detected' }, { time: '14:15', event: 'Resolved' }],
  }, tok);
  assert.strictEqual(c.status, 201);
  const pid = c.body.id;
  const g = await request(port, 'GET', `/postmortems/${pid}`, null, tok);
  assert.strictEqual(g.body.title, 'DB outage 2024-01-15');
  const u = await request(port, 'PUT', `/postmortems/${pid}`, { root_cause: '5 whys: ...' }, tok);
  assert.strictEqual(u.body.root_cause, '5 whys: ...');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Postmortem validation', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r1 = await request(port, 'POST', '/postmortems', { incident_id: 'i', summary: 's' }, 'tok');
  assert.strictEqual(r1.status, 400);  // missing title
  const r2 = await request(port, 'POST', '/postmortems', { title: 't', summary: 's' }, 'tok');
  assert.strictEqual(r2.status, 400);  // missing incident_id
  const r3 = await request(port, 'POST', '/postmortems', { title: 't', incident_id: 'i' }, 'tok');
  assert.strictEqual(r3.status, 400);  // missing summary
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Postmortem: publish', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/postmortems', {
    title: 'X', incident_id: 'i', summary: 's',
  }, tok);
  const p = await request(port, 'POST', `/postmortems/${c.body.id}/publish`, { user_id: 'alice' }, tok);
  assert.strictEqual(p.body.status, 'published');
  assert.strictEqual(p.body.published_by, 'alice');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Postmortem: cannot update after publish', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/postmortems', {
    title: 'X', incident_id: 'i', summary: 's',
  }, tok);
  await request(port, 'POST', `/postmortems/${c.body.id}/publish`, {}, tok);
  const u = await request(port, 'PUT', `/postmortems/${c.body.id}`, { title: 'New' }, tok);
  assert.strictEqual(u.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Action items: CRUD', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const pm = await request(port, 'POST', '/postmortems', {
    title: 'X', incident_id: 'i', summary: 's',
  }, tok);
  const c = await request(port, 'POST', '/action-items', {
    postmortem_id: pm.body.id, description: 'Add circuit breaker', owner: 'alice', deadline: '2024-02-01',
  }, tok);
  assert.strictEqual(c.status, 201);
  const aid = c.body.id;
  const u = await request(port, 'PUT', `/action-items/${aid}`, { status: 'completed' }, tok);
  assert.strictEqual(u.body.status, 'completed');
  assert.ok(u.body.completed_at);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Action items: validation', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/action-items', { postmortem_id: 'p' }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Action items: 404 for unknown postmortem', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/action-items', {
    postmortem_id: 'pm_unknown', description: 'x', owner: 'y',
  }, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Action items: filter by postmortem_id', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const pm = await request(port, 'POST', '/postmortems', {
    title: 'X', incident_id: 'i', summary: 's',
  }, tok);
  await request(port, 'POST', '/action-items', { postmortem_id: pm.body.id, description: 'a', owner: 'x' }, tok);
  await request(port, 'POST', '/action-items', { postmortem_id: pm.body.id, description: 'b', owner: 'y' }, tok);
  const r = await request(port, 'GET', `/action-items?postmortem_id=${pm.body.id}`, null, tok);
  assert.strictEqual(r.body.count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Postmortem get includes action items', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const pm = await request(port, 'POST', '/postmortems', {
    title: 'X', incident_id: 'i', summary: 's',
  }, tok);
  await request(port, 'POST', '/action-items', { postmortem_id: pm.body.id, description: 'a', owner: 'x' }, tok);
  const g = await request(port, 'GET', `/postmortems/${pm.body.id}`, null, tok);
  assert.strictEqual(g.body.action_items.length, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Delete postmortem removes action items', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const pm = await request(port, 'POST', '/postmortems', {
    title: 'X', incident_id: 'i', summary: 's',
  }, tok);
  await request(port, 'POST', '/action-items', { postmortem_id: pm.body.id, description: 'a', owner: 'x' }, tok);
  await request(port, 'DELETE', `/postmortems/${pm.body.id}`, null, tok);
  const r = await request(port, 'GET', `/action-items?postmortem_id=${pm.body.id}`, null, tok);
  assert.strictEqual(r.body.count, 0);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port1, 'POST', '/postmortems', {
    title: 'P', incident_id: 'i', summary: 's',
  }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/postmortems/${c.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});