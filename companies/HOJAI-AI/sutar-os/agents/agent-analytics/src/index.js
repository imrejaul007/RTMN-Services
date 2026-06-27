import cors from 'cors';
import helmet from 'helmet';
/**
 * Agent Analytics Service
 *
 * Provides comprehensive analytics for ACN agents including:
 * - Transaction metrics
 * - Negotiation success rates
 * - Revenue tracking
 * - Customer insights
 * - Performance dashboards
 * - Real-time monitoring
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const { v4: uuidv4 } = require('uuid');
const rezIntel = require('./rez-intel-client');

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

app.use(cors());
app.use(helmet());

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
setupSecurity(app, { serviceName: 'agent-analytics' });

const PORT = process.env.PORT || 4848;

// Service URLs
const ACN_NETWORK_URL = process.env.ACN_NETWORK_URL || 'http://localhost:4801';
const ACP_PROTOCOL_URL = process.env.ACP_PROTOCOL_URL || 'http://localhost:4800';
const AGENT_REPUTATION_URL = process.env.AGENT_REPUTATION_URL || 'http://localhost:4820';

// In-memory stores
const events = new PersistentMap('events', { serviceName: 'agent-analytics' });
const metrics = new PersistentMap('metrics', { serviceName: 'agent-analytics' });
const dashboards = new PersistentMap('dashboards', { serviceName: 'agent-analytics' });
const alerts = new PersistentMap('alerts', { serviceName: 'agent-analytics' });
const realtimeMetrics = new PersistentMap('realtime-metrics', { serviceName: 'agent-analytics' });

// Event types
const EVENT_TYPES = {
  TRANSACTION: 'transaction',
  NEGOTIATION: 'negotiation',
  ORDER: 'order',
  DISPUTE: 'dispute',
  PAYMENT: 'payment',
  REVIEW: 'review',
  SEARCH: 'search',
  VIEW: 'view',
  CLICK: 'click'
};

/**
 * Record event
 */
function recordEvent(agentId, eventType, data) {
  const event = {
    id: uuidv4(),
    agentId,
    type: eventType,
    data,
    timestamp: new Date().toISOString()
  };

  const agentEvents = events.get(agentId) || [];
  agentEvents.push(event);

  // Keep last 10000 events
  if (agentEvents.length > 10000) {
    agentEvents.shift();
  }

  events.set(agentId, agentEvents);

  // Update realtime metrics
  updateRealtimeMetrics(agentId, eventType, data);

  // Check for alerts
  checkAlerts(agentId, event);

  return event;
}

/**
 * Update realtime metrics
 */
function updateRealtimeMetrics(agentId, eventType, data) {
  let realtime = realtimeMetrics.get(agentId);

  if (!realtime) {
    realtime = {
      agentId,
      lastUpdated: new Date().toISOString(),
      hourly: {},
      daily: {},
      counters: {
        totalEvents: 0,
        negotiations: 0,
        successfulNegotiations: 0,
        orders: 0,
        revenue: 0,
        disputes: 0,
        views: 0,
        searches: 0
      }
    };
  }

  realtime.lastUpdated = new Date().toISOString();
  realtime.counters.totalEvents++;

  switch (eventType) {
    case EVENT_TYPES.NEGOTIATION:
      realtime.counters.negotiations++;
      if (data?.success) realtime.counters.successfulNegotiations++;
      break;
    case EVENT_TYPES.ORDER:
      realtime.counters.orders++;
      if (data?.amount) realtime.counters.revenue += data.amount;
      break;
    case EVENT_TYPES.DISPUTE:
      realtime.counters.disputes++;
      break;
    case EVENT_TYPES.VIEW:
      realtime.counters.views++;
      break;
    case EVENT_TYPES.SEARCH:
      realtime.counters.searches++;
      break;
  }

  // Update hourly bucket
  const hour = new Date().toISOString().slice(0, 13);
  if (!realtime.hourly[hour]) {
    realtime.hourly[hour] = { transactions: 0, revenue: 0, negotiations: 0 };
  }
  if (eventType === EVENT_TYPES.TRANSACTION || eventType === EVENT_TYPES.ORDER) {
    realtime.hourly[hour].transactions++;
    if (data?.amount) realtime.hourly[hour].revenue += data.amount;
  }
  if (eventType === EVENT_TYPES.NEGOTIATION) {
    realtime.hourly[hour].negotiations++;
  }

  // Update daily bucket
  const day = new Date().toISOString().slice(0, 10);
  if (!realtime.daily[day]) {
    realtime.daily[day] = { transactions: 0, revenue: 0, negotiations: 0 };
  }
  if (eventType === EVENT_TYPES.TRANSACTION || eventType === EVENT_TYPES.ORDER) {
    realtime.daily[day].transactions++;
    if (data?.amount) realtime.daily[day].revenue += data.amount;
  }
  if (eventType === EVENT_TYPES.NEGOTIATION) {
    realtime.daily[day].negotiations++;
  }

  realtimeMetrics.set(agentId, realtime);
}

/**
 * Check alerts
 */
function checkAlerts(agentId, event) {
  const realtime = realtimeMetrics.get(agentId);
  if (!realtime) return;

  const alerts = [];

  // High dispute rate alert
  if (realtime.counters.disputes > 5 &&
      realtime.counters.disputes / Math.max(1, realtime.counters.orders) > 0.1) {
    alerts.push({
      type: 'high_dispute_rate',
      severity: 'warning',
      message: `High dispute rate: ${(realtime.counters.disputes / realtime.counters.orders * 100).toFixed(1)}%`,
      threshold: 10,
      currentValue: (realtime.counters.disputes / realtime.counters.orders * 100).toFixed(1)
    });
  }

  // Low negotiation success
  if (realtime.counters.negotiations > 10 &&
      realtime.counters.successfulNegotiations / realtime.counters.negotiations < 0.3) {
    alerts.push({
      type: 'low_negotiation_success',
      severity: 'warning',
      message: 'Negotiation success rate below 30%',
      threshold: 30,
      currentValue: (realtime.counters.successfulNegotiations / realtime.counters.negotiations * 100).toFixed(1)
    });
  }

  // Save alerts
  if (alerts.length > 0) {
    const agentAlerts = alerts.get(agentId) || [];
    alerts.forEach(alert => {
      agentAlerts.push({
        ...alert,
        timestamp: new Date().toISOString(),
        acknowledged: false
      });
    });
    alerts.set(agentId, agentAlerts);
  }
}

/**
 * Calculate agent metrics
 */
function calculateMetrics(agentId, timeRange = '30d') {
  const allEvents = events.get(agentId) || [];

  // Filter by time range
  const now = Date.now();
  const rangeMs = {
    '1h': 60 * 60 * 1000,
    '24h': 24 * 60 * 60 * 1000,
    '7d': 7 * 24 * 60 * 60 * 1000,
    '30d': 30 * 24 * 60 * 60 * 1000,
    'all': Infinity
  }[timeRange] || 30 * 24 * 60 * 60 * 1000;

  const filteredEvents = allEvents.filter(e =>
    now - new Date(e.timestamp).getTime() <= rangeMs
  );

  const counts = {};
  Object.values(EVENT_TYPES).forEach(type => counts[type] = 0);

  filteredEvents.forEach(e => {
    counts[e.type] = (counts[e.type] || 0) + 1;
  });

  // Calculate revenue
  const transactions = filteredEvents.filter(e =>
    e.type === EVENT_TYPES.TRANSACTION || e.type === EVENT_TYPES.ORDER
  );
  const revenue = transactions.reduce((sum, e) => sum + (e.data?.amount || 0), 0);

  // Calculate negotiation metrics
  const negotiations = filteredEvents.filter(e => e.type === EVENT_TYPES.NEGOTIATION);
  const successfulNegotiations = negotiations.filter(n => n.data?.success).length;
  const negotiationSuccessRate = negotiations.length > 0
    ? (successfulNegotiations / negotiations.length * 100).toFixed(1)
    : 0;

  const avgNegotiationRounds = negotiations.length > 0
    ? negotiations.reduce((sum, n) => sum + (n.data?.rounds || 1), 0) / negotiations.length
    : 0;

  const avgDiscount = negotiations.length > 0
    ? negotiations.reduce((sum, n) => sum + (n.data?.discountPercent || 0), 0) / negotiations.length
    : 0;

  // Customer metrics
  const uniqueCustomers = new Set(
    filteredEvents
      .filter(e => e.data?.customerId)
      .map(e => e.data.customerId)
  ).size;

  const returningCustomers = filteredEvents
    .filter(e => e.data?.customerId)
    .reduce((acc, e) => {
      const cid = e.data.customerId;
      acc[cid] = (acc[cid] || 0) + 1;
      return acc;
    }, {});

  const returningCount = Object.values(returningCustomers).filter(c => c > 1).length;

  return {
    agentId,
    timeRange,
    events: {
      total: filteredEvents.length,
      breakdown: counts
    },
    transactions: {
      total: counts.transaction + counts.order,
      revenue,
      avgValue: transactions.length > 0 ? revenue / transactions.length : 0
    },
    negotiations: {
      total: negotiations.length,
      successful: successfulNegotiations,
      successRate: parseFloat(negotiationSuccessRate),
      avgRounds: parseFloat(avgNegotiationRounds.toFixed(1)),
      avgDiscountPercent: parseFloat(avgDiscount.toFixed(1))
    },
    customers: {
      unique: uniqueCustomers,
      returning: returningCount,
      retentionRate: uniqueCustomers > 0
        ? parseFloat((returningCount / uniqueCustomers * 100).toFixed(1))
        : 0
    },
    performance: {
      views: counts.view,
      searches: counts.search,
      conversionRate: counts.view > 0
        ? parseFloat(((counts.transaction + counts.order) / counts.view * 100).toFixed(2))
        : 0
    }
  };
}

/**
 * Create dashboard
 */
function createDashboard(agentId, config) {
  const dashboard = {
    id: `DASH-${uuidv4().substring(0, 8)}`,
    agentId,
    name: config.name || 'Agent Dashboard',
    widgets: config.widgets || [
      { type: 'transactions', size: 'large' },
      { type: 'revenue', size: 'medium' },
      { type: 'negotiations', size: 'medium' },
      { type: 'customers', size: 'small' },
      { type: 'alerts', size: 'small' }
    ],
    refreshInterval: config.refreshInterval || 60,
    createdAt: new Date().toISOString()
  };

  dashboards.set(dashboard.id, dashboard);
  return dashboard;
}

// ============================================================================
// API ENDPOINTS
// ============================================================================

app.get('/health', (req, res) => {
  res.json({
    service: 'Agent Analytics Service',
    version: '1.0.0',
    port: PORT,
    status: 'running',
    stats: {
      totalEvents: Array.from(events.values()).reduce((sum, e) => sum + e.length, 0),
      totalAgents: events.size,
      activeDashboards: dashboards.size
    }
  });
});

/**
 * Record event
 * POST /api/events
 */
app.post('/api/events',requireAuth,  (req, res) => {
  try {
    const { agentId, type, data } = req.body;
    if (!agentId || !type) {
      return res.status(400).json({ error: 'agentId and type are required' });
    }

    const event = recordEvent(agentId, type, data);
    res.status(201).json(event);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Batch events
 * POST /api/events/batch
 */
app.post('/api/events/batch',requireAuth,  (req, res) => {
  try {
    const { events: eventsList } = req.body;
    if (!Array.isArray(eventsList)) {
      return res.status(400).json({ error: 'events must be an array' });
    }

    const recorded = eventsList.map(e => recordEvent(e.agentId, e.type, e.data));
    res.status(201).json({ count: recorded.length, events: recorded });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get agent metrics
 * GET /api/metrics/:agentId
 */
app.get('/api/metrics/:agentId', (req, res) => {
  const { timeRange = '30d' } = req.query;
  const metrics = calculateMetrics(req.params.agentId, timeRange);
  res.json(metrics);
});

/**
 * Get realtime metrics
 * GET /api/realtime/:agentId
 */
app.get('/api/realtime/:agentId', (req, res) => {
  const realtime = realtimeMetrics.get(req.params.agentId);
  if (!realtime) {
    return res.status(404).json({ error: 'No realtime data' });
  }
  res.json(realtime);
});

/**
 * Get events
 * GET /api/events/:agentId
 */
app.get('/api/events/:agentId', (req, res) => {
  const { type, limit = 100, offset = 0 } = req.query;
  const allEvents = events.get(req.params.agentId) || [];

  let filtered = allEvents;
  if (type) {
    filtered = filtered.filter(e => e.type === type);
  }

  res.json({
    total: filtered.length,
    events: filtered
      .slice(-parseInt(limit) - parseInt(offset), -parseInt(offset) || undefined)
      .reverse()
  });
});

/**
 * Get alerts
 * GET /api/alerts/:agentId
 */
app.get('/api/alerts/:agentId', (req, res) => {
  const agentAlerts = alerts.get(req.params.agentId) || [];
  const { acknowledged } = req.query;

  let filtered = agentAlerts;
  if (acknowledged !== undefined) {
    filtered = filtered.filter(a => a.acknowledged === (acknowledged === 'true'));
  }

  res.json({
    total: filtered.length,
    alerts: filtered
  });
});

/**
 * Acknowledge alert
 * POST /api/alerts/:agentId/acknowledge
 */
app.post('/api/alerts/:agentId/acknowledge',requireAuth,  (req, res) => {
  const { alertId } = req.body;
  const agentAlerts = alerts.get(req.params.agentId) || [];

  const alert = agentAlerts.find(a => a.id === alertId);
  if (alert) {
    alert.acknowledged = true;
    alert.acknowledgedAt = new Date().toISOString();
    alerts.set(req.params.agentId, agentAlerts);
    return res.json(alert);
  }

  res.status(404).json({ error: 'Alert not found' });
});

/**
 * Create dashboard
 * POST /api/dashboards
 */
app.post('/api/dashboards',requireAuth,  (req, res) => {
  try {
    const dashboard = createDashboard(req.body.agentId, req.body);
    res.status(201).json(dashboard);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * Get dashboard
 * GET /api/dashboards/:id
 */
app.get('/api/dashboards/:id', (req, res) => {
  const dashboard = dashboards.get(req.params.id);
  if (!dashboard) {
    return res.status(404).json({ error: 'Dashboard not found' });
  }

  // Get current metrics
  const metrics = calculateMetrics(dashboard.agentId, '30d');

  res.json({
    ...dashboard,
    metrics
  });
});

/**
 * Get dashboards by agent
 * GET /api/dashboards/agent/:agentId
 */
app.get('/api/dashboards/agent/:agentId', (req, res) => {
  const agentDashboards = Array.from(dashboards.values())
    .filter(d => d.agentId === req.params.agentId);
  res.json(agentDashboards);
});

/**
 * Compare agents
 * POST /api/compare
 */
app.post('/api/compare',requireAuth,  (req, res) => {
  const { agentIds, timeRange = '30d' } = req.body;

  if (!Array.isArray(agentIds)) {
    return res.status(400).json({ error: 'agentIds must be an array' });
  }

  const comparison = agentIds.map(id => ({
    agentId: id,
    metrics: calculateMetrics(id, timeRange)
  }));

  res.json({ comparison });
});

/**
 * Network-wide analytics
 * GET /api/network/overview
 */
app.get('/api/network/overview', (req, res) => {
  const allRealtime = Array.from(realtimeMetrics.values());

  const totalRevenue = allRealtime.reduce((sum, r) => sum + r.counters.revenue, 0);
  const totalOrders = allRealtime.reduce((sum, r) => sum + r.counters.orders, 0);
  const totalNegotiations = allRealtime.reduce((sum, r) => sum + r.counters.negotiations, 0);
  const successfulNegotiations = allRealtime.reduce((sum, r) => sum + r.counters.successfulNegotiations, 0);

  res.json({
    totalAgents: allRealtime.length,
    totalOrders,
    totalRevenue,
    totalNegotiations,
    successfulNegotiations,
    successRate: totalNegotiations > 0
      ? (successfulNegotiations / totalNegotiations * 100).toFixed(1)
      : 0,
    avgOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0
  });
});

/**
 * Get top performers
 * GET /api/top
 */
app.get('/api/top', (req, res) => {
  const { metric = 'revenue', limit = 10 } = req.query;

  const performers = Array.from(realtimeMetrics.values()).map(r => ({
    agentId: r.agentId,
    metric: r.counters[metric] || 0
  })).sort((a, b) => b.metric - a.metric).slice(0, parseInt(limit));

  res.json({ metric, performers });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = 
// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', requireInternal, async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body;
  const enriched = await rezIntel.enrichAgentContext({ agentRole, userId, companyId, query, context }).catch(() => null);
  res.json({ enriched, source: enriched ? 'rez-intel' : 'unavailable' });
});

// Additional REZ Intelligence endpoints (shallow pattern)
app.post('/api/intel/classify-intent', requireAuth, async (req, res) => {
  try {
    const intent = await rezIntel.classifyIntent({ ...req.body }).catch(() => null);
    res.json({ success: !!intent, intent, source: intent ? 'rez-intel' : 'unavailable', fallback: !intent });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/intel/next-best-action', requireAuth, async (req, res) => {
  try {
    const action = await rezIntel.getNextBestAction({ ...req.query }).catch(() => null);
    res.json({ success: !!action, action, source: action ? 'rez-intel' : 'unavailable', fallback: !action });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║           AGENT ANALYTICS SERVICE                            ║
║                 Version 1.0.0                                  ║
╠══════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                   ║
║  Status: RUNNING                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Event Types: Transaction, Negotiation, Order, Dispute     ║
║                Payment, Review, Search, View                ║
╠══════════════════════════════════════════════════════════════╣
║  Metrics: Revenue, Orders, Success Rate, Avg Rounds        ║
║           Customers, Retention, Conversion                  ║
╠══════════════════════════════════════════════════════════════╣
║  API Endpoints:                                               ║
║    POST   /api/events              Record event              ║
║    GET    /api/metrics/:agentId    Get metrics              ║
║    GET    /api/realtime/:agentId   Realtime data            ║
║    GET    /api/alerts/:agentId     Get alerts               ║
║    POST   /api/dashboards          Create dashboard         ║
║    GET    /api/dashboards/:id      Get dashboard            ║
║    POST   /api/compare             Compare agents           ║
║    GET    /api/network/overview    Network overview         ║
╚══════════════════════════════════════════════════════════════╝
  `);
});
installGracefulShutdown(server);

module.exports = app;
module.exports.EVENT_TYPES = EVENT_TYPES;
module.exports.recordEvent = recordEvent;
module.exports.updateRealtimeMetrics = updateRealtimeMetrics;
module.exports.checkAlerts = checkAlerts;
module.exports.calculateMetrics = calculateMetrics;
module.exports.createDashboard = createDashboard;
