/**
 * Phase 14.2 — Dependency Graph HTTP integration tests
 */
// IMPORTANT: set env BEFORE requiring the service so DATA_DIR is captured correctly.
const TEST_DATA_DIR = '/tmp/depgraph-test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
process.env.DEPENDENCY_GRAPH_DATA_DIR = TEST_DATA_DIR;

const { test } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');

const { app, graphs } = require('../../src/index');

function listen() {
  return new Promise((resolve) => {
    const server = app.listen(0, () => resolve(server));
  });
}

function request(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      hostname: '127.0.0.1',
      port,
      method,
      path,
      headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {},
    };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString();
        let parsed; try { parsed = JSON.parse(text); } catch { parsed = text; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('HTTP: /health -> healthy', async (t) => {
  // graphs is module-level shared state, so test cleanup matters
  const server = await listen();
  t.after(() => server.close());
  const r = await request(server, 'GET', '/api/health');
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'healthy');
  assert.equal(r.body.service, 'dependency-graph');
});

test('HTTP: POST /api/graphs creates a graph', async (t) => {
  const server = await listen();
  t.after(() => server.close());
  const r = await request(server, 'POST', '/api/graphs', {
    tasks: [
      { id: 'a', dependsOn: [] },
      { id: 'b', dependsOn: ['a'] },
    ],
  });
  assert.equal(r.status, 201);
  assert.equal(r.body.tasks.length, 2);
  assert.equal(r.body.tasks[0].status, 'pending');
});

test('HTTP: POST /api/graphs rejects invalid DAG', async (t) => {
  const server = await listen();
  t.after(() => server.close());
  const r = await request(server, 'POST', '/api/graphs', {
    tasks: [
      { id: 'a', dependsOn: ['a'] }, // self-cycle
    ],
  });
  assert.equal(r.status, 400);
  assert.equal(r.body.error, 'INVALID_DAG');
});

test('HTTP: GET /api/graphs/:id/parallel-batches returns waves', async (t) => {
  const server = await listen();
  t.after(() => server.close());
  const create = await request(server, 'POST', '/api/graphs', {
    tasks: [
      { id: 'a', dependsOn: [] },
      { id: 'b', dependsOn: ['a'] },
      { id: 'c', dependsOn: ['a'] },
      { id: 'd', dependsOn: ['b', 'c'] },
    ],
  });
  const id = create.body.id;
  const r = await request(server, 'POST', `/api/graphs/${id}/parallel-batches`);
  assert.equal(r.status, 200);
  assert.equal(r.body.batches.length, 3);
});

test('HTTP: GET /api/graphs/:id/ready returns ready tasks', async (t) => {
  const server = await listen();
  t.after(() => server.close());
  const create = await request(server, 'POST', '/api/graphs', {
    tasks: [
      { id: 'a', dependsOn: [] },
      { id: 'b', dependsOn: ['a'] },
    ],
  });
  const id = create.body.id;
  const r = await request(server, 'GET', `/api/graphs/${id}/ready`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.ready, ['a']);
});

test('HTTP: POST /api/graphs/:id/mark updates task state', async (t) => {
  const server = await listen();
  t.after(() => server.close());
  const create = await request(server, 'POST', '/api/graphs', {
    tasks: [{ id: 'a', dependsOn: [] }],
  });
  const id = create.body.id;
  const r = await request(server, 'POST', `/api/graphs/${id}/mark`, {
    taskId: 'a',
    status: 'done',
  });
  assert.equal(r.status, 200);
  assert.equal(r.body.status, 'done');
});

test('HTTP: POST /api/graphs/:id/critical-path returns longest path', async (t) => {
  const server = await listen();
  t.after(() => server.close());
  const create = await request(server, 'POST', '/api/graphs', {
    tasks: [
      { id: 'a', dependsOn: [], durationMin: 5 },
      { id: 'b', dependsOn: ['a'], durationMin: 50 },
      { id: 'c', dependsOn: ['a'], durationMin: 1 },
    ],
  });
  const id = create.body.id;
  const r = await request(server, 'POST', `/api/graphs/${id}/critical-path`);
  assert.equal(r.status, 200);
  assert.deepEqual(r.body.path, ['a', 'b']);
  assert.equal(r.body.durationMin, 55);
});

test('HTTP: 404 for missing graph', async (t) => {
  const server = await listen();
  t.after(() => server.close());
  const r = await request(server, 'GET', '/api/graphs/nonexistent');
  assert.equal(r.status, 404);
});

test('HTTP: DELETE removes graph', async (t) => {
  const server = await listen();
  t.after(() => server.close());
  const create = await request(server, 'POST', '/api/graphs', {
    tasks: [{ id: 'a', dependsOn: [] }],
  });
  const id = create.body.id;
  const del = await request(server, 'DELETE', `/api/graphs/${id}`);
  assert.equal(del.status, 200);
  const get = await request(server, 'GET', `/api/graphs/${id}`);
  assert.equal(get.status, 404);
});

// Clear test store at end
test('teardown: clear graphs and remove data dir', () => {
  graphs.clear();
  try { fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true }); } catch { /* ignore */ }
});