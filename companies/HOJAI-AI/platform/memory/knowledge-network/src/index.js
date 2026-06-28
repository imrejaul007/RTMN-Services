/**
 * Knowledge Network Service
 * Cross-service knowledge graph connections
 * Manages knowledge sharing between different memory services
 */

import express from 'express';
import crypto from 'crypto';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

app.use(express.json());

// In-memory stores
const knowledgeNodes = new Map();      // nodeId -> { id, type, label, properties, services, connections, createdAt }
const crossServiceLinks = new Map();   // linkId -> { id, sourceNodeId, targetNodeId, relationship, strength, metadata }
const networkViews = new Map();        // viewId -> { id, name, nodeTypes, filters, createdBy }
const syncLogs = [];                   // Sync operation logs
const MAX_LOG_SIZE = 500;

// ID generation
function generateId(prefix = 'kn') {
  return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

// ============ KNOWLEDGE NODES ============

// Register a knowledge node
app.post('/api/nodes', requireInternal, (req, res) => {
  const { type, label, properties, services, tags } = req.body;

  if (!type || !label) {
    return res.status(400).json({ error: 'Type and label are required' });
  }

  const nodeId = generateId('node');
  const node = {
    id: nodeId,
    type,
    label,
    properties: properties || {},
    services: services || [],
    connections: { incoming: [], outgoing: [] },
    tags: tags || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    version: 1,
  };

  knowledgeNodes.set(nodeId, node);

  res.status(201).json({
    id: nodeId,
    node,
    message: 'Knowledge node created'
  });
});

// Get all nodes with filters
app.get('/api/nodes', (req, res) => {
  const { type, service, tag, search, limit, offset } = req.query;
  let result = Array.from(knowledgeNodes.values());

  if (type) result = result.filter(n => n.type === type);
  if (service) result = result.filter(n => n.services.includes(service));
  if (tag) result = result.filter(n => n.tags.includes(tag));
  if (search) {
    const lower = search.toLowerCase();
    result = result.filter(n =>
      n.label.toLowerCase().includes(lower) ||
      JSON.stringify(n.properties).toLowerCase().includes(lower)
    );
  }

  const total = result.length;
  if (offset) result = result.slice(parseInt(offset));
  if (limit) result = result.slice(0, parseInt(limit));

  res.json({ nodes: result, total, limit: parseInt(limit) || total, offset: parseInt(offset) || 0 });
});

// Get node by ID
app.get('/api/nodes/:nodeId', (req, res) => {
  const node = knowledgeNodes.get(req.params.nodeId);
  if (!node) return res.status(404).json({ error: 'Node not found' });
  res.json({ node });
});

// Update node
app.patch('/api/nodes/:nodeId', requireInternal, (req, res) => {
  const node = knowledgeNodes.get(req.params.nodeId);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  const { label, properties, services, tags } = req.body;
  if (label) node.label = label;
  if (properties) node.properties = { ...node.properties, ...properties };
  if (services) node.services = services;
  if (tags) node.tags = tags;
  node.updatedAt = new Date().toISOString();
  node.version++;

  res.json({ node });
});

// Delete node (also removes all links)
app.delete('/api/nodes/:nodeId', requireInternal, (req, res) => {
  const node = knowledgeNodes.get(req.params.nodeId);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  // Remove all links involving this node
  for (const [linkId, link] of crossServiceLinks) {
    if (link.sourceNodeId === req.params.nodeId || link.targetNodeId === req.params.nodeId) {
      crossServiceLinks.delete(linkId);
    }
  }

  knowledgeNodes.delete(req.params.nodeId);
  res.json({ message: 'Node deleted', id: req.params.nodeId });
});

// ============ CROSS-SERVICE LINKS ============

// Create a link between nodes
app.post('/api/links', requireInternal, (req, res) => {
  const { sourceNodeId, targetNodeId, relationship, strength, metadata } = req.body;

  if (!sourceNodeId || !targetNodeId || !relationship) {
    return res.status(400).json({ error: 'sourceNodeId, targetNodeId, and relationship are required' });
  }

  if (!knowledgeNodes.has(sourceNodeId) || !knowledgeNodes.has(targetNodeId)) {
    return res.status(404).json({ error: 'Source or target node not found' });
  }

  const linkId = generateId('link');
  const link = {
    id: linkId,
    sourceNodeId,
    targetNodeId,
    relationship,
    strength: strength || 1.0,
    metadata: metadata || {},
    createdAt: new Date().toISOString(),
  };

  crossServiceLinks.set(linkId, link);

  // Update node connections
  const source = knowledgeNodes.get(sourceNodeId);
  const target = knowledgeNodes.get(targetNodeId);
  source.connections.outgoing.push(linkId);
  target.connections.incoming.push(linkId);

  res.status(201).json({ id: linkId, link });
});

// Get all links with filters
app.get('/api/links', (req, res) => {
  const { sourceNodeId, targetNodeId, relationship, minStrength } = req.query;
  let result = Array.from(crossServiceLinks.values());

  if (sourceNodeId) result = result.filter(l => l.sourceNodeId === sourceNodeId);
  if (targetNodeId) result = result.filter(l => l.targetNodeId === targetNodeId);
  if (relationship) result = result.filter(l => l.relationship === relationship);
  if (minStrength) result = result.filter(l => l.strength >= parseFloat(minStrength));

  res.json({ links: result, total: result.length });
});

// Get link by ID
app.get('/api/links/:linkId', (req, res) => {
  const link = crossServiceLinks.get(req.params.linkId);
  if (!link) return res.status(404).json({ error: 'Link not found' });
  res.json({ link });
});

// Update link
app.patch('/api/links/:linkId', requireInternal, (req, res) => {
  const link = crossServiceLinks.get(req.params.linkId);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  const { relationship, strength, metadata } = req.body;
  if (relationship) link.relationship = relationship;
  if (strength !== undefined) link.strength = strength;
  if (metadata) link.metadata = { ...link.metadata, ...metadata };

  res.json({ link });
});

// Delete link
app.delete('/api/links/:linkId', requireInternal, (req, res) => {
  const link = crossServiceLinks.get(req.params.linkId);
  if (!link) return res.status(404).json({ error: 'Link not found' });

  // Remove from node connections
  const source = knowledgeNodes.get(link.sourceNodeId);
  const target = knowledgeNodes.get(link.targetNodeId);
  if (source) {
    source.connections.outgoing = source.connections.outgoing.filter(id => id !== req.params.linkId);
  }
  if (target) {
    target.connections.incoming = target.connections.incoming.filter(id => id !== req.params.linkId);
  }

  crossServiceLinks.delete(req.params.linkId);
  res.json({ message: 'Link deleted', id: req.params.linkId });
});

// ============ NETWORK VIEWS ============

// Create a network view
app.post('/api/views', requireInternal, (req, res) => {
  const { name, nodeTypes, filters, createdBy } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const viewId = generateId('view');
  const view = {
    id: viewId,
    name,
    nodeTypes: nodeTypes || [],
    filters: filters || {},
    createdBy: createdBy || 'system',
    createdAt: new Date().toISOString(),
  };

  networkViews.set(viewId, view);

  res.status(201).json({ id: viewId, view });
});

// Get all views
app.get('/api/views', (req, res) => {
  const views = Array.from(networkViews.values());
  res.json({ views, total: views.length });
});

// Get view by ID
app.get('/api/views/:viewId', (req, res) => {
  const view = networkViews.get(req.params.viewId);
  if (!view) return res.status(404).json({ error: 'View not found' });
  res.json({ view });
});

// Delete view
app.delete('/api/views/:viewId', requireInternal, (req, res) => {
  if (!networkViews.has(req.params.viewId)) {
    return res.status(404).json({ error: 'View not found' });
  }
  networkViews.delete(req.params.viewId);
  res.json({ message: 'View deleted', id: req.params.viewId });
});

// ============ GRAPH TRAVERSAL ============

// Get connected nodes (graph traversal)
app.get('/api/graph/:nodeId/connections', (req, res) => {
  const { depth, direction, relationship } = req.params.nodeId ? { depth: 1, direction: 'both', relationship: null } : {};
  const nodeId = req.params.nodeId;
  const maxDepth = parseInt(req.query.depth) || 2;
  const dir = req.query.direction || 'both';

  const node = knowledgeNodes.get(nodeId);
  if (!node) return res.status(404).json({ error: 'Node not found' });

  const visited = new Set();
  const results = [];

  function traverse(currentId, currentDepth) {
    if (currentDepth > maxDepth || visited.has(currentId)) return;
    visited.add(currentId);

    const current = knowledgeNodes.get(currentId);
    if (current) results.push({ node: current, depth: currentDepth });

    // Get connected links
    for (const link of crossServiceLinks.values()) {
      let neighborId = null;
      if (link.sourceNodeId === currentId && (dir === 'outgoing' || dir === 'both')) {
        neighborId = link.targetNodeId;
      } else if (link.targetNodeId === currentId && (dir === 'incoming' || dir === 'both')) {
        neighborId = link.sourceNodeId;
      }

      if (neighborId && !visited.has(neighborId)) {
        if (!relationship || link.relationship === relationship) {
          traverse(neighborId, currentDepth + 1);
        }
      }
    }
  }

  traverse(nodeId, 0);

  res.json({ nodeId, connections: results, total: results.length });
});

// Get shortest path between nodes
app.get('/api/graph/path', (req, res) => {
  const { from, to, maxHops } = req.query;

  if (!from || !to) {
    return res.status(400).json({ error: 'from and to node IDs are required' });
  }

  if (!knowledgeNodes.has(from) || !knowledgeNodes.has(to)) {
    return res.status(404).json({ error: 'Source or target node not found' });
  }

  const maxHopsLimit = parseInt(maxHops) || 10;
  const visited = new Set();
  const queue = [[from, [from]]];

  while (queue.length > 0) {
    const [current, path] = queue.shift();

    if (current === to) {
      return res.json({ path, hops: path.length - 1 });
    }

    if (path.length > maxHopsLimit) continue;
    if (visited.has(current)) continue;
    visited.add(current);

    // Find all connected nodes
    for (const link of crossServiceLinks.values()) {
      let neighbor = null;
      if (link.sourceNodeId === current) neighbor = link.targetNodeId;
      else if (link.targetNodeId === current) neighbor = link.sourceNodeId;

      if (neighbor && !visited.has(neighbor)) {
        queue.push([neighbor, [...path, neighbor]]);
      }
    }
  }

  res.json({ path: null, message: 'No path found' });
});

// ============ SYNC OPERATIONS ============

// Log a sync operation
app.post('/api/sync', requireInternal, (req, res) => {
  const { sourceService, targetService, operation, nodesAffected } = req.body;

  const logEntry = {
    id: generateId('sync'),
    sourceService: sourceService || 'unknown',
    targetService: targetService || 'unknown',
    operation: operation || 'unknown',
    nodesAffected: nodesAffected || 0,
    timestamp: new Date().toISOString(),
  };

  syncLogs.push(logEntry);
  if (syncLogs.length > MAX_LOG_SIZE) syncLogs.shift();

  res.status(201).json({ id: logEntry.id, sync: logEntry });
});

// Get sync logs
app.get('/api/sync', (req, res) => {
  const { sourceService, targetService, since, limit } = req.query;
  let result = [...syncLogs];

  if (sourceService) result = result.filter(l => l.sourceService === sourceService);
  if (targetService) result = result.filter(l => l.targetService === targetService);
  if (since) result = result.filter(l => new Date(l.timestamp) >= new Date(since));
  if (limit) result = result.slice(-parseInt(limit));

  res.json({ logs: result, total: result.length });
});

// ============ STATISTICS ============

app.get('/api/stats', (req, res) => {
  const stats = {
    totalNodes: knowledgeNodes.size,
    totalLinks: crossServiceLinks.size,
    totalViews: networkViews.size,
    totalSyncs: syncLogs.length,
    nodesByType: {},
    nodesByService: {},
    topRelationships: {},
  };

  for (const node of knowledgeNodes.values()) {
    stats.nodesByType[node.type] = (stats.nodesByType[node.type] || 0) + 1;
    for (const svc of node.services) {
      stats.nodesByService[svc] = (stats.nodesByService[svc] || 0) + 1;
    }
  }

  for (const link of crossServiceLinks.values()) {
    stats.topRelationships[link.relationship] = (stats.topRelationships[link.relationship] || 0) + 1;
  }

  res.json(stats);
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'knowledge-network',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 4796;
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  console.log(`Knowledge Network running on port ${PORT}`);
});

export { app, knowledgeNodes, crossServiceLinks, networkViews, syncLogs };
export default server;