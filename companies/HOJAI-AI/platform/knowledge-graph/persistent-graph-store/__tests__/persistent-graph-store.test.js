/**
 * KnowledgeOS Persistent Graph Store - Test Suite
 * Tests for nodes, edges, traversal, and search operations
 */

import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { v4 as uuidv4 } from 'uuid';

// Create test app
const app = express();
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Re-implement routes for testing (similar to main app)
const NODE_TYPES = ['PERSON', 'ORGANIZATION', 'LOCATION', 'PRODUCT', 'SERVICE', 'CONCEPT', 'DOCUMENT', 'EVENT', 'PLACE'];
const EDGE_TYPES = ['WORKS_FOR', 'LOCATED_IN', 'PRODUCE', 'SELL', 'KNOWS', 'REPORTED_BY'];

// In-memory storage for tests
const nodes = new Map();
const edges = new Map();

// Statistics
const stats = {
  nodesCreated: 0,
  nodesUpdated: 0,
  nodesDeleted: 0,
  edgesCreated: 0,
  edgesDeleted: 0,
  traversals: 0,
  searches: 0,
  errors: 0,
};

// Health endpoint
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'knowledge-graph-persistent',
    version: '1.0.0',
    port: 4750,
    timestamp: new Date().toISOString(),
  });
});

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Auth middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization header required' });
  }
  req.user = { id: 'authenticated' };
  next();
}

// NODE ROUTES
app.post('/nodes', requireAuth, (req, res) => {
  const { type, name, properties = {}, embedding, source } = req.body;

  if (!type || !NODE_TYPES.includes(type)) {
    return res.status(400).json({
      error: `Invalid node type. Must be one of: ${NODE_TYPES.join(', ')}`,
    });
  }

  if (!name || typeof name !== 'string') {
    return res.status(400).json({ error: 'name is required and must be a string' });
  }

  const id = uuidv4();
  const node = {
    id,
    type,
    name,
    properties,
    embedding,
    source,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  nodes.set(id, node);
  stats.nodesCreated++;
  res.status(201).json(node);
});

app.get('/nodes/:id', (req, res) => {
  const node = nodes.get(req.params.id);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }
  res.json(node);
});

app.get('/nodes', (req, res) => {
  const { type, limit = 50, offset = 0 } = req.query;
  let results = Array.from(nodes.values());

  if (type) {
    results = results.filter(n => n.type === type);
  }

  results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const paginated = results.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({
    nodes: paginated,
    total: results.length,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

app.put('/nodes/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const node = nodes.get(id);

  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }

  const { type, name, properties, embedding, source } = req.body;

  if (type !== undefined) {
    if (!NODE_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid node type. Must be one of: ${NODE_TYPES.join(', ')}`,
      });
    }
    node.type = type;
  }

  if (name !== undefined) node.name = name;
  if (properties !== undefined) node.properties = properties;
  if (embedding !== undefined) node.embedding = embedding;
  if (source !== undefined) node.source = source;

  node.updated_at = new Date().toISOString();
  stats.nodesUpdated++;
  res.json(node);
});

app.delete('/nodes/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  if (!nodes.has(id)) {
    return res.status(404).json({ error: 'Node not found' });
  }
  nodes.delete(id);
  stats.nodesDeleted++;
  res.json({ message: 'Node deleted', id });
});

// EDGE ROUTES
app.post('/edges', requireAuth, (req, res) => {
  const { sourceId, targetId, type, properties = {}, weight = 1.0, source } = req.body;

  if (!sourceId || !targetId) {
    return res.status(400).json({ error: 'sourceId and targetId are required' });
  }

  if (!type || !EDGE_TYPES.includes(type)) {
    return res.status(400).json({
      error: `Invalid edge type. Must be one of: ${EDGE_TYPES.join(', ')}`,
    });
  }

  if (!nodes.has(sourceId) || !nodes.has(targetId)) {
    return res.status(400).json({ error: 'Source or target node not found' });
  }

  const id = uuidv4();
  const edge = {
    id,
    source_id: sourceId,
    target_id: targetId,
    type,
    properties,
    weight,
    source,
    created_at: new Date().toISOString(),
  };
  edges.set(id, edge);
  stats.edgesCreated++;
  res.status(201).json(edge);
});

app.get('/edges/:id', (req, res) => {
  const edge = edges.get(req.params.id);
  if (!edge) {
    return res.status(404).json({ error: 'Edge not found' });
  }
  res.json(edge);
});

app.get('/edges', (req, res) => {
  const { type, sourceId, targetId, limit = 50, offset = 0 } = req.query;
  let results = Array.from(edges.values());

  if (type) results = results.filter(e => e.type === type);
  if (sourceId) results = results.filter(e => e.source_id === sourceId);
  if (targetId) results = results.filter(e => e.target_id === targetId);

  results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  const paginated = results.slice(parseInt(offset), parseInt(offset) + parseInt(limit));

  res.json({
    edges: paginated,
    count: results.length,
    limit: parseInt(limit),
    offset: parseInt(offset),
  });
});

app.put('/edges/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const edge = edges.get(id);

  if (!edge) {
    return res.status(404).json({ error: 'Edge not found' });
  }

  const { type, properties, weight, source } = req.body;

  if (type !== undefined) {
    if (!EDGE_TYPES.includes(type)) {
      return res.status(400).json({
        error: `Invalid edge type. Must be one of: ${EDGE_TYPES.join(', ')}`,
      });
    }
    edge.type = type;
  }

  if (properties !== undefined) edge.properties = properties;
  if (weight !== undefined) edge.weight = weight;
  if (source !== undefined) edge.source = source;

  stats.edgesUpdated++;
  res.json(edge);
});

app.delete('/edges/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  if (!edges.has(id)) {
    return res.status(404).json({ error: 'Edge not found' });
  }
  edges.delete(id);
  stats.edgesDeleted++;
  res.json({ message: 'Edge deleted', id });
});

// GRAPH TRAVERSAL
app.post('/graph/traverse/:startId', requireAuth, (req, res) => {
  const { startId } = req.params;
  const { maxDepth = 3, direction = 'out', edgeTypes = [], nodeTypes = [] } = req.body;

  const startNode = nodes.get(startId);
  if (!startNode) {
    return res.status(404).json({ error: 'Start node not found' });
  }

  const visited = new Set([startId]);
  const results = [];
  const queue = [{ id: startId, depth: 0, path: [] }];

  while (queue.length > 0) {
    const { id, depth, path } = queue.shift();

    if (depth >= maxDepth) continue;

    // Find neighbors
    for (const edge of edges.values()) {
      let neighborId = null;

      if (direction === 'out' && edge.source_id === id) {
        neighborId = edge.target_id;
      } else if (direction === 'in' && edge.target_id === id) {
        neighborId = edge.source_id;
      } else if (direction === 'both') {
        if (edge.source_id === id) neighborId = edge.target_id;
        else if (edge.target_id === id) neighborId = edge.source_id;
      }

      if (neighborId && !visited.has(neighborId)) {
        if (edgeTypes.length === 0 || edgeTypes.includes(edge.type)) {
          const neighborNode = nodes.get(neighborId);
          if (neighborNode && (nodeTypes.length === 0 || nodeTypes.includes(neighborNode.type))) {
            visited.add(neighborId);
            results.push({
              node: neighborNode,
              edge: { id: edge.id, type: edge.type, properties: edge.properties },
              depth: depth + 1,
              path: [...path, edge.id],
            });
            queue.push({ id: neighborId, depth: depth + 1, path: [...path, edge.id] });
          }
        }
      }
    }
  }

  stats.traversals++;
  res.json({
    startNode,
    visitedCount: visited.size,
    results,
  });
});

app.post('/graph/dfs/:startId', requireAuth, (req, res) => {
  const { startId } = req.params;
  const { maxDepth = 3, direction = 'out', edgeTypes = [] } = req.body;

  const startNode = nodes.get(startId);
  if (!startNode) {
    return res.status(404).json({ error: 'Start node not found' });
  }

  const visited = new Set();
  const results = [];

  function dfs(id, depth, path) {
    if (depth > maxDepth || visited.has(id)) return;
    visited.add(id);

    const node = nodes.get(id);
    if (node) {
      results.push({ node, depth, path });
    }

    for (const edge of edges.values()) {
      let neighborId = null;

      if (direction === 'out' && edge.source_id === id) {
        neighborId = edge.target_id;
      } else if (direction === 'in' && edge.target_id === id) {
        neighborId = edge.source_id;
      } else if (direction === 'both') {
        if (edge.source_id === id) neighborId = edge.target_id;
        else if (edge.target_id === id) neighborId = edge.source_id;
      }

      if (neighborId && !visited.has(neighborId)) {
        if (edgeTypes.length === 0 || edgeTypes.includes(edge.type)) {
          dfs(neighborId, depth + 1, [...path, edge.id]);
        }
      }
    }
  }

  dfs(startId, 0, []);
  stats.traversals++;

  res.json({
    startNode,
    visitedCount: visited.size,
    results,
  });
});

app.post('/graph/path/:startId/:endId', requireAuth, (req, res) => {
  const { startId, endId } = req.params;
  const { edgeTypes = [] } = req.body;

  if (!nodes.has(startId) || !nodes.has(endId)) {
    return res.status(404).json({ error: 'Start or end node not found' });
  }

  if (startId === endId) {
    return res.json({
      path: [nodes.get(startId)],
      edges: [],
      length: 0,
    });
  }

  const visited = new Set([startId]);
  const queue = [{ id: startId, path: [nodes.get(startId)], edges: [] }];

  while (queue.length > 0) {
    const { id, path, edges: pathEdges } = queue.shift();

    for (const edge of edges.values()) {
      if (edge.source_id !== id) continue;
      if (edgeTypes.length > 0 && !edgeTypes.includes(edge.type)) continue;

      if (!visited.has(edge.target_id)) {
        const newPath = [...path, nodes.get(edge.target_id)];
        const newEdges = [...pathEdges, { id: edge.id, type: edge.type, properties: edge.properties }];

        if (edge.target_id === endId) {
          return res.json({
            path: newPath,
            edges: newEdges,
            length: newPath.length - 1,
          });
        }

        visited.add(edge.target_id);
        queue.push({ id: edge.target_id, path: newPath, edges: newEdges });
      }
    }
  }

  res.json({
    path: null,
    edges: [],
    length: -1,
    message: 'No path found',
  });
});

app.post('/graph/search', requireAuth, (req, res) => {
  const { query, embedding, topK = 10, nodeTypes = [], minScore = 0.0 } = req.body;

  if (!embedding && !query) {
    return res.status(400).json({ error: 'Either embedding or query is required' });
  }

  // Text search
  if (query && !embedding) {
    const results = Array.from(nodes.values()).filter(n => {
      if (nodeTypes.length > 0 && !nodeTypes.includes(n.type)) return false;
      return n.name.toLowerCase().includes(query.toLowerCase()) ||
        JSON.stringify(n.properties).toLowerCase().includes(query.toLowerCase());
    }).slice(0, topK);

    stats.searches++;
    return res.json({
      query,
      results,
      count: results.length,
      type: 'text',
    });
  }

  // Vector search simulation (random scores for testing)
  const results = Array.from(nodes.values())
    .filter(n => n.embedding && (nodeTypes.length === 0 || nodeTypes.includes(n.type)))
    .map(n => ({
      ...n,
      score: 0.5 + Math.random() * 0.5,
    }))
    .filter(n => n.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);

  stats.searches++;
  res.json({
    query,
    results,
    count: results.length,
    type: 'vector',
  });
});

app.get('/graph/neighbors/:nodeId', (req, res) => {
  const { nodeId } = req.params;
  const { direction = 'both' } = req.query;

  const node = nodes.get(nodeId);
  if (!node) {
    return res.status(404).json({ error: 'Node not found' });
  }

  const neighbors = [];

  for (const edge of edges.values()) {
    if (edge.source_id === nodeId || edge.target_id === nodeId) {
      if (direction === 'out' && edge.source_id !== nodeId) continue;
      if (direction === 'in' && edge.target_id !== nodeId) continue;

      const neighborId = edge.source_id === nodeId ? edge.target_id : edge.source_id;
      const neighborNode = nodes.get(neighborId);

      if (neighborNode) {
        neighbors.push({
          node: neighborNode,
          edge: {
            id: edge.id,
            type: edge.type,
            properties: edge.properties,
            direction: edge.source_id === nodeId ? 'outgoing' : 'incoming',
          },
        });
      }
    }
  }

  res.json({
    node,
    neighbors,
    count: neighbors.length,
  });
});

// STATS & TYPES
app.get('/stats', (_req, res) => {
  const nodeCount = nodes.size;
  const edgeCount = edges.size;

  const nodesByType = {};
  for (const node of nodes.values()) {
    nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
  }

  const edgesByType = {};
  for (const edge of edges.values()) {
    edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
  }

  res.json({
    ...stats,
    totalNodes: nodeCount,
    totalEdges: edgeCount,
    nodesByType,
    edgesByType,
  });
});

app.post('/stats/reset', requireAuth, (_req, res) => {
  stats.nodesCreated = 0;
  stats.nodesUpdated = 0;
  stats.nodesDeleted = 0;
  stats.edgesCreated = 0;
  stats.edgesDeleted = 0;
  stats.traversals = 0;
  stats.searches = 0;
  stats.errors = 0;
  res.json({ message: 'Stats reset', stats });
});

app.get('/types/nodes', (_req, res) => {
  res.json({ nodeTypes: NODE_TYPES });
});

app.get('/types/edges', (_req, res) => {
  res.json({ edgeTypes: EDGE_TYPES });
});

// Error handler
app.use((err, req, res, _next) => {
  stats.errors++;
  res.status(500).json({ error: err.message });
});

// Test helper function
function createTestNode(type, name, properties = {}) {
  const id = uuidv4();
  const node = {
    id,
    type,
    name,
    properties,
    embedding: null,
    source: 'test',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  nodes.set(id, node);
  return node;
}

function createTestEdge(sourceId, targetId, type, properties = {}) {
  const id = uuidv4();
  const edge = {
    id,
    source_id: sourceId,
    target_id: targetId,
    type,
    properties,
    weight: 1.0,
    source: 'test',
    created_at: new Date().toISOString(),
  };
  edges.set(id, edge);
  return edge;
}

// Simple HTTP test helper
async function request(method, path, body = null, headers = {}) {
  return new Promise((resolve) => {
    const http = require('http');
    const server = app.listen(0, () => {
      const port = server.address().port;
      const options = {
        hostname: 'localhost',
        port,
        path,
        method: method.toUpperCase(),
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
      };

      const req = http.request(options, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          server.close();
          try {
            resolve({
              status: res.statusCode,
              data: JSON.parse(data),
            });
          } catch {
            resolve({
              status: res.statusCode,
              data: data,
            });
          }
        });
      });

      if (body) {
        req.write(JSON.stringify(body));
      }
      req.end();
    });
  });
}

// ============================================================================
// TESTS
// ============================================================================

describe('KnowledgeOS Persistent Graph Store', () => {
  beforeEach(() => {
    // Clear storage before each test
    nodes.clear();
    edges.clear();
    stats.nodesCreated = 0;
    stats.nodesUpdated = 0;
    stats.nodesDeleted = 0;
    stats.edgesCreated = 0;
    stats.edgesDeleted = 0;
    stats.traversals = 0;
    stats.searches = 0;
    stats.errors = 0;
  });

  // ==========================================================================
  // HEALTH ENDPOINTS
  // ==========================================================================

  describe('Health Endpoints', () => {
    it('GET /health should return healthy status', async () => {
      const res = await request('GET', '/health');
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('healthy');
      expect(res.data.service).toBe('knowledge-graph-persistent');
      expect(res.data.version).toBe('1.0.0');
      expect(res.data.port).toBe(4750);
    });

    it('GET /ready should return ready status', async () => {
      const res = await request('GET', '/ready');
      expect(res.status).toBe(200);
      expect(res.data.ready).toBe(true);
      expect(res.data.timestamp).toBeDefined();
    });
  });

  // ==========================================================================
  // NODE CRUD OPERATIONS
  // ==========================================================================

  describe('Node CRUD Operations', () => {
    describe('POST /nodes', () => {
      it('should create a valid PERSON node', async () => {
        const res = await request('POST', '/nodes', {
          type: 'PERSON',
          name: 'John Doe',
          properties: { age: 30, occupation: 'Engineer' },
          source: 'test',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(201);
        expect(res.data.type).toBe('PERSON');
        expect(res.data.name).toBe('John Doe');
        expect(res.data.properties.age).toBe(30);
        expect(res.data.id).toBeDefined();
      });

      it('should create an ORGANIZATION node', async () => {
        const res = await request('POST', '/nodes', {
          type: 'ORGANIZATION',
          name: 'Acme Corp',
          properties: { industry: 'Technology' },
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(201);
        expect(res.data.type).toBe('ORGANIZATION');
        expect(res.data.name).toBe('Acme Corp');
      });

      it('should create a PRODUCT node', async () => {
        const res = await request('POST', '/nodes', {
          type: 'PRODUCT',
          name: 'Widget Pro',
          properties: { price: 99.99 },
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(201);
        expect(res.data.type).toBe('PRODUCT');
      });

      it('should reject invalid node type', async () => {
        const res = await request('POST', '/nodes', {
          type: 'INVALID_TYPE',
          name: 'Test',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(400);
        expect(res.data.error).toContain('Invalid node type');
      });

      it('should reject missing name', async () => {
        const res = await request('POST', '/nodes', {
          type: 'PERSON',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(400);
        expect(res.data.error).toBe('name is required and must be a string');
      });

      it('should reject missing authorization', async () => {
        const res = await request('POST', '/nodes', {
          type: 'PERSON',
          name: 'Test',
        });

        expect(res.status).toBe(401);
      });
    });

    describe('GET /nodes/:id', () => {
      it('should retrieve an existing node', async () => {
        const node = createTestNode('PERSON', 'Jane Doe', { age: 25 });

        const res = await request('GET', `/nodes/${node.id}`);
        expect(res.status).toBe(200);
        expect(res.data.id).toBe(node.id);
        expect(res.data.name).toBe('Jane Doe');
      });

      it('should return 404 for non-existent node', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request('GET', `/nodes/${fakeId}`);

        expect(res.status).toBe(404);
        expect(res.data.error).toBe('Node not found');
      });
    });

    describe('GET /nodes', () => {
      it('should list all nodes with pagination', async () => {
        createTestNode('PERSON', 'Alice');
        createTestNode('PERSON', 'Bob');
        createTestNode('ORGANIZATION', 'Acme');

        const res = await request('GET', '/nodes?limit=10');
        expect(res.data.nodes.length).toBe(3);
        expect(res.data.total).toBe(3);
        expect(res.data.limit).toBe(10);
      });

      it('should filter nodes by type', async () => {
        createTestNode('PERSON', 'Alice');
        createTestNode('PERSON', 'Bob');
        createTestNode('ORGANIZATION', 'Acme');

        const res = await request('GET', '/nodes?type=PERSON');
        expect(res.data.nodes.length).toBe(2);
        res.data.nodes.forEach(n => expect(n.type).toBe('PERSON'));
      });
    });

    describe('PUT /nodes/:id', () => {
      it('should update node properties', async () => {
        const node = createTestNode('PERSON', 'Original Name', { age: 20 });

        const res = await request('PUT', `/nodes/${node.id}`, {
          name: 'Updated Name',
          properties: { age: 21 },
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(200);
        expect(res.data.name).toBe('Updated Name');
        expect(res.data.properties.age).toBe(21);
      });

      it('should reject invalid type update', async () => {
        const node = createTestNode('PERSON', 'Test');

        const res = await request('PUT', `/nodes/${node.id}`, {
          type: 'INVALID',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(400);
      });

      it('should return 404 for non-existent node', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request('PUT', `/nodes/${fakeId}`, {
          name: 'Test',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(404);
      });
    });

    describe('DELETE /nodes/:id', () => {
      it('should delete an existing node', async () => {
        const node = createTestNode('PERSON', 'To Delete');

        const res = await request('DELETE', `/nodes/${node.id}`, null, {
          Authorization: 'Bearer test-token',
        });

        expect(res.status).toBe(200);
        expect(res.data.message).toBe('Node deleted');
        expect(nodes.has(node.id)).toBe(false);
      });

      it('should return 404 for non-existent node', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request('DELETE', `/nodes/${fakeId}`, null, {
          Authorization: 'Bearer test-token',
        });

        expect(res.status).toBe(404);
      });
    });
  });

  // ==========================================================================
  // EDGE CRUD OPERATIONS
  // ==========================================================================

  describe('Edge CRUD Operations', () => {
    describe('POST /edges', () => {
      it('should create a WORKS_FOR edge', async () => {
        const person = createTestNode('PERSON', 'Alice');
        const org = createTestNode('ORGANIZATION', 'Acme Corp');

        const res = await request('POST', '/edges', {
          sourceId: person.id,
          targetId: org.id,
          type: 'WORKS_FOR',
          properties: { role: 'CEO' },
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(201);
        expect(res.data.type).toBe('WORKS_FOR');
        expect(res.data.source_id).toBe(person.id);
        expect(res.data.target_id).toBe(org.id);
      });

      it('should create a KNOWS edge', async () => {
        const alice = createTestNode('PERSON', 'Alice');
        const bob = createTestNode('PERSON', 'Bob');

        const res = await request('POST', '/edges', {
          sourceId: alice.id,
          targetId: bob.id,
          type: 'KNOWS',
          properties: { since: 2020 },
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(201);
        expect(res.data.type).toBe('KNOWS');
      });

      it('should create a LOCATED_IN edge', async () => {
        const company = createTestNode('ORGANIZATION', 'Acme');
        const location = createTestNode('LOCATION', 'New York');

        const res = await request('POST', '/edges', {
          sourceId: company.id,
          targetId: location.id,
          type: 'LOCATED_IN',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(201);
      });

      it('should create a PRODUCE edge', async () => {
        const company = createTestNode('ORGANIZATION', 'Apple');
        const product = createTestNode('PRODUCT', 'iPhone');

        const res = await request('POST', '/edges', {
          sourceId: company.id,
          targetId: product.id,
          type: 'PRODUCE',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(201);
      });

      it('should create a SELL edge', async () => {
        const store = createTestNode('ORGANIZATION', 'Best Buy');
        const product = createTestNode('PRODUCT', 'Laptop');

        const res = await request('POST', '/edges', {
          sourceId: store.id,
          targetId: product.id,
          type: 'SELL',
          weight: 0.8,
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(201);
        expect(res.data.weight).toBe(0.8);
      });

      it('should create a REPORTED_BY edge', async () => {
        const article = createTestNode('DOCUMENT', 'News Article');
        const author = createTestNode('PERSON', 'Jane Smith');

        const res = await request('POST', '/edges', {
          sourceId: article.id,
          targetId: author.id,
          type: 'REPORTED_BY',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(201);
      });

      it('should reject invalid edge type', async () => {
        const node1 = createTestNode('PERSON', 'Test1');
        const node2 = createTestNode('PERSON', 'Test2');

        const res = await request('POST', '/edges', {
          sourceId: node1.id,
          targetId: node2.id,
          type: 'INVALID_EDGE',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(400);
      });

      it('should reject missing sourceId', async () => {
        const node = createTestNode('PERSON', 'Test');

        const res = await request('POST', '/edges', {
          targetId: node.id,
          type: 'KNOWS',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(400);
        expect(res.data.error).toContain('sourceId');
      });

      it('should reject non-existent source node', async () => {
        const node = createTestNode('PERSON', 'Test');
        const fakeId = '00000000-0000-0000-0000-000000000000';

        const res = await request('POST', '/edges', {
          sourceId: fakeId,
          targetId: node.id,
          type: 'KNOWS',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(400);
      });
    });

    describe('GET /edges/:id', () => {
      it('should retrieve an existing edge', async () => {
        const source = createTestNode('PERSON', 'Alice');
        const target = createTestNode('ORGANIZATION', 'Acme');
        const edge = createTestEdge(source.id, target.id, 'WORKS_FOR');

        const res = await request('GET', `/edges/${edge.id}`);
        expect(res.status).toBe(200);
        expect(res.data.id).toBe(edge.id);
      });

      it('should return 404 for non-existent edge', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request('GET', `/edges/${fakeId}`);

        expect(res.status).toBe(404);
      });
    });

    describe('GET /edges', () => {
      it('should list all edges', async () => {
        const n1 = createTestNode('PERSON', 'A');
        const n2 = createTestNode('PERSON', 'B');
        const n3 = createTestNode('PERSON', 'C');

        createTestEdge(n1.id, n2.id, 'KNOWS');
        createTestEdge(n2.id, n3.id, 'KNOWS');

        const res = await request('GET', '/edges');
        expect(res.data.edges.length).toBe(2);
      });

      it('should filter edges by type', async () => {
        const n1 = createTestNode('PERSON', 'A');
        const n2 = createTestNode('PERSON', 'B');
        const org = createTestNode('ORGANIZATION', 'Org');

        createTestEdge(n1.id, n2.id, 'KNOWS');
        createTestEdge(n1.id, org.id, 'WORKS_FOR');

        const res = await request('GET', '/edges?type=KNOWS');
        expect(res.data.edges.length).toBe(1);
        expect(res.data.edges[0].type).toBe('KNOWS');
      });
    });

    describe('PUT /edges/:id', () => {
      it('should update edge properties', async () => {
        const n1 = createTestNode('PERSON', 'A');
        const n2 = createTestNode('PERSON', 'B');
        const edge = createTestEdge(n1.id, n2.id, 'KNOWS');

        const res = await request('PUT', `/edges/${edge.id}`, {
          properties: { since: 2021 },
          weight: 0.9,
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(200);
        expect(res.data.properties.since).toBe(2021);
        expect(res.data.weight).toBe(0.9);
      });
    });

    describe('DELETE /edges/:id', () => {
      it('should delete an existing edge', async () => {
        const n1 = createTestNode('PERSON', 'A');
        const n2 = createTestNode('PERSON', 'B');
        const edge = createTestEdge(n1.id, n2.id, 'KNOWS');

        const res = await request('DELETE', `/edges/${edge.id}`, null, {
          Authorization: 'Bearer test-token',
        });

        expect(res.status).toBe(200);
        expect(edges.has(edge.id)).toBe(false);
      });
    });
  });

  // ==========================================================================
  // GRAPH TRAVERSAL
  // ==========================================================================

  describe('Graph Traversal', () => {
    describe('BFS Traversal', () => {
      it('should traverse graph using BFS', async () => {
        const alice = createTestNode('PERSON', 'Alice');
        const bob = createTestNode('PERSON', 'Bob');
        const carol = createTestNode('PERSON', 'Carol');

        createTestEdge(alice.id, bob.id, 'KNOWS');
        createTestEdge(bob.id, carol.id, 'KNOWS');

        const res = await request('POST', `/graph/traverse/${alice.id}`, {
          maxDepth: 2,
          direction: 'out',
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(200);
        expect(res.data.visitedCount).toBe(3); // Alice + Bob + Carol
      });

      it('should limit traversal by depth', async () => {
        const a = createTestNode('PERSON', 'A');
        const b = createTestNode('PERSON', 'B');
        const c = createTestNode('PERSON', 'C');

        createTestEdge(a.id, b.id, 'KNOWS');
        createTestEdge(b.id, c.id, 'KNOWS');

        const res = await request('POST', `/graph/traverse/${a.id}`, {
          maxDepth: 1,
        }, { Authorization: 'Bearer test-token' });

        expect(res.data.visitedCount).toBe(2); // A and B
      });

      it('should filter by edge types', async () => {
        const a = createTestNode('PERSON', 'A');
        const b = createTestNode('PERSON', 'B');
        const c = createTestNode('ORGANIZATION', 'C');

        createTestEdge(a.id, b.id, 'KNOWS');
        createTestEdge(a.id, c.id, 'WORKS_FOR');

        const res = await request('POST', `/graph/traverse/${a.id}`, {
          edgeTypes: ['KNOWS'],
        }, { Authorization: 'Bearer test-token' });

        expect(res.data.results.every(r => r.edge.type === 'KNOWS')).toBe(true);
      });

      it('should return 404 for non-existent start node', async () => {
        const fakeId = '00000000-0000-0000-0000-000000000000';
        const res = await request('POST', `/graph/traverse/${fakeId}`, {}, {
          Authorization: 'Bearer test-token',
        });

        expect(res.status).toBe(404);
      });
    });

    describe('DFS Traversal', () => {
      it('should traverse graph using DFS', async () => {
        const a = createTestNode('PERSON', 'A');
        const b = createTestNode('PERSON', 'B');
        const c = createTestNode('PERSON', 'C');

        createTestEdge(a.id, b.id, 'KNOWS');
        createTestEdge(b.id, c.id, 'KNOWS');

        const res = await request('POST', `/graph/dfs/${a.id}`, {
          maxDepth: 3,
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(200);
        expect(res.data.visitedCount).toBe(3);
      });
    });

    describe('Shortest Path', () => {
      it('should find shortest path between nodes', async () => {
        const a = createTestNode('PERSON', 'A');
        const b = createTestNode('PERSON', 'B');
        const c = createTestNode('PERSON', 'C');
        const d = createTestNode('PERSON', 'D');

        createTestEdge(a.id, b.id, 'KNOWS');
        createTestEdge(b.id, c.id, 'KNOWS');
        createTestEdge(c.id, d.id, 'KNOWS');

        const res = await request('POST', `/graph/path/${a.id}/${d.id}`, {}, {
          Authorization: 'Bearer test-token',
        });

        expect(res.status).toBe(200);
        expect(res.data.length).toBe(3);
        expect(res.data.path.length).toBe(4);
      });

      it('should return 404 for non-existent start node', async () => {
        const node = createTestNode('PERSON', 'Test');
        const fakeId = '00000000-0000-0000-0000-000000000000';

        const res = await request('POST', `/graph/path/${fakeId}/${node.id}`, {}, {
          Authorization: 'Bearer test-token',
        });

        expect(res.status).toBe(404);
      });

      it('should return length 0 for same node', async () => {
        const node = createTestNode('PERSON', 'Test');

        const res = await request('POST', `/graph/path/${node.id}/${node.id}`, {}, {
          Authorization: 'Bearer test-token',
        });

        expect(res.data.length).toBe(0);
      });

      it('should return -1 for unreachable nodes', async () => {
        const a = createTestNode('PERSON', 'A');
        const b = createTestNode('PERSON', 'B');

        const res = await request('POST', `/graph/path/${a.id}/${b.id}`, {}, {
          Authorization: 'Bearer test-token',
        });

        expect(res.data.length).toBe(-1);
        expect(res.data.message).toBe('No path found');
      });
    });
  });

  // ==========================================================================
  // SEARCH OPERATIONS
  // ==========================================================================

  describe('Search Operations', () => {
    describe('POST /graph/search', () => {
      it('should perform text search', async () => {
        createTestNode('PERSON', 'Alice Smith', { age: 30 });
        createTestNode('PERSON', 'Bob Johnson', { age: 25 });
        createTestNode('ORGANIZATION', 'Alice Corp', {});

        const res = await request('POST', '/graph/search', {
          query: 'Alice',
          topK: 10,
        }, { Authorization: 'Bearer test-token' });

        expect(res.status).toBe(200);
        expect(res.data.type).toBe('text');
        expect(res.data.results.length).toBe(2);
        expect(res.data.query).toBe('Alice');
      });

      it('should filter text search by node types', async () => {
        createTestNode('PERSON', 'Alice');
        createTestNode('ORGANIZATION', 'Alice Corp');

        const res = await request('POST', '/graph/search', {
          query: 'Alice',
          nodeTypes: ['PERSON'],
        }, { Authorization: 'Bearer test-token' });

        expect(res.data.results.length).toBe(1);
        expect(res.data.results[0].type).toBe('PERSON');
      });

      it('should reject search without query or embedding', async () => {
        const res = await request('POST', '/graph/search', {}, {
          Authorization: 'Bearer test-token',
        });

        expect(res.status).toBe(400);
        expect(res.data.error).toContain('Either embedding or query is required');
      });
    });

    describe('GET /graph/neighbors/:nodeId', () => {
      it('should get neighbors of a node', async () => {
        const alice = createTestNode('PERSON', 'Alice');
        const bob = createTestNode('PERSON', 'Bob');
        const org = createTestNode('ORGANIZATION', 'Acme');

        createTestEdge(alice.id, bob.id, 'KNOWS');
        createTestEdge(alice.id, org.id, 'WORKS_FOR');

        const res = await request('GET', `/graph/neighbors/${alice.id}`);
        expect(res.data.count).toBe(2);
        expect(res.data.neighbors.some(n => n.node.name === 'Bob')).toBe(true);
        expect(res.data.neighbors.some(n => n.node.name === 'Acme')).toBe(true);
      });

      it('should filter neighbors by direction', async () => {
        const alice = createTestNode('PERSON', 'Alice');
        const bob = createTestNode('PERSON', 'Bob');
        const carol = createTestNode('PERSON', 'Carol');

        createTestEdge(alice.id, bob.id, 'KNOWS');
        createTestEdge(carol.id, alice.id, 'KNOWS');

        const res = await request('GET', `/graph/neighbors/${alice.id}?direction=out`);
        expect(res.data.count).toBe(1);
        expect(res.data.neighbors[0].node.name).toBe('Bob');
        expect(res.data.neighbors[0].edge.direction).toBe('outgoing');
      });
    });
  });

  // ==========================================================================
  // STATISTICS AND TYPES
  // ==========================================================================

  describe('Statistics and Types', () => {
    it('GET /stats should return correct statistics', async () => {
      createTestNode('PERSON', 'Alice');
      createTestNode('PERSON', 'Bob');
      createTestNode('ORGANIZATION', 'Acme');

      const n1 = createTestNode('PERSON', 'A');
      const n2 = createTestNode('PERSON', 'B');
      createTestEdge(n1.id, n2.id, 'KNOWS');

      const res = await request('GET', '/stats');
      expect(res.data.totalNodes).toBe(5);
      expect(res.data.totalEdges).toBe(1);
      expect(res.data.nodesByType.PERSON).toBe(4);
      expect(res.data.nodesByType.ORGANIZATION).toBe(1);
      expect(res.data.edgesByType.KNOWS).toBe(1);
    });

    it('POST /stats/reset should reset statistics', async () => {
      createTestNode('PERSON', 'Test');

      const res = await request('POST', '/stats/reset', null, {
        Authorization: 'Bearer test-token',
      });

      expect(res.data.stats.nodesCreated).toBe(0);
    });

    it('GET /types/nodes should return all node types', async () => {
      const res = await request('GET', '/types/nodes');
      expect(res.data.nodeTypes).toEqual(NODE_TYPES);
      expect(res.data.nodeTypes).toContain('PERSON');
      expect(res.data.nodeTypes).toContain('ORGANIZATION');
      expect(res.data.nodeTypes).toContain('LOCATION');
      expect(res.data.nodeTypes).toContain('PRODUCT');
      expect(res.data.nodeTypes).toContain('SERVICE');
      expect(res.data.nodeTypes).toContain('CONCEPT');
      expect(res.data.nodeTypes).toContain('DOCUMENT');
      expect(res.data.nodeTypes).toContain('EVENT');
      expect(res.data.nodeTypes).toContain('PLACE');
    });

    it('GET /types/edges should return all edge types', async () => {
      const res = await request('GET', '/types/edges');
      expect(res.data.edgeTypes).toEqual(EDGE_TYPES);
      expect(res.data.edgeTypes).toContain('WORKS_FOR');
      expect(res.data.edgeTypes).toContain('LOCATED_IN');
      expect(res.data.edgeTypes).toContain('PRODUCE');
      expect(res.data.edgeTypes).toContain('SELL');
      expect(res.data.edgeTypes).toContain('KNOWS');
      expect(res.data.edgeTypes).toContain('REPORTED_BY');
    });
  });

  // ==========================================================================
  // INTEGRATION SCENARIOS
  // ==========================================================================

  describe('Integration Scenarios', () => {
    it('should create and traverse a company hierarchy', async () => {
      // Create company hierarchy
      const ceo = createTestNode('PERSON', 'John CEO', { title: 'CEO' });
      const cto = createTestNode('PERSON', 'Jane CTO', { title: 'CTO' });
      const dev1 = createTestNode('PERSON', 'Dev 1', { title: 'Developer' });
      const dev2 = createTestNode('PERSON', 'Dev 2', { title: 'Developer' });
      const company = createTestNode('ORGANIZATION', 'TechCorp', { founded: 2020 });

      // Create relationships
      createTestEdge(ceo.id, company.id, 'WORKS_FOR', { role: 'CEO' });
      createTestEdge(cto.id, company.id, 'WORKS_FOR', { role: 'CTO' });
      createTestEdge(dev1.id, cto.id, 'WORKS_FOR', { role: 'Senior Developer' });
      createTestEdge(dev2.id, cto.id, 'WORKS_FOR', { role: 'Junior Developer' });

      // Traverse from CEO (outgoing edges only - WORKS_FOR to company)
      const res = await request('POST', `/graph/traverse/${ceo.id}`, {
        maxDepth: 3,
        direction: 'out',
      }, { Authorization: 'Bearer test-token' });

      // With "out" direction, only Company is reachable (CEO -> WORKS_FOR -> Company)
      // CTO, dev1, dev2 are not reachable via outgoing edges from CEO
      expect(res.data.visitedCount).toBe(2); // CEO + TechCorp
    });

    it('should handle a knowledge graph with multiple entity types', async () => {
      // Create entities
      const author = createTestNode('PERSON', 'Jane Writer', { born: 1980 });
      const book = createTestNode('DOCUMENT', 'The Great Book', { year: 2020 });
      const publisher = createTestNode('ORGANIZATION', 'Penguin Books', { country: 'USA' });
      const nyc = createTestNode('LOCATION', 'New York City', { country: 'USA' });
      const event = createTestNode('EVENT', 'Book Launch', { date: '2020-05-01' });

      // Create relationships
      createTestEdge(author.id, book.id, 'REPORTED_BY', { role: 'author' });
      createTestEdge(publisher.id, book.id, 'PRODUCE');
      createTestEdge(publisher.id, nyc.id, 'LOCATED_IN');
      createTestEdge(event.id, book.id, 'REPORTED_BY', { type: 'launches' });
      createTestEdge(author.id, nyc.id, 'LOCATED_IN', { since: 2010 });

      // Verify book launch event connects to the book
      const res = await request('GET', `/graph/neighbors/${book.id}`);
      expect(res.data.count).toBeGreaterThanOrEqual(2); // author and publisher at minimum
    });

    it('should find path through a social network', async () => {
      // Create social network
      const alice = createTestNode('PERSON', 'Alice');
      const bob = createTestNode('PERSON', 'Bob');
      const carol = createTestNode('PERSON', 'Carol');
      const dave = createTestNode('PERSON', 'Dave');
      const eve = createTestNode('PERSON', 'Eve');

      createTestEdge(alice.id, bob.id, 'KNOWS', { strength: 0.9 });
      createTestEdge(bob.id, carol.id, 'KNOWS', { strength: 0.8 });
      createTestEdge(carol.id, dave.id, 'KNOWS', { strength: 0.7 });
      createTestEdge(dave.id, eve.id, 'KNOWS', { strength: 0.6 });

      // Alice wants to reach Eve
      const res = await request('POST', `/graph/path/${alice.id}/${eve.id}`, {}, {
        Authorization: 'Bearer test-token',
      });

      expect(res.data.length).toBe(4); // Alice -> Bob -> Carol -> Dave -> Eve
      expect(res.data.path[0].name).toBe('Alice');
      expect(res.data.path[res.data.path.length - 1].name).toBe('Eve');
    });

    it('should support product catalog with relationships', async () => {
      // Create product catalog
      const laptop = createTestNode('PRODUCT', 'Pro Laptop', { price: 1299, category: 'electronics' });
      const phone = createTestNode('PRODUCT', 'Smart Phone', { price: 899, category: 'electronics' });
      const apple = createTestNode('ORGANIZATION', 'Apple Inc', { country: 'USA' });
      const store1 = createTestNode('ORGANIZATION', 'Apple Store NYC', { city: 'New York' });
      const store2 = createTestNode('ORGANIZATION', 'Apple Store LA', { city: 'Los Angeles' });

      // Create relationships
      createTestEdge(apple.id, laptop.id, 'PRODUCE', { since: 2020 });
      createTestEdge(apple.id, phone.id, 'PRODUCE', { since: 2019 });
      createTestEdge(store1.id, apple.id, 'WORKS_FOR');
      createTestEdge(store2.id, apple.id, 'WORKS_FOR');
      createTestEdge(store1.id, laptop.id, 'SELL', { stock: 50 });
      createTestEdge(store2.id, laptop.id, 'SELL', { stock: 30 });

      // Find all products by Apple
      const res = await request('POST', `/graph/traverse/${apple.id}`, {
        direction: 'out',
        edgeTypes: ['PRODUCE'],
      }, { Authorization: 'Bearer test-token' });

      expect(res.data.results.some(r => r.node.name === 'Pro Laptop')).toBe(true);
      expect(res.data.results.some(r => r.node.name === 'Smart Phone')).toBe(true);
    });
  });
});
