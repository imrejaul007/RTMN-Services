'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'runbook-engine-')); }
function setEnv(obj) { const prev = {}; for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; } return prev; }
function restoreEnv(prev) { for (const k of Object.keys(prev)) { if (prev[k] === undefined) delete process.env[k]; else process.env[k] = prev[k]; } }
let portCounter = 13000;
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
  assert.strictEqual(r.body.service, 'runbook-engine');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth required', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'GET', '/runbooks');
  assert.strictEqual(r.status, 401);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Runbook CRUD', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/runbooks', {
    name: 'Restart API',
    description: 'Restart API on prod',
    tags: ['prod', 'api'],
    parameters: [{ name: 'service', required: true }],
    steps: [{ type: 'command', name: 'restart', command: 'systemctl restart {{service}}' }],
  }, tok);
  assert.strictEqual(c.status, 201);
  const rid = c.body.id;
  const g = await request(port, 'GET', `/runbooks/${rid}`, null, tok);
  assert.strictEqual(g.body.name, 'Restart API');
  const u = await request(port, 'PUT', `/runbooks/${rid}`, { description: 'Updated' }, tok);
  assert.strictEqual(u.body.description, 'Updated');
  // Updating only description doesn't bump version; updating steps does
  const u2 = await request(port, 'PUT', `/runbooks/${rid}`, { steps: [{ type: 'note', content: 'hi' }] }, tok);
  assert.strictEqual(u2.body.version, 2);
  const d = await request(port, 'DELETE', `/runbooks/${rid}`, null, tok);
  assert.strictEqual(d.status, 200);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Runbook validation: missing name', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/runbooks', { steps: [{ type: 'note', content: 'x' }] }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Runbook validation: bad step type', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/runbooks', { name: 'X', steps: [{ type: 'BAD' }] }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Runbook validation: command step requires command', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/runbooks', { name: 'X', steps: [{ type: 'command' }] }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Runbook validation: http step requires url', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/runbooks', { name: 'X', steps: [{ type: 'http' }] }, 'tok');
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter runbooks by tag', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  await request(port, 'POST', '/runbooks', { name: 'A', tags: ['prod'], steps: [{ type: 'note', content: 'x' }] }, tok);
  await request(port, 'POST', '/runbooks', { name: 'B', tags: ['dev'], steps: [{ type: 'note', content: 'x' }] }, tok);
  const r = await request(port, 'GET', '/runbooks?tag=prod', null, tok);
  assert.strictEqual(r.body.count, 1);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Execute: requires missing required params', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/runbooks', {
    name: 'X',
    parameters: [{ name: 'service', required: true }],
    steps: [{ type: 'note', content: 'hi' }],
  }, tok);
  const r = await request(port, 'POST', `/runbooks/${c.body.id}/execute`, {}, tok);
  assert.strictEqual(r.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Execute: runs successfully', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/runbooks', {
    name: 'Restart API',
    parameters: [{ name: 'service', required: true }],
    steps: [
      { type: 'note', content: 'Starting {{service}}' },
      { type: 'command', command: 'echo restart' },
    ],
  }, tok);
  const r = await request(port, 'POST', `/runbooks/${c.body.id}/execute`, { parameters: { service: 'api' } }, tok);
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.body.status, 'running');
  assert.strictEqual(r.body.parameters.service, 'api');
  assert.strictEqual(r.body.step_results[0].status, 'completed');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Execute: 404 unknown runbook', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const r = await request(port, 'POST', '/runbooks/rbk_unknown/execute', {}, 'tok');
  assert.strictEqual(r.status, 404);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Execution: abort', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/runbooks', { name: 'X', steps: [{ type: 'note', content: 'a' }] }, tok);
  const e = await request(port, 'POST', `/runbooks/${c.body.id}/execute`, {}, tok);
  const a = await request(port, 'POST', `/executions/${e.body.id}/abort`, {}, tok);
  assert.strictEqual(a.body.status, 'aborted');
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Execution: cannot abort twice', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/runbooks', { name: 'X', steps: [{ type: 'note', content: 'a' }] }, tok);
  const e = await request(port, 'POST', `/runbooks/${c.body.id}/execute`, {}, tok);
  await request(port, 'POST', `/executions/${e.body.id}/abort`, {}, tok);
  const a2 = await request(port, 'POST', `/executions/${e.body.id}/abort`, {}, tok);
  assert.strictEqual(a2.status, 400);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Filter executions by runbook_id', async () => {
  const tmp = makeTmpDir(); const port = uniquePort();
  const h = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const tok = 'tok';
  const c = await request(port, 'POST', '/runbooks', { name: 'X', steps: [{ type: 'note', content: 'a' }] }, tok);
  await request(port, 'POST', `/runbooks/${c.body.id}/execute`, {}, tok);
  await request(port, 'POST', `/runbooks/${c.body.id}/execute`, {}, tok);
  const r = await request(port, 'GET', `/executions?runbook_id=${c.body.id}`, null, tok);
  assert.strictEqual(r.body.count, 2);
  await stopService(h); fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence', async () => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const c = await request(port1, 'POST', '/runbooks', { name: 'P', steps: [{ type: 'note', content: 'x' }] }, 'tok');
  await stopService(h1);
  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tok' });
  const g = await request(port2, 'GET', `/runbooks/${c.body.id}`, null, 'tok');
  assert.strictEqual(g.status, 200);
  await stopService(h2); fs.rmSync(tmp, { recursive: true, force: true });
});