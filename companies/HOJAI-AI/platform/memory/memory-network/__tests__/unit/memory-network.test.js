/**
 * Memory Network Service Tests
 * Tests for inter-service communication, pub/sub, and service registry
 */

import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';

// Create test app with in-memory stores
function createTestApp() {
  const app = express();
  app.use(express.json());

  // In-memory stores
  const services = new Map();
  const subscriptions = new Map();
  const messageLog = [];
  const healthChecks = new Map();
  const MAX_LOG_SIZE = 1000;

  function generateId() {
    return `svc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function generateMsgId() {
    return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  }

  // ============ SERVICE REGISTRY ============

  app.post('/api/services', (req, res) => {
    const { name, url, port, capabilities, metadata } = req.body;
    if (!name) return res.status(400).json({ error: 'Service name is required' });

    const serviceId = generateId();
    const service = {
      id: serviceId, name, url: url || `http://localhost:${port || 4000}`,
      port: port || 4000, capabilities: capabilities || [], metadata: metadata || {},
      status: 'active', registeredAt: new Date().toISOString(), lastSeen: new Date().toISOString(),
    };

    services.set(serviceId, service);
    subscriptions.set(serviceId, new Set());
    healthChecks.set(serviceId, { lastSeen: new Date().toISOString(), healthy: true });

    res.status(201).json({ id: serviceId, service });
  });

  app.get('/api/services', (req, res) => {
    const { capability, status, limit } = req.query;
    let result = Array.from(services.values());
    if (capability) result = result.filter(s => s.capabilities.includes(capability));
    if (status) result = result.filter(s => s.status === status);
    if (limit) result = result.slice(0, parseInt(limit));
    res.json({ services: result, total: result.length });
  });

  app.get('/api/services/:serviceId', (req, res) => {
    const service = services.get(req.params.serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json({ service });
  });

  app.patch('/api/services/:serviceId', (req, res) => {
    const service = services.get(req.params.serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    const { status, capabilities, metadata } = req.body;
    if (status) service.status = status;
    if (capabilities) service.capabilities = capabilities;
    if (metadata) service.metadata = { ...service.metadata, ...metadata };
    service.lastSeen = new Date().toISOString();
    res.json({ service });
  });

  app.delete('/api/services/:serviceId', (req, res) => {
    if (!services.has(req.params.serviceId)) return res.status(404).json({ error: 'Service not found' });
    services.delete(req.params.serviceId);
    subscriptions.delete(req.params.serviceId);
    healthChecks.delete(req.params.serviceId);
    res.json({ message: 'Service unregistered', id: req.params.serviceId });
  });

  app.post('/api/services/:serviceId/heartbeat', (req, res) => {
    const service = services.get(req.params.serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    service.lastSeen = new Date().toISOString();
    healthChecks.set(req.params.serviceId, { lastSeen: new Date().toISOString(), healthy: req.body.healthy !== false });
    res.json({ received: true, lastSeen: service.lastSeen });
  });

  // ============ PUBSUB ============

  app.post('/api/publish', (req, res) => {
    const { topic, message, sourceId, priority } = req.body;
    if (!topic || !message) return res.status(400).json({ error: 'Topic and message are required' });

    const msgId = generateMsgId();
    const msg = { id: msgId, topic, message, sourceId: sourceId || 'anonymous', priority: priority || 'normal', timestamp: new Date().toISOString() };
    messageLog.push(msg);
    if (messageLog.length > MAX_LOG_SIZE) messageLog.shift();

    res.status(201).json({ id: msgId, topic, delivered: subscriptions.size, timestamp: msg.timestamp });
  });

  app.post('/api/subscribe', (req, res) => {
    const { serviceId, topic } = req.body;
    if (!serviceId || !topic) return res.status(400).json({ error: 'ServiceId and topic are required' });
    if (!services.has(serviceId)) return res.status(404).json({ error: 'Service not registered' });
    subscriptions.get(serviceId).add({ topic, callback: 'internal' });
    res.json({ subscribed: true, serviceId, topic });
  });

  app.delete('/api/subscribe', (req, res) => {
    const { serviceId, topic } = req.body;
    if (!serviceId || !topic) return res.status(400).json({ error: 'ServiceId and topic are required' });
    const subs = subscriptions.get(serviceId);
    if (!subs) return res.status(404).json({ error: 'Service not found' });
    let removed = 0;
    for (const sub of subs) { if (sub.topic === topic) { subs.delete(sub); removed++; } }
    res.json({ unsubscribed: true, serviceId, topic, removed });
  });

  app.get('/api/subscriptions/:serviceId', (req, res) => {
    const subs = subscriptions.get(req.params.serviceId);
    if (!subs) return res.status(404).json({ error: 'Service not found' });
    res.json({ subscriptions: Array.from(subs) });
  });

  // ============ MESSAGES ============

  app.get('/api/messages', (req, res) => {
    const { topic, sourceId, since, limit } = req.query;
    let result = [...messageLog];
    if (topic) result = result.filter(m => m.topic === topic);
    if (sourceId) result = result.filter(m => m.sourceId === sourceId);
    if (since) result = result.filter(m => new Date(m.timestamp) >= new Date(since));
    if (limit) result = result.slice(-parseInt(limit));
    res.json({ messages: result, total: result.length });
  });

  // ============ HEALTH ============

  app.get('/api/health', (req, res) => {
    const now = Date.now();
    const statuses = [];
    for (const [serviceId, service] of services) {
      const age = (now - new Date(service.lastSeen).getTime()) / 1000;
      statuses.push({ serviceId, name: service.name, status: age > 60 ? 'stale' : service.status, lastSeen: service.lastSeen, healthy: age <= 60 });
    }
    res.json({ services: statuses, total: statuses.length });
  });

  app.get('/api/health/:serviceId', (req, res) => {
    const service = services.get(req.params.serviceId);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    const age = (Date.now() - new Date(service.lastSeen).getTime()) / 1000;
    const isStale = age > 60;
    const healthStatus = healthChecks.get(req.params.serviceId);
    res.json({ serviceId: req.params.serviceId, name: service.name, status: isStale ? 'stale' : service.status, lastSeen: service.lastSeen, healthy: !isStale && healthStatus?.healthy !== false });
  });

  // ============ STATS ============

  app.get('/api/stats', (req, res) => {
    const stats = { totalServices: services.size, totalSubscriptions: Array.from(subscriptions.values()).reduce((sum, s) => sum + s.size, 0), messagesInLog: messageLog.length, servicesByStatus: {}, servicesByCapability: {} };
    for (const service of services.values()) {
      stats.servicesByStatus[service.status] = (stats.servicesByStatus[service.status] || 0) + 1;
      for (const cap of service.capabilities) stats.servicesByCapability[cap] = (stats.servicesByCapability[cap] || 0) + 1;
    }
    res.json(stats);
  });

  // ============ ROUTING ============

  app.post('/api/route', (req, res) => {
    const { targetId, message, sourceId } = req.body;
    if (!targetId || !message) return res.status(400).json({ error: 'TargetId and message are required' });
    if (!services.has(targetId)) return res.status(404).json({ error: 'Target service not found' });
    const msgId = generateMsgId();
    const msg = { id: msgId, targetId, message, sourceId: sourceId || 'anonymous', timestamp: new Date().toISOString() };
    messageLog.push(msg);
    if (messageLog.length > MAX_LOG_SIZE) messageLog.shift();
    res.status(201).json({ id: msgId, delivered: true, timestamp: msg.timestamp });
  });

  app.post('/api/broadcast', (req, res) => {
    const { message, sourceId, excludeSelf } = req.body;
    if (!message) return res.status(400).json({ error: 'Message is required' });
    const msgId = generateMsgId();
    const timestamp = new Date().toISOString();
    let delivered = 0;
    for (const [serviceId] of services) { if (!(excludeSelf && serviceId === sourceId)) delivered++; }
    messageLog.push({ id: msgId, topic: '__broadcast__', message, sourceId: sourceId || 'anonymous', timestamp });
    if (messageLog.length > MAX_LOG_SIZE) messageLog.shift();
    res.status(201).json({ id: msgId, delivered, timestamp });
  });

  app.get('/health', (req, res) => res.json({ service: 'memory-network', status: 'healthy', timestamp: new Date().toISOString() }));

  return app;
}

describe('Memory Network Service', () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  // ============ SERVICE REGISTRY ============

  describe('Service Registration', () => {
    it('should register a new service', async () => {
      const res = await request(app)
        .post('/api/services')
        .send({ name: 'test-service', port: 4703, capabilities: ['storage', 'query'] });

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^svc_/);
      expect(res.body.service.name).toBe('test-service');
      expect(res.body.service.status).toBe('active');
      expect(res.body.service.capabilities).toEqual(['storage', 'query']);
    });

    it('should reject registration without name', async () => {
      const res = await request(app).post('/api/services').send({ port: 4703 });
      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Service name is required');
    });

    it('should list all registered services', async () => {
      await request(app).post('/api/services').send({ name: 'svc-1', port: 4703 });
      await request(app).post('/api/services').send({ name: 'svc-2', port: 4704 });

      const res = await request(app).get('/api/services');
      expect(res.body.total).toBe(2);
      expect(res.body.services).toHaveLength(2);
    });

    it('should filter services by capability', async () => {
      await request(app).post('/api/services').send({ name: 'svc-1', capabilities: ['storage'] });
      await request(app).post('/api/services').send({ name: 'svc-2', capabilities: ['query'] });

      const res = await request(app).get('/api/services?capability=storage');
      expect(res.body.total).toBe(1);
      expect(res.body.services[0].name).toBe('svc-1');
    });

    it('should get service by ID', async () => {
      const { body: { id } } = await request(app).post('/api/services').send({ name: 'test-svc' });
      const res = await request(app).get(`/api/services/${id}`);
      expect(res.status).toBe(200);
      expect(res.body.service.name).toBe('test-svc');
    });

    it('should return 404 for non-existent service', async () => {
      const res = await request(app).get('/api/services/non-existent-id');
      expect(res.status).toBe(404);
    });

    it('should update service status', async () => {
      const { body: { id } } = await request(app).post('/api/services').send({ name: 'test-svc' });
      const res = await request(app).patch(`/api/services/${id}`).send({ status: 'maintenance' });
      expect(res.body.service.status).toBe('maintenance');
    });

    it('should update service capabilities', async () => {
      const { body: { id } } = await request(app).post('/api/services').send({ name: 'test-svc', capabilities: ['storage'] });
      const res = await request(app).patch(`/api/services/${id}`).send({ capabilities: ['storage', 'backup'] });
      expect(res.body.service.capabilities).toEqual(['storage', 'backup']);
    });

    it('should unregister a service', async () => {
      const { body: { id } } = await request(app).post('/api/services').send({ name: 'test-svc' });
      const res = await request(app).delete(`/api/services/${id}`);
      expect(res.body.message).toBe('Service unregistered');

      const getRes = await request(app).get(`/api/services/${id}`);
      expect(getRes.status).toBe(404);
    });
  });

  // ============ HEARTBEAT ============

  describe('Heartbeat', () => {
    it('should record heartbeat from service', async () => {
      const { body: { id } } = await request(app).post('/api/services').send({ name: 'test-svc' });
      const res = await request(app).post(`/api/services/${id}/heartbeat`).send({ healthy: true });
      expect(res.body.received).toBe(true);
      expect(res.body.lastSeen).toBeDefined();
    });

    it('should report unhealthy when healthy=false', async () => {
      const { body: { id } } = await request(app).post('/api/services').send({ name: 'test-svc' });
      await request(app).post(`/api/services/${id}/heartbeat`).send({ healthy: false });
      const res = await request(app).get(`/api/health/${id}`);
      expect(res.body.healthy).toBe(false);
    });
  });

  // ============ PUBSUB ============

  describe('Publish/Subscribe', () => {
    it('should publish a message to a topic', async () => {
      const res = await request(app)
        .post('/api/publish')
        .send({ topic: 'memory.update', message: { type: 'update' }, sourceId: 'test-source' });

      expect(res.status).toBe(201);
      expect(res.body.id).toMatch(/^msg_/);
      expect(res.body.topic).toBe('memory.update');
    });

    it('should reject publish without topic or message', async () => {
      const res1 = await request(app).post('/api/publish').send({ topic: 'test' });
      expect(res1.status).toBe(400);

      const res2 = await request(app).post('/api/publish').send({ message: 'test' });
      expect(res2.status).toBe(400);
    });

    it('should subscribe a service to a topic', async () => {
      const { body: { id } } = await request(app).post('/api/services').send({ name: 'test-svc' });
      const res = await request(app).post('/api/subscribe').send({ serviceId: id, topic: 'memory.update' });
      expect(res.body.subscribed).toBe(true);
    });

    it('should reject subscribe for non-registered service', async () => {
      const res = await request(app).post('/api/subscribe').send({ serviceId: 'fake-id', topic: 'test' });
      expect(res.status).toBe(404);
    });

    it('should unsubscribe from a topic', async () => {
      const { body: { id } } = await request(app).post('/api/services').send({ name: 'test-svc' });
      await request(app).post('/api/subscribe').send({ serviceId: id, topic: 'memory.update' });
      const res = await request(app).delete('/api/subscribe').send({ serviceId: id, topic: 'memory.update' });
      expect(res.body.unsubscribed).toBe(true);
      expect(res.body.removed).toBe(1);
    });

    it('should get subscriptions for a service', async () => {
      const { body: { id } } = await request(app).post('/api/services').send({ name: 'test-svc' });
      await request(app).post('/api/subscribe').send({ serviceId: id, topic: 'topic1' });
      await request(app).post('/api/subscribe').send({ serviceId: id, topic: 'topic2' });

      const res = await request(app).get(`/api/subscriptions/${id}`);
      expect(res.body.subscriptions).toHaveLength(2);
    });
  });

  // ============ MESSAGES ============

  describe('Message Log', () => {
    it('should retrieve messages with filters', async () => {
      await request(app).post('/api/publish').send({ topic: 'topic1', message: 'msg1', sourceId: 'src1' });
      await request(app).post('/api/publish').send({ topic: 'topic2', message: 'msg2', sourceId: 'src2' });

      const res = await request(app).get('/api/messages?topic=topic1');
      expect(res.body.total).toBe(1);
      expect(res.body.messages[0].topic).toBe('topic1');

      const srcRes = await request(app).get('/api/messages?sourceId=src1');
      expect(srcRes.body.total).toBe(1);
    });

    it('should limit message results', async () => {
      for (let i = 0; i < 5; i++) {
        await request(app).post('/api/publish').send({ topic: 'test', message: `msg${i}` });
      }

      const res = await request(app).get('/api/messages?limit=3');
      expect(res.body.messages).toHaveLength(3);
    });
  });

  // ============ HEALTH ============

  describe('Health Monitoring', () => {
    it('should return health status of all services', async () => {
      await request(app).post('/api/services').send({ name: 'test-svc' });
      const res = await request(app).get('/api/health');
      expect(res.body.total).toBe(1);
      expect(res.body.services[0].name).toBe('test-svc');
    });

    it('should get specific service health', async () => {
      const { body: { id } } = await request(app).post('/api/services').send({ name: 'test-svc' });
      const res = await request(app).get(`/api/health/${id}`);
      expect(res.body.healthy).toBe(true);
    });
  });

  // ============ STATS ============

  describe('Network Statistics', () => {
    it('should return network statistics', async () => {
      await request(app).post('/api/services').send({ name: 'svc1', capabilities: ['storage'] });
      await request(app).post('/api/services').send({ name: 'svc2', capabilities: ['query'] });

      const res = await request(app).get('/api/stats');
      expect(res.body.totalServices).toBe(2);
      expect(res.body.servicesByStatus.active).toBe(2);
      expect(res.body.servicesByCapability.storage).toBe(1);
      expect(res.body.servicesByCapability.query).toBe(1);
    });
  });

  // ============ ROUTING ============

  describe('Message Routing', () => {
    it('should route message to specific service', async () => {
      const { body: { id: targetId } } = await request(app).post('/api/services').send({ name: 'target-svc' });
      const res = await request(app).post('/api/route').send({ targetId, message: { type: 'command' }, sourceId: 'source' });
      expect(res.status).toBe(201);
      expect(res.body.delivered).toBe(true);
    });

    it('should reject routing to non-existent service', async () => {
      const res = await request(app).post('/api/route').send({ targetId: 'fake', message: 'test' });
      expect(res.status).toBe(404);
    });

    it('should broadcast to all services', async () => {
      await request(app).post('/api/services').send({ name: 'svc1' });
      await request(app).post('/api/services').send({ name: 'svc2' });
      const res = await request(app).post('/api/broadcast').send({ message: 'hello', sourceId: 'admin' });
      expect(res.body.delivered).toBe(2);
    });

    it('should exclude self from broadcast when specified', async () => {
      const { body: { id } } = await request(app).post('/api/services').send({ name: 'svc1' });
      await request(app).post('/api/services').send({ name: 'svc2' });
      const res = await request(app).post('/api/broadcast').send({ message: 'hello', sourceId: id, excludeSelf: true });
      expect(res.body.delivered).toBe(1);
    });
  });

  // ============ HEALTH CHECK ============

  describe('Health Check Endpoint', () => {
    it('should return service health', async () => {
      const res = await request(app).get('/health');
      expect(res.body.service).toBe('memory-network');
      expect(res.body.status).toBe('healthy');
    });
  });
});
