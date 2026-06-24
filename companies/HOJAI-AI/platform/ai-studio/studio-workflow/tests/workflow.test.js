'use strict';

const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');

function makeTmpDir() { return fs.mkdtempSync(path.join(os.tmpdir(), 'studio-workflow-')); }

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
function uniquePort() { testCounter += 1; return 26000 + (testCounter * 13) % 1000; }

function simpleWorkflow() {
  return {
    name: 'Simple',
    project_id: 'p1',
    user_id: 'alice',
    nodes: [
      { id: 'start', type: 'llm', config: { model: 'gpt-4', prompt: 'Hello' } },
      { id: 'process', type: 'agent', config: { agent_id: 'a1' } },
      { id: 'output', type: 'output', config: {} }
    ],
    edges: [
      { source: 'start', target: 'process' },
      { source: 'process', target: 'output' }
    ]
  };
}

test('CRUD: create, read, update, delete workflow', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });
  const wf = simpleWorkflow();

  const c1 = await request(port, 'POST', '/workflows', wf, 'tkn');
  assert.strictEqual(c1.status, 201);
  assert.ok(c1.body.id.startsWith('wf_'));
  assert.strictEqual(c1.body.status, 'draft');
  assert.strictEqual(c1.body.version, 1);
  const wid = c1.body.id;

  const r1 = await request(port, 'GET', `/workflows/${wid}`, null, 'tkn');
  assert.strictEqual(r1.status, 200);
  assert.strictEqual(r1.body.name, 'Simple');

  // Update
  const u1 = await request(port, 'PUT', `/workflows/${wid}`, { name: 'Renamed' }, 'tkn');
  assert.strictEqual(u1.status, 200);
  assert.strictEqual(u1.body.name, 'Renamed');
  assert.strictEqual(u1.body.version, 2);

  // Update with invalid status
  const u2 = await request(port, 'PUT', `/workflows/${wid}`, { status: 'bad' }, 'tkn');
  assert.strictEqual(u2.status, 400);

  // List
  const l1 = await request(port, 'GET', '/workflows', null, 'tkn');
  assert.strictEqual(l1.body.count, 1);

  // Delete
  const d1 = await request(port, 'DELETE', `/workflows/${wid}`, null, 'tkn');
  assert.strictEqual(d1.status, 200);
  const d2 = await request(port, 'DELETE', `/workflows/${wid}`, null, 'tkn');
  assert.strictEqual(d2.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validation: rejects invalid nodes, edges, cycles', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  // Missing required fields
  const e1 = await request(port, 'POST', '/workflows', { nodes: [], edges: [] }, 'tkn');
  assert.strictEqual(e1.status, 400);
  const e2 = await request(port, 'POST', '/workflows', { name: 'X' }, 'tkn');
  assert.strictEqual(e2.status, 400);

  // Empty nodes
  const e3 = await request(port, 'POST', '/workflows', { name: 'X', project_id: 'p', user_id: 'u', nodes: [], edges: [] }, 'tkn');
  assert.strictEqual(e3.status, 400);

  // Duplicate node ids
  const dupNodes = simpleWorkflow();
  dupNodes.nodes = [{ id: 'a', type: 'llm' }, { id: 'a', type: 'output' }];
  dupNodes.edges = [];
  const e4 = await request(port, 'POST', '/workflows', dupNodes, 'tkn');
  assert.strictEqual(e4.status, 400);
  assert.match(e4.body.message, /duplicate/);

  // Invalid node type
  const badType = simpleWorkflow();
  badType.nodes[0].type = 'magic';
  const e5 = await request(port, 'POST', '/workflows', badType, 'tkn');
  assert.strictEqual(e5.status, 400);
  assert.match(e5.body.message, /invalid type/);

  // Edge referencing non-existent node
  const badEdge = simpleWorkflow();
  badEdge.edges.push({ source: 'start', target: 'ghost' });
  const e6 = await request(port, 'POST', '/workflows', badEdge, 'tkn');
  assert.strictEqual(e6.status, 400);
  assert.match(e6.body.message, /ghost/);

  // Self-loop
  const selfLoop = simpleWorkflow();
  selfLoop.nodes = [{ id: 'a', type: 'llm' }, { id: 'b', type: 'output' }];
  selfLoop.edges = [{ source: 'a', target: 'a' }, { source: 'a', target: 'b' }];
  const e7 = await request(port, 'POST', '/workflows', selfLoop, 'tkn');
  assert.strictEqual(e7.status, 400);

  // Cycle
  const cyc = simpleWorkflow();
  cyc.nodes = [
    { id: 'a', type: 'llm' },
    { id: 'b', type: 'agent' },
    { id: 'c', type: 'output' }
  ];
  cyc.edges = [
    { source: 'a', target: 'b' },
    { source: 'b', target: 'c' },
    { source: 'c', target: 'a' }
  ];
  const e8 = await request(port, 'POST', '/workflows', cyc, 'tkn');
  assert.strictEqual(e8.status, 400);
  assert.match(e8.body.message, /cycle/);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Validate endpoint: returns execution order without saving', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const wf = simpleWorkflow();
  const r = await request(port, 'POST', '/workflows/validate', wf, 'tkn');
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.body.valid, true);
  assert.deepStrictEqual(r.body.execution_order, ['start', 'process', 'output']);

  // Invalid: cycle
  const cyc = {
    name: 'C', project_id: 'p', user_id: 'u',
    nodes: [{ id: 'a', type: 'llm' }, { id: 'b', type: 'output' }],
    edges: [{ source: 'a', target: 'b' }, { source: 'b', target: 'a' }]
  };
  const r2 = await request(port, 'POST', '/workflows/validate', cyc, 'tkn');
  assert.strictEqual(r2.status, 400);

  // Order endpoint
  const c1 = await request(port, 'POST', '/workflows', wf, 'tkn');
  const o1 = await request(port, 'GET', `/workflows/${c1.body.id}/order`, null, 'tkn');
  assert.strictEqual(o1.status, 200);
  assert.deepStrictEqual(o1.body.order, ['start', 'process', 'output']);

  // Order of non-existent
  const o2 = await request(port, 'GET', '/workflows/wf_ghost/order', null, 'tkn');
  assert.strictEqual(o2.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Execute: requires active workflow; returns execution with order', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });
  const wf = simpleWorkflow();

  const c1 = await request(port, 'POST', '/workflows', wf, 'tkn');
  // Execute while draft
  const e1 = await request(port, 'POST', `/workflows/${c1.body.id}/execute`, { inputs: { x: 1 } }, 'tkn');
  assert.strictEqual(e1.status, 400);

  // Activate
  await request(port, 'PUT', `/workflows/${c1.body.id}`, { status: 'active' }, 'tkn');

  // Execute
  const e2 = await request(port, 'POST', `/workflows/${c1.body.id}/execute`, { inputs: { x: 1 }, user_id: 'alice' }, 'tkn');
  assert.strictEqual(e2.status, 201);
  assert.ok(e2.body.id.startsWith('exec_'));
  assert.strictEqual(e2.body.status, 'completed');
  assert.strictEqual(e2.body.workflow_id, c1.body.id);
  assert.deepStrictEqual(e2.body.execution_order, ['start', 'process', 'output']);
  assert.strictEqual(e2.body.start_node, 'start');
  assert.strictEqual(e2.body.output_node, 'output');
  assert.strictEqual(e2.body.node_results.length, 3);
  assert.ok(e2.body.duration_ms > 0);

  // Execute non-existent
  const e3 = await request(port, 'POST', '/workflows/wf_ghost/execute', {}, 'tkn');
  assert.strictEqual(e3.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Executions: list and get; filter by workflow/user/status', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const wf = simpleWorkflow();
  const c1 = await request(port, 'POST', '/workflows', wf, 'tkn');
  await request(port, 'PUT', `/workflows/${c1.body.id}`, { status: 'active' }, 'tkn');
  await request(port, 'POST', `/workflows/${c1.body.id}/execute`, { user_id: 'alice' }, 'tkn');
  await request(port, 'POST', `/workflows/${c1.body.id}/execute`, { user_id: 'bob' }, 'tkn');
  await request(port, 'POST', `/workflows/${c1.body.id}/execute`, { user_id: 'alice' }, 'tkn');

  // List
  const l1 = await request(port, 'GET', '/executions', null, 'tkn');
  assert.strictEqual(l1.body.count, 3);

  // Filter by workflow
  const l2 = await request(port, 'GET', `/executions?workflow_id=${c1.body.id}`, null, 'tkn');
  assert.strictEqual(l2.body.count, 3);

  // Filter by user
  const l3 = await request(port, 'GET', '/executions?user_id=alice', null, 'tkn');
  assert.strictEqual(l3.body.count, 2);

  // Filter by status
  const l4 = await request(port, 'GET', '/executions?status=completed', null, 'tkn');
  assert.strictEqual(l4.body.count, 3);

  // Get one
  const g1 = await request(port, 'GET', `/executions/${l1.body.executions[0].id}`, null, 'tkn');
  assert.strictEqual(g1.status, 200);

  // Get non-existent
  const g2 = await request(port, 'GET', '/executions/exec_ghost', null, 'tkn');
  assert.strictEqual(g2.status, 404);

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('List node types; filter workflows; auth', async (t) => {
  const tmp = makeTmpDir();
  const port = uniquePort();
  const handle = await startService({ PORT: String(port), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  // Node types
  const nt = await request(port, 'GET', '/node-types', null, 'tkn');
  assert.strictEqual(nt.status, 200);
  assert.ok(nt.body.types.includes('llm'));
  assert.ok(nt.body.types.includes('agent'));
  assert.ok(nt.body.types.includes('rag'));

  // Create 2 workflows
  const wf1 = simpleWorkflow();
  wf1.user_id = 'alice';
  const wf2 = simpleWorkflow();
  wf2.name = 'Second';
  wf2.user_id = 'bob';
  await request(port, 'POST', '/workflows', wf1, 'tkn');
  await request(port, 'POST', '/workflows', wf2, 'tkn');

  // Filter
  const l1 = await request(port, 'GET', '/workflows?user_id=alice', null, 'tkn');
  assert.strictEqual(l1.body.count, 1);
  const l2 = await request(port, 'GET', '/workflows?project_id=p1', null, 'tkn');
  assert.strictEqual(l2.body.count, 2);
  const l3 = await request(port, 'GET', '/workflows?status=draft', null, 'tkn');
  assert.strictEqual(l3.body.count, 2);

  // Auth
  const a1 = await request(port, 'GET', '/workflows', null, null);
  assert.strictEqual(a1.status, 401);
  const a2 = await request(port, 'GET', '/node-types', null, 'wrong');
  assert.strictEqual(a2.status, 401);

  // Health
  const h = await request(port, 'GET', '/health', null, null);
  assert.strictEqual(h.status, 200);
  assert.strictEqual(h.body.service, 'studio-workflow');

  await stopService(handle);
  fs.rmSync(tmp, { recursive: true, force: true });
});

test('Persistence: workflows + executions survive restart', async (t) => {
  const tmp = makeTmpDir();
  const port1 = uniquePort();
  const h1 = await startService({ PORT: String(port1), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const wf = simpleWorkflow();
  const c1 = await request(port1, 'POST', '/workflows', wf, 'tkn');
  await request(port1, 'PUT', `/workflows/${c1.body.id}`, { status: 'active' }, 'tkn');
  await request(port1, 'POST', `/workflows/${c1.body.id}/execute`, {}, 'tkn');

  await stopService(h1);

  const port2 = uniquePort();
  const h2 = await startService({ PORT: String(port2), DATA_DIR: tmp, INTERNAL_TOKEN: 'tkn' });

  const l1 = await request(port2, 'GET', '/workflows', null, 'tkn');
  assert.strictEqual(l1.body.count, 1);
  const l2 = await request(port2, 'GET', '/executions', null, 'tkn');
  assert.strictEqual(l2.body.count, 1);

  await stopService(h2);
  fs.rmSync(tmp, { recursive: true, force: true });
});
