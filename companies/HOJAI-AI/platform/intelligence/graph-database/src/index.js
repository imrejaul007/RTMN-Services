/**
 * RTMN Graph Database Service
 * Port: 4783
 *
 * In-memory property graph database (Neo4j/Memgraph alternative).
 * Single-process, CommonJS. Provides:
 *   - Nodes with arbitrary labels + JSON properties
 *   - Edges with type + JSON properties, directed
 *   - Cypher-lite pattern matching: (a:Label {prop: value})-[r:TYPE]->(b)
 *   - BFS traversal (configurable depth, direction, edge-type filters)
 *   - Shortest path (BFS, unweighted)
 *   - Connected components (undirected union-find)
 *   - PageRank (damped power iteration, 20 iterations default)
 *   - Node-degree analytics
 *   - Full CRUD on nodes, edges, labels
 *
 * Uses Map for O(1) lookups; traversals scan nodes/edges linearly.
 * TODO: swap Map for Neo4j or Memgraph when graph size exceeds ~100k nodes.
 */

'use strict';

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');

const PORT = process.env.PORT || 4783;
const SERVICE_NAME = 'graph-database';

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------
const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors('*'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

app.get('/health', (_req, res) => res.redirect(301, '/api/health'));

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
/**
 * nodes: id -> { id, labels: Set<string>, properties: object, createdAt }
 * edges: id -> { id, type, from, to, properties, createdAt }
 * nodeEdges: nodeId -> { outgoing: Set<edgeId>, incoming: Set<edgeId> }
 * edgeIndex: type -> Set<edgeId>
 * labelIndex: label -> Set<nodeId>
 * auditLog: capped array
 */
const nodes = new PersistentMap('nodes', { serviceName: 'graph-database' });
const edges = new PersistentMap('edges', { serviceName: 'graph-database' });
const nodeEdges = new PersistentMap('node-edges', { serviceName: 'graph-database' }); // nodeId -> { outgoing: Set, incoming: Set }
const edgeIndex = new PersistentMap('edge-index', { serviceName: 'graph-database' }); // type -> Set<edgeId>
const labelIndex = new PersistentMap('label-index', { serviceName: 'graph-database' }); // label -> Set<nodeId>

const AUDIT_CAP = 5000;
const auditLog = [];

const stats = {
  totalNodesCreated: 0,
  totalNodesDeleted: 0,
  totalEdgesCreated: 0,
  totalEdgesDeleted: 0,
  totalQueries: 0,
  totalTraversals: 0,
  totalShortestPaths: 0,
  totalComponentRuns: 0,
  totalPageRankRuns: 0,
  errors: 0
};

const startedAt = new Date().toISOString();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function principalOf(req) {
  return req.headers['x-principal'] || req.headers['x-user-id'] || 'anonymous';
}

function audit(entry) {
  auditLog.push({ ...entry, ts: new Date().toISOString() });
  if (auditLog.length > AUDIT_CAP) auditLog.splice(0, auditLog.length - AUDIT_CAP);
}

function ensureNodeEdges(id) {
  if (!nodeEdges.has(id)) nodeEdges.set(id, { outgoing: new Set(), incoming: new Set() });
  return nodeEdges.get(id);
}

/** Safe label-index getter — initializes missing labels with a fresh Set. */
function getLabelSet(lbl) {
  if (!labelIndex.has(lbl)) labelIndex.set(lbl, new Set());
  return labelIndex.get(lbl);
}

function matchesLabel(node, labelFilter) {
  if (!labelFilter) return true;
  if (Array.isArray(labelFilter)) {
    // OR semantics: node has any of the labels
    return labelFilter.some(l => node.labels.has(l));
  }
  return node.labels.has(labelFilter);
}

function matchesProps(node, propFilter) {
  if (!propFilter || typeof propFilter !== 'object') return true;
  for (const [k, v] of Object.entries(propFilter)) {
    if (node.properties[k] !== v) return false;
  }
  return true;
}

/**
 * Parse a simplified Cypher-lite pattern:
 *   "(a:Person {name: 'Alice'})-[r:KNOWS]->(b:Person)"
 * Returns { fromVar, fromLabels, fromProps, edgeVar, edgeType, edgeDir, toVar, toLabels, toProps }
 *
 * Supported forms:
 *   (var:Label {prop: val})
 *   (var)                  - any node
 *   (var:Label1|Label2)    - any of multiple labels (treated as array)
 *   -[var:TYPE]->
 *   -[var]->
 *   -[var:TYPE]-   (no direction)
 *   <-[var:TYPE]-  (incoming)
 */
function parsePattern(pattern) {
  if (typeof pattern !== 'string') return null;
  let p = pattern.trim();
  let incoming = false;

  // Normalize incoming pattern (a)<-[r]-(b) to outgoing (b)-[r]->(a) so the main
  // regex below can match. We track `incoming` so the matcher flips results.
  if (/<-/.test(p) && !/->/.test(p)) {
    const swap = p.match(/^\(\s*([^)]+)\s*\)\s*<-\s*(\[[^\]]+\])\s*-\s*\(\s*([^)]+)\s*\)$/);
    if (swap) {
      p = `(${swap[3]})-${swap[2]}->(${swap[1]})`;
      incoming = true;
    }
  }

  // Match full pattern: (left) -[edge]-> (right) OR (left) <-[edge]- (right)
  // We capture direction by the position of the arrow.
  const re = /^\(\s*([a-zA-Z_][\w]*)?\s*(?::\s*([a-zA-Z_|][\w|]*))?\s*(?:\{([^}]*)\})?\s*\)\s*(?:<?-)(\s*\[\s*([a-zA-Z_][\w]*)?\s*(?::\s*([a-zA-Z_][\w]*))?\s*(?:\{([^}]*)\})?\s*\]\s*)(?:->|-\s*$)/;
  const m = p.match(re);
  if (!m) return null;

  // Detect direction: '->' between edge bracket and to-node = outgoing; '<-' = incoming; '-' alone = both.
  const edgeEnd = p.indexOf(m[4]) + m[4].length;
  const afterEdgeBracket = p.slice(edgeEnd);
  let dir;
  if (/^\s*->/.test(afterEdgeBracket)) dir = 'out';
  else if (/^\s*<-/.test(afterEdgeBracket)) dir = 'in';
  else dir = 'both';

  const fromVar = m[1] || null;
  const fromLabels = m[2] ? (m[2].includes('|') ? m[2].split('|') : m[2]) : null;
  const fromPropsStr = m[3] || '';
  const edgeVar = m[5] || null;
  const edgeType = m[6] || null;
  const edgePropsStr = m[7] || '';

  // Now find the right-side node after the edge: (var:Label {...})
  // m[4] ends at the bracket (before the trailing arrow), so slice from there.
  const afterEdge = p.slice(p.indexOf(m[4]) + m[4].length);
  // Strip any leading arrow ('->' or '-') or '<-' (incoming direction).
  const trimmed = afterEdge.replace(/^(->|-->|<--|<-|-)\s*/, '').trim();
  const rightRe = /^\(?\s*([a-zA-Z_][\w]*)?\s*(?::\s*([a-zA-Z_|][\w|]*))?\s*(?:\{([^}]*)\})?\s*\)?\s*$/;
  const rm = trimmed.match(rightRe);
  if (!rm) return null;

  const toVar = rm[1] || null;
  const toLabels = rm[2] ? (rm[2].includes('|') ? rm[2].split('|') : rm[2]) : null;
  const toPropsStr = rm[3] || '';

  return {
    fromVar, fromLabels, fromProps: parseProps(fromPropsStr),
    edgeVar, edgeType, edgeProps: parseProps(edgePropsStr),
    toVar, toLabels, toProps: parseProps(toPropsStr),
    direction: incoming ? 'in' : dir,
    incoming
  };
}

function parseProps(s) {
  if (!s || !s.trim()) return null;
  // Parse key: value pairs. Values may be string (single-quoted), number, true/false/null.
  const obj = {};
  // Tokenize on commas at top level (no nested objects here).
  const parts = [];
  let depth = 0, cur = '';
  for (const ch of s) {
    if (ch === ',' && depth === 0) { parts.push(cur); cur = ''; }
    else { cur += ch; if (ch === '{' || ch === '[') depth++; else if (ch === '}' || ch === ']') depth--; }
  }
  if (cur.trim()) parts.push(cur);
  for (const part of parts) {
    const idx = part.indexOf(':');
    if (idx < 0) continue;
    const k = part.slice(0, idx).trim();
    const vRaw = part.slice(idx + 1).trim();
    obj[k] = coerceValue(vRaw);
  }
  return obj;
}

function coerceValue(v) {
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (v === 'null') return null;
  if (/^-?\d+$/.test(v)) return parseInt(v, 10);
  if (/^-?\d+\.\d+$/.test(v)) return parseFloat(v);
  // Strip surrounding single or double quotes
  if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) {
    return v.slice(1, -1);
  }
  return v;
}

/**
 * BFS traversal from a start node.
 * options:
 *   maxDepth (default 3)
 *   direction: 'out' | 'in' | 'both' (default 'out')
 *   edgeTypes: array of types (default all)
 *   labelFilter: only visit nodes with these labels
 * Returns: [{ node, depth, path: [edgeId, ...] }]
 */
function bfs(startId, options = {}) {
  const maxDepth = options.maxDepth || 3;
  const direction = options.direction || 'out';
  const edgeTypes = options.edgeTypes || null;
  const labelFilter = options.labelFilter || null;

  const start = nodes.get(startId);
  if (!start) return [];

  const visited = new Set([startId]);
  let frontier = [{ id: startId, depth: 0, path: [] }];
  const results = [{ node: toPublicNode(start), depth: 0, path: [] }];

  while (frontier.length > 0) {
    const nextFrontier = [];
    for (const { id, depth, path } of frontier) {
      if (depth >= maxDepth) continue;
      const ne = ensureNodeEdges(id);
      const candidates = [];

      if (direction === 'out' || direction === 'both') {
        for (const eid of ne.outgoing) candidates.push({ eid, neighborId: edges.get(eid).to });
      }
      if (direction === 'in' || direction === 'both') {
        for (const eid of ne.incoming) candidates.push({ eid, neighborId: edges.get(eid).from });
      }

      for (const { eid, neighborId } of candidates) {
        if (visited.has(neighborId)) continue;
        const edge = edges.get(eid);
        if (edgeTypes && !edgeTypes.includes(edge.type)) continue;
        const neighbor = nodes.get(neighborId);
        if (!neighbor) continue;
        if (labelFilter && !matchesLabel(neighbor, labelFilter)) continue;
        visited.add(neighborId);
        const newPath = [...path, eid];
        results.push({ node: toPublicNode(neighbor), depth: depth + 1, path: newPath });
        nextFrontier.push({ id: neighborId, depth: depth + 1, path: newPath });
      }
    }
    frontier = nextFrontier;
  }
  return results;
}

/**
 * Shortest path (BFS, unweighted). Returns array of nodes + edges or null.
 */
function shortestPath(fromId, toId, options = {}) {
  const direction = options.direction || 'out';
  const edgeTypes = options.edgeTypes || null;

  if (!nodes.has(fromId) || !nodes.has(toId)) return null;
  if (fromId === toId) return { length: 0, nodes: [toPublicNode(nodes.get(fromId))], edges: [] };

  const visited = new Set([fromId]);
  const queue = [{ id: fromId, path: [], edgePath: [] }];

  while (queue.length > 0) {
    const { id, path, edgePath } = queue.shift();
    const ne = ensureNodeEdges(id);
    const candidates = [];

    if (direction === 'out' || direction === 'both') {
      for (const eid of ne.outgoing) {
        const e = edges.get(eid);
        if (edgeTypes && !edgeTypes.includes(e.type)) continue;
        candidates.push({ eid, neighborId: e.to });
      }
    }
    if (direction === 'in' || direction === 'both') {
      for (const eid of ne.incoming) {
        const e = edges.get(eid);
        if (edgeTypes && !edgeTypes.includes(e.type)) continue;
        candidates.push({ eid, neighborId: e.from });
      }
    }

    for (const { eid, neighborId } of candidates) {
      if (visited.has(neighborId)) continue;
      visited.add(neighborId);
      const newPath = [...path, neighborId];
      const newEdgePath = [...edgePath, eid];
      if (neighborId === toId) {
        const resultNodes = [toPublicNode(nodes.get(fromId)), ...newPath.map(id => toPublicNode(nodes.get(id)))];
        const resultEdges = newEdgePath.map(eid => toPublicEdge(edges.get(eid)));
        return { length: newPath.length, nodes: resultNodes, edges: resultEdges };
      }
      queue.push({ id: neighborId, path: newPath, edgePath: newEdgePath });
    }
  }
  return null;
}

/**
 * Connected components via union-find over undirected adjacency.
 * Returns array of { id, size, nodes: [node, ...] }
 */
function connectedComponents(options = {}) {
  const labelFilter = options.labelFilter || null;
  const eligibleIds = [];
  for (const n of nodes.values()) {
    if (labelFilter && !matchesLabel(n, labelFilter)) continue;
    eligibleIds.push(n.id);
  }

  const parent = new PersistentMap('parent', { serviceName: 'graph-database' });
  for (const id of eligibleIds) parent.set(id, id);
  function find(x) {
    while (parent.get(x) !== x) {
      parent.set(x, parent.get(parent.get(x)));
      x = parent.get(x);
    }
    return x;
  }
  function union(a, b) {
    const ra = find(a), rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  }

  // Union across edges (treat as undirected)
  for (const e of edges.values()) {
    if (!parent.has(e.from) || !parent.has(e.to)) continue;
    union(e.from, e.to);
  }

  // Group
  const groups = new PersistentMap('groups', { serviceName: 'graph-database' });
  for (const id of eligibleIds) {
    const root = find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(id);
  }

  const result = [];
  for (const [root, members] of groups) {
    result.push({
      id: root,
      size: members.length,
      nodes: members.map(id => toPublicNode(nodes.get(id)))
    });
  }
  result.sort((a, b) => b.size - a.size);
  return result;
}

/**
 * PageRank (damped power iteration).
 * options:
 *   damping (default 0.85)
 *   iterations (default 20)
 *   labelFilter (default all nodes)
 */
function pageRank(options = {}) {
  const damping = options.damping ?? 0.85;
  const iterations = options.iterations || 20;
  const labelFilter = options.labelFilter || null;

  const nodeIds = [];
  for (const n of nodes.values()) {
    if (labelFilter && !matchesLabel(n, labelFilter)) continue;
    nodeIds.push(n.id);
  }
  const N = nodeIds.length;
  if (N === 0) return { iterations: 0, scores: [] };

  const idIndex = new PersistentMap('id-index', { serviceName: 'graph-database' });
  nodeIds.forEach((id, i) => idIndex.set(id, i));

  // Build adjacency: for each node, list of nodes it points to.
  const outAdj = Array.from({ length: N }, () => []);
  const inAdj = Array.from({ length: N }, () => []);
  for (const e of edges.values()) {
    const fi = idIndex.get(e.from);
    const ti = idIndex.get(e.to);
    if (fi !== undefined && ti !== undefined) {
      outAdj[fi].push(ti);
      inAdj[ti].push(fi);
    }
  }

  let scores = new Array(N).fill(1 / N);
  for (let it = 0; it < iterations; it++) {
    const next = new Array(N).fill((1 - damping) / N);
    let danglingSum = 0;
    for (let i = 0; i < N; i++) {
      if (outAdj[i].length === 0) danglingSum += scores[i];
    }
    for (let i = 0; i < N; i++) {
      const incoming = inAdj[i];
      let s = 0;
      for (const j of incoming) {
        s += scores[j] / outAdj[j].length;
      }
      next[i] += damping * s + damping * (danglingSum / N);
    }
    scores = next;
  }

  const ranked = nodeIds.map((id, i) => ({
    nodeId: id,
    score: +scores[i].toFixed(8),
    rank: 0
  }));
  ranked.sort((a, b) => b.score - a.score);
  ranked.forEach((r, i) => r.rank = i + 1);

  return {
    damping,
    iterations,
    nodeCount: N,
    edgeCount: edges.size,
    scores: ranked
  };
}

function toPublicNode(n) {
  return {
    id: n.id,
    labels: Array.from(n.labels),
    properties: n.properties,
    createdAt: n.createdAt
  };
}

function toPublicEdge(e) {
  return {
    id: e.id,
    type: e.type,
    from: e.from,
    to: e.to,
    properties: e.properties,
    createdAt: e.createdAt
  };
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** GET /api/health */
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    port: String(PORT),
    version: '1.0.0',
    counts: {
      nodes: nodes.size,
      edges: edges.size,
      labels: labelIndex.size,
      edgeTypes: edgeIndex.size
    },
    stats,
    uptime: process.uptime(),
    startedAt,
    timestamp: new Date().toISOString()
  });
});

/** POST /api/nodes - create a node. Body: { labels: [...], properties: {...} } */
app.post('/api/nodes',requireAuth,  (req, res) => {
  const { labels = [], properties = {} } = req.body || {};
  if (!Array.isArray(labels)) {
    return res.status(400).json({ error: 'labels (array of strings) is required' });
  }
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
    return res.status(400).json({ error: 'properties must be an object' });
  }

  const id = uuidv4();
  const node = {
    id,
    labels: new Set(labels),
    properties,
    createdAt: new Date().toISOString()
  };
  nodes.set(id, node);
  ensureNodeEdges(id);
  for (const lbl of labels) {
    if (!labelIndex.has(lbl)) labelIndex.set(lbl, new Set());
    getLabelSet(lbl).add(id);
  }
  stats.totalNodesCreated++;

  audit({
    op: 'node-create',
    nodeId: id,
    labels,
    propertiesCount: Object.keys(properties).length,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.status(201).json({ message: 'Node created', node: toPublicNode(node) });
});

/** POST /api/nodes/batch - bulk create. Body: { nodes: [{ labels, properties }, ...] } */
app.post('/api/nodes/batch',requireAuth,  (req, res) => {
  const { nodes: list = [] } = req.body || {};
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: 'nodes (array) is required' });
  }
  if (list.length > 1000) {
    return res.status(400).json({ error: 'max 1000 nodes per batch' });
  }

  const created = [];
  for (const item of list) {
    const labels = item.labels || [];
    const properties = item.properties || {};
    if (!Array.isArray(labels)) continue;
    if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) continue;
    const id = uuidv4();
    const node = { id, labels: new Set(labels), properties, createdAt: new Date().toISOString() };
    nodes.set(id, node);
    ensureNodeEdges(id);
    for (const lbl of labels) {
      getLabelSet(lbl).add(id);
    }
    stats.totalNodesCreated++;
    created.push(toPublicNode(node));
  }

  audit({
    op: 'node-batch-create',
    requested: list.length,
    created: created.length,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.status(201).json({ message: 'Nodes created', count: created.length, nodes: created });
});

/** GET /api/nodes/:id - get one node */
app.get('/api/nodes/:id', (req, res) => {
  const n = nodes.get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Node not found' });
  res.json({ node: toPublicNode(n) });
});

/** PATCH /api/nodes/:id - update labels and/or properties. Body: { addLabels?, removeLabels?, setProperties?, removeProperties? } */
app.patch('/api/nodes/:id',requireAuth,  (req, res) => {
  const n = nodes.get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Node not found' });
  const { addLabels = [], removeLabels = [], setProperties, removeProperties = [] } = req.body || {};

  for (const lbl of addLabels) {
    if (typeof lbl !== 'string') continue;
    n.labels.add(lbl);
    getLabelSet(lbl).add(n.id);
  }
  for (const lbl of removeLabels) {
    if (typeof lbl !== 'string') continue;
    n.labels.delete(lbl);
    if (labelIndex.has(lbl)) getLabelSet(lbl).delete(n.id);
  }
  if (setProperties && typeof setProperties === 'object' && !Array.isArray(setProperties)) {
    Object.assign(n.properties, setProperties);
  }
  for (const k of removeProperties) {
    if (typeof k !== 'string') continue;
    delete n.properties[k];
  }

  audit({
    op: 'node-update',
    nodeId: n.id,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.json({ message: 'Node updated', node: toPublicNode(n) });
});

/** DELETE /api/nodes/:id - delete node + all incident edges */
app.delete('/api/nodes/:id',requireAuth,  (req, res) => {
  const n = nodes.get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Node not found' });

  const ne = ensureNodeEdges(n.id);
  const incidentEdges = new Set([...ne.outgoing, ...ne.incoming]);
  for (const eid of incidentEdges) {
    const e = edges.get(eid);
    if (!e) continue;
    edges.delete(eid);
    if (edgeIndex.has(e.type)) edgeIndex.get(e.type).delete(eid);
    const fromNe = nodeEdges.get(e.from);
    const toNe = nodeEdges.get(e.to);
    if (fromNe) fromNe.outgoing.delete(eid);
    if (toNe) toNe.incoming.delete(eid);
    stats.totalEdgesDeleted++;
  }

  for (const lbl of n.labels) {
    if (labelIndex.has(lbl)) getLabelSet(lbl).delete(n.id);
  }
  nodeEdges.delete(n.id);
  nodes.delete(n.id);
  stats.totalNodesDeleted++;

  audit({
    op: 'node-delete',
    nodeId: n.id,
    deletedEdges: incidentEdges.size,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.json({ message: 'Node deleted', id: n.id, deletedEdges: incidentEdges.size });
});

/** GET /api/nodes - list nodes. Query: ?label=X, ?limit=50, ?offset=0 */
app.get('/api/nodes', (req, res) => {
  const { label, limit, offset } = req.query;
  let list = Array.from(nodes.values());

  if (label) {
    const ids = labelIndex.get(label) || new Set();
    if (ids) {
      list = list.filter(n => ids.has(n.id));
    } else {
      list = [];
    }
  }
  list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

  const off = parseInt(offset) || 0;
  const lim = Math.min(parseInt(limit) || 50, 500);
  const page = list.slice(off, off + lim);

  res.json({
    count: list.length,
    limit: lim,
    offset: off,
    nodes: page.map(toPublicNode)
  });
});

/** POST /api/edges - create an edge. Body: { type, from, to, properties? } */
app.post('/api/edges',requireAuth,  (req, res) => {
  const { type, from, to, properties = {} } = req.body || {};
  if (typeof type !== 'string' || !type.trim()) {
    return res.status(400).json({ error: 'type (non-empty string) is required' });
  }
  if (!nodes.has(from)) {
    return res.status(400).json({ error: `from node '${from}' not found` });
  }
  if (!nodes.has(to)) {
    return res.status(400).json({ error: `to node '${to}' not found` });
  }
  if (typeof properties !== 'object' || properties === null || Array.isArray(properties)) {
    return res.status(400).json({ error: 'properties must be an object' });
  }

  const id = uuidv4();
  const edge = {
    id,
    type,
    from,
    to,
    properties,
    createdAt: new Date().toISOString()
  };
  edges.set(id, edge);
  if (!edgeIndex.has(type)) edgeIndex.set(type, new Set());
  edgeIndex.get(type).add(id);

  const fromNe = ensureNodeEdges(from);
  const toNe = ensureNodeEdges(to);
  fromNe.outgoing.add(id);
  toNe.incoming.add(id);
  stats.totalEdgesCreated++;

  audit({
    op: 'edge-create',
    edgeId: id,
    type, from, to,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.status(201).json({ message: 'Edge created', edge: toPublicEdge(edge) });
});

/** POST /api/edges/batch - bulk create. Body: { edges: [{ type, from, to, properties? }, ...] } */
app.post('/api/edges/batch',requireAuth,  (req, res) => {
  const { edges: list = [] } = req.body || {};
  if (!Array.isArray(list)) {
    return res.status(400).json({ error: 'edges (array) is required' });
  }
  if (list.length > 5000) {
    return res.status(400).json({ error: 'max 5000 edges per batch' });
  }

  const created = [];
  for (const item of list) {
    if (typeof item.type !== 'string' || !item.type.trim()) continue;
    if (!nodes.has(item.from) || !nodes.has(item.to)) continue;
    const id = uuidv4();
    const edge = {
      id,
      type: item.type,
      from: item.from,
      to: item.to,
      properties: item.properties || {},
      createdAt: new Date().toISOString()
    };
    edges.set(id, edge);
    if (!edgeIndex.has(item.type)) edgeIndex.set(item.type, new Set());
    edgeIndex.get(item.type).add(id);
    const fromNe = ensureNodeEdges(item.from);
    const toNe = ensureNodeEdges(item.to);
    fromNe.outgoing.add(id);
    toNe.incoming.add(id);
    stats.totalEdgesCreated++;
    created.push(toPublicEdge(edge));
  }

  audit({
    op: 'edge-batch-create',
    requested: list.length,
    created: created.length,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.status(201).json({ message: 'Edges created', count: created.length, edges: created });
});

/** GET /api/edges/:id */
app.get('/api/edges/:id', (req, res) => {
  const e = edges.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Edge not found' });
  res.json({ edge: toPublicEdge(e) });
});

/** PATCH /api/edges/:id - update type/properties. Body: { type?, setProperties?, removeProperties? } */
app.patch('/api/edges/:id',requireAuth,  (req, res) => {
  const e = edges.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Edge not found' });
  const { type, setProperties, removeProperties = [] } = req.body || {};

  if (type && typeof type === 'string' && type.trim() && type !== e.type) {
    if (edgeIndex.has(e.type)) edgeIndex.get(e.type).delete(e.id);
    e.type = type;
    if (!edgeIndex.has(type)) edgeIndex.set(type, new Set());
    edgeIndex.get(type).add(e.id);
  }
  if (setProperties && typeof setProperties === 'object' && !Array.isArray(setProperties)) {
    Object.assign(e.properties, setProperties);
  }
  for (const k of removeProperties) {
    if (typeof k !== 'string') continue;
    delete e.properties[k];
  }

  audit({ op: 'edge-update', edgeId: e.id, principal: principalOf(req), success: true, ip: req.ip });
  res.json({ message: 'Edge updated', edge: toPublicEdge(e) });
});

/** DELETE /api/edges/:id */
app.delete('/api/edges/:id',requireAuth,  (req, res) => {
  const e = edges.get(req.params.id);
  if (!e) return res.status(404).json({ error: 'Edge not found' });

  if (edgeIndex.has(e.type)) edgeIndex.get(e.type).delete(e.id);
  const fromNe = nodeEdges.get(e.from);
  const toNe = nodeEdges.get(e.to);
  if (fromNe) fromNe.outgoing.delete(e.id);
  if (toNe) toNe.incoming.delete(e.id);
  edges.delete(e.id);
  stats.totalEdgesDeleted++;

  audit({ op: 'edge-delete', edgeId: e.id, principal: principalOf(req), success: true, ip: req.ip });
  res.json({ message: 'Edge deleted', id: e.id });
});

/** GET /api/edges - list edges. Query: ?type, ?from, ?to, ?limit, ?offset */
app.get('/api/edges', (req, res) => {
  const { type, from, to, limit, offset } = req.query;
  let list = Array.from(edges.values());

  if (type) {
    const ids = edgeIndex.get(type);
    if (ids) {
      list = list.filter(e => ids.has(e.id));
    } else {
      list = [];
    }
  }
  if (from) list = list.filter(e => e.from === from);
  if (to) list = list.filter(e => e.to === to);
  list.sort((a, b) => (b.createdAt > a.createdAt ? 1 : -1));

  const off = parseInt(offset) || 0;
  const lim = Math.min(parseInt(limit) || 50, 500);
  const page = list.slice(off, off + lim);

  res.json({
    count: list.length,
    limit: lim,
    offset: off,
    edges: page.map(toPublicEdge)
  });
});

/** POST /api/match - Cypher-lite pattern matching. Body: { pattern } */
app.post('/api/match',requireAuth,  (req, res) => {
  const { pattern } = req.body || {};
  if (typeof pattern !== 'string' || !pattern.trim()) {
    return res.status(400).json({ error: 'pattern (string) is required' });
  }

  const parsed = parsePattern(pattern);
  if (!parsed) {
    return res.status(400).json({ error: 'Could not parse pattern. Expected: (a:Label {prop: val})-[r:TYPE]->(b:Label)' });
  }

  stats.totalQueries++;

  // Filter candidate source nodes
  const sourceCandidates = [];
  for (const n of nodes.values()) {
    if (!matchesLabel(n, parsed.fromLabels)) continue;
    if (!matchesProps(n, parsed.fromProps)) continue;
    sourceCandidates.push(n);
  }

  const matches = [];
  for (const src of sourceCandidates) {
    const ne = ensureNodeEdges(src.id);
    const edgeCandidates = (parsed.direction === 'in')
      ? Array.from(ne.incoming)
      : (parsed.direction === 'out')
        ? Array.from(ne.outgoing)
        : Array.from(new Set([...ne.outgoing, ...ne.incoming]));

    for (const eid of edgeCandidates) {
      const e = edges.get(eid);
      if (!e) continue;
      if (parsed.edgeType && e.type !== parsed.edgeType) continue;
      if (parsed.edgeProps && !matchesProps(e, parsed.edgeProps)) continue;
      const targetId = (parsed.direction === 'in') ? e.from : e.to;
      const tgt = nodes.get(targetId);
      if (!tgt) continue;
      if (!matchesLabel(tgt, parsed.toLabels)) continue;
      if (!matchesProps(tgt, parsed.toProps)) continue;
      matches.push({
        from: parsed.incoming ? toPublicNode(tgt) : toPublicNode(src),
        edge: toPublicEdge(e),
        to: parsed.incoming ? toPublicNode(src) : toPublicNode(tgt)
      });
    }
  }

  audit({
    op: 'pattern-match',
    pattern,
    matches: matches.length,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.json({
    pattern,
    parsed,
    count: matches.length,
    matches
  });
});

/** POST /api/traverse - BFS traversal. Body: { startId, maxDepth?, direction?, edgeTypes?, labelFilter? } */
app.post('/api/traverse',requireAuth,  (req, res) => {
  const { startId, maxDepth, direction, edgeTypes, labelFilter } = req.body || {};
  if (!startId || !nodes.has(startId)) {
    return res.status(400).json({ error: 'startId (existing node id) is required' });
  }

  stats.totalTraversals++;
  const results = bfs(startId, {
    maxDepth: typeof maxDepth === 'number' ? Math.min(Math.max(maxDepth, 1), 10) : 3,
    direction: direction || 'out',
    edgeTypes: Array.isArray(edgeTypes) ? edgeTypes : null,
    labelFilter: labelFilter || null
  });

  audit({
    op: 'traverse',
    startId,
    depth: maxDepth || 3,
    direction: direction || 'out',
    visited: results.length,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.json({
    startId,
    visited: results.length,
    results
  });
});

/** POST /api/shortest-path - find shortest path. Body: { from, to, direction?, edgeTypes? } */
app.post('/api/shortest-path',requireAuth,  (req, res) => {
  const { from, to, direction, edgeTypes } = req.body || {};
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to (node ids) are required' });
  }
  if (!nodes.has(from) || !nodes.has(to)) {
    return res.status(400).json({ error: 'both from and to must exist' });
  }

  stats.totalShortestPaths++;
  const path = shortestPath(from, to, {
    direction: direction || 'out',
    edgeTypes: Array.isArray(edgeTypes) ? edgeTypes : null
  });

  audit({
    op: 'shortest-path',
    from, to,
    found: !!path,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  if (!path) {
    return res.json({ from, to, found: false, length: null, path: null });
  }
  res.json({ from, to, found: true, ...path });
});

/** POST /api/components - connected components. Body: { labelFilter? } */
app.post('/api/components',requireAuth,  (req, res) => {
  const { labelFilter } = req.body || {};
  stats.totalComponentRuns++;
  const comps = connectedComponents({
    labelFilter: labelFilter || null
  });

  audit({
    op: 'components',
    labelFilter: labelFilter || null,
    components: comps.length,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.json({
    count: comps.length,
    largestSize: comps.length > 0 ? comps[0].size : 0,
    components: comps
  });
});

/** POST /api/pagerank - PageRank. Body: { damping?, iterations?, labelFilter?, topK? } */
app.post('/api/pagerank',requireAuth,  (req, res) => {
  const { damping, iterations, labelFilter, topK } = req.body || {};
  stats.totalPageRankRuns++;
  const result = pageRank({
    damping: typeof damping === 'number' ? damping : 0.85,
    iterations: typeof iterations === 'number' ? Math.min(Math.max(iterations, 1), 100) : 20,
    labelFilter: labelFilter || null
  });

  if (typeof topK === 'number' && topK > 0) {
    result.scores = result.scores.slice(0, Math.min(topK, 1000));
  }

  audit({
    op: 'pagerank',
    iterations: result.iterations,
    nodes: result.nodeCount,
    principal: principalOf(req),
    success: true,
    ip: req.ip
  });

  res.json(result);
});

/** GET /api/labels - list all labels + counts */
app.get('/api/labels', (_req, res) => {
  const labels = [];
  for (const [label, ids] of labelIndex) {
    labels.push({ label, count: ids.size });
  }
  labels.sort((a, b) => b.count - a.count);
  res.json({ count: labels.length, labels });
});

/** GET /api/edge-types - list all edge types + counts */
app.get('/api/edge-types', (_req, res) => {
  const types = [];
  for (const [type, ids] of edgeIndex) {
    types.push({ type, count: ids.size });
  }
  types.sort((a, b) => b.count - a.count);
  res.json({ count: types.length, types });
});

/** GET /api/degree/:id - node degree (in/out/total) */
app.get('/api/degree/:id', (req, res) => {
  const n = nodes.get(req.params.id);
  if (!n) return res.status(404).json({ error: 'Node not found' });
  const ne = ensureNodeEdges(n.id);
  res.json({
    nodeId: n.id,
    outDegree: ne.outgoing.size,
    inDegree: ne.incoming.size,
    degree: ne.outgoing.size + ne.incoming.size
  });
});

/** POST /api/clear - wipe graph (testing). Body: { confirm: true } */
app.post('/api/clear',requireAuth,  (req, res) => {
  const { confirm } = req.body || {};
  if (confirm !== true) {
    return res.status(400).json({ error: 'pass { confirm: true } to wipe the graph' });
  }
  const removed = { nodes: nodes.size, edges: edges.size };
  nodes.clear();
  edges.clear();
  nodeEdges.clear();
  edgeIndex.clear();
  labelIndex.clear();

  audit({ op: 'clear', removed, principal: principalOf(req), success: true, ip: req.ip });
  res.json({ message: 'Graph cleared', removed });
});

/** GET /api/stats */
app.get('/api/stats', (_req, res) => {
  res.json({
    counts: {
      nodes: nodes.size,
      edges: edges.size,
      labels: labelIndex.size,
      edgeTypes: edgeIndex.size
    },
    ...stats,
    auditEntries: auditLog.length,
    uptime: process.uptime(),
    startedAt
  });
});

/** POST /api/stats/reset */
app.post('/api/stats/reset',requireAuth,  (req, res) => {
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
  audit({ op: 'stats-reset', principal: principalOf(req), success: true, ip: req.ip });
  res.json({ message: 'Stats reset', stats });
});

/** GET /api/audit */
app.get('/api/audit', (req, res) => {
  let list = auditLog;
  if (req.query.op) list = list.filter(e => e.op === req.query.op);
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ count: list.length, entries: list.slice(-limit) });
});

// ---------------------------------------------------------------------------
// Seed data: a small social-like graph for demos
// ---------------------------------------------------------------------------
(function seed() {
  const people = [
    { name: 'Alice',   age: 30, city: 'NYC' },
    { name: 'Bob',     age: 28, city: 'LA' },
    { name: 'Carol',   age: 35, city: 'NYC' },
    { name: 'Dave',    age: 40, city: 'SF' },
    { name: 'Eve',     age: 25, city: 'LA' },
    { name: 'Frank',   age: 50, city: 'SF' }
  ];

  const personIdByName = {};
  for (const p of people) {
    const id = uuidv4();
    personIdByName[p.name] = id;
    const node = { id, labels: new Set(['Person']), properties: { ...p }, createdAt: new Date().toISOString() };
    nodes.set(id, node);
    ensureNodeEdges(id);
    if (!labelIndex.has('Person')) labelIndex.set('Person', new Set());
    getLabelSet('Person').add(id);
    stats.totalNodesCreated++;
  }

  // Company
  const acmeId = uuidv4();
  nodes.set(acmeId, { id: acmeId, labels: new Set(['Company']), properties: { name: 'Acme Corp', industry: 'Tech' }, createdAt: new Date().toISOString() });
  ensureNodeEdges(acmeId);
  getLabelSet('Company').add(acmeId);
  stats.totalNodesCreated++;

  // KNOWS edges
  const knowsPairs = [['Alice','Bob'],['Alice','Carol'],['Bob','Dave'],['Carol','Eve'],['Dave','Eve'],['Eve','Frank'],['Alice','Frank']];
  for (const [a, b] of knowsPairs) {
    const id = uuidv4();
    const e = { id, type: 'KNOWS', from: personIdByName[a], to: personIdByName[b], properties: { since: 2020 }, createdAt: new Date().toISOString() };
    edges.set(id, e);
    if (!edgeIndex.has('KNOWS')) edgeIndex.set('KNOWS', new Set());
    edgeIndex.get('KNOWS').add(id);
    ensureNodeEdges(e.from).outgoing.add(id);
    ensureNodeEdges(e.to).incoming.add(id);
    stats.totalEdgesCreated++;
  }

  // WORKS_AT edges
  const worksPairs = [['Alice', 'Engineer'], ['Bob', 'Manager'], ['Carol', 'Designer']];
  for (const [name, role] of worksPairs) {
    const id = uuidv4();
    const e = { id, type: 'WORKS_AT', from: personIdByName[name], to: acmeId, properties: { role }, createdAt: new Date().toISOString() };
    edges.set(id, e);
    if (!edgeIndex.has('WORKS_AT')) edgeIndex.set('WORKS_AT', new Set());
    edgeIndex.get('WORKS_AT').add(id);
    ensureNodeEdges(e.from).outgoing.add(id);
    ensureNodeEdges(e.to).incoming.add(id);
    stats.totalEdgesCreated++;
  }

  console.log(`[${SERVICE_NAME}] seeded ${nodes.size} nodes, ${edges.size} edges (6 people, 1 company, 7 KNOWS, 3 WORKS_AT)`);
})();

// ---------------------------------------------------------------------------
// Error handlers
// ---------------------------------------------------------------------------
app.use((req, res) => res.status(404).json({ error: `Route ${req.method} ${req.path} not found` }));
app.use((err, req, res, _next) => {
  console.error(`[${SERVICE_NAME}] error:`, err);
  stats.errors++;
  res.status(500).json({ error: 'Internal server error' });
});

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] listening on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] health: http://localhost:${PORT}/api/health`);
});
installGracefulShutdown(server);
