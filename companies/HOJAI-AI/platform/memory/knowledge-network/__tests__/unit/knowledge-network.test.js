/**
 * Knowledge Network Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

function createTestApp() {
  const app = express();
  app.use(express.json());

  const knowledgeNodes = new Map();
  const crossServiceLinks = new Map();
  const networkViews = new Map();
  const syncLogs = [];

  function generateId(prefix = 'kn') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // Nodes
  app.post('/api/nodes', (req, res) => {
    const { type, label, properties, services, tags } = req.body;
    if (!type || !label) return res.status(400).json({ error: 'Type and label are required' });
    const nodeId = generateId('node');
    const node = { id: nodeId, type, label, properties: properties || {}, services: services || [], connections: { incoming: [], outgoing: [] }, tags: tags || [], createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), version: 1 };
    knowledgeNodes.set(nodeId, node);
    res.status(201).json({ id: nodeId, node });
  });

  app.get('/api/nodes', (req, res) => {
    const { type, service, tag, search, limit, offset } = req.query;
    let result = Array.from(knowledgeNodes.values());
    if (type) result = result.filter(n => n.type === type);
    if (service) result = result.filter(n => n.services.includes(service));
    if (tag) result = result.filter(n => n.tags.includes(tag));
    if (search) { const lower = search.toLowerCase(); result = result.filter(n => n.label.toLowerCase().includes(lower)); }
    const total = result.length;
    if (offset) result = result.slice(parseInt(offset));
    if (limit) result = result.slice(0, parseInt(limit));
    res.json({ nodes: result, total, limit: parseInt(limit) || total, offset: parseInt(offset) || 0 });
  });

  app.get('/api/nodes/:nodeId', (req, res) => {
    const node = knowledgeNodes.get(req.params.nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    res.json({ node });
  });

  app.patch('/api/nodes/:nodeId', (req, res) => {
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

  app.delete('/api/nodes/:nodeId', (req, res) => {
    if (!knowledgeNodes.has(req.params.nodeId)) return res.status(404).json({ error: 'Node not found' });
    for (const [linkId, link] of crossServiceLinks) {
      if (link.sourceNodeId === req.params.nodeId || link.targetNodeId === req.params.nodeId) crossServiceLinks.delete(linkId);
    }
    knowledgeNodes.delete(req.params.nodeId);
    res.json({ message: 'Node deleted', id: req.params.nodeId });
  });

  // Links
  app.post('/api/links', (req, res) => {
    const { sourceNodeId, targetNodeId, relationship, strength, metadata } = req.body;
    if (!sourceNodeId || !targetNodeId || !relationship) return res.status(400).json({ error: 'sourceNodeId, targetNodeId, and relationship are required' });
    if (!knowledgeNodes.has(sourceNodeId) || !knowledgeNodes.has(targetNodeId)) return res.status(404).json({ error: 'Source or target node not found' });
    const linkId = generateId('link');
    const link = { id: linkId, sourceNodeId, targetNodeId, relationship, strength: strength || 1.0, metadata: metadata || {}, createdAt: new Date().toISOString() };
    crossServiceLinks.set(linkId, link);
    knowledgeNodes.get(sourceNodeId).connections.outgoing.push(linkId);
    knowledgeNodes.get(targetNodeId).connections.incoming.push(linkId);
    res.status(201).json({ id: linkId, link });
  });

  app.get('/api/links', (req, res) => {
    const { sourceNodeId, targetNodeId, relationship, minStrength } = req.query;
    let result = Array.from(crossServiceLinks.values());
    if (sourceNodeId) result = result.filter(l => l.sourceNodeId === sourceNodeId);
    if (targetNodeId) result = result.filter(l => l.targetNodeId === targetNodeId);
    if (relationship) result = result.filter(l => l.relationship === relationship);
    if (minStrength) result = result.filter(l => l.strength >= parseFloat(minStrength));
    res.json({ links: result, total: result.length });
  });

  app.get('/api/links/:linkId', (req, res) => {
    const link = crossServiceLinks.get(req.params.linkId);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    res.json({ link });
  });

  app.patch('/api/links/:linkId', (req, res) => {
    const link = crossServiceLinks.get(req.params.linkId);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    const { relationship, strength, metadata } = req.body;
    if (relationship) link.relationship = relationship;
    if (strength !== undefined) link.strength = strength;
    if (metadata) link.metadata = { ...link.metadata, ...metadata };
    res.json({ link });
  });

  app.delete('/api/links/:linkId', (req, res) => {
    const link = crossServiceLinks.get(req.params.linkId);
    if (!link) return res.status(404).json({ error: 'Link not found' });
    const source = knowledgeNodes.get(link.sourceNodeId);
    const target = knowledgeNodes.get(link.targetNodeId);
    if (source) source.connections.outgoing = source.connections.outgoing.filter(id => id !== req.params.linkId);
    if (target) target.connections.incoming = target.connections.incoming.filter(id => id !== req.params.linkId);
    crossServiceLinks.delete(req.params.linkId);
    res.json({ message: 'Link deleted', id: req.params.linkId });
  });

  // Views
  app.post('/api/views', (req, res) => {
    const { name, nodeTypes, filters, createdBy } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const viewId = generateId('view');
    const view = { id: viewId, name, nodeTypes: nodeTypes || [], filters: filters || {}, createdBy: createdBy || 'system', createdAt: new Date().toISOString() };
    networkViews.set(viewId, view);
    res.status(201).json({ id: viewId, view });
  });

  app.get('/api/views', (req, res) => {
    res.json({ views: Array.from(networkViews.values()), total: networkViews.size });
  });

  app.get('/api/views/:viewId', (req, res) => {
    const view = networkViews.get(req.params.viewId);
    if (!view) return res.status(404).json({ error: 'View not found' });
    res.json({ view });
  });

  app.delete('/api/views/:viewId', (req, res) => {
    if (!networkViews.has(req.params.viewId)) return res.status(404).json({ error: 'View not found' });
    networkViews.delete(req.params.viewId);
    res.json({ message: 'View deleted', id: req.params.viewId });
  });

  // Graph traversal
  app.get('/api/graph/:nodeId/connections', (req, res) => {
    const nodeId = req.params.nodeId;
    const maxDepth = parseInt(req.query.depth) || 2;
    const node = knowledgeNodes.get(nodeId);
    if (!node) return res.status(404).json({ error: 'Node not found' });
    const visited = new Set();
    const results = [];
    function traverse(currentId, currentDepth) {
      if (currentDepth > maxDepth || visited.has(currentId)) return;
      visited.add(currentId);
      const current = knowledgeNodes.get(currentId);
      if (current) results.push({ node: current, depth: currentDepth });
      for (const link of crossServiceLinks.values()) {
        let neighborId = null;
        if (link.sourceNodeId === currentId) neighborId = link.targetNodeId;
        else if (link.targetNodeId === currentId) neighborId = link.sourceNodeId;
        if (neighborId && !visited.has(neighborId)) traverse(neighborId, currentDepth + 1);
      }
    }
    traverse(nodeId, 0);
    res.json({ nodeId, connections: results, total: results.length });
  });

  app.get('/api/graph/path', (req, res) => {
    const { from, to, maxHops } = req.query;
    if (!from || !to) return res.status(400).json({ error: 'from and to node IDs are required' });
    if (!knowledgeNodes.has(from) || !knowledgeNodes.has(to)) return res.status(404).json({ error: 'Source or target node not found' });
    const maxHopsLimit = parseInt(maxHops) || 10;
    const visited = new Set();
    const queue = [[from, [from]]];
    while (queue.length > 0) {
      const [current, path] = queue.shift();
      if (current === to) return res.json({ path, hops: path.length - 1 });
      if (path.length > maxHopsLimit || visited.has(current)) continue;
      visited.add(current);
      for (const link of crossServiceLinks.values()) {
        let neighbor = null;
        if (link.sourceNodeId === current) neighbor = link.targetNodeId;
        else if (link.targetNodeId === current) neighbor = link.sourceNodeId;
        if (neighbor && !visited.has(neighbor)) queue.push([neighbor, [...path, neighbor]]);
      }
    }
    res.json({ path: null, message: 'No path found' });
  });

  // Sync
  app.post('/api/sync', (req, res) => {
    const { sourceService, targetService, operation, nodesAffected } = req.body;
    const logEntry = { id: generateId('sync'), sourceService: sourceService || 'unknown', targetService: targetService || 'unknown', operation: operation || 'unknown', nodesAffected: nodesAffected || 0, timestamp: new Date().toISOString() };
    syncLogs.push(logEntry);
    res.status(201).json({ id: logEntry.id, sync: logEntry });
  });

  app.get('/api/sync', (req, res) => {
    const { sourceService, limit } = req.query;
    let result = [...syncLogs];
    if (sourceService) result = result.filter(l => l.sourceService === sourceService);
    if (limit) result = result.slice(-parseInt(limit));
    res.json({ logs: result, total: result.length });
  });

  // Stats
  app.get('/api/stats', (req, res) => {
    const stats = { totalNodes: knowledgeNodes.size, totalLinks: crossServiceLinks.size, totalViews: networkViews.size, nodesByType: {}, nodesByService: {}, topRelationships: {} };
    for (const node of knowledgeNodes.values()) {
      stats.nodesByType[node.type] = (stats.nodesByType[node.type] || 0) + 1;
      for (const svc of node.services) stats.nodesByService[svc] = (stats.nodesByService[svc] || 0) + 1;
    }
    for (const link of crossServiceLinks.values()) stats.topRelationships[link.relationship] = (stats.topRelationships[link.relationship] || 0) + 1;
    res.json(stats);
  });

  app.get('/health', (req, res) => res.json({ service: 'knowledge-network', status: 'healthy', timestamp: new Date().toISOString() }));

  return app;
}

describe('Knowledge Network Service', () => {
  let app;

  beforeEach(() => { app = createTestApp(); });

  describe('Nodes', () => {
    it('should create a knowledge node', async () => {
      const res = await request(app).post('/api/nodes').send({ type: 'concept', label: 'Machine Learning', services: ['memory-os'], tags: ['ai'] });
      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^node_/);
      expect(res.body.node.type).toBe('concept');
    });

    it('should reject node without type or label', async () => {
      const res1 = await request(app).post('/api/nodes').send({ label: 'test' });
      expect(res1.status).toBe(400);
      const res2 = await request(app).post('/api/nodes').send({ type: 'test' });
      expect(res2.status).toBe(400);
    });

    it('should list nodes with filters', async () => {
      await request(app).post('/api/nodes').send({ type: 'concept', label: 'ML', services: ['svc1'] });
      await request(app).post('/api/nodes').send({ type: 'fact', label: 'Fact', services: ['svc2'] });
      const res = await request(app).get('/api/nodes?type=concept');
      expect(res.body.total).toBe(1);
    });

    it('should filter nodes by service', async () => {
      await request(app).post('/api/nodes').send({ type: 't', label: 'n1', services: ['svc-a'] });
      await request(app).post('/api/nodes').send({ type: 't', label: 'n2', services: ['svc-b'] });
      const res = await request(app).get('/api/nodes?service=svc-a');
      expect(res.body.total).toBe(1);
    });

    it('should get node by ID', async () => {
      const { body: { id } } = await request(app).post('/api/nodes').send({ type: 't', label: 'test' });
      const res = await request(app).get(`/api/nodes/${id}`);
      expect(res.body.node.label).toBe('test');
    });

    it('should update node', async () => {
      const { body: { id } } = await request(app).post('/api/nodes').send({ type: 't', label: 'old' });
      const res = await request(app).patch(`/api/nodes/${id}`).send({ label: 'new' });
      expect(res.body.node.label).toBe('new');
      expect(res.body.node.version).toBe(2);
    });

    it('should delete node and its links', async () => {
      const { body: { id: n1 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n1' });
      const { body: { id: n2 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n2' });
      await request(app).post('/api/links').send({ sourceNodeId: n1, targetNodeId: n2, relationship: 'related' });
      await request(app).delete(`/api/nodes/${n1}`);
      const links = await request(app).get('/api/links');
      expect(links.body.links).toHaveLength(0);
    });
  });

  describe('Links', () => {
    it('should create a link between nodes', async () => {
      const { body: { id: n1 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n1' });
      const { body: { id: n2 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n2' });
      const res = await request(app).post('/api/links').send({ sourceNodeId: n1, targetNodeId: n2, relationship: 'depends_on', strength: 0.8 });
      expect(res.status).toBe(201);
      expect(res.body.link.strength).toBe(0.8);
    });

    it('should reject link with missing nodes', async () => {
      const res = await request(app).post('/api/links').send({ sourceNodeId: 'fake', targetNodeId: 'also-fake', relationship: 'test' });
      expect(res.status).toBe(404);
    });

    it('should get links with filters', async () => {
      const { body: { id: n1 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n1' });
      const { body: { id: n2 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n2' });
      await request(app).post('/api/links').send({ sourceNodeId: n1, targetNodeId: n2, relationship: 'type-a' });
      await request(app).post('/api/links').send({ sourceNodeId: n1, targetNodeId: n2, relationship: 'type-b' });
      const res = await request(app).get('/api/links?relationship=type-a');
      expect(res.body.total).toBe(1);
    });

    it('should update link', async () => {
      const { body: { id: n1 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n1' });
      const { body: { id: n2 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n2' });
      const { body: { id } } = await request(app).post('/api/links').send({ sourceNodeId: n1, targetNodeId: n2, relationship: 'old' });
      const res = await request(app).patch(`/api/links/${id}`).send({ relationship: 'new', strength: 0.5 });
      expect(res.body.link.relationship).toBe('new');
      expect(res.body.link.strength).toBe(0.5);
    });

    it('should delete link', async () => {
      const { body: { id: n1 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n1' });
      const { body: { id: n2 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n2' });
      const { body: { id } } = await request(app).post('/api/links').send({ sourceNodeId: n1, targetNodeId: n2, relationship: 'test' });
      await request(app).delete(`/api/links/${id}`);
      const res = await request(app).get(`/api/links/${id}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Views', () => {
    it('should create a view', async () => {
      const res = await request(app).post('/api/views').send({ name: 'AI Concepts', nodeTypes: ['concept'], createdBy: 'user1' });
      expect(res.status).toBe(201);
      expect(res.body.view.name).toBe('AI Concepts');
    });

    it('should list views', async () => {
      await request(app).post('/api/views').send({ name: 'v1' });
      await request(app).post('/api/views').send({ name: 'v2' });
      const res = await request(app).get('/api/views');
      expect(res.body.total).toBe(2);
    });

    it('should delete view', async () => {
      const { body: { id } } = await request(app).post('/api/views').send({ name: 'test' });
      await request(app).delete(`/api/views/${id}`);
      const res = await request(app).get(`/api/views/${id}`);
      expect(res.status).toBe(404);
    });
  });

  describe('Graph Traversal', () => {
    it('should get connected nodes', async () => {
      const { body: { id: n1 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n1' });
      const { body: { id: n2 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n2' });
      const { body: { id: n3 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n3' });
      await request(app).post('/api/links').send({ sourceNodeId: n1, targetNodeId: n2, relationship: 'r' });
      await request(app).post('/api/links').send({ sourceNodeId: n2, targetNodeId: n3, relationship: 'r' });
      const res = await request(app).get(`/api/graph/${n1}/connections?depth=2`);
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });

    it('should find shortest path', async () => {
      const { body: { id: n1 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n1' });
      const { body: { id: n2 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n2' });
      await request(app).post('/api/links').send({ sourceNodeId: n1, targetNodeId: n2, relationship: 'r' });
      const res = await request(app).get(`/api/graph/path?from=${n1}&to=${n2}`);
      expect(res.body.path).toHaveLength(2);
    });

    it('should return no path when unreachable', async () => {
      const { body: { id: n1 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n1' });
      const { body: { id: n2 } } = await request(app).post('/api/nodes').send({ type: 't', label: 'n2' });
      const res = await request(app).get(`/api/graph/path?from=${n1}&to=${n2}`);
      expect(res.body.path).toBeNull();
    });
  });

  describe('Sync', () => {
    it('should log sync operation', async () => {
      const res = await request(app).post('/api/sync').send({ sourceService: 'svc1', targetService: 'svc2', operation: 'merge', nodesAffected: 5 });
      expect(res.status).toBe(201);
      expect(res.body.sync.nodesAffected).toBe(5);
    });

    it('should get sync logs', async () => {
      await request(app).post('/api/sync').send({ sourceService: 'svc1', operation: 'op1' });
      await request(app).post('/api/sync').send({ sourceService: 'svc2', operation: 'op2' });
      const res = await request(app).get('/api/sync?sourceService=svc1');
      expect(res.body.total).toBe(1);
    });
  });

  describe('Stats', () => {
    it('should return network statistics', async () => {
      await request(app).post('/api/nodes').send({ type: 'concept', label: 'n1', services: ['svc1'] });
      await request(app).post('/api/nodes').send({ type: 'fact', label: 'n2', services: ['svc1'] });
      const res = await request(app).get('/api/stats');
      expect(res.body.totalNodes).toBe(2);
      expect(res.body.nodesByType.concept).toBe(1);
      expect(res.body.nodesByService.svc1).toBe(2);
    });
  });

  describe('Health', () => {
    it('should return health status', async () => {
      const res = await request(app).get('/health');
      expect(res.body.status).toBe('healthy');
    });
  });
});