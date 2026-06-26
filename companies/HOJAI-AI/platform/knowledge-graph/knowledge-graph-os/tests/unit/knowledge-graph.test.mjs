/**
 * KnowledgeGraphOS Unit Tests (ESM)
 *
 * Tests all API endpoints of the ESM service.
 * Run: node --test tests/unit/knowledge-graph.test.mjs
 */

// Set env vars BEFORE importing the service module
process.env.REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import http from 'node:http';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { default: app } = await import(resolve(__dirname, '../../src/index.js'));

// Auth token used by requireAuth
const TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'dev-token-kg';

const PORT = 4551;
let server;
const BASE = 'http://localhost:' + PORT;

function req(method, path, body, extraHeaders) {
  return new Promise(function(resolve, reject) {
    const url = new URL(path, BASE);
    const data = body ? JSON.stringify(body) : null;
    const opts = {
      method,
      hostname: 'localhost',
      port: PORT,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json', 'x-internal-token': TOKEN, ...(extraHeaders || {}) },
    };
    if (data) opts.headers['Content-Length'] = Buffer.byteLength(data);
    const r = http.request(opts, function(res) {
      let chunks = '';
      res.on('data', function(c) { chunks += c; });
      res.on('end', function() {
        let parsed;
        try { parsed = JSON.parse(chunks); } catch (_) { parsed = chunks; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (data) r.write(data);
    r.end();
  });
}

before(async () => {
  await new Promise(function(resolve) { server = app.listen(PORT, '127.0.0.1', resolve); });
});

after(async () => {
  await new Promise(function(resolve) { server.close(resolve); });
});

// ============================================================
// HEALTH & STATS
// ============================================================
describe('Health & Stats', () => {
  it('GET /health -> 200', async () => {
    const res = await req('GET', '/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'healthy');
    assert.strictEqual(res.body.service, 'knowledge-graph-os');
    assert.ok(res.body.stats);
  });

  it('GET /api/stats -> 200', async () => {
    const res = await req('GET', '/api/stats');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(typeof res.body.totalNodes, 'number');
    assert.strictEqual(typeof res.body.totalRelationships, 'number');
  });

  it('GET /ready -> 200', async () => {
    const res = await req('GET', '/ready');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.ready, true);
  });
});

// ============================================================
// NODE CRUD
// ============================================================
describe('Node CRUD', () => {
  it('POST /api/nodes -> 201', async () => {
    const res = await req('POST', '/api/nodes', {
      id: 'node-001', type: 'TEST_ENTITY',
      properties: { name: 'Test Node', value: 42 },
      labels: ['Test', 'Unit']
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.id, 'node-001');
    assert.strictEqual(res.body.type, 'TEST_ENTITY');
    assert.deepStrictEqual(res.body.labels, ['Test', 'Unit', 'TEST_ENTITY']);
    assert.ok(res.body.createdAt);
  });

  it('POST /api/nodes -> 400 (missing id)', async () => {
    const res = await req('POST', '/api/nodes', { type: 'TEST' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('POST /api/nodes -> 400 (missing type)', async () => {
    const res = await req('POST', '/api/nodes', { id: 'no-type' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('GET /api/nodes/:id -> 200 (exists)', async () => {
    await req('POST', '/api/nodes', { id: 'node-get-001', type: 'PERSON', properties: { name: 'Alice' } });
    const res = await req('GET', '/api/nodes/node-get-001');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, 'node-get-001');
  });

  it('GET /api/nodes/:id -> 404 (ghost)', async () => {
    const res = await req('GET', '/api/nodes/ghost-node');
    assert.strictEqual(res.status, 404);
  });

  it('PATCH /api/nodes/:id -> 200 (update)', async () => {
    await req('POST', '/api/nodes', { id: 'node-patch-001', type: 'PERSON', properties: { name: 'Bob', age: 25 } });
    const res = await req('PATCH', '/api/nodes/node-patch-001', { name: 'Robert', city: 'Mumbai' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.properties.name, 'Robert');
    assert.strictEqual(res.body.properties.city, 'Mumbai');
    assert.strictEqual(res.body.properties.age, 25);
  });

  it('PATCH /api/nodes/:id -> 404 (ghost)', async () => {
    const res = await req('PATCH', '/api/nodes/not-there', { name: 'New' });
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/nodes/:id -> 200', async () => {
    await req('POST', '/api/nodes', { id: 'node-del-001', type: 'TEMP', properties: {} });
    const res = await req('DELETE', '/api/nodes/node-del-001');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const getRes = await req('GET', '/api/nodes/node-del-001');
    assert.strictEqual(getRes.status, 404);
  });

  it('DELETE /api/nodes/:id -> 404 (ghost)', async () => {
    const res = await req('DELETE', '/api/nodes/ghost-node');
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/nodes/:id cascades to relationships', async () => {
    await req('POST', '/api/nodes', { id: 'n1', type: 'A', properties: {} });
    await req('POST', '/api/nodes', { id: 'n2', type: 'B', properties: {} });
    const relRes = await req('POST', '/api/relationships', { from: 'n1', to: 'n2', type: 'LINKS', properties: {} });
    await req('DELETE', '/api/nodes/n1');
    const getRel = await req('GET', '/api/relationships/' + relRes.body.id);
    assert.strictEqual(getRel.status, 404);
  });

  it('GET /api/nodes -> 200 (list)', async () => {
    const res = await req('GET', '/api/nodes');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.nodes));
    assert.strictEqual(typeof res.body.total, 'number');
  });

  it('GET /api/nodes?type=X -> filters', async () => {
    await req('POST', '/api/nodes', { id: 'f-apple', type: 'APPLE', properties: {} });
    await req('POST', '/api/nodes', { id: 'f-banana', type: 'BANANA', properties: {} });
    const res = await req('GET', '/api/nodes?type=APPLE');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.every(n => n.type === 'APPLE'));
  });
});

// ============================================================
// NODE FIND
// ============================================================
describe('Node Find', () => {
  it('POST /api/nodes/find -> 200 (by type)', async () => {
    await req('POST', '/api/nodes', { id: 'ff1', type: 'FRUIT', properties: {} });
    await req('POST', '/api/nodes', { id: 'ff2', type: 'FRUIT', properties: {} });
    await req('POST', '/api/nodes', { id: 'ff3', type: 'VEGGIE', properties: {} });
    const res = await req('POST', '/api/nodes/find', { type: 'FRUIT' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.every(n => n.type === 'FRUIT'));
    assert.strictEqual(res.body.total, res.body.nodes.length);
  });

  it('POST /api/nodes/find -> 200 (by labels)', async () => {
    await req('POST', '/api/nodes', { id: 'fl1', type: 'X', labels: ['Red', 'Sweet'], properties: {} });
    await req('POST', '/api/nodes', { id: 'fl2', type: 'X', labels: ['Red'], properties: {} });
    const res = await req('POST', '/api/nodes/find', { labels: ['Red', 'Sweet'] });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.every(n => n.labels.includes('Red') && n.labels.includes('Sweet')));
  });

  it('POST /api/nodes/find -> 200 (by properties)', async () => {
    await req('POST', '/api/nodes', { id: 'fp1', type: 'P', properties: { color: 'red', size: 10 } });
    await req('POST', '/api/nodes', { id: 'fp2', type: 'P', properties: { color: 'blue', size: 5 } });
    const res = await req('POST', '/api/nodes/find', { properties: { color: 'red' } });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.nodes.length, 1);
    assert.strictEqual(res.body.nodes[0].id, 'fp1');
  });

  it('POST /api/nodes/find -> 200 (limit)', async () => {
    const res = await req('POST', '/api/nodes/find', { limit: 3 });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.length <= 3);
  });
});

// ============================================================
// RELATIONSHIP CRUD
// ============================================================
describe('Relationship CRUD', () => {
  before(async () => {
    await req('POST', '/api/nodes', { id: 'r-from', type: 'A', properties: {} });
    await req('POST', '/api/nodes', { id: 'r-to', type: 'B', properties: {} });
  });

  it('POST /api/relationships -> 201', async () => {
    const res = await req('POST', '/api/relationships', {
      from: 'r-from', to: 'r-to', type: 'KNOWS',
      properties: { since: '2024-01-01', strength: 0.9 }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.from, 'r-from');
    assert.strictEqual(res.body.to, 'r-to');
    assert.strictEqual(res.body.type, 'KNOWS');
    assert.ok(res.body.id);
  });

  it('POST /api/relationships -> 400 (missing from)', async () => {
    const res = await req('POST', '/api/relationships', { to: 'r-to', type: 'KNOWS' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('from'));
  });

  it('POST /api/relationships -> 400 (missing to)', async () => {
    const res = await req('POST', '/api/relationships', { from: 'r-from', type: 'KNOWS' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('to'));
  });

  it('POST /api/relationships -> 400 (missing type)', async () => {
    const res = await req('POST', '/api/relationships', { from: 'r-from', to: 'r-to' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('type'));
  });

  it('GET /api/relationships/:id -> 200', async () => {
    const create = await req('POST', '/api/relationships', { from: 'r-from', to: 'r-to', type: 'LINKS', properties: {} });
    const res = await req('GET', '/api/relationships/' + create.body.id);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, create.body.id);
  });

  it('GET /api/relationships/:id -> 404 (ghost)', async () => {
    const res = await req('GET', '/api/relationships/ghost-rel');
    assert.strictEqual(res.status, 404);
  });

  it('DELETE /api/relationships/:id -> 200', async () => {
    const create = await req('POST', '/api/relationships', { from: 'r-from', to: 'r-to', type: 'EDGES', properties: {} });
    const res = await req('DELETE', '/api/relationships/' + create.body.id);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.success, true);
    const getRes = await req('GET', '/api/relationships/' + create.body.id);
    assert.strictEqual(getRes.status, 404);
  });

  it('DELETE /api/relationships/:id -> 404 (ghost)', async () => {
    const res = await req('DELETE', '/api/relationships/ghost-rel');
    assert.strictEqual(res.status, 404);
  });
});

// ============================================================
// NODE RELATIONSHIPS
// ============================================================
describe('Node Relationships', () => {
  before(async () => {
    await req('POST', '/api/nodes', { id: 'nra', type: 'PERSON', properties: {} });
    await req('POST', '/api/nodes', { id: 'nrb', type: 'COMPANY', properties: {} });
    await req('POST', '/api/nodes', { id: 'nrc', type: 'PERSON', properties: {} });
    await req('POST', '/api/relationships', { from: 'nra', to: 'nrb', type: 'WORKS_AT', properties: {} });
    await req('POST', '/api/relationships', { from: 'nrc', to: 'nrb', type: 'WORKS_AT', properties: {} });
    await req('POST', '/api/relationships', { from: 'nrb', to: 'nra', type: 'EMPLOYS', properties: {} });
  });

  it('GET /api/nodes/:id/relationships (both directions)', async () => {
    const res = await req('GET', '/api/nodes/nrb/relationships');
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.relationships));
    assert.strictEqual(res.body.total, 3);
  });

  it('direction=outbound -> only outbound', async () => {
    const res = await req('GET', '/api/nodes/nrb/relationships?direction=outbound');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.relationships.every(r => r.from === 'nrb'));
  });

  it('direction=inbound -> only inbound', async () => {
    const res = await req('GET', '/api/nodes/nrb/relationships?direction=inbound');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.relationships.every(r => r.to === 'nrb'));
  });
});

// ============================================================
// GRAPH OPERATIONS
// ============================================================
describe('Graph Operations', () => {
  before(async () => {
    await req('POST', '/api/nodes', { id: 'ga', type: 'A', properties: {} });
    await req('POST', '/api/nodes', { id: 'gb', type: 'B', properties: {} });
    await req('POST', '/api/nodes', { id: 'gc', type: 'C', properties: {} });
    await req('POST', '/api/relationships', { from: 'ga', to: 'gb', type: 'NEXT', properties: {} });
    await req('POST', '/api/relationships', { from: 'gb', to: 'gc', type: 'NEXT', properties: {} });
    await req('POST', '/api/relationships', { from: 'ga', to: 'gc', type: 'JUMPS', properties: {} });
  });

  it('POST /api/traverse -> 200 (BFS depth=2)', async () => {
    const res = await req('POST', '/api/traverse', { startId: 'ga', depth: 2, direction: 'outbound', types: [] });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.some(n => n.id === 'gb'));
    assert.ok(res.body.nodes.some(n => n.id === 'gc'));
  });

  it('depth=1 -> only direct neighbors', async () => {
    const res = await req('POST', '/api/traverse', { startId: 'ga', depth: 1, direction: 'outbound' });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.some(n => n.id === 'gb'));
    assert.ok(!res.body.nodes.some(n => n.id === 'gc'));
  });

  it('POST /api/traverse -> 400 (missing startId)', async () => {
    const res = await req('POST', '/api/traverse', { depth: 2 });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('startId'));
  });

  it('POST /api/path -> 200 (path found)', async () => {
    const res = await req('POST', '/api/path', { from: 'ga', to: 'gc', maxDepth: 10 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.found, true);
    assert.ok(Array.isArray(res.body.path));
    assert.strictEqual(res.body.path[0], 'ga');
    assert.strictEqual(res.body.path[res.body.path.length - 1], 'gc');
  });

  it('POST /api/path -> 200 (path not found)', async () => {
    await req('POST', '/api/nodes', { id: 'gorphan', type: 'O', properties: {} });
    const res = await req('POST', '/api/path', { from: 'ga', to: 'gorphan', maxDepth: 3 });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.found, false);
    assert.strictEqual(res.body.length, -1);
  });

  it('POST /api/path -> 400 (missing from)', async () => {
    const res = await req('POST', '/api/path', { to: 'gc' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('from'));
  });

  it('POST /api/path -> 400 (missing to)', async () => {
    const res = await req('POST', '/api/path', { from: 'ga' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('to'));
  });
});

// ============================================================
// SEARCH
// ============================================================
describe('Search', () => {
  before(async () => {
    await req('POST', '/api/nodes', { id: 's1', type: 'PERSON', properties: { name: 'Alice Smith', city: 'Bangalore' } });
    await req('POST', '/api/nodes', { id: 's2', type: 'PERSON', properties: { name: 'Bob Jones', city: 'Mumbai' } });
    await req('POST', '/api/nodes', { id: 's3', type: 'COMPANY', properties: { name: 'Alice Tech', city: 'Bangalore' } });
  });

  it('GET /api/search?q=Alice -> finds matches', async () => {
    const res = await req('GET', '/api/search?q=Alice');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.query, 'Alice');
    assert.ok(res.body.nodes.length >= 2);
    assert.ok(res.body.nodes.every(n => JSON.stringify(n).toLowerCase().includes('alice')));
  });

  it('GET /api/search?q=Bangalore -> property search', async () => {
    const res = await req('GET', '/api/search?q=Bangalore');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.nodes.some(n => n.id === 's1'));
    assert.ok(res.body.nodes.some(n => n.id === 's3'));
  });

  it('GET /api/search -> 400 (missing q)', async () => {
    const res = await req('GET', '/api/search');
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error.includes('q'));
  });
});

// ============================================================
// RTMN-SPECIFIC ENDPOINTS
// ============================================================
describe('RTMN-Specific Endpoints', () => {
  before(async () => {
    await req('POST', '/api/nodes', { id: 'rtmn1', type: 'CORP', properties: {} });
    await req('POST', '/api/nodes', { id: 'rtmn2', type: 'CORP', properties: {} });
    await req('POST', '/api/nodes', { id: 'rtmnchild', type: 'CHILD', properties: {} });
    await req('POST', '/api/relationships', { from: 'rtmn1', to: 'rtmnchild', type: 'HAS', properties: {} });
  });

  it('POST /api/corpid/link -> 201', async () => {
    const res = await req('POST', '/api/corpid/link', {
      fromId: 'rtmn1', toId: 'rtmn2', relationship: 'PARTNERS_WITH',
      properties: { since: '2024-01-01' }
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.from, 'rtmn1');
    assert.strictEqual(res.body.type, 'PARTNERS_WITH');
  });

  it('POST /api/corpid/link -> 400 (missing relationship)', async () => {
    const res = await req('POST', '/api/corpid/link', { fromId: 'rtmn1', toId: 'rtmn2' });
    assert.strictEqual(res.status, 400);
    assert.ok(res.body.error);
  });

  it('GET /api/entity/:id/graph -> 200 (depth=1)', async () => {
    const res = await req('GET', '/api/entity/rtmn1/graph?depth=1');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.node);
    assert.strictEqual(res.body.node.id, 'rtmn1');
    assert.ok(Array.isArray(res.body.neighbors));
    assert.ok(Array.isArray(res.body.relationships));
  });

  it('GET /api/entity/:id/graph -> depth=2 (nested)', async () => {
    await req('POST', '/api/nodes', { id: 'rtmnl2', type: 'L2', properties: {} });
    await req('POST', '/api/relationships', { from: 'rtmnchild', to: 'rtmnl2', type: 'LINKS', properties: {} });
    const res = await req('GET', '/api/entity/rtmn1/graph?depth=2');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.neighbors.some(n => n.id === 'rtmnl2'));
  });
});

// ============================================================
// GRAPH SEEDING
// ============================================================
describe('Graph Seeding', () => {
  it('starts with CORP-IND-00001', async () => {
    const res = await req('GET', '/api/nodes/CORP-IND-00001');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.type, 'INDIVIDUAL');
    assert.strictEqual(res.body.properties.name, 'John Doe');
  });

  it('seeded nodes have relationships', async () => {
    const res = await req('GET', '/api/nodes/CORP-IND-00001/relationships');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.relationships.length > 0);
  });

  it('stats reflect seeded data', async () => {
    const res = await req('GET', '/api/stats');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.totalNodes > 0);
    assert.ok(res.body.totalRelationships > 0);
    assert.ok(res.body.nodeTypes);
    assert.ok(res.body.relTypes);
  });
});
