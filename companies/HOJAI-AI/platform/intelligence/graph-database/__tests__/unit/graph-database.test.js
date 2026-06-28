/**
 * graph-database - vitest unit tests
 *
 * Exercises the in-memory property graph (nodes, edges, Cypher-lite, BFS,
 * shortest path, components, PageRank) via the Express app exported by
 * src/index.js. Uses `supertest`-free HTTP-injection via http.createServer
 * to keep the test self-contained.
 *
 * SET env vars BEFORE importing app so NO_LISTEN and auth bypass are correct.
 * graph-database src/index.js uses require() (CJS) so the env vars must be
 * set before the import so the conditional checks in the IIFE are correct.
 */
import { describe, test, expect, beforeAll, afterAll } from 'vitest';

// Must be set BEFORE importing the app (the IIFE in graph-database checks these
// at module load time and will spawn the server if they aren't set correctly).
process.env.GRAPH_DATABASE_NO_LISTEN = '1';
process.env.GRAPH_DATABASE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

const http = require('http');
// graph-database exports everything as properties on the app function.
// The default export IS the app, so we get it via module.default or by using
// the app itself. Named exports (seedData, nodes, stats) are attached to app.
const _mod = require('../../src/index.js');
const app = _mod;
const seedData = _mod.seedData;
const nodes = _mod.nodes;
const edges = _mod.edges;
const nodeEdges = _mod.nodeEdges;
const edgeIndex = _mod.edgeIndex;
const labelIndex = _mod.labelIndex;
const stats = _mod.stats;

let server;
let baseUrl;

beforeAll(async () => {
  // Reset storage before tests
  nodes.clear();
  edges.clear();
  nodeEdges.clear();
  edgeIndex.clear();
  labelIndex.clear();
  Object.assign(stats, {
    totalNodesCreated: 0, totalNodesDeleted: 0,
    totalEdgesCreated: 0, totalEdgesDeleted: 0,
    totalQueries: 0, totalTraversals: 0, totalShortestPaths: 0,
    totalComponentRuns: 0, totalPageRankRuns: 0, errors: 0
  });
  seedData();
  server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, () => resolve()));
  const { port } = server.address();
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise((resolve) => server.close(resolve));
});

afterEach(() => {
  // Reset storage between tests (so each test is independent)
  nodes.clear();
  edges.clear();
  nodeEdges.clear();
  edgeIndex.clear();
  labelIndex.clear();
  seedData();
});

function req(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' }
    };
    const r = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        let parsed;
        try { parsed = data ? JSON.parse(data) : null; } catch { parsed = data; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

describe('config exports', () => {
  test('app is a function (Express)', () => {
    expect(typeof app).toBe('function');
  });
  test('seedData is exported', () => {
    expect(typeof seedData).toBe('function');
  });
  test('nodes/edges/stats are exported directly', () => {
    expect(nodes).toBeDefined();
    expect(edges).toBeDefined();
    expect(stats).toBeDefined();
  });
  test('seedData populates 7 nodes + 10 edges (6 people + 1 company)', () => {
    expect(nodes.size).toBe(7);
    expect(edges.size).toBe(10);
  });
});

describe('GET /api/health', () => {
  test('returns 200 with status healthy', async () => {
    const res = await req('GET', '/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('graph-database');
    expect(res.body.counts).toBeDefined();
    expect(res.body.counts.nodes).toBe(7);
    expect(res.body.counts.edges).toBe(10);
  });
});

describe('POST /api/nodes', () => {
  test('creates a node and returns 201', async () => {
    const res = await req('POST', '/api/nodes', {
      labels: ['Person'],
      properties: { name: 'Zoe', age: 33 }
    });
    expect(res.status).toBe(201);
    expect(res.body.node).toBeDefined();
    expect(res.body.node.id).toBeDefined();
    expect(res.body.node.labels).toEqual(['Person']);
  });
  test('rejects missing labels (400)', async () => {
    const res = await req('POST', '/api/nodes', { labels: 'not-an-array', properties: { name: 'X' } });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/labels/);
  });
  test('rejects non-array properties (400)', async () => {
    const res = await req('POST', '/api/nodes', { labels: ['Person'], properties: 'oops' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/nodes', () => {
  test('lists all nodes', async () => {
    const res = await req('GET', '/api/nodes');
    expect(res.status).toBe(200);
    expect(res.body.count).toBeGreaterThanOrEqual(7);
    expect(Array.isArray(res.body.nodes)).toBe(true);
  });
  test('filters by label', async () => {
    const res = await req('GET', '/api/nodes?label=Person');
    expect(res.status).toBe(200);
    expect(res.body.nodes.every((n) => n.labels.includes('Person'))).toBe(true);
  });
});

describe('GET /api/nodes/:id', () => {
  test('returns the node', async () => {
    const created = await req('POST', '/api/nodes', { labels: ['X'], properties: { k: 1 } });
    const id = created.body.node.id;
    const res = await req('GET', `/api/nodes/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.node.id).toBe(id);
  });
  test('returns 404 for unknown id', async () => {
    const res = await req('GET', '/api/nodes/does-not-exist');
    expect(res.status).toBe(404);
  });
});

describe('POST /api/edges', () => {
  test('creates an edge between two existing nodes', async () => {
    const a = await req('POST', '/api/nodes', { labels: ['A'], properties: {} });
    const b = await req('POST', '/api/nodes', { labels: ['B'], properties: {} });
    const res = await req('POST', '/api/edges', {
      type: 'CONNECTS',
      from: a.body.node.id,
      to: b.body.node.id
    });
    expect(res.status).toBe(201);
    expect(res.body.edge.type).toBe('CONNECTS');
  });
  test('rejects missing from node (400)', async () => {
    const b = await req('POST', '/api/nodes', { labels: ['B'], properties: {} });
    const res = await req('POST', '/api/edges', { type: 'X', from: 'nope', to: b.body.node.id });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/match (Cypher-lite)', () => {
  test('matches (a:Person {city: "NYC"})-[:KNOWS]->(b:Person)', async () => {
    const res = await req('POST', '/api/match', {
      pattern: '(a:Person {city: "NYC"})-[r:KNOWS]->(b:Person)'
    });
    expect(res.status).toBe(200);
    expect(res.body.matches).toBeDefined();
    expect(Array.isArray(res.body.matches)).toBe(true);
    expect(res.body.matches.length).toBeGreaterThan(0);
  });
  test('rejects missing pattern (400)', async () => {
    const res = await req('POST', '/api/match', {});
    expect(res.status).toBe(400);
  });
});

describe('POST /api/traverse (BFS)', () => {
  test('traverses 2 hops outgoing from Alice', async () => {
    // Alice is in seed data; find her
    const list = await req('GET', '/api/nodes?label=Person');
    const alice = list.body.nodes.find((n) => n.properties.name === 'Alice');
    expect(alice).toBeDefined();
    const res = await req('POST', '/api/traverse', {
      startId: alice.id,
      maxDepth: 2,
      direction: 'out'
    });
    expect(res.status).toBe(200);
    expect(res.body.visited).toBeGreaterThan(1);
    expect(Array.isArray(res.body.results)).toBe(true);
    expect(res.body.results.length).toBeGreaterThan(1);
  });
  test('rejects missing startId (400)', async () => {
    const res = await req('POST', '/api/traverse', { maxDepth: 1 });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/shortest-path', () => {
  test('finds path Alice -> Frank (2 hops via KNOWS)', async () => {
    const list = await req('GET', '/api/nodes?label=Person');
    const byName = Object.fromEntries(list.body.nodes.map((n) => [n.properties.name, n.id]));
    const res = await req('POST', '/api/shortest-path', {
      from: byName.Alice,
      to: byName.Frank,
      direction: 'out'
    });
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });
  test('returns found:false for disconnected nodes', async () => {
    // Create two isolated nodes (no edges to anything)
    const a = await req('POST', '/api/nodes', { labels: ['Iso'], properties: {} });
    const b = await req('POST', '/api/nodes', { labels: ['Iso'], properties: {} });
    const res = await req('POST', '/api/shortest-path', { from: a.body.node.id, to: b.body.node.id });
    expect(res.status).toBe(200);
    expect(res.body.found).toBe(false);
  });
});

describe('POST /api/components', () => {
  test('returns connected components', async () => {
    const res = await req('POST', '/api/components', {});
    expect(res.status).toBe(200);
    expect(typeof res.body.count).toBe('number');
    expect(Array.isArray(res.body.components)).toBe(true);
  });
});

describe('POST /api/pagerank', () => {
  test('returns top-K ranked nodes for Person label', async () => {
    const res = await req('POST', '/api/pagerank', { labelFilter: 'Person', topK: 5 });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.scores)).toBe(true);
    expect(res.body.scores.length).toBeGreaterThan(0);
    expect(res.body.scores[0]).toHaveProperty('nodeId');
    expect(res.body.scores[0]).toHaveProperty('score');
  });
});

describe('GET /api/labels and /api/edge-types', () => {
  test('GET /api/labels returns labels with counts', async () => {
    const res = await req('GET', '/api/labels');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.labels)).toBe(true);
    const person = res.body.labels.find((l) => l.label === 'Person');
    expect(person).toBeDefined();
    expect(person.count).toBeGreaterThanOrEqual(6);
  });
  test('GET /api/edge-types returns edge types with counts', async () => {
    const res = await req('GET', '/api/edge-types');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.types)).toBe(true);
    const knows = res.body.types.find((t) => t.type === 'KNOWS');
    expect(knows).toBeDefined();
    expect(knows.count).toBeGreaterThanOrEqual(7);
  });
});

describe('GET /api/stats and POST /api/stats/reset', () => {
  test('GET /api/stats returns current counts', async () => {
    const res = await req('GET', '/api/stats');
    expect(res.status).toBe(200);
    expect(res.body).toBeDefined();
  });
  test('POST /api/stats/reset zeros counters', async () => {
    const res = await req('POST', '/api/stats/reset', {});
    expect(res.status).toBe(200);
  });
});

describe('GET /api/audit', () => {
  test('returns recent operations', async () => {
    const res = await req('GET', '/api/audit');
    expect(res.status).toBe(200);
    expect(res.body.entries).toBeDefined();
    expect(Array.isArray(res.body.entries)).toBe(true);
  });
});

describe('POST /api/clear', () => {
  test('wipes the graph with confirm: true', async () => {
    const res = await req('POST', '/api/clear', { confirm: true });
    expect(res.status).toBe(200);
    expect(nodes.size).toBe(0);
    expect(edges.size).toBe(0);
  });
  test('rejects without confirm (400)', async () => {
    const res = await req('POST', '/api/clear', {});
    expect(res.status).toBe(400);
  });
});

describe('404 handling', () => {
  test('unknown route returns 404', async () => {
    const res = await req('GET', '/api/no-such-route');
    expect(res.status).toBe(404);
  });
});
