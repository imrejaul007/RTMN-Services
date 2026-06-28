/**
 * Memory Network Service
 * Inter-service communication layer for the memory ecosystem
 * Handles service registry, pub/sub messaging, and event routing
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
const services = new Map();        // serviceId -> { id, name, url, port, capabilities, status, registeredAt }
const subscriptions = new Map();    // serviceId -> Set<{ topic, callback }>
const messageLog = [];              // Recent messages for debugging
const healthChecks = new Map();     // serviceId -> { lastSeen, healthy }
const MAX_LOG_SIZE = 1000;

// Service ID generation
function generateId() {
  return `svc_${crypto.randomBytes(8).toString('hex')}`;
}

// Message ID generation
function generateMsgId() {
  return `msg_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
}

// ============ SERVICE REGISTRY ============

// Register a memory service
app.post('/api/services', requireInternal, (req, res) => {
  const { name, url, port, capabilities, metadata } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Service name is required' });
  }

  const serviceId = generateId();
  const service = {
    id: serviceId,
    name,
    url: url || `http://localhost:${port || 4000}`,
    port: port || 4000,
    capabilities: capabilities || [],
    metadata: metadata || {},
    status: 'active',
    registeredAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };

  services.set(serviceId, service);
  subscriptions.set(serviceId, new Set());
  healthChecks.set(serviceId, { lastSeen: new Date().toISOString(), healthy: true });

  res.status(201).json({
    id: serviceId,
    service,
    message: 'Service registered successfully'
  });
});

// Get all registered services
app.get('/api/services', (req, res) => {
  const { capability, status, limit } = req.query;
  let result = Array.from(services.values());

  // Filter by capability
  if (capability) {
    result = result.filter(s => s.capabilities.includes(capability));
  }

  // Filter by status
  if (status) {
    result = result.filter(s => s.status === status);
  }

  // Apply limit
  if (limit) {
    result = result.slice(0, parseInt(limit));
  }

  res.json({ services: result, total: result.length });
});

// Get service by ID
app.get('/api/services/:serviceId', (req, res) => {
  const { serviceId } = req.params;
  const service = services.get(serviceId);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  res.json({ service });
});

// Update service status
app.patch('/api/services/:serviceId', requireInternal, (req, res) => {
  const { serviceId } = req.params;
  const { status, capabilities, metadata } = req.body;
  const service = services.get(serviceId);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  if (status) service.status = status;
  if (capabilities) service.capabilities = capabilities;
  if (metadata) service.metadata = { ...service.metadata, ...metadata };
  service.lastSeen = new Date().toISOString();

  res.json({ service });
});

// Unregister service
app.delete('/api/services/:serviceId', requireInternal, (req, res) => {
  const { serviceId } = req.params;

  if (!services.has(serviceId)) {
    return res.status(404).json({ error: 'Service not found' });
  }

  services.delete(serviceId);
  subscriptions.delete(serviceId);
  healthChecks.delete(serviceId);

  res.json({ message: 'Service unregistered', id: serviceId });
});

// Heartbeat - service alive check
app.post('/api/services/:serviceId/heartbeat', requireInternal, (req, res) => {
  const { serviceId } = req.params;
  const { healthy } = req.body;
  const service = services.get(serviceId);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  service.lastSeen = new Date().toISOString();
  healthChecks.set(serviceId, {
    lastSeen: new Date().toISOString(),
    healthy: healthy !== false
  });

  res.json({ received: true, lastSeen: service.lastSeen });
});

// ============ PUBSUB MESSAGING ============

// Publish message to a topic
app.post('/api/publish', requireInternal, (req, res) => {
  const { topic, message, sourceId, priority } = req.body;

  if (!topic || !message) {
    return res.status(400).json({ error: 'Topic and message are required' });
  }

  const msgId = generateMsgId();
  const msg = {
    id: msgId,
    topic,
    message,
    sourceId: sourceId || 'anonymous',
    priority: priority || 'normal',
    timestamp: new Date().toISOString(),
  };

  // Store in log
  messageLog.push(msg);
  if (messageLog.length > MAX_LOG_SIZE) {
    messageLog.shift();
  }

  // Deliver to subscribers
  let delivered = 0;
  for (const [subscriberId, subs] of subscriptions) {
    for (const sub of subs) {
      if (sub.topic === topic || sub.topic === '*') {
        delivered++;
      }
    }
  }

  res.status(201).json({
    id: msgId,
    topic,
    delivered,
    timestamp: msg.timestamp
  });
});

// Subscribe to a topic
app.post('/api/subscribe', requireInternal, (req, res) => {
  const { serviceId, topic, callback } = req.body;

  if (!serviceId || !topic) {
    return res.status(400).json({ error: 'ServiceId and topic are required' });
  }

  if (!services.has(serviceId)) {
    return res.status(404).json({ error: 'Service not registered' });
  }

  const sub = { topic, callback: callback || 'internal' };
  subscriptions.get(serviceId).add(sub);

  res.json({ subscribed: true, serviceId, topic });
});

// Unsubscribe from topic
app.delete('/api/subscribe', requireInternal, (req, res) => {
  const { serviceId, topic } = req.body;

  if (!serviceId || !topic) {
    return res.status(400).json({ error: 'ServiceId and topic are required' });
  }

  const subs = subscriptions.get(serviceId);
  if (subs) {
    let removed = 0;
    for (const sub of subs) {
      if (sub.topic === topic) {
        subs.delete(sub);
        removed++;
      }
    }
    res.json({ unsubscribed: true, serviceId, topic, removed });
  } else {
    res.status(404).json({ error: 'Service not found' });
  }
});

// Get subscriptions for a service
app.get('/api/subscriptions/:serviceId', (req, res) => {
  const { serviceId } = req.params;
  const subs = subscriptions.get(serviceId);

  if (!subs) {
    return res.status(404).json({ error: 'Service not found' });
  }

  res.json({ subscriptions: Array.from(subs) });
});

// ============ MESSAGE LOG ============

// Get recent messages
app.get('/api/messages', (req, res) => {
  const { topic, sourceId, since, limit } = req.query;
  let result = [...messageLog];

  // Filter by topic
  if (topic) {
    result = result.filter(m => m.topic === topic);
  }

  // Filter by source
  if (sourceId) {
    result = result.filter(m => m.sourceId === sourceId);
  }

  // Filter by time
  if (since) {
    const sinceDate = new Date(since);
    result = result.filter(m => new Date(m.timestamp) >= sinceDate);
  }

  // Apply limit
  if (limit) {
    result = result.slice(-parseInt(limit));
  }

  res.json({ messages: result, total: result.length });
});

// ============ HEALTH MONITORING ============

// Get all service health statuses
app.get('/api/health', (req, res) => {
  const now = Date.now();
  const statuses = [];

  for (const [serviceId, service] of services) {
    const lastSeen = new Date(service.lastSeen).getTime();
    const age = (now - lastSeen) / 1000; // seconds
    const isStale = age > 60; // No heartbeat for > 60s

    statuses.push({
      serviceId,
      name: service.name,
      status: isStale ? 'stale' : service.status,
      lastSeen: service.lastSeen,
      healthy: !isStale && healthChecks.get(serviceId)?.healthy !== false,
    });
  }

  res.json({ services: statuses, total: statuses.length });
});

// Get specific service health
app.get('/api/health/:serviceId', (req, res) => {
  const { serviceId } = req.params;
  const service = services.get(serviceId);

  if (!service) {
    return res.status(404).json({ error: 'Service not found' });
  }

  const now = Date.now();
  const lastSeen = new Date(service.lastSeen).getTime();
  const age = (now - lastSeen) / 1000;
  const isStale = age > 60;

  res.json({
    serviceId,
    name: service.name,
    status: isStale ? 'stale' : service.status,
    lastSeen: service.lastSeen,
    healthy: !isStale && healthChecks.get(serviceId)?.healthy !== false,
  });
});

// ============ STATS ============

// Get network statistics
app.get('/api/stats', (req, res) => {
  const stats = {
    totalServices: services.size,
    totalSubscriptions: Array.from(subscriptions.values()).reduce((sum, s) => sum + s.size, 0),
    messagesInLog: messageLog.length,
    servicesByStatus: {},
    servicesByCapability: {},
  };

  // Count by status
  for (const service of services.values()) {
    stats.servicesByStatus[service.status] = (stats.servicesByStatus[service.status] || 0) + 1;
    for (const cap of service.capabilities) {
      stats.servicesByCapability[cap] = (stats.servicesByCapability[cap] || 0) + 1;
    }
  }

  res.json(stats);
});

// ============ ROUTING ============

// Route message to specific service
app.post('/api/route', requireInternal, (req, res) => {
  const { targetId, message, sourceId } = req.body;

  if (!targetId || !message) {
    return res.status(400).json({ error: 'TargetId and message are required' });
  }

  if (!services.has(targetId)) {
    return res.status(404).json({ error: 'Target service not found' });
  }

  const msgId = generateMsgId();
  const msg = {
    id: msgId,
    targetId,
    message,
    sourceId: sourceId || 'anonymous',
    timestamp: new Date().toISOString(),
  };

  messageLog.push(msg);
  if (messageLog.length > MAX_LOG_SIZE) {
    messageLog.shift();
  }

  res.status(201).json({ id: msgId, delivered: true, timestamp: msg.timestamp });
});

// Broadcast to all services
app.post('/api/broadcast', requireInternal, (req, res) => {
  const { message, sourceId, excludeSelf } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const msgId = generateMsgId();
  const timestamp = new Date().toISOString();

  let delivered = 0;
  for (const [serviceId, service] of services) {
    if (excludeSelf && serviceId === sourceId) continue;
    delivered++;
  }

  messageLog.push({
    id: msgId,
    topic: '__broadcast__',
    message,
    sourceId: sourceId || 'anonymous',
    timestamp,
  });

  if (messageLog.length > MAX_LOG_SIZE) {
    messageLog.shift();
  }

  res.status(201).json({ id: msgId, delivered, timestamp });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    service: 'memory-network',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

const PORT = process.env.PORT || 4795;
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  console.log(`Memory Network running on port ${PORT}`);
});

// Export for testing
export { app, services, subscriptions, messageLog, healthChecks };
export default server;
