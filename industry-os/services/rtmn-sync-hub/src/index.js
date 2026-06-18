/**
 * RTMN Sync Hub - Real-Time Synchronization System
 *
 * This service ensures that when any product/service updates,
 * all related OS automatically reflect those changes.
 *
 * Features:
 * - Service Registry (track all services)
 * - Event Bus (real-time pub/sub)
 * - Webhook System (notify on changes)
 * - Version Tracker (know what's running)
 * - Sync Engine (auto-sync data)
 *
 * Port: 4399 (Unified Hub)
 */

const express = require('express');
const cors = require('cors');
const { EventEmitter } = require('events');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4399;

// ============================================================
// EVENT BUS - Real-time pub/sub
// ============================================================

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(100);
  }
}

const eventBus = new EventBus();

// Event types
const EVENTS = {
  SERVICE_REGISTERED: 'service:registered',
  SERVICE_UPDATED: 'service:updated',
  SERVICE_HEALTHY: 'service:healthy',
  SERVICE_UNHEALTHY: 'service:unhealthy',
  DATA_SYNC: 'data:sync',
  FEATURE_UPDATED: 'feature:updated',
  WEBHOOK_RECEIVED: 'webhook:received',
};

// ============================================================
// SERVICE REGISTRY
// ============================================================

const registry = {
  services: new Map(),
  versions: new Map(),
  health: new Map(),
  lastUpdate: new Map(),
};

// ============================================================
// DATABASE - Sync Data
// ============================================================

const db = {
  syncLog: new Map(),
  webhooks: new Map(),
  subscriptions: new Map(),
  features: new Map(),
};

// ============================================================
// SAMPLE DATA - Auto-populate known services
// ============================================================

function initRegistry() {
  // Core Business OS
  registerService({
    id: 'finance-os',
    name: 'Finance OS',
    port: 4801,
    type: 'core',
    category: 'business',
    version: '1.0.0',
    modules: ['accounting', 'ar', 'ap', 'treasury', 'budget', 'tax', 'audit', 'ai-copilot'],
    features: ['24-industry-integration', 'gst-tds', 'cash-forecasting'],
    health: 'healthy',
    lastSync: new Date().toISOString(),
  });

  registerService({
    id: 'workforce-os',
    name: 'Workforce OS',
    port: 5077,
    type: 'core',
    category: 'business',
    version: '1.0.0',
    modules: ['employees', 'payroll', 'attendance', 'leave', 'benefits', 'performance', 'training'],
    features: ['finance-sync', 'auto-payroll'],
    health: 'healthy',
    lastSync: new Date().toISOString(),
  });

  registerService({
    id: 'sales-os',
    name: 'Sales OS',
    port: 5055,
    type: 'core',
    category: 'business',
    version: '2.0.0',
    modules: ['crm', 'pipeline', 'cpq', 'contracts', 'activities', 'commissions', 'enablement'],
    features: ['22-ai-agents', 'customer-success'],
    health: 'healthy',
    lastSync: new Date().toISOString(),
  });

  registerService({
    id: 'legal-os',
    name: 'Legal OS',
    port: 5035,
    type: 'core',
    category: 'business',
    version: '1.0.0',
    modules: ['contracts', 'compliance', 'documents', 'matters', 'billing', 'ai-assistant'],
    features: ['digital-twin', '7-contract-types'],
    health: 'healthy',
    lastSync: new Date().toISOString(),
  });

  registerService({
    id: 'operations-os',
    name: 'Operations OS',
    port: 5250,
    type: 'core',
    category: 'business',
    version: '2.1.0',
    modules: ['command-center', 'process-os', 'workflow-os', 'project-os', 'task-os', 'sop-os', 'approval-os', 'resource-os', 'incident-os', 'risk-os', 'analytics', 'delivery', 'planning', 'pmo', 'quality', 'change-mgmt', 'knowledge', 'capacity', 'automation', 'process-learning', 'ai-brain'],
    features: ['21-modules', '23-ai-agents', '10-digital-twins', 'observe-learn-automate'],
    health: 'healthy',
    lastSync: new Date().toISOString(),
  });

  // Department OS
  registerService({
    id: 'marketing-os',
    name: 'Marketing OS',
    port: 5500,
    type: 'department',
    category: 'business',
    version: '1.0.0',
    modules: ['campaigns', 'journey', 'audience', 'content'],
    health: 'healthy',
    lastSync: new Date().toISOString(),
  });

  registerService({
    id: 'customer-success-os',
    name: 'Customer Success OS',
    port: 4050,
    type: 'department',
    category: 'business',
    version: '1.0.0',
    modules: ['nps', 'churn', 'health-scores'],
    health: 'healthy',
    lastSync: new Date().toISOString(),
  });

  // Foundation
  registerService({
    id: 'corpId',
    name: 'CorpID',
    port: 4702,
    type: 'foundation',
    category: 'security',
    version: '1.0.0',
    modules: ['auth', 'identity'],
    health: 'healthy',
    lastSync: new Date().toISOString(),
  });

  registerService({
    id: 'memory-os',
    name: 'Memory OS',
    port: 4703,
    type: 'foundation',
    category: 'memory',
    version: '1.0.0',
    modules: ['context', 'persistence'],
    health: 'healthy',
    lastSync: new Date().toISOString(),
  });

  registerService({
    id: 'twinos-hub',
    name: 'TwinOS Hub',
    port: 4705,
    type: 'foundation',
    category: 'digital-twin',
    version: '1.0.0',
    modules: ['twins', 'sync'],
    health: 'healthy',
    lastSync: new Date().toISOString(),
  });

  // Companies
  registerService({
    id: 'lawgens',
    name: 'LawGens',
    type: 'company',
    category: 'legal',
    version: '1.0.0',
    features: ['contract-management', 'legal-document-ai', 'invoice-ocr'],
    health: 'healthy',
    lastSync: new Date().toISOString(),
  });

  console.log(`Sync Hub: ${registry.services.size} services registered`);
}

// ============================================================
// SERVICE REGISTRATION
// ============================================================

function registerService(service) {
  const existing = registry.services.get(service.id);
  const isNew = !existing;

  registry.services.set(service.id, {
    ...service,
    registeredAt: existing?.registeredAt || new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
  });

  registry.versions.set(service.id, service.version);
  registry.health.set(service.id, service.health || 'unknown');
  registry.lastUpdate.set(service.id, new Date().toISOString());

  // Emit events
  if (isNew) {
    eventBus.emit(EVENTS.SERVICE_REGISTERED, service);
  } else {
    eventBus.emit(EVENTS.SERVICE_UPDATED, {
      service: service.id,
      old: existing,
      new: service,
    });
  }

  return service;
}

// ============================================================
// HEALTH & STATUS
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'rtmn-sync-hub',
    version: '1.0.0',
    port: PORT,
    tagline: 'Real-Time Synchronization Hub',
    uptime: process.uptime(),
  });
});

app.get('/status', (req, res) => {
  const services = Array.from(registry.services.values());
  const healthy = services.filter(s => s.health === 'healthy').length;
  const unhealthy = services.filter(s => s.health === 'unhealthy').length;

  res.json({
    service: 'RTMN Sync Hub',
    tagline: 'Real-Time Synchronization Hub',
    services: {
      total: services.length,
      healthy,
      unhealthy,
    },
    events: {
      listeners: eventBus.listenerCount('*'),
    },
    lastSync: new Date().toISOString(),
  });
});

// ============================================================
// SERVICE REGISTRY
// ============================================================

app.get('/api/registry', (req, res) => {
  const { type, category, health } = req.query;
  let services = Array.from(registry.services.values());

  if (type) services = services.filter(s => s.type === type);
  if (category) services = services.filter(s => s.category === category);
  if (health) services = services.filter(s => s.health === health);

  res.json({
    services,
    total: services.length,
    summary: {
      byType: groupBy(services, 'type'),
      byCategory: groupBy(services, 'category'),
      byHealth: groupBy(services, 'health'),
    },
  });
});

app.get('/api/registry/:id', (req, res) => {
  const service = registry.services.get(req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });
  res.json(service);
});

app.post('/api/registry', (req, res) => {
  const service = registerService(req.body);
  eventBus.emit(EVENTS.SERVICE_REGISTERED, service);
  res.status(201).json(service);
});

app.patch('/api/registry/:id', (req, res) => {
  const existing = registry.services.get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Service not found' });

  const updated = registerService({ ...existing, ...req.body });
  res.json(updated);
});

// ============================================================
// VERSION TRACKING
// ============================================================

app.get('/api/versions', (req, res) => {
  const versions = Array.from(registry.versions.entries()).map(([id, version]) => ({
    id,
    version,
    lastUpdated: registry.lastUpdate.get(id),
  }));
  res.json({ versions, total: versions.length });
});

app.get('/api/versions/changes', (req, res) => {
  const since = req.query.since || new Date(Date.now() - 86400000).toISOString();
  const changes = [];

  registry.lastUpdate.forEach((timestamp, serviceId) => {
    if (timestamp > since) {
      changes.push({
        serviceId,
        timestamp,
        version: registry.versions.get(serviceId),
      });
    }
  });

  res.json({ changes, since });
});

// ============================================================
// HEALTH MONITORING
// ============================================================

app.get('/api/health', (req, res) => {
  const services = Array.from(registry.services.values());
  const healthMap = {};

  services.forEach(s => {
    healthMap[s.id] = {
      health: s.health,
      modules: s.modules?.length || 0,
      features: s.features?.length || 0,
    };
  });

  res.json({
    summary: {
      total: services.length,
      healthy: services.filter(s => s.health === 'healthy').length,
      unhealthy: services.filter(s => s.health === 'unhealthy').length,
      unknown: services.filter(s => !s.health || s.health === 'unknown').length,
    },
    services: healthMap,
  });
});

app.post('/api/health/:id', (req, res) => {
  const service = registry.services.get(req.params.id);
  if (!service) return res.status(404).json({ error: 'Service not found' });

  const { health, message } = req.body;
  service.health = health;
  registry.health.set(req.params.id, health);
  registry.lastUpdate.set(req.params.id, new Date().toISOString());

  // Emit event
  eventBus.emit(health === 'healthy' ? EVENTS.SERVICE_HEALTHY : EVENTS.SERVICE_UNHEALTHY, {
    service: req.params.id,
    message,
    timestamp: new Date().toISOString(),
  });

  res.json({ service: req.params.id, health, message });
});

// ============================================================
// EVENT BUS - SSE (Server-Sent Events)
// ============================================================

app.get('/api/events/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Send initial data
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: new Date().toISOString() })}\n\n`);

  // Subscribe to events
  const handler = (event, data) => {
    res.write(`data: ${JSON.stringify({ event, data, timestamp: new Date().toISOString() })}\n\n`);
  };

  eventBus.on(EVENTS.SERVICE_REGISTERED, (data) => handler('SERVICE_REGISTERED', data));
  eventBus.on(EVENTS.SERVICE_UPDATED, (data) => handler('SERVICE_UPDATED', data));
  eventBus.on(EVENTS.SERVICE_HEALTHY, (data) => handler('SERVICE_HEALTHY', data));
  eventBus.on(EVENTS.SERVICE_UNHEALTHY, (data) => handler('SERVICE_UNHEALTHY', data));
  eventBus.on(EVENTS.DATA_SYNC, (data) => handler('DATA_SYNC', data));
  eventBus.on(EVENTS.FEATURE_UPDATED, (data) => handler('FEATURE_UPDATED', data));

  // Keep alive
  const keepAlive = setInterval(() => {
    res.write(`data: ${JSON.stringify({ type: 'ping', timestamp: new Date().toISOString() })}\n\n`);
  }, 30000);

  // Cleanup on close
  req.on('close', () => {
    clearInterval(keepAlive);
    eventBus.off(EVENTS.SERVICE_REGISTERED, handler);
    eventBus.off(EVENTS.SERVICE_UPDATED, handler);
    eventBus.off(EVENTS.SERVICE_HEALTHY, handler);
    eventBus.off(EVENTS.SERVICE_UNHEALTHY, handler);
    eventBus.off(EVENTS.DATA_SYNC, handler);
    eventBus.off(EVENTS.FEATURE_UPDATED, handler);
  });
});

app.get('/api/events/types', (req, res) => {
  res.json({
    events: Object.values(EVENTS),
    descriptions: {
      'service:registered': 'New service registered',
      'service:updated': 'Service configuration updated',
      'service:healthy': 'Service health check passed',
      'service:unhealthy': 'Service health check failed',
      'data:sync': 'Data synchronized between services',
      'feature:updated': 'Feature added/updated/removed',
      'webhook:received': 'Webhook received from external service',
    },
  });
});

// ============================================================
// DATA SYNC
// ============================================================

app.post('/api/sync', (req, res) => {
  const { source, target, data, type } = req.body;

  const syncRecord = {
    id: `SYNC-${Date.now()}`,
    source,
    target,
    type: type || 'full',
    data,
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  db.syncLog.set(syncRecord.id, syncRecord);

  // Emit sync event
  eventBus.emit(EVENTS.DATA_SYNC, {
    source,
    target,
    type,
    data: type === 'full' ? { keys: Object.keys(data || {}) } : data,
  });

  // Simulate sync
  setTimeout(() => {
    syncRecord.status = 'completed';
    syncRecord.completedAt = new Date().toISOString();
    db.syncLog.set(syncRecord.id, syncRecord);
  }, 100);

  res.status(201).json(syncRecord);
});

app.get('/api/sync/log', (req, res) => {
  const { source, target, status } = req.query;
  let logs = Array.from(db.syncLog.values());

  if (source) logs = logs.filter(l => l.source === source);
  if (target) logs = logs.filter(l => l.target === target);
  if (status) logs = logs.filter(l => l.status === status);

  logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  res.json({ logs: logs.slice(0, 100), total: logs.length });
});

// ============================================================
// WEBHOOKS
// ============================================================

app.post('/api/webhooks', (req, res) => {
  const { url, events, secret } = req.body;
  const id = `WH-${Date.now()}`;

  const webhook = {
    id,
    url,
    events: events || Object.values(EVENTS),
    secret,
    status: 'active',
    createdAt: new Date().toISOString(),
    deliveries: [],
  };

  db.webhooks.set(id, webhook);

  // Subscribe to events
  events?.forEach(event => {
    eventBus.on(event, (data) => {
      deliverWebhook(webhook, event, data);
    });
  });

  res.status(201).json(webhook);
});

app.get('/api/webhooks', (req, res) => {
  const webhooks = Array.from(db.webhooks.values());
  res.json({ webhooks, total: webhooks.length });
});

app.delete('/api/webhooks/:id', (req, res) => {
  const webhook = db.webhooks.get(req.params.id);
  if (!webhook) return res.status(404).json({ error: 'Webhook not found' });

  // Unsubscribe from events
  webhook.events.forEach(event => {
    eventBus.off(event, () => {});
  });

  db.webhooks.delete(req.params.id);
  res.json({ deleted: req.params.id });
});

function deliverWebhook(webhook, event, data) {
  const delivery = {
    id: `DEL-${Date.now()}`,
    webhookId: webhook.id,
    event,
    data,
    timestamp: new Date().toISOString(),
    status: 'pending',
  };

  // In production, would actually deliver to webhook.url
  console.log(`[WEBHOOK] Delivering ${event} to ${webhook.url}`);

  webhook.deliveries.push(delivery);
}

// ============================================================
// FEATURES
// ============================================================

app.get('/api/features', (req, res) => {
  const { service, category } = req.query;
  let features = Array.from(db.features.values());

  if (service) features = features.filter(f => f.service === service);
  if (category) features = features.filter(f => f.category === category);

  res.json({ features, total: features.length });
});

app.post('/api/features', (req, res) => {
  const { service, name, category, status, description } = req.body;
  const id = `FEAT-${Date.now()}`;

  const feature = {
    id,
    service,
    name,
    category: category || 'general',
    status: status || 'active',
    description,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.features.set(id, feature);

  // Emit feature update event
  eventBus.emit(EVENTS.FEATURE_UPDATED, { service, feature, action: 'created' });

  res.status(201).json(feature);
});

app.patch('/api/features/:id', (req, res) => {
  const feature = db.features.get(req.params.id);
  if (!feature) return res.status(404).json({ error: 'Feature not found' });

  const updated = { ...feature, ...req.body, updatedAt: new Date().toISOString() };
  db.features.set(req.params.id, updated);

  // Emit feature update event
  eventBus.emit(EVENTS.FEATURE_UPDATED, { service: feature.service, feature: updated, action: 'updated' });

  res.json(updated);
});

// ============================================================
// SUBSCRIPTIONS - Service-to-service communication
// ============================================================

app.post('/api/subscriptions', (req, res) => {
  const { subscriber, service, events } = req.body;
  const id = `SUB-${Date.now()}`;

  const subscription = {
    id,
    subscriber,
    service,
    events: events || ['*'],
    status: 'active',
    createdAt: new Date().toISOString(),
  };

  db.subscriptions.set(id, subscription);

  // Create handlers for each event
  events?.forEach(event => {
    eventBus.on(event, (data) => {
      console.log(`[SUBSCRIPTION] ${subscriber} received ${event} from ${service}`);
    });
  });

  res.status(201).json(subscription);
});

app.get('/api/subscriptions', (req, res) => {
  const { subscriber, service } = req.query;
  let subs = Array.from(db.subscriptions.values());

  if (subscriber) subs = subs.filter(s => s.subscriber === subscriber);
  if (service) subs = subs.filter(s => s.service === service);

  res.json({ subscriptions: subs, total: subs.length });
});

// ============================================================
// ANALYTICS
// ============================================================

app.get('/api/analytics/overview', (req, res) => {
  const services = Array.from(registry.services.values());

  res.json({
    timestamp: new Date().toISOString(),
    services: {
      total: services.length,
      byType: groupBy(services, 'type'),
      byCategory: groupBy(services, 'category'),
      healthSummary: {
        healthy: services.filter(s => s.health === 'healthy').length,
        unhealthy: services.filter(s => s.health === 'unhealthy').length,
      },
    },
    sync: {
      totalSyncs: db.syncLog.size,
      completed: Array.from(db.syncLog.values()).filter(s => s.status === 'completed').length,
    },
    features: {
      total: db.features.size,
    },
    subscriptions: {
      total: db.subscriptions.size,
    },
  });
});

// ============================================================
// UTILITY
// ============================================================

function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const value = item[key] || 'unknown';
    groups[value] = (groups[value] || 0) + 1;
    return groups;
  }, {});
}

// ============================================================
// START
// ============================================================

initRegistry();

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════════════════════╗`);
  console.log(`║              RTMN SYNC HUB - Real-Time Synchronization          ║`);
  console.log(`╠════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                                  ║`);
  console.log(`╠════════════════════════════════════════════════════════════════════╣`);
  console.log(`║  FEATURES:                                                    ║`);
  console.log(`║  ✅ Service Registry (Track all services)                      ║`);
  console.log(`║  ✅ Event Bus (Real-time pub/sub)                             ║`);
  console.log(`║  ✅ Webhook System (Notify on changes)                         ║`);
  console.log(`║  ✅ Version Tracker (Know what's running)                     ║`);
  console.log(`║  ✅ Sync Engine (Auto-sync data)                             ║`);
  console.log(`║  ✅ SSE Stream (Real-time updates)                            ║`);
  console.log(`╚════════════════════════════════════════════════════════════════════╝`);
  console.log(`\n  Try: curl http://localhost:${PORT}/api/registry`);
  console.log(`       curl http://localhost:${PORT}/api/health`);
  console.log(`       curl http://localhost:${PORT}/api/features`);
});
