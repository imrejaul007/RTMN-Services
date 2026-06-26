/**
 * KnowledgeGraphOS REST API
 * Graph Database for RTMN Ecosystem
 *
 * Built on REZ-graph-service foundation
 */

import express from 'express';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';

const app = express();
const PORT = process.env.PORT || 4501;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// In-memory graph store (replace with Neo4j/RedisGraph in production)
class GraphStore {
  constructor() {
    this.nodes = new Map();
    this.relationships = new Map();
    this.adjacency = new Map(); // node -> type -> [related nodes]
  }

  // Node operations
  createNode(id, type, properties = {}, labels = []) {
    const node = {
      id,
      type,
      properties,
      labels: labels.length ? labels : [type],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.nodes.set(id, node);
    return node;
  }

  getNode(id) {
    return this.nodes.get(id);
  }

  updateNode(id, properties) {
    const node = this.nodes.get(id);
    if (!node) return null;
    node.properties = { ...node.properties, ...properties };
    node.updatedAt = new Date().toISOString();
    return node;
  }

  deleteNode(id) {
    // Delete all relationships
    const rels = this.getRelationships(id);
    for (const rel of rels) {
      this.deleteRelationship(rel.id);
    }
    this.adjacency.delete(id);
    return this.nodes.delete(id);
  }

  findNodes(query) {
    const { type, labels, properties, limit = 100 } = query;
    let results = Array.from(this.nodes.values());

    if (type) results = results.filter(n => n.type === type);
    if (labels) results = results.filter(n => labels.every(l => n.labels.includes(l)));
    if (properties) {
      results = results.filter(n => {
        for (const [key, value] of Object.entries(properties)) {
          if (n.properties[key] !== value) return false;
        }
        return true;
      });
    }

    return results.slice(0, limit);
  }

  // Relationship operations
  createRelationship(from, to, type, properties = {}) {
    const id = `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const relationship = {
      id,
      from,
      to,
      type,
      properties,
      createdAt: new Date().toISOString()
    };
    this.relationships.set(id, relationship);

    // Update adjacency
    if (!this.adjacency.has(from)) this.adjacency.set(from, new Map());
    if (!this.adjacency.get(from).has(type)) this.adjacency.get(from).set(type, new Set());
    this.adjacency.get(from).get(type).add(to);

    return relationship;
  }

  getRelationship(id) {
    return this.relationships.get(id);
  }

  getRelationships(nodeId, direction = 'both') {
    return Array.from(this.relationships.values()).filter(rel => {
      if (direction === 'outbound') return rel.from === nodeId;
      if (direction === 'inbound') return rel.to === nodeId;
      return rel.from === nodeId || rel.to === nodeId;
    });
  }

  deleteRelationship(id) {
    const rel = this.relationships.get(id);
    if (rel) {
      // Update adjacency
      const adj = this.adjacency.get(rel.from);
      if (adj && adj.has(rel.type)) {
        adj.get(rel.type).delete(rel.to);
      }
    }
    return this.relationships.delete(id);
  }

  // Graph operations
  traverse(startId, options = {}) {
    const { depth = 3, direction = 'both', types = [] } = options;
    const visited = new Set();
    const results = [];
    const queue = [{ id: startId, depth: 0 }];

    while (queue.length > 0) {
      const { id, depth: currentDepth } = queue.shift();
      if (visited.has(id) || currentDepth > depth) continue;
      visited.add(id);

      const node = this.nodes.get(id);
      if (node) results.push(node);

      const rels = this.getRelationships(id, direction);
      for (const rel of rels) {
        if (types.length && !types.includes(rel.type)) continue;
        const neighborId = rel.from === id ? rel.to : rel.from;
        if (!visited.has(neighborId)) {
          queue.push({ id: neighborId, depth: currentDepth + 1 });
        }
      }
    }

    return results;
  }

  findPath(fromId, toId, maxDepth = 10) {
    const visited = new Set();
    const queue = [{ id: fromId, path: [fromId] }];

    while (queue.length > 0) {
      const { id, path } = queue.shift();
      if (visited.has(id)) continue;
      visited.add(id);

      if (id === toId) {
        return { found: true, path, length: path.length - 1 };
      }

      if (path.length > maxDepth) continue;

      const rels = this.getRelationships(id, 'outbound');
      for (const rel of rels) {
        const neighborId = rel.to;
        if (!visited.has(neighborId)) {
          queue.push({ id: neighborId, path: [...path, neighborId] });
        }
      }
    }

    return { found: false, path: [], length: -1 };
  }

  getStats() {
    const nodeTypes = {};
    const relTypes = {};

    for (const node of this.nodes.values()) {
      nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
    }

    for (const rel of this.relationships.values()) {
      relTypes[rel.type] = (relTypes[rel.type] || 0) + 1;
    }

    return {
      totalNodes: this.nodes.size,
      totalRelationships: this.relationships.size,
      nodeTypes,
      relTypes,
      density: this.nodes.size > 1
        ? this.relationships.size / (this.nodes.size * (this.nodes.size - 1))
        : 0
    };
  }

  // Seed with RTMN entities
  seed() {
    // CorpIDs
    this.createNode('CORP-IND-00001', 'INDIVIDUAL', { name: 'John Doe', email: 'john@example.com' }, ['Human', 'User']);
    this.createNode('CORP-BIZ-00001', 'BUSINESS', { name: 'Acme Corp', type: 'retail' }, ['Business', 'Company']);
    this.createNode('CORP-MER-00001', 'MERCHANT', { name: 'Acme Store', businessId: 'CORP-BIZ-00001' }, ['Merchant', 'Store']);
    this.createNode('CORP-SUP-00001', 'SUPPLIER', { name: 'Global Supplies', rating: 4.5 }, ['Supplier']);

    // Products
    this.createNode('PROD-001', 'PRODUCT', { name: 'Widget A', price: 99.99 }, ['Product', 'SKU']);
    this.createNode('PROD-002', 'PRODUCT', { name: 'Widget B', price: 149.99 }, ['Product', 'SKU']);

    // Relationships
    this.createRelationship('CORP-IND-00001', 'CORP-BIZ-00001', 'WORKS_AT', { role: 'CEO' });
    this.createRelationship('CORP-BIZ-00001', 'CORP-MER-00001', 'OWNS', {});
    this.createRelationship('CORP-SUP-00001', 'CORP-BIZ-00001', 'SUPPLIES', { since: '2020-01-01' });
    this.createRelationship('CORP-MER-00001', 'PROD-001', 'SELLS', { price: 99.99 });
    this.createRelationship('CORP-SUP-00001', 'PROD-001', 'PRODUCES', { cost: 45.00 });

    console.log('[GraphOS] Seeded with RTMN entities');
  }
}

const graph = new GraphStore();
graph.seed();

// ============================================
// API ROUTES
// ============================================

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'knowledge-graph-os',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: graph.getStats()
  });
});

// Stats
app.get('/api/stats', (req, res) => {
  res.json(graph.getStats());
});

// ============================================
// NODE ENDPOINTS
// ============================================

// Create node
app.post('/api/nodes',requireAuth,  (req, res) => {
  try {
    const { id, type, properties = {}, labels = [] } = req.body;
    if (!id || !type) {
      return res.status(400).json({ error: 'id and type are required' });
    }
    const node = graph.createNode(id, type, properties, labels);
    res.status(201).json(node);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get node
app.get('/api/nodes/:id', (req, res) => {
  const node = graph.getNode(req.params.id);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  res.json(node);
});

// Update node
app.patch('/api/nodes/:id',requireAuth,  (req, res) => {
  const node = graph.updateNode(req.params.id, req.body);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  res.json(node);
});

// Delete node
app.delete('/api/nodes/:id',requireAuth,  (req, res) => {
  const deleted = graph.deleteNode(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Node not found' });
  }
  res.json({ success: true });
});

// Find nodes
app.post('/api/nodes/find',requireAuth,  (req, res) => {
  const nodes = graph.findNodes(req.body);
  res.json({ nodes, total: nodes.length });
});

// Get all nodes
app.get('/api/nodes', (req, res) => {
  const { type, limit = 100 } = req.query;
  const nodes = graph.findNodes({ type, limit: parseInt(limit) });
  res.json({ nodes, total: nodes.length });
});

// ============================================
// RELATIONSHIP ENDPOINTS
// ============================================

// Create relationship
app.post('/api/relationships',requireAuth,  (req, res) => {
  try {
    const { from, to, type, properties = {} } = req.body;
    if (!from || !to || !type) {
      return res.status(400).json({ error: 'from, to, and type are required' });
    }
    const rel = graph.createRelationship(from, to, type, properties);
    res.status(201).json(rel);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get relationship
app.get('/api/relationships/:id', (req, res) => {
  const rel = graph.getRelationship(req.params.id);
  if (!rel) {
    return res.status(404).json({ error: 'Relationship not found' });
  }
  res.json(rel);
});

// Delete relationship
app.delete('/api/relationships/:id',requireAuth,  (req, res) => {
  const deleted = graph.deleteRelationship(req.params.id);
  if (!deleted) {
    return res.status(404).json({ error: 'Relationship not found' });
  }
  res.json({ success: true });
});

// Get node relationships
app.get('/api/nodes/:id/relationships', (req, res) => {
  const { direction = 'both' } = req.query;
  const rels = graph.getRelationships(req.params.id, direction);
  res.json({ relationships: rels, total: rels.length });
});

// ============================================
// GRAPH OPERATIONS
// ============================================

// Traverse graph
app.post('/api/traverse',requireAuth,  (req, res) => {
  const { startId, depth = 3, direction = 'both', types = [] } = req.body;
  if (!startId) {
    return res.status(400).json({ error: 'startId is required' });
  }
  const nodes = graph.traverse(startId, { depth, direction, types });
  res.json({ startId, nodes, total: nodes.length });
});

// Find path
app.post('/api/path',requireAuth,  (req, res) => {
  const { from, to, maxDepth = 10 } = req.body;
  if (!from || !to) {
    return res.status(400).json({ error: 'from and to are required' });
  }
  const path = graph.findPath(from, to, maxDepth);
  res.json(path);
});

// ============================================
// QUERY ENDPOINTS
// ============================================

// Search
app.get('/api/search', (req, res) => {
  const { q, type } = req.query;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }

  const nodes = graph.findNodes({ type });
  const matched = nodes.filter(n => {
    const searchStr = JSON.stringify(n).toLowerCase();
    return searchStr.includes(q.toLowerCase());
  });

  res.json({ query: q, nodes: matched, total: matched.length });
});

// ============================================
// RTMN-SPECIFIC ENDPOINTS
// ============================================

// Link CorpID entities
app.post('/api/corpid/link',requireAuth,  (req, res) => {
  const { fromId, toId, relationship, properties = {} } = req.body;
  if (!fromId || !toId || !relationship) {
    return res.status(400).json({ error: 'fromId, toId, and relationship are required' });
  }
  const rel = graph.createRelationship(fromId, toId, relationship, properties);
  res.json(rel);
});

// Get entity graph
app.get('/api/entity/:id/graph', (req, res) => {
  const { depth = 2 } = req.query;
  const nodes = graph.traverse(req.params.id, { depth: parseInt(depth) });
  const rels = graph.getRelationships(req.params.id);
  res.json({ node: graph.getNode(req.params.id), neighbors: nodes, relationships: rels });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[GraphOS Error]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


// Skip auto-listen in test mode so tests can control the server lifecycle
if (process.env.NODE_ENV !== 'test' && process.env.KG_SKIP_AUTO_LISTEN !== 'true') {
  const server = app.listen(PORT, () => {
    console.log(`🔗 KnowledgeGraphOS running on port ${PORT}`);
    console.log(`   Nodes: ${graph.nodes.size}, Relationships: ${graph.relationships.size}`);
  });
  installGracefulShutdown(server);
}

export { app, graph };

export default app;
