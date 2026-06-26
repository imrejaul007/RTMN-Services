'use strict';

process.env.GRAPH_DATABASE_NO_LISTEN = '1';
process.env.GRAPH_DATABASE_REQUIRE_AUTH = 'false';
process.env.NODE_ENV = 'test';

var test = require('node:test');
var assert = require('node:assert/strict');
var http = require('http');

Object.keys(require.cache).forEach(function(k) {
  if (k.includes('graph-database')) delete require.cache[k];
});

var exported = require('../src/index.js');
var app = exported.app;

// Exported helpers
var bfs = exported.bfs;
var shortestPath = exported.shortestPath;
var connectedComponents = exported.connectedComponents;
var pageRank = exported.pageRank;
var parsePattern = exported.parsePattern;
var matchesLabel = exported.matchesLabel;
var matchesProps = exported.matchesProps;

// Storage maps for reset
var nodes = exported.nodes;
var edges = exported.edges;
var nodeEdges = exported.nodeEdges;
var edgeIndex = exported.edgeIndex;
var labelIndex = exported.labelIndex;
var stats = exported.stats;
var auditLog = exported.auditLog;

// Seed function (extracted from the IIFE)
function seedGraph() {
  nodes.clear();
  edges.clear();
  nodeEdges.clear();
  edgeIndex.clear();
  labelIndex.clear();
  stats.totalNodesCreated = 0;
  stats.totalNodesDeleted = 0;
  stats.totalEdgesCreated = 0;
  stats.totalEdgesDeleted = 0;
  stats.totalQueries = 0;
  stats.totalTraversals = 0;
  stats.totalShortestPaths = 0;
  stats.totalComponentRuns = 0;
  stats.totalPageRankRuns = 0;
  stats.errors = 0;

  var people = [
    { name: 'Alice',   age: 30, city: 'NYC' },
    { name: 'Bob',     age: 28, city: 'LA' },
    { name: 'Carol',   age: 35, city: 'NYC' },
    { name: 'Dave',    age: 40, city: 'SF' },
    { name: 'Eve',     age: 25, city: 'LA' },
    { name: 'Frank',   age: 50, city: 'SF' }
  ];

  var personIdByName = {};
  for (var i = 0; i < people.length; i++) {
    var p = people[i];
    var id = require('uuid').v4();
    personIdByName[p.name] = id;
    var node = {
      id: id,
      labels: new Set(['Person']),
      properties: Object.assign({}, p),
      createdAt: new Date().toISOString()
    };
    nodes.set(id, node);
    nodeEdges.set(id, { outgoing: new Set(), incoming: new Set() });
    if (!labelIndex.has('Person')) labelIndex.set('Person', new Set());
    labelIndex.get('Person').add(id);
    stats.totalNodesCreated++;
  }

  var acmeId = require('uuid').v4();
  nodes.set(acmeId, {
    id: acmeId,
    labels: new Set(['Company']),
    properties: { name: 'Acme Corp', industry: 'Tech' },
    createdAt: new Date().toISOString()
  });
  nodeEdges.set(acmeId, { outgoing: new Set(), incoming: new Set() });
  labelIndex.set('Company', new Set());
  labelIndex.get('Company').add(acmeId);
  stats.totalNodesCreated++;

  var knowsPairs = [['Alice','Bob'],['Alice','Carol'],['Bob','Dave'],['Carol','Eve'],['Dave','Eve'],['Eve','Frank'],['Alice','Frank']];
  for (var j = 0; j < knowsPairs.length; j++) {
    var pair = knowsPairs[j];
    var eid = require('uuid').v4();
    var e = {
      id: eid,
      type: 'KNOWS',
      from: personIdByName[pair[0]],
      to: personIdByName[pair[1]],
      properties: { since: 2020 },
      createdAt: new Date().toISOString()
    };
    edges.set(eid, e);
    if (!edgeIndex.has('KNOWS')) edgeIndex.set('KNOWS', new Set());
    edgeIndex.get('KNOWS').add(eid);
    nodeEdges.get(e.from).outgoing.add(eid);
    nodeEdges.get(e.to).incoming.add(eid);
    stats.totalEdgesCreated++;
  }

  var worksPairs = [['Alice','Engineer'],['Bob','Manager'],['Carol','Designer']];
  for (var k = 0; k < worksPairs.length; k++) {
    var wp = worksPairs[k];
    var wid = require('uuid').v4();
    var we = {
      id: wid,
      type: 'WORKS_AT',
      from: personIdByName[wp[0]],
      to: acmeId,
      properties: { role: wp[1] },
      createdAt: new Date().toISOString()
    };
    edges.set(wid, we);
    if (!edgeIndex.has('WORKS_AT')) edgeIndex.set('WORKS_AT', new Set());
    edgeIndex.get('WORKS_AT').add(wid);
    nodeEdges.get(we.from).outgoing.add(wid);
    nodeEdges.get(we.to).incoming.add(wid);
    stats.totalEdgesCreated++;
  }
}

function resetGraph() {
  nodes.clear();
  edges.clear();
  nodeEdges.clear();
  edgeIndex.clear();
  labelIndex.clear();
  auditLog.length = 0;
  stats.totalNodesCreated = 0;
  stats.totalNodesDeleted = 0;
  stats.totalEdgesCreated = 0;
  stats.totalEdgesDeleted = 0;
  stats.totalQueries = 0;
  stats.totalTraversals = 0;
  stats.totalShortestPaths = 0;
  stats.totalComponentRuns = 0;
  stats.totalPageRankRuns = 0;
  stats.errors = 0;
}

var server;
var baseUrl;

function req(method, path, body, headers) {
  if (headers === undefined) headers = {};
  return new Promise(function(resolve, reject) {
    var url = new URL(baseUrl + path);
    var opts = {
      method: method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: Object.assign({ 'Content-Type': 'application/json' }, headers)
    };
    var r = http.request(opts, function(res) {
      var chunks = [];
      res.on('data', function(c) { chunks.push(c); });
      res.on('end', function() {
        var raw = Buffer.concat(chunks).toString('utf8');
        var parsed;
        try { parsed = raw ? JSON.parse(raw) : null; } catch (e) { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    r.on('error', reject);
    if (body !== undefined) r.write(JSON.stringify(body));
    r.end();
  });
}

// ============================================================
// Tests
// ============================================================

test('exports', function() {
  assert.equal(typeof app, 'function', 'app is function');
  assert.equal(exported.PORT, 4783, 'PORT is 4783');
  assert.equal(exported.SERVICE_NAME, 'graph-database', 'SERVICE_NAME is graph-database');
  assert.equal(exported.VERSION, '1.0.0', 'VERSION is 1.0.0');
  assert.equal(typeof exported.bfs, 'function', 'bfs exported');
  assert.equal(typeof exported.shortestPath, 'function', 'shortestPath exported');
  assert.equal(typeof exported.connectedComponents, 'function', 'connectedComponents exported');
  assert.equal(typeof exported.pageRank, 'function', 'pageRank exported');
  assert.equal(typeof exported.parsePattern, 'function', 'parsePattern exported');
  assert.equal(typeof exported.authOrBypass, 'function', 'authOrBypass exported');
  assert.equal(typeof nodes, 'object', 'nodes exported');
  assert.equal(typeof edges, 'object', 'edges exported');
  assert.equal(typeof nodeEdges, 'object', 'nodeEdges exported');
  assert.equal(typeof edgeIndex, 'object', 'edgeIndex exported');
  assert.equal(typeof labelIndex, 'object', 'labelIndex exported');
  assert.equal(typeof stats, 'object', 'stats exported');
});

test('parsePattern - simple outgoing edge', function() {
  var result = parsePattern('(a:Person)-[r:KNOWS]->(b:Person)');
  assert.notEqual(result, null, 'parsed successfully');
  assert.equal(result.fromLabels, 'Person', 'fromLabels');
  assert.equal(result.edgeType, 'KNOWS', 'edgeType');
  assert.equal(result.toLabels, 'Person', 'toLabels');
  assert.equal(result.direction, 'out', 'direction out');
});

test('parsePattern - incoming edge', function() {
  var result = parsePattern('(a:Person)<-[r:KNOWS]-(b:Person)');
  assert.notEqual(result, null, 'parsed successfully');
  assert.equal(result.direction, 'in', 'direction in');
});

test('parsePattern - bidirectional edge returns null (not supported)', function() {
  // Trailing dash without arrow is not supported by this parser
  var result = parsePattern('(a:Person)-[r:FOLLOWS]-(b:Person)');
  assert.equal(result, null, 'bidirectional edge not supported');
});

test('parsePattern - with property filter', function() {
  var result = parsePattern("(a:Person {name:'Alice'})-[r:KNOWS]->(b)");
  assert.notEqual(result, null, 'parsed');
  assert.deepEqual(result.fromProps, { name: 'Alice' }, 'fromProps parsed');
});

test('parsePattern - invalid returns null', function() {
  assert.equal(parsePattern('not a pattern'), null, 'invalid returns null');
  assert.equal(parsePattern(null), null, 'null returns null');
});

test('matchesLabel', function() {
  var node = { labels: new Set(['Person', 'Employee']), properties: {} };
  assert.equal(matchesLabel(node, 'Person'), true, 'single label match');
  assert.equal(matchesLabel(node, 'Admin'), false, 'single label no match');
  assert.equal(matchesLabel(node, ['Person', 'Admin']), true, 'array OR match');
  assert.equal(matchesLabel(node, ['Admin', 'Boss']), false, 'array no match');
  assert.equal(matchesLabel(node, null), true, 'null matches all');
  assert.equal(matchesLabel(node, undefined), true, 'undefined matches all');
});

test('matchesProps', function() {
  var node = { properties: { name: 'Alice', age: 30 } };
  assert.equal(matchesProps(node, null), true, 'null matches all');
  assert.equal(matchesProps(node, { name: 'Alice' }), true, 'exact prop match');
  assert.equal(matchesProps(node, { name: 'Bob' }), false, 'prop mismatch');
  assert.equal(matchesProps(node, { name: 'Alice', age: 30 }), true, 'multiple exact match');
  assert.equal(matchesProps(node, { age: 31 }), false, 'partial mismatch');
});

test('bfs - no node', function() {
  var result = bfs('nonexistent-id');
  assert.deepEqual(result, [], 'returns empty for unknown node');
});

test('bfs - seeded graph', function() {
  seedGraph();
  // Alice has outgoing KNOWS edges to Bob, Carol, Frank
  var aliceId;
  nodes.forEach(function(n) {
    if (n.properties.name === 'Alice') aliceId = n.id;
  });
  assert.notEqual(aliceId, undefined, 'found Alice');
  var result = bfs(aliceId, { maxDepth: 1 });
  assert.ok(result.length >= 1, 'found neighbors at depth 1');
  assert.equal(result[0].depth, 0, 'first result is start node');
});

test('bfs - direction filters', function() {
  seedGraph();
  var aliceId, bobId;
  nodes.forEach(function(n) {
    if (n.properties.name === 'Alice') aliceId = n.id;
    if (n.properties.name === 'Bob') bobId = n.id;
  });
  var out = bfs(aliceId, { direction: 'out' });
  var inc = bfs(bobId, { direction: 'in' });
  assert.ok(out.length >= 1, 'outgoing traversal');
  assert.ok(inc.length >= 1, 'incoming traversal');
});

test('shortestPath - same node', function() {
  seedGraph();
  var aliceId;
  nodes.forEach(function(n) {
    if (n.properties.name === 'Alice') aliceId = n.id;
  });
  var result = shortestPath(aliceId, aliceId);
  assert.equal(result.length, 0, 'zero-length for same node');
});

test('shortestPath - known path', function() {
  seedGraph();
  var aliceId, frankId;
  nodes.forEach(function(n) {
    if (n.properties.name === 'Alice') aliceId = n.id;
    if (n.properties.name === 'Frank') frankId = n.id;
  });
  var result = shortestPath(aliceId, frankId);
  assert.equal(result !== null, true, 'path found');
  assert.ok(result.length >= 1, 'path length >= 1');
});

test('shortestPath - no path', function() {
  resetGraph();
  // Two isolated nodes
  var id1 = require('uuid').v4();
  var id2 = require('uuid').v4();
  nodes.set(id1, { id: id1, labels: new Set(['A']), properties: {}, createdAt: new Date().toISOString() });
  nodes.set(id2, { id: id2, labels: new Set(['B']), properties: {}, createdAt: new Date().toISOString() });
  var result = shortestPath(id1, id2);
  assert.equal(result, null, 'no path between isolated nodes');
});

test('connectedComponents - seeded graph is one component', function() {
  seedGraph();
  var result = connectedComponents({});
  assert.ok(result.length >= 1, 'has components');
  // The seeded graph (7 people + 1 company) should be one connected component
  assert.ok(result[0].size >= 7, 'largest component includes all people');
});

test('connectedComponents - isolated nodes', function() {
  resetGraph();
  for (var i = 0; i < 3; i++) {
    var nid = require('uuid').v4();
    nodes.set(nid, { id: nid, labels: new Set(['Iso']), properties: {}, createdAt: new Date().toISOString() });
  }
  var result = connectedComponents({});
  // Each isolated node is its own component (no edges between them)
  assert.equal(result.length, 3, 'three components for 3 isolated nodes');
  assert.equal(result[0].size, 1, 'largest component has 1 node');
});

test('pageRank - seeded graph', function() {
  seedGraph();
  var result = pageRank({});
  assert.ok(result.scores.length > 0, 'has scores');
  assert.equal(result.damping, 0.85, 'default damping');
  assert.equal(result.iterations, 20, 'default iterations');
  assert.ok(result.scores[0].score > 0, 'top score > 0');
  assert.ok(result.scores[0].nodeId, 'has nodeId');
  assert.ok(typeof result.scores[0].rank === 'number', 'has rank');
});

test('setup - starts server on port 0', async function() {
  resetGraph();
  seedGraph();
  server = http.createServer(app);
  await new Promise(function(resolve) { server.listen(0, resolve); });
  baseUrl = 'http://127.0.0.1:' + server.address().port;
  assert.ok(server.address().port > 0, 'server on non-zero port');
});

test('GET /ready returns 200', async function() {
  var res = await req('GET', '/ready');
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.ready, true, 'ready true');
});

test('GET /api/health returns 200', async function() {
  var res = await req('GET', '/api/health');
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.service, 'graph-database', 'service name');
  assert.ok(typeof res.body.counts.nodes === 'number', 'has node count');
});

test('GET /api/labels returns seeded labels', async function() {
  var res = await req('GET', '/api/labels');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.labels.length >= 2, 'has Person and Company labels');
});

test('GET /api/edge-types returns seeded types', async function() {
  var res = await req('GET', '/api/edge-types');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.types.length >= 2, 'has KNOWS and WORKS_AT');
});

test('GET /api/nodes returns seeded nodes', async function() {
  var res = await req('GET', '/api/nodes');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.count >= 7, 'has seeded people nodes');
});

test('GET /api/nodes with label filter', async function() {
  var res = await req('GET', '/api/nodes?label=Person');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.nodes.length >= 6, 'has Person nodes');
  res.body.nodes.forEach(function(n) {
    assert.ok(n.labels.includes('Person'), 'all have Person label');
  });
});

test('GET /api/nodes/:id returns seeded node', async function() {
  var aliceId;
  nodes.forEach(function(n) {
    if (n.properties && n.properties.name === 'Alice') aliceId = n.id;
  });
  if (!aliceId) { assert.ok(true, 'Alice not in seeded data'); return; }
  var res = await req('GET', '/api/nodes/' + aliceId);
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.node.properties.name, 'Alice', 'Alice returned');
});

test('GET /api/nodes/:id returns 404 for unknown', async function() {
  var res = await req('GET', '/api/nodes/unknown-id-xyz');
  assert.equal(res.status, 404, 'status 404');
});

test('GET /api/edges returns seeded edges', async function() {
  var res = await req('GET', '/api/edges');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.count >= 10, 'has seeded edges');
});

test('GET /api/edges/:id returns seeded edge', async function() {
  var edgeId;
  edges.forEach(function(e) {
    if (e.type === 'KNOWS') { edgeId = e.id; return; }
  });
  if (!edgeId) { assert.ok(true, 'no KNOWS edge'); return; }
  var res = await req('GET', '/api/edges/' + edgeId);
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.edge.type, 'KNOWS', 'KNOWS edge returned');
});

test('GET /api/edges/:id returns 404 for unknown', async function() {
  var res = await req('GET', '/api/edges/unknown-id-xyz');
  assert.equal(res.status, 404, 'status 404');
});

test('POST /api/nodes creates node', async function() {
  resetGraph();
  var res = await req('POST', '/api/nodes', {
    labels: ['Test'],
    properties: { name: 'TestNode' }
  });
  assert.equal(res.status, 201, 'status 201');
  assert.ok(res.body.node, 'has node');
  assert.equal(res.body.node.labels[0], 'Test', 'label set');
  assert.equal(res.body.node.properties.name, 'TestNode', 'properties set');
});

test('POST /api/nodes rejects non-array labels', async function() {
  var res = await req('POST', '/api/nodes', { labels: 'not-array', properties: {} });
  assert.equal(res.status, 400, 'status 400');
});

test('POST /api/nodes rejects null properties', async function() {
  var res = await req('POST', '/api/nodes', { labels: ['Test'], properties: null });
  assert.equal(res.status, 400, 'status 400');
});

test('POST /api/edges creates edge', async function() {
  resetGraph();
  // Create two nodes first
  var r1 = await req('POST', '/api/nodes', { labels: ['A'], properties: { name: 'A' } });
  var r2 = await req('POST', '/api/nodes', { labels: ['B'], properties: { name: 'B' } });
  var n1 = r1.body.node.id;
  var n2 = r2.body.node.id;

  var res = await req('POST', '/api/edges', {
    type: 'LINKS_TO',
    from: n1,
    to: n2,
    properties: { weight: 1 }
  });
  assert.equal(res.status, 201, 'status 201');
  assert.equal(res.body.edge.type, 'LINKS_TO', 'edge type');
  assert.equal(res.body.edge.from, n1, 'from set');
  assert.equal(res.body.edge.to, n2, 'to set');
});

test('POST /api/edges rejects missing type', async function() {
  var res = await req('POST', '/api/edges', { from: 'a', to: 'b' });
  assert.equal(res.status, 400, 'status 400');
});

test('POST /api/edges rejects nonexistent from/to', async function() {
  var res = await req('POST', '/api/edges', { type: 'X', from: 'no-such', to: 'no-such' });
  assert.equal(res.status, 400, 'status 400');
});

test('POST /api/match pattern match', async function() {
  seedGraph();
  var res = await req('POST', '/api/match', {
    pattern: '(a:Person)-[r:KNOWS]->(b:Person)'
  });
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.count >= 0, 'has count');
  assert.ok(res.body.parsed, 'has parsed pattern');
});

test('POST /api/match invalid pattern', async function() {
  seedGraph();
  var res = await req('POST', '/api/match', { pattern: 'not valid' });
  assert.equal(res.status, 400, 'status 400');
});

test('POST /api/traverse BFS', async function() {
  seedGraph();
  var aliceId;
  nodes.forEach(function(n) {
    if (n.properties.name === 'Alice') aliceId = n.id;
  });
  if (!aliceId) { assert.ok(true, 'Alice not found'); return; }
  var res = await req('POST', '/api/traverse', { startId: aliceId, maxDepth: 2 });
  assert.equal(res.status, 200, 'status 200');
  assert.ok(res.body.visited >= 1, 'visited nodes');
  assert.ok(res.body.results, 'has results');
});

test('POST /api/traverse rejects unknown startId', async function() {
  var res = await req('POST', '/api/traverse', { startId: 'unknown-id' });
  assert.equal(res.status, 400, 'status 400');
});

test('POST /api/shortest-path finds path', async function() {
  seedGraph();
  var aliceId, frankId;
  nodes.forEach(function(n) {
    if (n.properties.name === 'Alice') aliceId = n.id;
    if (n.properties.name === 'Frank') frankId = n.id;
  });
  if (!aliceId || !frankId) { assert.ok(true, 'nodes not found'); return; }
  var res = await req('POST', '/api/shortest-path', { from: aliceId, to: frankId });
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.found, true, 'path found');
  assert.ok(res.body.length >= 1, 'path length >= 1');
});

test('POST /api/shortest-path no path', async function() {
  resetGraph();
  var id1 = require('uuid').v4();
  var id2 = require('uuid').v4();
  nodes.set(id1, { id: id1, labels: new Set(['X']), properties: {}, createdAt: new Date().toISOString() });
  nodes.set(id2, { id: id2, labels: new Set(['Y']), properties: {}, createdAt: new Date().toISOString() });
  var res = await req('POST', '/api/shortest-path', { from: id1, to: id2 });
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.found, false, 'no path found');
});

test('POST /api/components', async function() {
  seedGraph();
  var res = await req('POST', '/api/components', {});
  assert.equal(res.status, 200, 'status 200');
  assert.ok(typeof res.body.count === 'number', 'has count');
  assert.ok(typeof res.body.largestSize === 'number', 'has largestSize');
});

test('POST /api/pagerank', async function() {
  seedGraph();
  var res = await req('POST', '/api/pagerank', {});
  assert.equal(res.status, 200, 'status 200');
  assert.ok(Array.isArray(res.body.scores), 'has scores array');
  assert.ok(res.body.scores.length > 0, 'has score entries');
});

test('POST /api/pagerank with damping and iterations', async function() {
  seedGraph();
  var res = await req('POST', '/api/pagerank', { damping: 0.7, iterations: 5, topK: 3 });
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.damping, 0.7, 'damping set');
  assert.equal(res.body.iterations, 5, 'iterations set');
  assert.equal(res.body.scores.length, 3, 'topK applied');
});

test('GET /api/degree/:id', async function() {
  seedGraph();
  var aliceId;
  nodes.forEach(function(n) {
    if (n.properties.name === 'Alice') aliceId = n.id;
  });
  if (!aliceId) { assert.ok(true, 'Alice not found'); return; }
  var res = await req('GET', '/api/degree/' + aliceId);
  assert.equal(res.status, 200, 'status 200');
  assert.ok(typeof res.body.outDegree === 'number', 'has outDegree');
  assert.ok(typeof res.body.inDegree === 'number', 'has inDegree');
  assert.ok(res.body.outDegree >= 1, 'Alice has outgoing edges');
});

test('GET /api/degree/:id 404 for unknown', async function() {
  var res = await req('GET', '/api/degree/unknown-id');
  assert.equal(res.status, 404, 'status 404');
});

test('GET /api/stats', async function() {
  var res = await req('GET', '/api/stats');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(typeof res.body.counts === 'object', 'has counts');
});

test('GET /api/audit', async function() {
  var res = await req('GET', '/api/audit');
  assert.equal(res.status, 200, 'status 200');
  assert.ok(Array.isArray(res.body.entries), 'has entries');
});

test('POST /api/stats/reset', async function() {
  var res = await req('POST', '/api/stats/reset', {});
  assert.equal(res.status, 200, 'status 200');
  assert.equal(res.body.message, 'Stats reset', 'reset message');
});

test('GET /health redirects', async function() {
  var res = await req('GET', '/health');
  assert.equal(res.status, 301, 'status 301');
});

test('GET /unknown returns 404', async function() {
  var res = await req('GET', '/unknown/route');
  assert.equal(res.status, 404, 'status 404');
});

test('GET /api/nodes/:id - not found', async function() {
  var res = await req('GET', '/api/nodes/this-does-not-exist');
  assert.equal(res.status, 404, 'status 404');
});

test('GET /api/edges/:id - not found', async function() {
  var res = await req('GET', '/api/edges/this-does-not-exist');
  assert.equal(res.status, 404, 'status 404');
});
