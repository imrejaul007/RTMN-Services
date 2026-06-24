'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'studio-agent-')); }

function setEnv(obj) {
  const prev = {};
  for (const k of Object.keys(obj)) { prev[k] = process.env[k]; process.env[k] = obj[k]; }
  return prev;
}
function restoreEnv(prev) {
  for (const k of Object.keys(prev)) {
    if (prev[k] === undefined) delete process.env[k];
    else process.env[k] = prev[k];
  }
}

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
      headers: { 'Content-Type': 'application/json', ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}), ...(token ? { 'X-Internal-Token': token } : {}) }
    }, (res) => {
      let chunks = '';
      res.on('data', (c) => chunks += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(chunks) }); }
        catch (e) { resolve({ status: res.statusCode, body: chunks }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

let testCounter = 0;
function uniquePort() { testCounter += 1; return 27000 + (testCounter * 17) % 1000; }

function simpleAgent() {
  return {
    name: 'Support Agent',
    role: 'Customer support specialist',
    description: 'Helps customers',
    system_prompt: 'You are a helpful agent.',
    model: 'gpt-4',
    temperature: 0.5,
    max_tokens: 1024,
    project_id: 'p1',
    user_id: 'alice',
    tools: [{ name: 'web_search', type: 'web_search' }],
    skills: [{ name: 'empathy' }],
    memory: { type: 'long_term', partition: 'support', retention_days: 30 },
    guardrails: ['content_filter', 'pii_redaction'],
    tags: ['support', 'production']
  };
}

test('Capabilities: returns valid tool/memory/guardrail types', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const r = await request(port, 'GET', '/capabilities', null, 'tkn');
  assert.strictEqual(r.status, 200);
  assert.ok(r.body.tool_types.includes('function'));
  assert.ok(r.body.tool_types.includes('twin'));
  assert.ok(r.body.tool_types.includes('rag'));
  assert.ok(r.body.memory_types.includes('long_term'));
  assert.ok(r.body.guardrails.includes('content_filter'));

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('CRUD: create, read, update, delete agent with full config', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });
  const ag = simpleAgent();

  const c1 = await request(port, 'POST', '/agents', ag, 'tkn');
  assert.strictEqual(c1.status, 201);
  assert.ok(c1.body.id.startsWith('agt_'));
  assert.strictEqual(c1.body.status, 'draft');
  assert.strictEqual(c1.body.version, 1);
  assert.deepStrictEqual(c1.body.tools, ag.tools);
  assert.deepStrictEqual(c1.body.guardrails, ag.guardrails);
  const aid = c1.body.id;

  const r1 = await request(port, 'GET', `/agents/${aid}`, null, 'tkn');
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(r1.body.name, 'Support Agent');

  // Update
  const u1 = await request(port, 'PUT', `/agents/${aid}`, { name: 'Renamed', model: 'claude-opus-4' }, 'tkn');
  assert.strictEqual(u1.body.name, 'Renamed');
  assert.strictEqual(u1.body.model, 'claude-opus-4');
  assert.strictEqual(u1.body.version, 2);

  // Update with bad status
  const u2 = await request(port, 'PUT', `/agents/${aid}`, { status: 'banana' }, 'tkn');
  assert.strictEqual(u2.status, 400);

  // Delete
  const d1 = await request(port, 'DELETE', `/agents/${aid}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);
  const d2 = await request(port, 'DELETE', `/agents/${aid}`, null, 'tkn');
  assert.strictEqual(d2.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: rejects missing/invalid fields', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  // Missing name
  const e1 = await request(port, 'POST', '/agents', { role: 'X', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e1.status, 400);
  // Missing role
  const e2 = await request(port, 'POST', '/agents', { name: 'X', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e2.status, 400);
  // Missing project_id
  const e3 = await request(port, 'POST', '/agents', { name: 'X', role: 'Y', user_id: 'u' }, 'tkn');
  assert.strictEqual(e3.status, 400);
  // Missing user_id
  const e4 = await request(port, 'POST', '/agents', { name: 'X', role: 'Y', project_id: 'p' }, 'tkn');
  assert.strictEqual(e4.status, 400);
  // Empty name
  const e5 = await request(port, 'POST', '/agents', { name: '   ', role: 'X', project_id: 'p', user_id: 'u' }, 'tkn');
  assert.strictEqual(e5.status, 400);
  // Bad temperature
  const e6 = await request(port, 'POST', '/agents', { name: 'X', role: 'Y', project_id: 'p', user_id: 'u', temperature: 5 }, 'tkn');
  assert.strictEqual(e6.status, 400);
  // Bad max_tokens
  const e7 = await request(port, 'POST', '/agents', { name: 'X', role: 'Y', project_id: 'p', user_id: 'u', max_tokens: 0 }, 'tkn');
  assert.strictEqual(e7.status, 400);
  // Bad tool type
  const e8 = await request(port, 'POST', '/agents', { name: 'X', role: 'Y', project_id: 'p', user_id: 'u', tools: [{ name: 't', type: 'magic' }] }, 'tkn');
  assert.strictEqual(e8.status, 400);
  // Bad memory type
  const e9 = await request(port, 'POST', '/agents', { name: 'X', role: 'Y', project_id: 'p', user_id: 'u', memory: { type: 'cosmic' } }, 'tkn');
  assert.strictEqual(e9.status, 400);
  // Bad guardrail
  const e10 = await request(port, 'POST', '/agents', { name: 'X', role: 'Y', project_id: 'p', user_id: 'u', guardrails: ['banana'] }, 'tkn');
  assert.strictEqual(e10.status, 400);
  // tools not array
  const e11 = await request(port, 'POST', '/agents', { name: 'X', role: 'Y', project_id: 'p', user_id: 'u', tools: 'notarray' }, 'tkn');
  assert.strictEqual(e11.status, 400);
  // tool missing name
  const e12 = await request(port, 'POST', '/agents', { name: 'X', role: 'Y', project_id: 'p', user_id: 'u', tools: [{ type: 'function' }] }, 'tkn');
  assert.strictEqual(e12.status, 400);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Tools: add, conflict, remove from agent', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });
  const ag = simpleAgent();
  ag.tools = []; // start with no tools

  const c1 = await request(port, 'POST', '/agents', ag, 'tkn');
  const aid = c1.body.id;

  // Add tool
  const a1 = await request(port, 'POST', `/agents/${aid}/tools`, { name: 'web_search', type: 'web_search' }, 'tkn');
  assert.strictEqual(a1.status, 201);
  assert.strictEqual(a1.body.tools.length, 1);

  // Add tool with default type
  const a2 = await request(port, 'POST', `/agents/${aid}/tools`, { name: 'fn1' }, 'tkn');
  assert.strictEqual(a2.status, 201);
  assert.strictEqual(a2.body.tools[1].type, 'function');

  // Add conflict
  const a3 = await request(port, 'POST', `/agents/${aid}/tools`, { name: 'web_search', type: 'web_search' }, 'tkn');
  assert.strictEqual(a3.status, 409);

  // Bad type
  const a4 = await request(port, 'POST', `/agents/${aid}/tools`, { name: 'bad', type: 'magic' }, 'tkn');
  assert.strictEqual(a4.status, 400);

  // Missing name
  const a5 = await request(port, 'POST', `/agents/${aid}/tools`, { type: 'function' }, 'tkn');
  assert.strictEqual(a5.status, 400);

  // Remove tool
  const r1 = await request(port, 'DELETE', `/agents/${aid}/tools/web_search`, null, 'tkn');
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(r1.body.tools.length, 1);

  // Remove non-existent
  const r2 = await request(port, 'DELETE', `/agents/${aid}/tools/ghost`, null, 'tkn');
  assert.strictEqual(r2.status, 404);

  // Remove from non-existent agent
  const r3 = await request(port, 'DELETE', `/agents/agt_ghost/tools/x`, null, 'tkn');
  assert.strictEqual(r3.status, 404);

  // Add to non-existent agent
  const a6 = await request(port, 'POST', '/agents/agt_ghost/tools', { name: 'x' }, 'tkn');
  assert.strictEqual(a6.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Clone: creates a copy with new id and version 1', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const c1 = await request(port, 'POST', '/agents', simpleAgent(), 'tkn');
  const aid = c1.body.id;

  const c2 = await request(port, 'POST', `/agents/${aid}/clone`, { name: 'Cloned Agent' }, 'tkn');
  assert.strictEqual(c2.status, 201);
  assert.notStrictEqual(c2.body.id, aid);
  assert.strictEqual(c2.body.name, 'Cloned Agent');
  assert.strictEqual(c2.body.version, 1);
  assert.strictEqual(c2.body.cloned_from, aid);
  // Same config
  assert.deepStrictEqual(c2.body.tools, c1.body.tools);

  // Clone requires name
  const e1 = await request(port, 'POST', `/agents/${aid}/clone`, {}, 'tkn');
  assert.strictEqual(e1.status, 400);

  // Clone non-existent
  const e2 = await request(port, 'POST', '/agents/agt_ghost/clone', { name: 'X' }, 'tkn');
  assert.strictEqual(e2.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('List: filter by project_id, user_id, status, model', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const a1 = simpleAgent();
  a1.name = 'A1';
  a1.user_id = 'alice';
  const a2 = simpleAgent();
  a2.name = 'A2';
  a2.user_id = 'bob';
  a2.model = 'claude-opus-4';
  const a3 = simpleAgent();
  a3.name = 'A3';
  a3.user_id = 'alice';
  a3.project_id = 'p2';

  await request(port, 'POST', '/agents', a1, 'tkn');
  await request(port, 'POST', '/agents', a2, 'tkn');
  await request(port, 'POST', '/agents', a3, 'tkn');

  // By user
  const l1 = await request(port, 'GET', '/agents?user_id=alice', null, 'tkn');
  assert.strictEqual(l1.body.count, 2);
  // By project
  const l2 = await request(port, 'GET', '/agents?project_id=p1', null, 'tkn');
  assert.strictEqual(l2.body.count, 2);
  const l3 = await request(port, 'GET', '/agents?project_id=p2', null, 'tkn');
  assert.strictEqual(l3.body.count, 1);
  // By model
  const l4 = await request(port, 'GET', '/agents?model=claude-opus-4', null, 'tkn');
  assert.strictEqual(l4.body.count, 1);
  // By status
  const l5 = await request(port, 'GET', '/agents?status=draft', null, 'tkn');
  assert.strictEqual(l5.body.count, 3);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Auth: rejects without token; 404 on missing', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const a1 = await request(port, 'GET', '/agents', null, null);
  assert.strictEqual(a1.status, 401);
  const a2 = await request(port, 'GET', '/agents', null, 'wrong');
  assert.strictEqual(a2.status, 401);
  const a3 = await request(port, 'GET', '/agents', null, 'tkn');
  assert.strictEqual(a3.status, 200);

  const g1 = await request(port, 'GET', '/agents/agt_ghost', null, 'tkn');
  assert.strictEqual(g1.status, 404);

  const u1 = await request(port, 'PUT', '/agents/agt_ghost', { name: 'X' }, 'tkn');
  assert.strictEqual(u1.status, 404);

  // Health
  const h = await request(port, 'GET', '/health', null, null);
  assert.strictEqual(h.status, 200);
  assert.strictEqual(h.body.service, 'studio-agent');

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: agents survive restart', async (t) => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  await request(port1, 'POST', '/agents', simpleAgent(), 'tkn');
  await request(port1, 'POST', '/agents', simpleAgent(), 'tkn');

  await stopService(h1);

  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const l = await request(port2, 'GET', '/agents', null, 'tkn');
  assert.strictEqual(l.body.count, 2);

  await stopService(h2);
  fs.rmSync(tmp, { recursive: true, force: true });
});
