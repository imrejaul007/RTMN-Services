/**
 * LoopOS Trust Graph
 * Visual trust relationships between agents
 * Port: 4751
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4751;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Trust relationship types
const RELATIONSHIP_TYPES = {
  SUPERVISES: 'supervises',
  DELEGATES_TO: 'delegates_to',
  TRUSTS: 'trusts',
  VERIFIES: 'verifies',
  COLLABORATES_WITH: 'collaborates_with',
  REPORTS_TO: 'reports_to',
  APPROVES: 'approves',
  MENTORS: 'mentors'
};

// Trust levels
const TRUST_LEVELS = {
  TRUSTED: 'trusted',
  VERIFIED: 'verified',
  PROVISIONAL: 'provisional',
  RESTRICTED: 'restricted',
  UNTRUSTED: 'untrusted'
};

// In-memory stores
const nodes = new Map();      // nodeId -> TrustNode
const edges = new Map();      // edgeId -> TrustEdge
const relationships = new Map(); // `${fromId}:${type}:${toId}` -> relationship

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-trust-graph',
  version: '1.0.0',
  port: PORT,
  nodes: nodes.size,
  edges: edges.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Node Management ─────────────────────────────────────

/**
 * Create trust node (agent/fleet/org)
 * POST /api/nodes
 */
app.post('/api/nodes', requireAuth, (req, res) => {
  const {
    id,
    type,
    name,
    trustScore = 50,
    trustLevel = TRUST_LEVELS.PROVISIONAL,
    metadata = {}
  } = req.body || {};

  if (!type) return res.status(400).json({ error: 'type is required' });

  const nodeId = id || `${type}-${randomUUID().slice(0, 8)}`;

  if (nodes.has(nodeId)) {
    return res.status(409).json({ error: 'Node already exists' });
  }

  const node = {
    id: nodeId,
    type, // 'agent', 'fleet', 'organization', 'department'
    name: name || nodeId,
    trustScore,
    trustLevel,
    metadata,
    relationships: { inbound: [], outbound: [] },
    stats: {
      trustGiven: 0,
      trustReceived: 0,
      collaborations: 0,
      verifications: 0
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  nodes.set(nodeId, node);
  logger.info(`Trust node created: ${nodeId} (${type})`);
  res.status(201).json(node);
});

/**
 * Get node
 * GET /api/nodes/:id
 */
app.get('/api/nodes/:id', (req, res) => {
  const node = nodes.get(req.params.id);
  if (!node) return res.status(404).json({ error: 'Node not found' });
  res.json(node);
});

/**
 * List nodes
 * GET /api/nodes
 */
app.get('/api/nodes', (req, res) => {
  const { type, trustLevel, minTrustScore, limit = 100 } = req.query;
  let items = [...nodes.values()];

  if (type) items = items.filter(n => n.type === type);
  if (trustLevel) items = items.filter(n => n.trustLevel === trustLevel);
  if (minTrustScore) items = items.filter(n => n.trustScore >= Number(minTrustScore));

  res.json({ count: items.length, nodes: items });
});

/**
 * Update node trust
 * PUT /api/nodes/:id/trust
 */
app.put('/api/nodes/:id/trust', requireAuth, (req, res) => {
  const { trustScore, trustLevel, reason } = req.body || {};
  const node = nodes.get(req.params.id);

  if (!node) return res.status(404).json({ error: 'Node not found' });

  if (trustScore !== undefined) node.trustScore = trustScore;
  if (trustLevel) node.trustLevel = trustLevel;
  node.updatedAt = new Date().toISOString();

  // Recalculate level based on score
  if (trustScore !== undefined) {
    if (trustScore >= 90) node.trustLevel = TRUST_LEVELS.TRUSTED;
    else if (trustScore >= 70) node.trustLevel = TRUST_LEVELS.VERIFIED;
    else if (trustScore >= 50) node.trustLevel = TRUST_LEVELS.PROVISIONAL;
    else if (trustScore >= 25) node.trustLevel = TRUST_LEVELS.RESTRICTED;
    else node.trustLevel = TRUST_LEVELS.UNTRUSTED;
  }

  res.json(node);
});

/**
 * Delete node
 * DELETE /api/nodes/:id
 */
app.delete('/api/nodes/:id', requireAuth, (req, res) => {
  if (!nodes.has(req.params.id)) return res.status(404).json({ error: 'Node not found' });

  // Remove all edges
  for (const [edgeId, edge] of edges) {
    if (edge.from === req.params.id || edge.to === req.params.id) {
      edges.delete(edgeId);
    }
  }

  nodes.delete(req.params.id);
  res.json({ deleted: true });
});

// ── Edge (Relationship) Management ─────────────────────────

/**
 * Create trust relationship
 * POST /api/edges
 */
app.post('/api/edges', requireAuth, (req, res) => {
  const {
    from,
    to,
    type,
    trustWeight = 1,
    bidirectional = false,
    metadata = {}
  } = req.body || {};

  if (!from || !to || !type) {
    return res.status(400).json({ error: 'from, to, and type are required' });
  }

  if (!nodes.has(from)) return res.status(404).json({ error: 'Source node not found' });
  if (!nodes.has(to)) return res.status(404).json({ error: 'Target node not found' });

  const id = `edge-${randomUUID().slice(0, 8)}`;

  const edge = {
    id,
    from,
    to,
    type,
    trustWeight,
    bidirectional,
    metadata,
    status: 'active',
    history: [{ weight: trustWeight, timestamp: new Date().toISOString() }],
    createdAt: new Date().toISOString()
  };

  edges.set(id, edge);

  // Index by relationship key
  const key = `${from}:${type}:${to}`;
  relationships.set(key, id);

  // Update node relationships
  const fromNode = nodes.get(from);
  const toNode = nodes.get(to);

  fromNode.relationships.outbound.push({ edgeId: id, to, type });
  toNode.relationships.inbound.push({ edgeId: id, from, type });

  // Update stats
  if (type === RELATIONSHIP_TYPES.TRUSTS || type === RELATIONSHIP_TYPES.DELEGATES_TO) {
    fromNode.stats.trustGiven++;
    toNode.stats.trustReceived++;
  }
  if (type === RELATIONSHIP_TYPES.COLLABORATES_WITH) {
    fromNode.stats.collaborations++;
    toNode.stats.collaborations++;
  }
  if (type === RELATIONSHIP_TYPES.VERIFIES) {
    toNode.stats.verifications++;
  }

  logger.info(`Trust edge created: ${from} --[${type}]--> ${to}`);
  res.status(201).json(edge);
});

/**
 * Get edge
 * GET /api/edges/:id
 */
app.get('/api/edges/:id', (req, res) => {
  const edge = edges.get(req.params.id);
  if (!edge) return res.status(404).json({ error: 'Edge not found' });
  res.json(edge);
});

/**
 * List edges
 * GET /api/edges
 */
app.get('/api/edges', (req, res) => {
  const { from, to, type, status } = req.query;
  let items = [...edges.values()];

  if (from) items = items.filter(e => e.from === from);
  if (to) items = items.filter(e => e.to === to);
  if (type) items = items.filter(e => e.type === type);
  if (status) items = items.filter(e => e.status === status);

  res.json({ count: items.length, edges: items });
});

/**
 * Update edge weight
 * PUT /api/edges/:id
 */
app.put('/api/edges/:id', requireAuth, (req, res) => {
  const { trustWeight, status, metadata } = req.body || {};
  const edge = edges.get(req.params.id);

  if (!edge) return res.status(404).json({ error: 'Edge not found' });

  if (trustWeight !== undefined) {
    edge.trustWeight = trustWeight;
    edge.history.push({ weight: trustWeight, timestamp: new Date().toISOString() });
  }
  if (status) edge.status = status;
  if (metadata) edge.metadata = { ...edge.metadata, ...metadata };

  res.json(edge);
});

/**
 * Delete edge
 * DELETE /api/edges/:id
 */
app.delete('/api/edges/:id', requireAuth, (req, res) => {
  const edge = edges.get(req.params.id);
  if (!edge) return res.status(404).json({ error: 'Edge not found' });

  // Remove from node indexes
  const fromNode = nodes.get(edge.from);
  const toNode = nodes.get(edge.to);

  if (fromNode) {
    fromNode.relationships.outbound = fromNode.relationships.outbound.filter(r => r.edgeId !== req.params.id);
  }
  if (toNode) {
    toNode.relationships.inbound = toNode.relationships.inbound.filter(r => r.edgeId !== req.params.id);
  }

  edges.delete(req.params.id);
  res.json({ deleted: true });
});

// ── Graph Queries ────────────────────────────────────────

/**
 * Get ego graph (node + neighbors)
 * GET /api/graph/ego/:nodeId
 */
app.get('/api/graph/ego/:nodeId', (req, res) => {
  const { depth = 1 } = req.query;
  const maxDepth = Math.min(Number(depth), 3);

  const node = nodes.get(req.params.nodeId);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  const result = {
    center: node,
    nodes: [node],
    edges: []
  };

  const visited = new Set([req.params.nodeId]);
  const queue = [{ id: req.params.nodeId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current.depth >= maxDepth) continue;

    // Find all edges for this node
    for (const edge of edges.values()) {
      if (edge.status !== 'active') continue;

      let neighbor = null;

      if (edge.from === current.id) {
        neighbor = nodes.get(edge.to);
      } else if (edge.to === current.id) {
        neighbor = nodes.get(edge.from);
      }

      if (neighbor && !visited.has(neighbor.id)) {
        visited.add(neighbor.id);
        result.nodes.push(neighbor);
        result.edges.push(edge);

        queue.push({ id: neighbor.id, depth: current.depth + 1 });
      }
    }
  }

  res.json(result);
});

/**
 * Find shortest trust path
 * GET /api/graph/path
 */
app.get('/api/graph/path', (req, res) => {
  const { from, to, type } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to are required' });
  }

  const path = findShortestTrustPath(from, to, type);
  res.json(path);
});

/**
 * Get trust clusters
 * GET /api/graph/clusters
 */
app.get('/api/graph/clusters', (req, res) => {
  const { minTrustScore = 50 } = req.query;
  const threshold = Number(minTrustScore);

  // Build adjacency list
  const graph = new Map();

  for (const edge of edges.values()) {
    if (edge.status !== 'active') continue;
    if (edge.trustWeight < threshold) continue;

    if (!graph.has(edge.from)) graph.set(edge.from, []);
    if (!graph.has(edge.to)) graph.set(edge.to, []);

    graph.get(edge.from).push(edge.to);
    if (edge.bidirectional) {
      graph.get(edge.to).push(edge.from);
    }
  }

  // Find connected components
  const visited = new Set();
  const clusters = [];

  for (const nodeId of graph.keys()) {
    if (visited.has(nodeId)) continue;

    const cluster = [];
    const queue = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift();
      if (visited.has(current)) continue;
      visited.add(current);
      cluster.push(current);

      const neighbors = graph.get(current) || [];
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          queue.push(neighbor);
        }
      }
    }

    if (cluster.length > 1) {
      clusters.push({
        id: `cluster-${clusters.length}`,
        nodes: cluster,
        size: cluster.length,
        avgTrustScore: cluster.reduce((sum, id) => sum + (nodes.get(id)?.trustScore || 0), 0) / cluster.length
      });
    }
  }

  res.json({ count: clusters.length, clusters });
});

/**
 * Get trust statistics
 * GET /api/graph/stats
 */
app.get('/api/graph/stats', (req, res) => {
  const totalNodes = nodes.size;
  const totalEdges = edges.size;
  const activeEdges = [...edges.values()].filter(e => e.status === 'active').length;

  const byType = {};
  for (const edge of edges.values()) {
    byType[edge.type] = (byType[edge.type] || 0) + 1;
  }

  const byNodeType = {};
  for (const node of nodes.values()) {
    byNodeType[node.type] = (byNodeType[node.type] || 0) + 1;
  }

  const avgTrustScore = nodes.size > 0
    ? [...nodes.values()].reduce((sum, n) => sum + n.trustScore, 0) / nodes.size
    : 0;

  const byLevel = {};
  for (const node of nodes.values()) {
    byLevel[node.trustLevel] = (byLevel[node.trustLevel] || 0) + 1;
  }

  res.json({
    totalNodes,
    totalEdges,
    activeEdges,
    avgTrustScore: Math.round(avgTrustScore * 100) / 100,
    byType,
    byNodeType,
    byTrustLevel: byLevel
  });
});

/**
 * Get most trusted nodes
 * GET /api/graph/top
 */
app.get('/api/graph/top', (req, res) => {
  const { limit = 10, by = 'trustScore' } = req.query;

  let items = [...nodes.values()];

  if (by === 'trustScore') {
    items.sort((a, b) => b.trustScore - a.trustScore);
  } else if (by === 'trustReceived') {
    items.sort((a, b) => b.stats.trustReceived - a.stats.trustReceived);
  } else if (by === 'collaborations') {
    items.sort((a, b) => b.stats.collaborations - a.stats.collaborations);
  }

  items = items.slice(0, Number(limit));

  res.json({ count: items.length, nodes: items });
});

/**
 * Get influencers (nodes with most outbound trust)
 * GET /api/graph/influencers
 */
app.get('/api/graph/influencers', (req, res) => {
  const { limit = 10 } = req.query;

  const influencers = [...nodes.values()]
    .filter(n => n.stats.trustGiven > 0)
    .sort((a, b) => b.stats.trustGiven - a.stats.trustGiven)
    .slice(0, Number(limit));

  res.json({ count: influencers.length, influencers });
});

/**
 * Get verification chain (who verifies whom)
 * GET /api/graph/verification-chain/:nodeId
 */
app.get('/api/graph/verification-chain/:nodeId', (req, res) => {
  const chain = [];
  const visited = new Set();
  let current = req.params.nodeId;

  while (current && !visited.has(current)) {
    visited.add(current);
    const node = nodes.get(current);

    // Find verifier
    const verifierEdge = [...edges.values()].find(e =>
      e.to === current &&
      e.type === RELATIONSHIP_TYPES.VERIFIES &&
      e.status === 'active'
    );

    if (verifierEdge) {
      chain.push({
        node: node.id,
        name: node.name,
        verifiedBy: verifierEdge.from,
        verifierName: nodes.get(verifierEdge.from)?.name
      });
      current = verifierEdge.from;
    } else {
      chain.push({
        node: node.id,
        name: node.name,
        verifiedBy: null,
        root: true
      });
      break;
    }
  }

  res.json({ chain: chain.reverse() });
});

// ── Helper Functions ───────────────────────────────────

function findShortestTrustPath(from, to, type) {
  if (from === to) {
    return { path: [{ id: from, name: nodes.get(from)?.name }], hops: 0 };
  }

  const visited = new Set();
  const queue = [{ id: from, path: [{ id: from, name: nodes.get(from)?.name }] }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (visited.has(current.id)) continue;
    visited.add(current.id);

    // Find edges from current node
    for (const edge of edges.values()) {
      if (edge.status !== 'active') continue;
      if (type && edge.type !== type) continue;

      let neighbor = null;

      if (edge.from === current.id) {
        neighbor = edge.to;
      } else if (edge.to === current.id && edge.bidirectional) {
        neighbor = edge.from;
      }

      if (neighbor && !visited.has(neighbor)) {
        const neighborNode = nodes.get(neighbor);
        const newPath = [...current.path, { id: neighbor, name: neighborNode?.name, trustWeight: edge.trustWeight }];

        if (neighbor === to) {
          return { path: newPath, hops: newPath.length - 1 };
        }

        queue.push({ id: neighbor, path: newPath });
      }
    }
  }

  return { path: null, message: 'No trust path found' };
}

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS Trust Graph listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
