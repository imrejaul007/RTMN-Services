import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4705;

// Winston logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple())
    })
  ]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Twin Registry - tracks all registered twins
const twinRegistry = new Map();

// Twin States - current state of all twins
const twinStates = new Map();

// Sync Events - history of sync operations
const syncEvents = [];

// Twin Definitions - metadata about each twin type
const twinDefinitions = {
  // Restaurant OS Twins
  'restaurant-os.menu': { service: 'restaurant-os', port: 5010, type: 'catalog', category: 'restaurant' },
  'restaurant-os.order': { service: 'restaurant-os', port: 5010, type: 'order', category: 'restaurant' },
  'restaurant-os.kitchen': { service: 'restaurant-os', port: 5010, type: 'queue', category: 'restaurant' },
  'restaurant-os.table': { service: 'restaurant-os', port: 5010, type: 'resource', category: 'restaurant' },
  'restaurant-os.customer': { service: 'restaurant-os', port: 5010, type: 'customer', category: 'restaurant' },

  // Hotel OS Twins
  'hotel-os.room': { service: 'hotel-os', port: 5025, type: 'resource', category: 'hotel' },
  'hotel-os.booking': { service: 'hotel-os', port: 5025, type: 'order', category: 'hotel' },
  'hotel-os.guest': { service: 'hotel-os', port: 5025, type: 'customer', category: 'hotel' },
  'hotel-os.service': { service: 'hotel-os', port: 5025, type: 'service', category: 'hotel' },
  'hotel-os.revenue': { service: 'hotel-os', port: 5025, type: 'metric', category: 'hotel' },

  // Hospitality OS Twins
  'hospitality-os.establishment': { service: 'hospitality-os', port: 5050, type: 'resource', category: 'hospitality' },
  'hospitality-os.staff': { service: 'hospitality-os', port: 5050, type: 'workforce', category: 'hospitality' },
  'hospitality-os.customer': { service: 'hospitality-os', port: 5050, type: 'customer', category: 'hospitality' },
  'hospitality-os.transaction': { service: 'hospitality-os', port: 5050, type: 'transaction', category: 'hospitality' },
  'hospitality-os.event': { service: 'hospitality-os', port: 5050, type: 'event', category: 'hospitality' },

  // Foundation Twins
  'corpid': { service: 'corpid-os', port: 4702, type: 'identity', category: 'foundation' },
  'memory': { service: 'memory-os', port: 4703, type: 'storage', category: 'foundation' },
  'goal': { service: 'goal-os', port: 4242, type: 'orchestration', category: 'foundation' },
  'decision': { service: 'decision-engine', port: 4240, type: 'policy', category: 'foundation' },
  'agent': { service: 'agent-os', port: 3002, type: 'agent', category: 'foundation' },

  // Business Twins
  'marketing': { service: 'marketing-os', port: 3034, type: 'campaign', category: 'business' },
  'workforce': { service: 'workforce-os', port: 3036, type: 'hr', category: 'business' },
  'commerce': { service: 'commerce-os', port: 3033, type: 'transaction', category: 'business' },
  'finance': { service: 'finance-os', port: 3035, type: 'ledger', category: 'business' },

  // Knowledge Twins
  'knowledge': { service: 'knowledge-graph-os', port: 4501, type: 'graph', category: 'intelligence' },
  'simulation': { service: 'simulation-os', port: 4241, type: 'model', category: 'intelligence' },
  'boa': { service: 'boa-os', port: 3017, type: 'advisory', category: 'intelligence' }
};

// Initialize default twins
function initializeDefaults() {
  for (const [twinId, definition] of Object.entries(twinDefinitions)) {
    const twin = {
      id: twinId,
      name: twinId.split('.').pop(),
      service: definition.service,
      type: definition.type,
      category: definition.category,
      port: definition.port,
      status: 'registered',
      health: 'unknown',
      lastSync: null,
      lastUpdate: null,
      version: 1,
      syncCount: 0
    };
    twinRegistry.set(twinId, twin);
    twinStates.set(twinId, { data: null, timestamp: null });
  }
  logger.info(`TwinOS Hub initialized with ${twinRegistry.size} twin definitions`);
}

initializeDefaults();

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'twinos-hub',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    stats: {
      totalTwins: twinRegistry.size,
      active: Array.from(twinRegistry.values()).filter(t => t.status === 'active').length,
      syncing: Array.from(twinRegistry.values()).filter(t => t.status === 'syncing').length
    }
  });
});

// ============= TWIN REGISTRY =============

// List all twins
app.get('/api/twins', (req, res) => {
  const { category, type, status, service } = req.query;
  let twins = Array.from(twinRegistry.values());

  if (category) twins = twins.filter(t => t.category === category);
  if (type) twins = twins.filter(t => t.type === type);
  if (status) twins = twins.filter(t => t.status === status);
  if (service) twins = twins.filter(t => t.service === service);

  res.json({
    success: true,
    count: twins.length,
    twins: twins.map(t => ({
      ...t,
      state: twinStates.get(t.id) ? 'available' : 'empty'
    }))
  });
});

// Get twin details
app.get('/api/twins/:id', (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) return res.status(404).json({ success: false, error: 'Twin not found' });

  res.json({
    success: true,
    twin,
    state: twinStates.get(req.params.id)
  });
});

// Register new twin
app.post('/api/twins', (req, res) => {
  const { id, name, service, type, category, port } = req.body;

  if (!id || !service) {
    return res.status(400).json({ success: false, error: 'ID and service required' });
  }

  if (twinRegistry.has(id)) {
    return res.status(409).json({ success: false, error: 'Twin already registered' });
  }

  const twin = {
    id,
    name: name || id.split('.').pop(),
    service,
    type: type || 'generic',
    category: category || 'custom',
    port: port || 0,
    status: 'registered',
    health: 'unknown',
    lastSync: null,
    lastUpdate: null,
    version: 1,
    syncCount: 0,
    createdAt: new Date().toISOString()
  };

  twinRegistry.set(id, twin);
  twinStates.set(id, { data: null, timestamp: null });

  logger.info(`Twin registered: ${id}`);
  res.status(201).json({ success: true, twin });
});

// Update twin metadata
app.put('/api/twins/:id', (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) return res.status(404).json({ success: false, error: 'Twin not found' });

  const { name, type, category, port } = req.body;
  if (name) twin.name = name;
  if (type) twin.type = type;
  if (category) twin.category = category;
  if (port) twin.port = port;
  twin.updatedAt = new Date().toISOString();

  twinRegistry.set(twin.id, twin);
  res.json({ success: true, twin });
});

// Unregister twin
app.delete('/api/twins/:id', (req, res) => {
  if (!twinRegistry.has(req.params.id)) {
    return res.status(404).json({ success: false, error: 'Twin not found' });
  }

  twinRegistry.delete(req.params.id);
  twinStates.delete(req.params.id);

  logger.info(`Twin unregistered: ${req.params.id}`);
  res.json({ success: true, message: 'Twin unregistered' });
});

// ============= TWIN STATE =============

// Get twin state
app.get('/api/twins/:id/state', (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) return res.status(404).json({ success: false, error: 'Twin not found' });

  const state = twinStates.get(req.params.id);
  res.json({ success: true, twin, state: state || null });
});

// Update twin state
app.put('/api/twins/:id/state', (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) return res.status(404).json({ success: false, error: 'Twin not found' });

  const { data } = req.body;
  if (data === undefined) {
    return res.status(400).json({ success: false, error: 'Data required' });
  }

  const timestamp = new Date().toISOString();
  twinStates.set(req.params.id, { data, timestamp, version: twin.version });
  twin.lastUpdate = timestamp;
  twinRegistry.set(twin.id, twin);

  res.json({ success: true, state: twinStates.get(req.params.id) });
});

// ============= SYNC OPERATIONS =============

// Sync single twin
app.post('/api/sync/:id', (req, res) => {
  const twin = twinRegistry.get(req.params.id);
  if (!twin) return res.status(404).json({ success: false, error: 'Twin not found' });

  twin.status = 'syncing';
  twinRegistry.set(twin.id, twin);

  // Simulate sync (in production, would call actual service)
  setTimeout(() => {
    twin.status = 'active';
    twin.lastSync = new Date().toISOString();
    twin.syncCount++;
    twin.health = 'healthy';
    twinRegistry.set(twin.id, twin);

    // Record sync event
    syncEvents.unshift({
      id: uuidv4(),
      twinId: twin.id,
      action: 'sync',
      timestamp: new Date().toISOString(),
      success: true
    });
    if (syncEvents.length > 1000) syncEvents.pop();
  }, 100);

  res.json({ success: true, twin, message: 'Sync initiated' });
});

// Bulk sync
app.post('/api/sync', (req, res) => {
  const { twinIds } = req.body;

  if (twinIds && twinIds.length > 0) {
    const results = twinIds.map(id => {
      const twin = twinRegistry.get(id);
      if (!twin) return { id, success: false, error: 'Not found' };
      twin.status = 'syncing';
      twinRegistry.set(twin.id, twin);
      return { id, success: true };
    });
    res.json({ success: true, results, message: 'Bulk sync initiated' });
  } else {
    // Sync all twins
    Array.from(twinRegistry.values()).forEach(twin => {
      twin.status = 'syncing';
      twinRegistry.set(twin.id, twin);
    });
    res.json({ success: true, count: twinRegistry.size, message: 'Full sync initiated' });
  }
});

// Sync by category
app.post('/api/sync/category/:category', (req, res) => {
  const twins = Array.from(twinRegistry.values()).filter(t => t.category === req.params.category);

  if (twins.length === 0) {
    return res.status(404).json({ success: false, error: 'No twins in category' });
  }

  twins.forEach(twin => {
    twin.status = 'syncing';
    twinRegistry.set(twin.id, twin);
  });

  res.json({ success: true, count: twins.length, twins: twins.map(t => t.id) });
});

// ============= TWIN RELATIONSHIPS =============

// Get relationships
app.get('/api/relationships', (req, res) => {
  const { twinId } = req.query;
  const relationships = [];

  // Define some standard relationships
  const relationMap = {
    'restaurant-os.order': ['restaurant-os.menu', 'restaurant-os.kitchen', 'restaurant-os.customer'],
    'restaurant-os.kitchen': ['restaurant-os.order', 'restaurant-os.menu'],
    'hotel-os.booking': ['hotel-os.room', 'hotel-os.guest'],
    'hotel-os.guest': ['hotel-os.booking', 'hotel-os.service'],
    'hospitality-os.customer': ['hospitality-os.transaction', 'hospitality-os.event']
  };

  if (twinId) {
    const related = relationMap[twinId] || [];
    return res.json({ success: true, twinId, related });
  }

  res.json({ success: true, relationships: relationMap });
});

// Link twins
app.post('/api/relationships', (req, res) => {
  const { sourceId, targetId, type } = req.body;

  if (!sourceId || !targetId) {
    return res.status(400).json({ success: false, error: 'Source and target IDs required' });
  }

  if (!twinRegistry.has(sourceId) || !twinRegistry.has(targetId)) {
    return res.status(404).json({ success: false, error: 'Twin not found' });
  }

  logger.info(`Linked twins: ${sourceId} -> ${targetId} (${type || 'default'})`);
  res.json({ success: true, message: 'Twins linked', source: sourceId, target: targetId });
});

// ============= SYNC EVENTS =============

// Get sync history
app.get('/api/sync/history', (req, res) => {
  const { twinId, limit } = req.query;
  let events = [...syncEvents];

  if (twinId) events = events.filter(e => e.twinId === twinId);
  if (limit) events = events.slice(0, parseInt(limit));

  res.json({ success: true, count: events.length, events });
});

// ============= HUB OPERATIONS =============

// Get hub statistics
app.get('/api/stats', (req, res) => {
  const twins = Array.from(twinRegistry.values());
  const categories = {};
  const services = {};

  twins.forEach(twin => {
    categories[twin.category] = (categories[twin.category] || 0) + 1;
    services[twin.service] = (services[twin.service] || 0) + 1;
  });

  res.json({
    success: true,
    stats: {
      totalTwins: twins.length,
      byStatus: {
        active: twins.filter(t => t.status === 'active').length,
        syncing: twins.filter(t => t.status === 'syncing').length,
        registered: twins.filter(t => t.status === 'registered').length,
        inactive: twins.filter(t => t.status === 'inactive').length
      },
      byHealth: {
        healthy: twins.filter(t => t.health === 'healthy').length,
        degraded: twins.filter(t => t.health === 'degraded').length,
        unknown: twins.filter(t => t.health === 'unknown').length
      },
      byCategory: categories,
      byService: services,
      totalSyncs: twins.reduce((sum, t) => sum + t.syncCount, 0),
      syncEvents: syncEvents.length
    }
  });
});

// Get categories
app.get('/api/categories', (req, res) => {
  const twins = Array.from(twinRegistry.values());
  const categories = [...new Set(twins.map(t => t.category))];

  res.json({
    success: true,
    categories: categories.map(cat => ({
      name: cat,
      count: twins.filter(t => t.category === cat).length,
      twins: twins.filter(t => t.category === cat).map(t => t.id)
    }))
  });
});

// Get services
app.get('/api/services', (req, res) => {
  const twins = Array.from(twinRegistry.values());
  const services = [...new Set(twins.map(t => t.service))];

  res.json({
    success: true,
    services: services.map(svc => ({
      name: svc,
      count: twins.filter(t => t.service === svc).length,
      twins: twins.filter(t => t.service === svc).map(t => t.id)
    }))
  });
});

// Health check all twins
app.get('/api/health/all', async (req, res) => {
  const results = [];

  for (const [id, twin] of twinRegistry) {
    // In production, would actually ping the service
    const healthy = twin.status === 'active' && twin.health === 'healthy';
    results.push({
      id,
      service: twin.service,
      status: healthy ? 'healthy' : 'unhealthy',
      port: twin.port
    });
  }

  const healthyCount = results.filter(r => r.status === 'healthy').length;
  res.json({
    success: true,
    summary: {
      total: results.length,
      healthy: healthyCount,
      unhealthy: results.length - healthyCount
    },
    twins: results
  });
});

// ============= EXPORT/IMPORT =============

// Export hub state
app.get('/api/export', (req, res) => {
  res.json({
    success: true,
    exported: new Date().toISOString(),
    registry: Array.from(twinRegistry.values()),
    states: Object.fromEntries(twinStates)
  });
});

// Import hub state
app.post('/api/import', (req, res) => {
  const { registry, states } = req.body;

  if (registry) {
    registry.forEach(twin => {
      twinRegistry.set(twin.id, twin);
    });
  }

  if (states) {
    Object.entries(states).forEach(([id, state]) => {
      twinStates.set(id, state);
    });
  }

  logger.info(`Imported ${registry?.length || 0} twins`);
  res.json({ success: true, message: 'Import complete' });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error(err);
  res.status(500).json({ success: false, error: err.message });
});

// Start
app.listen(PORT, () => {
  logger.info(`🔗 TwinOS Hub running on port ${PORT}`);
  logger.info(`📊 Managing ${twinRegistry.size} digital twins`);
});

export default app;
