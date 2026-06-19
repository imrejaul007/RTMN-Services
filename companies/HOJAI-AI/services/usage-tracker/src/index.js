/**
 * SUTAR OS — Usage Tracker (port 4252)
 *
 * Tracks metered usage of marketplace services, AI agents, and digital twins
 * across the RTMN ecosystem. Generates usage records, aggregates them into
 * invoices, and computes revenue share for providers.
 *
 * Endpoints:
 *   POST /api/usage/record          Record a single usage event
 *   GET  /api/usage                 List usage records (filter by tenant/provider/service)
 *   GET  /api/usage/aggregate/:key  Aggregated usage for a tenant or provider
 *   POST /api/billing/generate      Generate invoice from usage records
 *   GET  /api/billing               List invoices
 *   GET  /api/billing/:id           Get invoice detail
 *   GET  /api/plans                 List pricing plans
 *   POST /api/plans                 Create a pricing plan
 *   GET  /api/quotas/:tenantId      Get quota usage for tenant
 *   POST /api/quotas/:tenantId      Set quota for tenant
 *   GET  /api/revenue/share/:providerId  Compute revenue share for provider
 *   GET  /health
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');

const app = express();
const PORT = process.env.PORT || 4252;
const SERVICE_NAME = 'sutar-usage-tracker';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

// ---------- In-memory stores ----------
const usageRecords = [];          // { id, tenantId, providerId, serviceId, metric, quantity, unit, timestamp, metadata }
const invoices = [];              // { id, tenantId, lineItems, subtotal, tax, total, status, dueDate, ... }
const plans = new Map();          // planId -> { name, pricing: { metric: rate }, ... }
const quotas = new Map();         // tenantId -> { metric: limit }
const providerBalances = new Map(); // providerId -> { earned, pending }

const DEFAULT_PLATFORM_FEE = 0.15; // 15%

// ---------- Seed data ----------
function seed() {
  const now = Date.now();

  const demoPlanId = uuid();
  plans.set(demoPlanId, {
    id: demoPlanId,
    name: 'Pay-As-You-Go (Default)',
    pricing: {
      llm_tokens: 0.00003,       // $ per token
      api_call: 0.001,           // $ per call
      twin_update: 0.0001,       // $ per update
      storage_mb_hour: 0.00001,  // $ per MB-hour
      compute_gpu_second: 0.0005 // $ per GPU-second
    },
    platformFee: DEFAULT_PLATFORM_FEE,
    createdAt: now
  });

  // Synthetic usage records
  const tenants = ['tenant-restaurant-001', 'tenant-hotel-002', 'tenant-retail-003'];
  const providers = ['provider-inference-gateway', 'provider-synthetic-data', 'provider-gpu-cluster'];
  const services = ['inference-gateway', 'synthetic-data', 'gpu-cluster'];
  const metrics = ['llm_tokens', 'api_call', 'twin_update', 'compute_gpu_second'];

  for (let i = 0; i < 60; i++) {
    const tenant = tenants[i % tenants.length];
    const provider = providers[i % providers.length];
    const service = services[i % services.length];
    const metric = metrics[i % metrics.length];
    const quantity = metric === 'llm_tokens'
      ? 1000 + Math.floor(Math.random() * 50000)
      : metric === 'compute_gpu_second'
        ? 60 + Math.floor(Math.random() * 3600)
        : 1 + Math.floor(Math.random() * 100);
    const units = metric === 'llm_tokens' ? 'tokens'
      : metric === 'compute_gpu_second' ? 'gpu-seconds'
      : metric === 'twin_update' ? 'updates'
      : 'calls';

    usageRecords.push({
      id: uuid(),
      tenantId: tenant,
      providerId: provider,
      serviceId: service,
      metric,
      quantity,
      unit: units,
      timestamp: now - (60 - i) * 3600 * 1000,
      metadata: { planId: demoPlanId, source: 'seed' }
    });
  }

  // Default quotas
  for (const t of tenants) {
    quotas.set(t, { llm_tokens: 5_000_000, api_call: 100_000, compute_gpu_second: 100_000 });
  }

  // Compute initial provider balances
  for (const p of providers) recomputeProviderBalance(p);
}

function recomputeProviderBalance(providerId) {
  let earned = 0;
  let pending = 0;
  for (const r of usageRecords) {
    if (r.providerId !== providerId) continue;
    const value = priceUsage(r);
    earned += value;
  }
  // Mark 80% as settled, 20% as pending (paid out via invoices)
  pending = earned * 0.2;
  providerBalances.set(providerId, { earned, pending, settled: earned * 0.8 });
}

function priceUsage(record) {
  // Default pricing if no plan metadata
  const defaultRates = {
    llm_tokens: 0.00003,
    api_call: 0.001,
    twin_update: 0.0001,
    storage_mb_hour: 0.00001,
    compute_gpu_second: 0.0005
  };
  const planId = record.metadata?.planId;
  const plan = planId ? plans.get(planId) : null;
  const rate = plan ? plan.pricing[record.metric] ?? defaultRates[record.metric] : defaultRates[record.metric];
  if (rate == null) return 0;
  return record.quantity * rate;
}

// ---------- Health ----------
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    layer: 5,
    sutarLayer: 'Economy / Metering',
    port: PORT,
    counts: {
      usageRecords: usageRecords.length,
      invoices: invoices.length,
      plans: plans.size,
      quotas: quotas.size,
      providers: providerBalances.size
    },
    timestamp: new Date().toISOString()
  });
});

// ---------- Usage ----------
app.post('/api/usage/record', (req, res) => {
  const { tenantId, providerId, serviceId, metric, quantity, unit, metadata } = req.body || {};
  if (!tenantId || !providerId || !serviceId || !metric || quantity == null) {
    return res.status(400).json({ error: 'tenantId, providerId, serviceId, metric, quantity required' });
  }
  const record = {
    id: uuid(),
    tenantId,
    providerId,
    serviceId,
    metric,
    quantity: Number(quantity),
    unit: unit || 'units',
    timestamp: Date.now(),
    metadata: metadata || {}
  };
  usageRecords.push(record);
  recomputeProviderBalance(providerId);

  // Quota enforcement
  const tenantQuota = quotas.get(tenantId) || {};
  const tenantUsed = usageRecords
    .filter(r => r.tenantId === tenantId && r.metric === metric)
    .reduce((s, r) => s + r.quantity, 0);
  const quotaLimit = tenantQuota[metric];
  const overQuota = quotaLimit != null && tenantUsed > quotaLimit;

  res.status(201).json({ record, overQuota, quotaLimit, quotaUsed: tenantUsed });
});

app.get('/api/usage', (req, res) => {
  const { tenantId, providerId, serviceId, metric, since, until, limit = 200 } = req.query;
  let rows = usageRecords;
  if (tenantId) rows = rows.filter(r => r.tenantId === tenantId);
  if (providerId) rows = rows.filter(r => r.providerId === providerId);
  if (serviceId) rows = rows.filter(r => r.serviceId === serviceId);
  if (metric) rows = rows.filter(r => r.metric === metric);
  if (since) rows = rows.filter(r => r.timestamp >= Number(since));
  if (until) rows = rows.filter(r => r.timestamp <= Number(until));
  rows = rows.slice(-Number(limit));
  res.json({ count: rows.length, records: rows });
});

app.get('/api/usage/aggregate/:key', (req, res) => {
  const { key } = req.params;
  const { by = 'metric' } = req.query;
  const rows = usageRecords.filter(r => r.tenantId === key || r.providerId === key);
  const grouped = {};
  let totalUsd = 0;
  for (const r of rows) {
    const groupKey = by === 'metric' ? r.metric : by === 'service' ? r.serviceId : r.providerId;
    if (!grouped[groupKey]) grouped[groupKey] = { quantity: 0, unit: r.unit, usd: 0, events: 0 };
    grouped[groupKey].quantity += r.quantity;
    grouped[groupKey].usd += priceUsage(r);
    grouped[groupKey].events += 1;
    totalUsd += priceUsage(r);
  }
  res.json({ key, by, groups: grouped, totalUsd: Number(totalUsd.toFixed(6)), eventCount: rows.length });
});

// ---------- Billing ----------
app.post('/api/billing/generate', (req, res) => {
  const { tenantId, periodStart, periodEnd, taxRate = 0.0 } = req.body || {};
  if (!tenantId || !periodStart || !periodEnd) {
    return res.status(400).json({ error: 'tenantId, periodStart, periodEnd required' });
  }
  const rows = usageRecords.filter(r =>
    r.tenantId === tenantId &&
    r.timestamp >= Number(periodStart) &&
    r.timestamp <= Number(periodEnd)
  );

  // Group by provider+metric
  const lineItemMap = {};
  for (const r of rows) {
    const key = `${r.providerId}::${r.metric}`;
    if (!lineItemMap[key]) {
      lineItemMap[key] = { providerId: r.providerId, metric: r.metric, quantity: 0, unit: r.unit, subtotal: 0 };
    }
    lineItemMap[key].quantity += r.quantity;
    lineItemMap[key].subtotal += priceUsage(r);
  }
  const lineItems = Object.values(lineItemMap).map(li => ({
    ...li,
    subtotal: Number(li.subtotal.toFixed(6))
  }));
  const subtotal = lineItems.reduce((s, li) => s + li.subtotal, 0);
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const invoice = {
    id: uuid(),
    invoiceNumber: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    tenantId,
    periodStart: Number(periodStart),
    periodEnd: Number(periodEnd),
    lineItems,
    subtotal: Number(subtotal.toFixed(6)),
    tax: Number(tax.toFixed(6)),
    total: Number(total.toFixed(6)),
    taxRate,
    status: 'issued',
    dueDate: Date.now() + 30 * 24 * 3600 * 1000,
    createdAt: Date.now()
  };
  invoices.push(invoice);
  res.status(201).json({ invoice });
});

app.get('/api/billing', (_req, res) => {
  res.json({ count: invoices.length, invoices });
});

app.get('/api/billing/:id', (req, res) => {
  const inv = invoices.find(i => i.id === req.params.id);
  if (!inv) return res.status(404).json({ error: 'Invoice not found' });
  res.json({ invoice: inv });
});

// ---------- Plans ----------
app.get('/api/plans', (_req, res) => {
  res.json({ count: plans.size, plans: Array.from(plans.values()) });
});

app.post('/api/plans', (req, res) => {
  const { name, pricing, platformFee = DEFAULT_PLATFORM_FEE } = req.body || {};
  if (!name || !pricing) return res.status(400).json({ error: 'name and pricing required' });
  const id = uuid();
  const plan = { id, name, pricing, platformFee, createdAt: Date.now() };
  plans.set(id, plan);
  res.status(201).json({ plan });
});

// ---------- Quotas ----------
app.get('/api/quotas/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const quota = quotas.get(tenantId) || {};
  const used = {};
  for (const metric of Object.keys(quota)) {
    used[metric] = usageRecords
      .filter(r => r.tenantId === tenantId && r.metric === metric)
      .reduce((s, r) => s + r.quantity, 0);
  }
  res.json({ tenantId, quota, used });
});

app.post('/api/quotas/:tenantId', (req, res) => {
  const { tenantId } = req.params;
  const { quota } = req.body || {};
  if (!quota) return res.status(400).json({ error: 'quota object required' });
  quotas.set(tenantId, quota);
  res.status(201).json({ tenantId, quota });
});

// ---------- Revenue share ----------
app.get('/api/revenue/share/:providerId', (req, res) => {
  const { providerId } = req.params;
  const balance = providerBalances.get(providerId) || { earned: 0, pending: 0, settled: 0 };
  const usageRows = usageRecords.filter(r => r.providerId === providerId);
  const byTenant = {};
  for (const r of usageRows) {
    if (!byTenant[r.tenantId]) byTenant[r.tenantId] = { usageUsd: 0, events: 0 };
    byTenant[r.tenantId].usageUsd += priceUsage(r);
    byTenant[r.tenantId].events += 1;
  }
  const totalEarned = balance.earned || 0;
  const platformCut = totalEarned * DEFAULT_PLATFORM_FEE;
  const providerCut = totalEarned - platformCut;
  res.json({
    providerId,
    totalEarned: Number(totalEarned.toFixed(6)),
    platformFee: DEFAULT_PLATFORM_FEE,
    platformCut: Number(platformCut.toFixed(6)),
    providerCut: Number(providerCut.toFixed(6)),
    byTenant,
    balance
  });
});

// ---------- Root ----------
app.get('/', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    sutar: 'Layer 5 — Economy / Metering',
    port: PORT,
    endpoints: [
      'POST /api/usage/record',
      'GET  /api/usage',
      'GET  /api/usage/aggregate/:key',
      'POST /api/billing/generate',
      'GET  /api/billing',
      'GET  /api/billing/:id',
      'GET  /api/plans',
      'POST /api/plans',
      'GET  /api/quotas/:tenantId',
      'POST /api/quotas/:tenantId',
      'GET  /api/revenue/share/:providerId',
      'GET  /health'
    ]
  });
});

// ---------- Boot ----------
seed();
app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] listening on http://localhost:${PORT}`);
  console.log(`[${SERVICE_NAME}] seeded ${usageRecords.length} usage records, ${plans.size} plan(s), ${quotas.size} quota(s)`);
});