/**
 * KnowledgeGraphOS Unit Tests
 *
 * Tests all API endpoints by importing the ESM source with mocked @rtmn/shared.
 * Uses Node.js native test runner. Each describe block starts its own server.
 *
 * The mock in _setup-mock.cjs intercepts @rtmn/shared imports by patching
 * Module._resolveFilename before the ESM service module loads.
 */

// Load the mock first (patches Module._resolveFilename)
require('./_setup-mock.cjs');

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('http');

// Load the service (after the mock is set up)
const servicePath = require.resolve('../../src/index.js');
delete require.cache[servicePath];
const { createRequire } = require('module');
const serviceRequire = createRequire(__filename);
const { default: app } = serviceRequire(servicePath);

const PORT = 4551;
let server;
const BASE = 'http://localhost:' + PORT;

function req(method, path, body, extraHeaders) {
  return new Promise(function(resolve, reject) {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method: method,
      hostname: 'localhost',
      port: PORT,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...(extraHeaders || {}),
      },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, function(res) {
      let chunks = '';
      res.on('data', function(c) { chunks += c; });
      res.on('end', function() {
        let parsed = chunks;
        try { parsed = JSON.parse(chunks); } catch (_) {}
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

before(async function() {
  await new Promise(function(resolve) {
    server = app.listen(PORT, '127.0.0.1', resolve);
  });
});

after(async function() {
  await new Promise(function(resolve) { server.close(resolve); });
});

// ============================================================
// HEALTH & STATS
// ============================================================
describe('Health & Stats', function() {
  it('GET /health -> 200', async function() {
    const res = await req('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'knowledge-graph-os');
    assert.ok(res.body.stats);
  });

  it('GET /api/stats -> 200', async function() {
    const res = await req('GET', '/api/stats');
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.totalNodes === 'number');
    assert.ok(typeof res.body.totalRelationships === 'number');
  });

  it('GET /ready -> 200', async function() {
    const res = await req('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
  });
});

// ============================================================
// NODE CRUD
// ============================================================
describe('Node CRUD', function() {
  it('POST /api/nodes -> 201 (valid node)', async function() {
    const res = await req('POST', '/api/nodes', {
      id: 'node-001',
      type: 'TEST_ENTITY',
      properties: { name: 'Test Node', value: 42 },
      labels: ['Test', 'Unit']
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.id, 'node-001');
    assert.strictEqual(res.body.type, 'TEST_ENTITY');
    assert.deepStrictEqual(res.body.labels, ['Test', 'Unit', 'TEST_ENTITY']);
    assert.ok(res.body.createdAt);
  });

  it('POST /api/nodes -> 400 (missing id)', async function() {
    const res = await req('POST', '/api/nodes', { type: 'TEST' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/nodes -> 400 (missing type)', async function() {
    const res = await req('POST', '/api/nodes', { id: 'no-type' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('GET /api/nodes/:id -> 200 (existing)', async function() {
    await req('POST', '/api/nodes', { id: 'node-get-001', type: 'PERSON', properties: { name: 'Alice' } });
    const res = await req('GET', '/api/nodes/node-get-001');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, 'node-get-001');
    assert.strictEqual(res.body.properties.name, 'Alice');
  });

  it('GET /api/nodes/:id -> 404 (non-existent)', async function() {
    const res = await req('GET', '/api/nodes/ghost-node');
    assert.strictEqual(res.status, 404);
  });

  it('PATCH /api/nodes/:id -> 200 (update)', async function() {
    await req('POST', '/api/nodes', { id: 'node-patch-001', type: 'PERSON', properties: { name: 'Bob', age: 25 } });
    const res = await req('PATCH', '/api/nodes/node-patch-001', { name: 'Robert', city: 'Mumbai' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.properties.name, 'Robert');
    assert.strictEqual(res.body.properties.city, 'Mumbai');
    assert.strictEqual(res.body.properties.age, 25);
  });

  it('PATCH /api/nodes/:id -> 404 (non-existent)', async function() {
    const res = await req('PATCH', '/api/nodes/not-there', { name: 'New' });
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/nodes/:id -> 200 (existing)', async function() {
    await req('POST', '/api/nodes', { id: 'node-del-001', type: 'TEMP', properties: {} });
    const res = await req('DELETE', '/api/nodes/node-del-001');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const getRes = await req('GET', '/api/nodes/node-del-001');
    assert.strictEqual(getRes.status, 404);
  });

  it('DELETE /api/nodes/:id -> 404 (non-existent)', async function() {
    const res = await req('DELETE', '/api/nodes/ghost-node');
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/nodes/:id also deletes relationships', async function() {
    await req('POST', '/api/nodes', { id: 'n1', type: 'A', properties: {} });
    await req('POST', '/api/nodes', { id: 'n2', type: 'B', properties: {} });
    const relRes = await req('POST', '/api/relationships', { from: 'n1', to: 'n2', type: 'LINKS', properties: {} });
    await req('DELETE', '/api/nodes/n1');
    const getRel = await req('GET', '/api/relationships/' + relRes.body.id);
    assert.strictEqual(getRel.status, 404);
  });

  it('GET /api/nodes -> 200 (list)', async function() {
    const res = await req('GET', '/api/nodes');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.nodes));
  });

  it('GET /api/nodes?type=X -> filters by type', async function() {
    await req('POST', '/api/nodes', { id: 'filter-apple', type: 'APPLE', properties: {} });
    await req('POST', '/api/nodes', { id: 'filter-banana', type: 'BANANA', properties: {} });
    const res = await req('GET', '/api/nodes?type=APPLE');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.every(function(n) { return n.type === 'APPLE'; }));
  });
});

// ============================================================
// NODE FIND
// ============================================================
describe('Node Find', function() {
  it('POST /api/nodes/find -> 200 (by type)', async function() {
    await req('POST', '/api/nodes', { id: 'find-fruit-1', type: 'FRUIT', properties: {} });
    await req('POST', '/api/nodes', { id: 'find-fruit-2', type: 'FRUIT', properties: {} });
    await req('POST', '/api/nodes', { id: 'find-veggie', type: 'VEGGIE', properties: {} });
    const res = await req('POST', '/api/nodes/find', { type: 'FRUIT' });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.nodes));
    assert.ok(res.body.nodes.every(function(n) { return n.type === 'FRUIT'; }));
    assert.strictEqual(res.body.total, res.body.nodes.length);
  });

  it('POST /api/nodes/find -> 200 (by labels)', async function() {
    await req('POST', '/api/nodes', { id: 'find-lab-1', type: 'X', labels: ['Red', 'Sweet'], properties: {} });
    await req('POST', '/api/nodes', { id: 'find-lab-2', type: 'X', labels: ['Red'], properties: {} });
    const res = await req('POST', '/api/nodes/find', { labels: ['Red', 'Sweet'] });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.length >= 1);
    assert.ok(res.body.nodes.every(function(n) { return n.labels.includes('Red') && n.labels.includes('Sweet'); }));
  });

  it('POST /api/nodes/find -> 200 (by properties)', async function() {
    await req('POST', '/api/nodes', { id: 'find-prop-1', type: 'P', properties: { color: 'red', size: 10 } });
    await req('POST', '/api/nodes', { id: 'find-prop-2', type: 'P', properties: { color: 'blue', size: 5 } });
    const res = await req('POST', '/api/nodes/find', { properties: { color: 'red' } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.nodes.length, 1);
    assert.strictEqual(res.body.nodes[0].id, 'find-prop-1');
  });

  it('POST /api/nodes/find -> 200 (limit)', async function() {
    const res = await req('POST', '/api/nodes/find', { limit: 3 });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.length <= 3);
  });
});

// ============================================================
// RELATIONSHIP CRUD
// ============================================================
describe('Relationship CRUD', function() {
  before(async function() {
    await req('POST', '/api/nodes', { id: 'rel-from', type: 'A', properties: {} });
    await req('POST', '/api/nodes', { id: 'rel-to', type: 'B', properties: {} });
  });

  it('POST /api/relationships -> 201 (valid)', async function() {
    const res = await req('POST', '/api/relationships', {
      from: 'rel-from', to: 'rel-to', type: 'KNOWS',
      properties: { since: '2024-01-01', strength: 0.9 }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.from, 'rel-from');
    assert.strictEqual(res.body.to, 'rel-to');
    assert.strictEqual(res.body.type, 'KNOWS');
    assert.ok(res.body.id);
  });

  it('POST /api/relationships -> 400 (missing from)', async function() {
    const res = await req('POST', '/api/relationships', { to: 'rel-to', type: 'KNOWS' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('from'));
  });

  it('POST /api/relationships -> 400 (missing to)', async function() {
    const res = await req('POST', '/api/relationships', { from: 'rel-from', type: 'KNOWS' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('to'));
  });

  it('POST /api/relationships -> 400 (missing type)', async function() {
    const res = await req('POST', '/api/relationships', { from: 'rel-from', to: 'rel-to' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('type'));
  });

  it('GET /api/relationships/:id -> 200 (existing)', async function() {
    const create = await req('POST', '/api/relationships', { from: 'rel-from', to: 'rel-to', type: 'LINKS', properties: {} });
    const res = await req('GET', '/api/relationships/' + create.body.id);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, create.body.id);
  });

  it('GET /api/relationships/:id -> 404 (non-existent)', async function() {
    const res = await req('GET', '/api/relationships/ghost-rel');
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/relationships/:id -> 200 (existing)', async function() {
    const create = await req('POST', '/api/relationships', { from: 'rel-from', to: 'rel-to', type: 'EDGES', properties: {} });
    const res = await req('DELETE', '/api/relationships/' + create.body.id);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const getRes = await req('GET', '/api/relationships/' + create.body.id);
    assert.strictEqual(getRes.status, 404);
  });

  it('DELETE /api/relationships/:id -> 404 (non-existent)', async function() {
    const res = await req('DELETE', '/api/relationships/ghost-rel');
    assert.strictEqual(res.status, 404);
  });
});

// ============================================================
// NODE RELATIONSHIPS
// ============================================================
describe('Node Relationships', function() {
  before(async function() {
    await req('POST', '/api/nodes', { id: 'nr-a', type: 'PERSON', properties: {} });
    await req('POST', '/api/nodes', { id: 'nr-b', type: 'COMPANY', properties: {} });
    await req('POST', '/api/nodes', { id: 'nr-c', type: 'PERSON', properties: {} });
    await req('POST', '/api/relationships', { from: 'nr-a', to: 'nr-b', type: 'WORKS_AT', properties: {} });
    await req('POST', '/api/relationships', { from: 'nr-c', to: 'nr-b', type: 'WORKS_AT', properties: {} });
    await req('POST', '/api/relationships', { from: 'nr-b', to: 'nr-a', type: 'EMPLOYS', properties: {} });
  });

  it('GET /api/nodes/:id/relationships (both)', async function() {
    const res = await req('GET', '/api/nodes/nr-b/relationships');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.relationships));
    assert.strictEqual(res.body.total, 3);
  });

  it('GET /api/nodes/:id/relationships?direction=outbound', async function() {
    const res = await req('GET', '/api/nodes/nr-b/relationships?direction=outbound');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.relationships.every(function(r) { return r.from === 'nr-b'; }));
  });

  it('GET /api/nodes/:id/relationships?direction=inbound', async function() {
    const res = await req('GET', '/api/nodes/nr-b/relationships?direction=inbound');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.relationships.every(function(r) { return r.to === 'nr-b'; }));
  });
});

// ============================================================
// GRAPH OPERATIONS
// ============================================================
describe('Graph Operations', function() {
  before(async function() {
    await req('POST', '/api/nodes', { id: 'g-a', type: 'A', properties: {} });
    await req('POST', '/api/nodes', { id: 'g-b', type: 'B', properties: {} });
    await req('POST', '/api/nodes', { id: 'g-c', type: 'C', properties: {} });
    await req('POST', '/api/relationships', { from: 'g-a', to: 'g-b', type: 'NEXT', properties: {} });
    await req('POST', '/api/relationships', { from: 'g-b', to: 'g-c', type: 'NEXT', properties: {} });
    await req('POST', '/api/relationships', { from: 'g-a', to: 'g-c', type: 'JUMPS', properties: {} });
  });

  it('POST /api/traverse -> 200 (BFS depth=2)', async function() {
    const res = await req('POST', '/api/traverse', { startId: 'g-a', depth: 2, direction: 'outbound', types: [] });
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.nodes));
    assert.ok(res.body.nodes.some(function(n) { return n.id === 'g-b'; }));
    assert.ok(res.body.nodes.some(function(n) { return n.id === 'g-c'; }));
  });

  it('POST /api/traverse -> 200 (depth=1)', async function() {
    const res = await req('POST', '/api/traverse', { startId: 'g-a', depth: 1, direction: 'outbound' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.some(function(n) { return n.id === 'g-b'; }));
    assert.ok(!res.body.nodes.some(function(n) { return n.id === 'g-c'; }));
  });

  it('POST /api/traverse -> 400 (missing startId)', async function() {
    const res = await req('POST', '/api/traverse', { depth: 2 });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('startId'));
  });

  it('POST /api/path -> 200 (path found)', async function() {
    const res = await req('POST', '/api/path', { from: 'g-a', to: 'g-c', maxDepth: 10 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.found, true);
    assert.ok(Array.isArray(res.body.path));
    assert.strictEqual(res.body.path[0], 'g-a');
    assert.strictEqual(res.body.path[res.body.path.length - 1], 'g-c');
  });

  it('POST /api/path -> 200 (path not found)', async function() {
    await req('POST', '/api/nodes', { id: 'g-orphan', type: 'O', properties: {} });
    const res = await req('POST', '/api/path', { from: 'g-a', to: 'g-orphan', maxDepth: 3 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.found, false);
    assert.strictEqual(res.body.length, -1);
  });

  it('POST /api/path -> 400 (missing from)', async function() {
    const res = await req('POST', '/api/path', { to: 'g-c' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('from'));
  });

  it('POST /api/path -> 400 (missing to)', async function() {
    const res = await req('POST', '/api/path', { from: 'g-a' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('to'));
  });
});

// ============================================================
// SEARCH
// ============================================================
describe('Search', function() {
  before(async function() {
    await req('POST', '/api/nodes', { id: 's-1', type: 'PERSON', properties: { name: 'Alice Smith', city: 'Bangalore' } });
    await req('POST', '/api/nodes', { id: 's-2', type: 'PERSON', properties: { name: 'Bob Jones', city: 'Mumbai' } });
    await req('POST', '/api/nodes', { id: 's-3', type: 'COMPANY', properties: { name: 'Alice Tech', city: 'Bangalore' } });
  });

  it('GET /api/search?q=Alice -> finds matches', async function() {
    const res = await req('GET', '/api/search?q=Alice');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.query, 'Alice');
    assert.ok(res.body.nodes.length >= 2);
    assert.ok(res.body.nodes.every(function(n) { return JSON.stringify(n).toLowerCase().includes('alice'); }));
  });

  it('GET /api/search?q=Bangalore -> finds by property value', async function() {
    const res = await req('GET', '/api/search?q=Bangalore');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.some(function(n) { return n.id === 's-1'; }));
    assert.ok(res.body.nodes.some(function(n) { return n.id === 's-3'; }));
  });

  it('GET /api/search -> 400 (missing q)', async function() {
    const res = await req('GET', '/api/search');
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('q'));
  });
});

// ============================================================
// RTMN-SPECIFIC ENDPOINTS
// ============================================================
describe('RTMN-Specific Endpoints', function() {
  before(async function() {
    await req('POST', '/api/nodes', { id: 'rtmn-1', type: 'CORP', properties: {} });
    await req('POST', '/api/nodes', { id: 'rtmn-2', type: 'CORP', properties: {} });
    await req('POST', '/api/nodes', { id: 'rtmn-child', type: 'CHILD', properties: {} });
    await req('POST', '/api/relationships', { from: 'rtmn-1', to: 'rtmn-child', type: 'HAS', properties: {} });
  });

  it('POST /api/corpid/link -> 201', async function() {
    const res = await req('POST', '/api/corpid/link', {
      fromId: 'rtmn-1', toId: 'rtmn-2', relationship: 'PARTNERS_WITH',
      properties: { since: '2024-01-01' }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.from, 'rtmn-1');
    assert.strictEqual(res.body.type, 'PARTNERS_WITH');
  });

  it('POST /api/corpid/link -> 400 (missing relationship)', async function() {
    const res = await req('POST', '/api/corpid/link', { fromId: 'rtmn-1', toId: 'rtmn-2' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('GET /api/entity/:id/graph -> 200 (depth=1)', async function() {
    const res = await req('GET', '/api/entity/rtmn-1/graph?depth=1');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.node);
    assert.strictEqual(res.body.node.id, 'rtmn-1');
    assert.ok(Array.isArray(res.body.neighbors));
    assert.ok(Array.isArray(res.body.relationships));
  });

  it('GET /api/entity/:id/graph -> depth=2 (nested)', async function() {
    await req('POST', '/api/nodes', { id: 'rtmn-l2', type: 'L2', properties: {} });
    await req('POST', '/api/relationships', { from: 'rtmn-child', to: 'rtmn-l2', type: 'LINKS', properties: {} });
    const res = await req('GET', '/api/entity/rtmn-1/graph?depth=2');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.neighbors.some(function(n) { return n.id === 'rtmn-l2'; }));
  });
});

// ============================================================
// GRAPH SEEDING
// ============================================================
describe('Graph Seeding', function() {
  it('starts with seeded RTMN entities', async function() {
    const res = await req('GET', '/api/nodes/CORP-IND-00001');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.type, 'INDIVIDUAL');
    assert.strictEqual(res.body.properties.name, 'John Doe');
  });

  it('seeded nodes have relationships', async function() {
    const res = await req('GET', '/api/nodes/CORP-IND-00001/relationships');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.relationships.length > 0);
  });

  it('stats reflect seeded data', async function() {
    const res = await req('GET', '/api/stats');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.totalNodes > 0);
    assert.ok(res.body.totalRelationships > 0);
    assert.ok(res.body.nodeTypes);
    assert.ok(res.body.relTypes);
  });
});
