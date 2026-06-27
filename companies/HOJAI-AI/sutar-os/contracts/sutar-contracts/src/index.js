/**
 * SUTAR OS — Contracts OS (port 4185)
 *
 * SUTAR-specific contract templates that agents can negotiate + sign.
 * Distinct from /services/agent-contracts (4830) which is the ACN-level
 * contract engine; this service is the SUTAR-specific templates +
 * lifecycle (draft → negotiate → sign → fulfill → settle).
 *
 * Layer: 6 (Trust + Contracts + Negotiation)
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { setupSecurity, strictLimiter } = require('@rtmn/shared/security');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');
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

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4185;
const SERVICE_NAME = 'sutar-contracts';
setupSecurity(app, { serviceName: 'sutar-contracts' });
// Template kinds and their default fields.
// Covers the full Nexha Vision contract surface:
//   Purchase Contracts, Supply Agreements, Service Contracts, NDAs, SLAs.
// The original 4 (negotiation, sla, delivery, data_share) are preserved
// for backward compatibility.
const TEMPLATES = {
  negotiation: {
    name: 'Negotiation Contract',
    fields: ['parties', 'subject', 'terms', 'walkAwayPrice', 'expiresAt'],
    description: 'Two parties agree to negotiate terms under specified constraints.',
  },
  sla: {
    name: 'Service Level Agreement',
    fields: ['provider', 'consumer', 'metric', 'target', 'penalty', 'duration'],
    description: 'Provider commits to a measurable service level for a duration.',
  },
  delivery: {
    name: 'Delivery Contract',
    fields: ['from', 'to', 'item', 'quantity', 'deliveryBy', 'price'],
    description: 'Delivery of goods/services by a deadline for a price.',
  },
  data_share: {
    name: 'Data Sharing Agreement',
    fields: ['provider', 'consumer', 'dataset', 'purpose', 'retentionDays'],
    description: 'Provider shares data with consumer under a specific purpose and retention.',
  },
  // ---- Nexha Vision additions (2026-06-22) ----
  purchase_order: {
    name: 'Purchase Order',
    fields: ['buyer', 'seller', 'lineItems', 'subtotal', 'tax', 'total', 'currency', 'paymentTerms', 'deliveryBy', 'deliveryAddress'],
    description: 'Formal PO between a buyer and a seller for specific line items with payment terms and delivery deadline.',
    example: {
      buyer: 'restaurant-001', seller: 'supplier-042',
      lineItems: [{ sku: 'rice-basmati-1kg', quantity: 500, unitPrice: 80, uom: 'kg' }],
      subtotal: 40000, tax: 7200, total: 47200, currency: 'INR',
      paymentTerms: 'Net 30', deliveryBy: '2026-07-15',
      deliveryAddress: '42 MG Road, Bengaluru',
    },
  },
  supply_agreement: {
    name: 'Supply Agreement',
    fields: ['buyer', 'seller', 'product', 'volumeTiers', 'duration', 'exclusivity', 'pricePerUnit', 'currency', 'renewalTerms'],
    description: 'Long-term supply arrangement with volume tiers, optional exclusivity, and renewal terms.',
    example: {
      buyer: 'restaurant-001', seller: 'supplier-042',
      product: 'rice-basmati-1kg',
      volumeTiers: [
        { minQty: 100, maxQty: 499, pricePerUnit: 85 },
        { minQty: 500, maxQty: 9999, pricePerUnit: 80 },
      ],
      duration: 'P1Y', exclusivity: 'non-exclusive',
      pricePerUnit: 80, currency: 'INR',
      renewalTerms: 'auto-renew with 30-day notice',
    },
  },
  service_contract: {
    name: 'Service Contract',
    fields: ['provider', 'consumer', 'service', 'scope', 'fee', 'duration', 'deliverables', 'acceptanceCriteria'],
    description: 'Provider delivers a service to consumer against scope, fee, and acceptance criteria.',
    example: {
      provider: 'consultant-007', consumer: 'restaurant-001',
      service: 'menu-engineering',
      scope: 'Analyze menu margins and recommend re-pricing for top 20 items',
      fee: 50000, currency: 'INR',
      duration: 'P30D',
      deliverables: ['menu margin report', 're-pricing recommendations'],
      acceptanceCriteria: 'report delivered within 30 days, recommendations actionable',
    },
  },
  nda: {
    name: 'Non-Disclosure Agreement',
    fields: ['parties', 'purpose', 'confidentialInformation', 'duration', 'jurisdiction', 'permittedDisclosures'],
    description: 'Mutual or one-way confidentiality agreement with defined scope and duration.',
    example: {
      parties: ['restaurant-001', 'consultant-007'],
      purpose: 'menu-engineering engagement',
      confidentialInformation: 'menu items, pricing, supplier list, customer data',
      duration: 'P2Y', jurisdiction: 'India',
      permittedDisclosures: ['legal advisors', 'auditors under NDA'],
    },
  },
};

const LIFECYCLE = ['draft', 'negotiating', 'signed', 'fulfilled', 'settled', 'cancelled', 'breached'];

const contracts = new PersistentMap('contracts', { serviceName: 'sutar-contracts' });
const audit = [];

function seed() {
  const seeds = [
    { kind: 'sla', parties: ['merchant-001', 'platform'], terms: { metric: 'response_time_ms', target: 200, penalty: 'refund' }, status: 'signed' },
    { kind: 'delivery', parties: ['supplier-001', 'merchant-001'], terms: { item: 'coffee_beans', quantity: 100, deliveryBy: '2026-07-01', price: 1200 }, status: 'negotiating' },
  ];
  for (const s of seeds) {
    const id = uuid();
    contracts.set(id, {
      id, ...s,
      createdAt: new Date().toISOString(),
      signedAt: s.status === 'signed' ? new Date().toISOString() : null,
      audit: [],
    });
  }
}
seed();

app.get('/health', (_req, res) => {
  const byStatus = {};
  for (const c of contracts.values()) byStatus[c.status] = (byStatus[c.status] || 0) + 1;
  res.json({
    status: 'ok', service: SERVICE_NAME, sutarLayer: 6, port: PORT,
    counts: { contracts: contracts.size, audit: audit.length, byStatus },
    capabilities: ['templates-list', 'contracts-create', 'contracts-create-from-deal', 'contracts-list', 'contracts-get', 'contracts-sign', 'contracts-fulfill', 'contracts-settle', 'contracts-cancel', 'audit-list'],
    timestamp: new Date().toISOString(),
  });
});

// ---------- Templates ----------

app.get('/api/templates', (_req, res) => {
  res.json({ count: Object.keys(TEMPLATES).length, templates: TEMPLATES });
});

app.get('/api/templates/:kind', (req, res) => {
  const t = TEMPLATES[req.params.kind];
  if (!t) return res.status(404).json({ error: `unknown template; allowed: ${Object.keys(TEMPLATES).join(',')}` });
  res.json(t);
});

// Return the example payload for a template (useful for procurement-os
// and other services that want to generate-from-deal).
app.get('/api/templates/:kind/example', (req, res) => {
  const t = TEMPLATES[req.params.kind];
  if (!t) return res.status(404).json({ error: `unknown template; allowed: ${Object.keys(TEMPLATES).join(',')}` });
  if (!t.example) return res.status(404).json({ error: `no example for ${req.params.kind}` });
  res.json(t.example);
});

// ---------- Contracts ----------

app.post('/api/contracts',requireAuth,  (req, res) => {
  const { kind, parties = [], terms = {}, expiresAt } = req.body || {};
  if (!TEMPLATES[kind]) return res.status(400).json({ error: `kind must be one of: ${Object.keys(TEMPLATES).join(',')}` });
  if (!Array.isArray(parties) || parties.length < 2) return res.status(400).json({ error: 'at least 2 parties required' });
  const id = uuid();
  const c = {
    id, kind, parties, terms, expiresAt, status: 'draft',
    createdAt: new Date().toISOString(),
    audit: [{ kind: 'create', at: new Date().toISOString(), actor: parties[0] }],
  };
  contracts.set(id, c);
  audit.push({ kind: 'create', contractId: id, at: Date.now() });
  res.status(201).json(c);
});

// Convenience for procurement-os and other deal-aware services.
// Accepts a "deal" object (winner supplier, items, totals, etc.) and
// creates a purchase_order draft in one call. Returns the contract.
//   POST /api/contracts/from-deal
//   {
//     "deal": {
//       "dealId": "...",
//       "buyerId": "restaurant-001",
//       "sellerId": "supplier-042",
//       "items": [{"sku":"rice","quantity":500,"unitPrice":80}],
//       "subtotal": 40000, "tax": 7200, "currency": "INR",
//       "paymentTerms": "Net 30",
//       "deliveryBy": "2026-07-15",
//       "deliveryAddress": "42 MG Road, Bengaluru"
//     },
//     "autoSign": false   // if true, immediately transition draft → signed
//   }
app.post('/api/contracts/from-deal', requireAuth, (req, res) => {
  const { deal, autoSign = false } = req.body || {};
  if (!deal || !deal.buyerId || !deal.sellerId) {
    return res.status(400).json({ error: 'deal.buyerId and deal.sellerId required' });
  }
  if (!Array.isArray(deal.items) || deal.items.length === 0) {
    return res.status(400).json({ error: 'deal.items must be a non-empty array' });
  }

  const subtotal = Number(deal.subtotal) || deal.items.reduce((s, it) => s + (Number(it.quantity) * Number(it.unitPrice || 0)), 0);
  const tax = Number(deal.tax) || Math.round(subtotal * 0.18);
  const total = Number(deal.total) || (subtotal + tax);

  const terms = {
    buyer: deal.buyerId,
    seller: deal.sellerId,
    lineItems: deal.items,
    subtotal, tax, total,
    currency: deal.currency || 'INR',
    paymentTerms: deal.paymentTerms || 'Net 30',
    deliveryBy: deal.deliveryBy || null,
    deliveryAddress: deal.deliveryAddress || null,
    sourceDealId: deal.dealId || null,
  };

  const id = uuid();
  const now = new Date().toISOString();
  const c = {
    id,
    kind: 'purchase_order',
    parties: [deal.buyerId, deal.sellerId],
    terms,
    expiresAt: deal.expiresAt || null,
    status: autoSign ? 'signed' : 'draft',
    createdAt: now,
    signedAt: autoSign ? now : null,
    audit: [
      { kind: 'create', at: now, actor: 'system', source: 'procurement-os:from-deal' },
      ...(autoSign ? [{ kind: 'sign', at: now, actor: deal.buyerId, source: 'auto-sign' }] : []),
    ],
  };
  contracts.set(id, c);
  audit.push({ kind: 'create', contractId: id, at: Date.now(), source: 'from-deal' });
  if (autoSign) audit.push({ kind: 'sign', contractId: id, at: Date.now(), source: 'auto-sign' });

  res.status(201).json(c);
});

app.get('/api/contracts', (req, res) => {
  let list = Array.from(contracts.values());
  if (req.query.status) list = list.filter(c => c.status === req.query.status);
  if (req.query.party) list = list.filter(c => c.parties.includes(req.query.party));
  res.json({ count: list.length, contracts: list });
});

app.get('/api/contracts/:id', (req, res) => {
  const c = contracts.get(req.params.id);
  if (!c) return res.status(404).json({ error: 'unknown contract' });
  res.json(c);
});

function transition(id, toStatus, actor) {
  const c = contracts.get(id);
  if (!c) return null;
  if (!LIFECYCLE.includes(toStatus)) return { error: 'invalid status' };
  const validFrom = {
    draft: ['negotiating', 'cancelled', 'signed'],
    negotiating: ['signed', 'cancelled'],
    signed: ['fulfilled', 'breached', 'cancelled'],
    fulfilled: ['settled', 'breached'],
    settled: [],
    cancelled: [],
    breached: ['settled'],
  };
  if (!validFrom[c.status].includes(toStatus)) return { error: `cannot transition ${c.status} → ${toStatus}` };
  c.status = toStatus;
  c.audit.push({ kind: toStatus, at: new Date().toISOString(), actor });
  if (toStatus === 'signed') c.signedAt = new Date().toISOString();
  if (toStatus === 'fulfilled') c.fulfilledAt = new Date().toISOString();
  if (toStatus === 'settled') c.settledAt = new Date().toISOString();
  audit.push({ kind: toStatus, contractId: id, at: Date.now() });
  return c;
}

app.post('/api/contracts/:id/sign',requireAuth,  (req, res) => {
  const { party } = req.body || {};
  const r = transition(req.params.id, 'signed', party);
  if (!r) return res.status(404).json({ error: 'unknown contract' });
  if (r.error) return res.status(400).json(r);
  res.json(r);
});

app.post('/api/contracts/:id/fulfill',requireAuth,  (req, res) => {
  const { party } = req.body || {};
  const r = transition(req.params.id, 'fulfilled', party);
  if (!r) return res.status(404).json({ error: 'unknown contract' });
  if (r.error) return res.status(400).json(r);
  res.json(r);
});

app.post('/api/contracts/:id/settle',requireAuth,  (req, res) => {
  const { party } = req.body || {};
  const r = transition(req.params.id, 'settled', party);
  if (!r) return res.status(404).json({ error: 'unknown contract' });
  if (r.error) return res.status(400).json(r);
  res.json(r);
});

app.post('/api/contracts/:id/cancel',requireAuth,  (req, res) => {
  const { party, reason } = req.body || {};
  const r = transition(req.params.id, 'cancelled', party);
  if (!r) return res.status(404).json({ error: 'unknown contract' });
  if (r.error) return res.status(400).json(r);
  if (reason) r.cancelReason = reason;
  res.json(r);
});

app.get('/api/audit', (_req, res) => {
  res.json({ count: audit.length, audit: audit.slice(-100) });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// REZ Intelligence endpoints
app.get('/rez-intel-status', async (req, res) => {
  const isHealthy = await rezIntel.checkRezIntelHealth();
  res.json({ rezIntelEnabled: rezIntel.REZ_INTEL_ENABLED, rezIntelUrl: rezIntel.REZ_INTEL_URL, rezIntelHealthy: isHealthy });
});

app.post('/api/enrich', requireInternal, async (req, res) => {
  const { agentRole, userId, companyId, query, context } = req.body || {};
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

const server = app.listen(PORT, () => {
  console.log(`${SERVICE_NAME} listening on :${PORT}`);
});
installGracefulShutdown(server);

module.exports = app;
module.exports.transition = transition;
module.exports.TEMPLATES = TEMPLATES;
module.exports.LIFECYCLE = LIFECYCLE;
