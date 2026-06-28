/**
 * SUTAR OS — Usage Tracker
 *
 * AI usage metering and billing for agent operations.
 * Tracks tokens, API calls, compute time, and cost attribution.
 *
 * Endpoints:
 *   POST /api/events         — Record usage event
 *   GET  /api/events        — Query usage events
 *   GET  /api/summary       — Usage summary by period
 *   GET  /api/cost          — Cost breakdown
 *   GET  /api/quotas        — Quota status
 *   POST /api/quotas       — Set quota
 *   GET  /health
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { setupSecurity, requireAuth } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());
setupSecurity(app, { serviceName: 'sutar-usage-tracker' });

const PORT = process.env.USAGE_PORT || 4252;

// ---------- In-Memory Stores ----------
const events = [];
const quotas = new Map();
const MAX_EVENTS = 500000;

// ---------- Pricing (per 1K units) ----------
const PRICING = {
  token: 0.00003,      // $0.03 per 1K input tokens
  outputToken: 0.00009, // $0.09 per 1K output tokens
  apiCall: 0.001,       // $0.001 per API call
  computeMinute: 0.05,   // $0.05 per compute minute
  storageGB: 0.10,       // $0.10 per GB/month
  networkGB: 0.05,       // $0.05 per GB network
};

// ---------- Event Recording ----------
function recordEvent(params) {
  const id = uuidv4();
  const event = {
    id,
    agentId: params.agentId,
    tenantId: params.tenantId,
    service: params.service,
    type: params.type, // token, api_call, compute, storage, network
    quantity: params.quantity,
    unit: params.unit,
    timestamp: new Date().toISOString(),
    metadata: params.metadata || {},
    cost: calculateCost(params),
  };
  events.push(event);
  while (events.length > MAX_EVENTS) events.shift();

  // Check quota
  const quotaStatus = checkQuota(event.tenantId, event.type, event.quantity);
  return { eventId: id, cost: event.cost, quotaExceeded: quotaStatus.exceeded, quotaRemaining: quotaStatus.remaining };
}

function calculateCost(event) {
  const q = event.quantity || 0;
  switch (event.type) {
    case 'input_token': return q * PRICING.token;
    case 'output_token': return q * PRICING.outputToken;
    case 'api_call': return q * PRICING.apiCall;
    case 'compute_minute': return q * PRICING.computeMinute;
    case 'storage_gb': return q * PRICING.storageGB;
    case 'network_gb': return q * PRICING.networkGB;
    default: return 0;
  }
}

function checkQuota(tenantId, type, quantity) {
  const key = `${tenantId}:${type}`;
  const quota = quotas.get(key);
  if (!quota) return { exceeded: false, remaining: null };

  const used = getUsage(tenantId, type);
  const wouldBe = used + quantity;
  return {
    exceeded: wouldBe > quota.limit,
    remaining: Math.max(0, quota.limit - used),
    limit: quota.limit,
    used,
  };
}

function getUsage(tenantId, type, since = null) {
  let filtered = events.filter(e => e.tenantId === tenantId && e.type === type);
  if (since) filtered = filtered.filter(e => e.timestamp >= since);
  return filtered.reduce((s, e) => s + e.quantity, 0);
}

// ---------- Usage Summary ----------
function getUsageSummary(params) {
  const { tenantId, period, since, until } = params;
  if (!tenantId) return { error: 'tenantId required' };

  let filtered = events.filter(e => e.tenantId === tenantId);
  if (since) filtered = filtered.filter(e => e.timestamp >= since);
  if (until) filtered = filtered.filter(e => e.timestamp <= until);

  const byType = {};
  for (const e of filtered) {
    if (!byType[e.type]) byType[e.type] = { quantity: 0, cost: 0, events: 0 };
    byType[e.type].quantity += e.quantity || 0;
    byType[e.type].cost += e.cost || 0;
    byType[e.type].events++;
  }

  const totalCost = Object.values(byType).reduce((s, v) => s + v.cost, 0);

  return {
    tenantId,
    period: period || 'custom',
    since: since || 'all_time',
    until: until || 'now',
    totalEvents: filtered.length,
    totalCost: Math.round(totalCost * 100) / 100,
    byType: Object.entries(byType).map(([type, data]) => ({ type, ...data, cost: Math.round(data.cost * 100) / 100 })),
  };
}

// ---------- Cost Breakdown ----------
function getCostBreakdown(params) {
  const { tenantId, by, period } = params;
  if (!tenantId) return { error: 'tenantId required' };

  let filtered = events.filter(e => e.tenantId === tenantId);
  if (period === 'day') {
    const dayAgo = new Date(Date.now() - 86400000).toISOString();
    filtered = filtered.filter(e => e.timestamp >= dayAgo);
  } else if (period === 'week') {
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString();
    filtered = filtered.filter(e => e.timestamp >= weekAgo);
  } else if (period === 'month') {
    const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString();
    filtered = filtered.filter(e => e.timestamp >= monthAgo);
  }

  if (by === 'agent') {
    const byAgent = {};
    for (const e of filtered) {
      const aid = e.agentId || 'unknown';
      if (!byAgent[aid]) byAgent[aid] = { cost: 0, events: 0 };
      byAgent[aid].cost += e.cost || 0;
      byAgent[aid].events++;
    }
    return { tenantId, by: 'agent', breakdown: Object.entries(byAgent).map(([agentId, data]) => ({ agentId, cost: Math.round(data.cost * 100) / 100, events: data.events })) };
  } else if (by === 'service') {
    const byService = {};
    for (const e of filtered) {
      const svc = e.service || 'unknown';
      if (!byService[svc]) byService[svc] = { cost: 0, events: 0 };
      byService[svc].cost += e.cost || 0;
      byService[svc].events++;
    }
    return { tenantId, by: 'service', breakdown: Object.entries(byService).map(([service, data]) => ({ service, cost: Math.round(data.cost * 100) / 100, events: data.events })) };
  }

  return { tenantId, by: by || 'type', totalCost: Math.round(filtered.reduce((s, e) => s + (e.cost || 0), 0) * 100) / 100, events: filtered.length };
}

// ---------- Routes ----------
app.post('/api/events', requireAuth, (req, res) => {
  const result = recordEvent(req.body);
  res.status(201).json(result);
});

app.get('/api/events', requireAuth, (req, res) => {
  const { tenantId, agentId, type, since, limit } = req.query;
  let list = [...events];
  if (tenantId) list = list.filter(e => e.tenantId === tenantId);
  if (agentId) list = list.filter(e => e.agentId === agentId);
  if (type) list = list.filter(e => e.type === type);
  if (since) list = list.filter(e => e.timestamp >= since);
  list.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  const pageSize = Math.min(parseInt(limit) || 100, 1000);
  res.json({ total: events.length, returned: Math.min(list.length, pageSize), events: list.slice(0, pageSize) });
});

app.get('/api/summary', requireAuth, (req, res) => {
  const result = getUsageSummary(req.query);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/cost', requireAuth, (req, res) => {
  res.json(getCostBreakdown(req.query));
});

app.get('/api/quotas', requireAuth, (req, res) => {
  const { tenantId } = req.query;
  const list = tenantId
    ? Array.from(quotas.values()).filter(q => q.tenantId === tenantId)
    : Array.from(quotas.values());
  res.json({ total: list.length, quotas: list });
});

app.post('/api/quotas', requireAuth, (req, res) => {
  const { tenantId, type, limit } = req.body;
  if (!tenantId || !type || !limit) return res.status(400).json({ error: 'tenantId, type, limit required' });
  const quota = { tenantId, type, limit, createdAt: new Date().toISOString() };
  quotas.set(`${tenantId}:${type}`, quota);
  res.status(201).json(quota);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sutar-usage-tracker', port: PORT, layer: 'Marketplace + Economy', events: events.length, quotas: quotas.size, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => { console.log(`[sutar-usage-tracker] listening on :${PORT}`); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
