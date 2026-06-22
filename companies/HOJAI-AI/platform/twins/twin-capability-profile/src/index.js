/**
 * Twin Capability Profile (port 4150)
 *
 * Discovery layer for the HOJAI ecosystem. Every Twin advertises what it
 * CAN DO so AI agents can discover capabilities without hard-coding endpoints.
 *
 * Separates representation (TwinOS) from capability (this service) from
 * execution (SkillOS). The flow:
 *
 *   Agent asks "what can do X?"  →  this service  →  returns list of twins
 *       that advertise capability X  →  agent picks one  →  invokes skill
 *
 * Each Twin can declare:
 *   - capabilities (the verbs it can perform)
 *   - supportedSkills (the SkillOS skills it knows how to invoke)
 *   - supportedApis (REST endpoints it exposes)
 *   - supportedEvents (events it emits)
 *   - supportedWorkflows (flow-orchestrator plans it can run)
 *   - inputSchema / outputSchema (for each capability)
 *   - sla (latency, success rate)
 *   - authRequired
 *
 * Port: 4150
 * Pattern: in-memory + Express 5
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

const PORT = process.env.TWIN_CAPABILITY_PROFILE_PORT || 4150;
const SKILLOS_URL = process.env.SKILLOS_URL || 'http://localhost:4743';
const TWINOS_URL = process.env.TWINOS_URL || 'http://localhost:4705';
const POLICYOS_URL = process.env.POLICYOS_URL || 'http://localhost:4254';
const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '2mb' }));
app.use(morgan('tiny'));

// =============================================================================
// STORES
// =============================================================================

const profiles = new PersistentMap('profiles', { serviceName: 'twin-capability-profile' });      // twinId -> profile
const capabilityIndex = new PersistentMap('capability-index', { serviceName: 'twin-capability-profile' }); // capability -> [twinIds]  (reverse index for fast discovery)
const slaObservations = new PersistentMap('sla-observations', { serviceName: 'twin-capability-profile' }); // twinId -> [{latencyMs, success, errorCode, at}]
const audit = [];

// =============================================================================
// SEED
// =============================================================================

function seed() {
  const samples = [
    {
      twinId: 'twn-restaurant-demo',
      twinType: 'restaurant',
      owner: 'demo',
      capabilities: [
        { name: 'acceptOrder', description: 'Accept a new food order', inputSchema: { items: 'array', customerId: 'string' }, outputSchema: { orderId: 'string', status: 'string', total: 'number' }, sla: { latencyMs: 500, successRate: 0.98 }, authRequired: true },
        { name: 'reserveTable', description: 'Reserve a restaurant table', inputSchema: { date: 'string', partySize: 'number' }, outputSchema: { reservationId: 'string', tableId: 'string' }, sla: { latencyMs: 300, successRate: 0.99 }, authRequired: false },
        { name: 'recommendDish', description: 'Recommend a dish', inputSchema: { preferences: 'object' }, outputSchema: { dishId: 'string', confidence: 'number' }, sla: { latencyMs: 800, successRate: 0.92 }, authRequired: false },
      ],
      supportedSkills: ['skl-restaurant-order', 'skl-restaurant-reserve'],
      supportedApis: ['POST /api/orders', 'GET /api/reservations'],
      supportedEvents: ['order.placed', 'order.fulfilled', 'reservation.confirmed'],
      supportedWorkflows: ['order-to-kitchen'],
    },
    {
      twinId: 'twn-hotel-demo',
      twinType: 'hotel',
      owner: 'demo',
      capabilities: [
        { name: 'checkAvailability', description: 'Check room availability for date range', inputSchema: { checkIn: 'string', checkOut: 'string', guests: 'number' }, outputSchema: { available: 'boolean', rooms: 'array' }, sla: { latencyMs: 400, successRate: 0.99 }, authRequired: false },
        { name: 'holdRoom', description: 'Hold a room for X minutes before booking', inputSchema: { roomId: 'string', holdMinutes: 'number' }, outputSchema: { holdId: 'string', expiresAt: 'string' }, sla: { latencyMs: 300, successRate: 0.98 }, authRequired: true },
        { name: 'confirmBooking', description: 'Convert a held room into a confirmed booking', inputSchema: { holdId: 'string', guestInfo: 'object' }, outputSchema: { bookingId: 'string', total: 'number' }, sla: { latencyMs: 600, successRate: 0.97 }, authRequired: true },
        { name: 'requestHousekeeping', description: 'Request housekeeping for a room', inputSchema: { roomId: 'string', priority: 'string' }, outputSchema: { taskId: 'string', eta: 'string' }, sla: { latencyMs: 200, successRate: 0.99 }, authRequired: true },
      ],
      supportedSkills: ['skl-hotel-booking', 'skl-hotel-check-availability'],
      supportedApis: ['POST /api/bookings', 'POST /api/housekeeping'],
      supportedEvents: ['booking.confirmed', 'booking.checked-in', 'housekeeping.requested'],
      supportedWorkflows: ['guest-checkin'],
    },
    {
      twinId: 'twn-product-demo',
      twinType: 'product',
      owner: 'demo',
      capabilities: [
        { name: 'checkPrice', description: 'Get current price for a product', inputSchema: { productId: 'string' }, outputSchema: { price: 'number', currency: 'string' }, sla: { latencyMs: 200, successRate: 0.99 }, authRequired: false },
        { name: 'getWarranty', description: 'Get warranty info for a product', inputSchema: { productId: 'string' }, outputSchema: { warranty: 'object' }, sla: { latencyMs: 300, successRate: 0.99 }, authRequired: false },
        { name: 'recommendAccessories', description: 'Recommend accessories for this product', inputSchema: { productId: 'string' }, outputSchema: { accessories: 'array' }, sla: { latencyMs: 800, successRate: 0.90 }, authRequired: false },
      ],
      supportedSkills: ['skl-product-lookup'],
      supportedApis: ['GET /api/products/:id'],
      supportedEvents: ['price.changed', 'inventory.updated'],
      supportedWorkflows: [],
    },
    {
      twinId: 'twn-merchant-demo',
      twinType: 'merchant',
      owner: 'demo',
      capabilities: [
        { name: 'acceptQuote', description: 'Accept a price quote from an agent', inputSchema: { quoteId: 'string' }, outputSchema: { orderId: 'string', status: 'string' }, sla: { latencyMs: 400, successRate: 0.98 }, authRequired: true },
        { name: 'reserveInventory', description: 'Reserve inventory for a future sale', inputSchema: { sku: 'string', quantity: 'number' }, outputSchema: { reservationId: 'string' }, sla: { latencyMs: 300, successRate: 0.97 }, authRequired: true },
        { name: 'issueInvoice', description: 'Issue an invoice for a purchase', inputSchema: { orderId: 'string' }, outputSchema: { invoiceId: 'string', total: 'number' }, sla: { latencyMs: 500, successRate: 0.99 }, authRequired: true },
        { name: 'trackOrder', description: 'Track an order status', inputSchema: { orderId: 'string' }, outputSchema: { status: 'string', eta: 'string' }, sla: { latencyMs: 200, successRate: 0.99 }, authRequired: false },
        { name: 'negotiate', description: 'Negotiate price with an AI agent', inputSchema: { productId: 'string', initialOffer: 'number' }, outputSchema: { finalPrice: 'number', rounds: 'number' }, sla: { latencyMs: 1000, successRate: 0.85 }, authRequired: true },
      ],
      supportedSkills: ['skl-negotiate', 'skl-invoice'],
      supportedApis: ['POST /api/orders', 'POST /api/invoices'],
      supportedEvents: ['quote.received', 'invoice.issued', 'order.shipped'],
      supportedWorkflows: ['order-to-fulfillment'],
    },
    {
      twinId: 'twn-beauty-demo',
      twinType: 'beauty',
      owner: 'demo',
      capabilities: [
        { name: 'checkStylistAvailability', description: 'Check available slots for a stylist', inputSchema: { stylistId: 'string', date: 'string' }, outputSchema: { slots: 'array' }, sla: { latencyMs: 300, successRate: 0.99 }, authRequired: false },
        { name: 'bookAppointment', description: 'Book a salon appointment', inputSchema: { stylistId: 'string', serviceId: 'string', slot: 'string', clientId: 'string' }, outputSchema: { appointmentId: 'string' }, sla: { latencyMs: 400, successRate: 0.97 }, authRequired: true },
        { name: 'recommendService', description: 'Recommend a service based on preferences', inputSchema: { clientId: 'string', preferences: 'object' }, outputSchema: { serviceId: 'string', confidence: 'number' }, sla: { latencyMs: 800, successRate: 0.88 }, authRequired: false },
      ],
      supportedSkills: ['skl-beauty-booking'],
      supportedApis: ['POST /api/appointments'],
      supportedEvents: ['appointment.booked', 'appointment.completed'],
      supportedWorkflows: ['appointment-reminder-24h'],
    },
  ];
  for (const s of samples) {
    const id = uuidv4();
    profiles.set(s.twinId, {
      id,
      ...s,
      supportedPolicies: Array.isArray(s.supportedPolicies) ? s.supportedPolicies : [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      capabilitiesDeclared: s.capabilities.length,
      capabilitiesByName: s.capabilities.map(c => c.name),
    });
    for (const cap of s.capabilities) {
      if (!capabilityIndex.has(cap.name)) capabilityIndex.set(cap.name, new Set());
      capabilityIndex.get(cap.name).add(s.twinId);
    }
  }
}
seed();

// =============================================================================
// HELPERS
// =============================================================================

function auditLog(entry) {
  audit.push({ id: uuidv4(), at: new Date().toISOString(), ...entry });
  if (audit.length > 5000) audit.splice(0, audit.length - 5000);
}

function reindex(twinId, capabilities) {
  // remove old entries
  for (const [cap, set] of capabilityIndex.entries()) {
    set.delete(twinId);
    if (set.size === 0) capabilityIndex.delete(cap);
  }
  // add new
  for (const c of capabilities || []) {
    if (!capabilityIndex.has(c.name)) capabilityIndex.set(c.name, new Set());
    capabilityIndex.get(c.name).add(twinId);
  }
}

// =============================================================================
// EXTERNAL VALIDATION HELPERS (SkillOS / TwinOS / PolicyOS)
// =============================================================================

async function httpGetJson(url, timeoutMs = 1500) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    return { ok: r.ok, status: r.status, body: r.ok ? await r.json() : null };
  } catch (e) {
    return { ok: false, status: 0, body: null, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

async function validateSkillsAgainstSkillOS(skillIds) {
  if (!Array.isArray(skillIds) || skillIds.length === 0) return { ok: true, missing: [] };
  const checks = await Promise.all(skillIds.map((id) =>
    httpGetJson(`${SKILLOS_URL}/api/skills/${encodeURIComponent(id)}`)
  ));
  const missing = [];
  checks.forEach((r, i) => {
    if (!r.ok || r.status === 404) missing.push(skillIds[i]);
  });
  return { ok: missing.length === 0, missing };
}

async function validateTwinAgainstTwinOS(twinId) {
  const r = await httpGetJson(`${TWINOS_URL}/api/twins/${encodeURIComponent(twinId)}`);
  return { ok: r.ok && r.status === 200, exists: r.ok && r.status === 200 };
}

// =============================================================================
// SLA OBSERVATION HELPERS
// =============================================================================

function recordSlaObservation(twinId, observation) {
  if (!slaObservations.has(twinId)) slaObservations.set(twinId, []);
  const list = slaObservations.get(twinId);
  list.push(observation);
  // keep rolling window of last 100
  if (list.length > 100) list.splice(0, list.length - 100);
}

function computeObservedSla(twinId) {
  const list = slaObservations.get(twinId) || [];
  if (list.length === 0) {
    return { sampleCount: 0, avgLatencyMs: null, successRate: null, windowSize: 100 };
  }
  const totalLatency = list.reduce((sum, o) => sum + (Number(o.latencyMs) || 0), 0);
  const successes = list.filter((o) => o.success === true).length;
  return {
    sampleCount: list.length,
    avgLatencyMs: Math.round(totalLatency / list.length),
    successRate: Number((successes / list.length).toFixed(4)),
    windowSize: 100,
  };
}

function computeSlaDrift(declared, observed) {
  if (!declared || observed.sampleCount === 0) {
    return { drift: false, latencyDeltaMs: null, successRateDelta: null, message: 'insufficient data' };
  }
  const latencyDeltaMs = observed.avgLatencyMs - (declared.latencyMs || 0);
  const successRateDelta = Number(((observed.successRate || 0) - (declared.successRate || 0)).toFixed(4));
  // drift if latency is >25% worse than declared OR success rate drops >5%
  const latencyDrift = latencyDeltaMs > (declared.latencyMs || 0) * 0.25;
  const successDrift = successRateDelta < -0.05;
  return {
    drift: latencyDrift || successDrift,
    latencyDeltaMs,
    successRateDelta,
    message: latencyDrift && successDrift
      ? 'both latency and success rate degraded'
      : latencyDrift
        ? 'latency exceeded declared SLA by >25%'
        : successDrift
          ? 'success rate dropped >5% below declared'
          : 'within declared SLA',
  };
}

// =============================================================================
// ROUTES
// =============================================================================

app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'twin-capability-profile',
    version: '1.0.0',
    port: PORT,
    counts: {
      profiles: profiles.size,
      capabilities: capabilityIndex.size,
    },
    byTwinType: Array.from(profiles.values()).reduce((acc, p) => {
      acc[p.twinType] = (acc[p.twinType] || 0) + 1;
      return acc;
    }, {}),
    capabilities: [
      'profiles-list', 'profiles-get', 'profiles-create', 'profiles-update', 'profiles-delete',
      'discover-by-capability', 'discover-by-twin-type', 'search',
      'capability-graph', 'audit',
    ],
  });
});
app.get('/', (_req, res) => res.redirect('/health'));

// ── Profiles CRUD ──────────────────────────────────────────────────────────

app.get('/api/profiles', (req, res) => {
  const { twinType, owner, minCapabilities } = req.query;
  let list = Array.from(profiles.values());
  if (twinType) list = list.filter((p) => p.twinType === twinType);
  if (owner) list = list.filter((p) => p.owner === owner);
  if (minCapabilities) list = list.filter((p) => p.capabilitiesDeclared >= parseInt(minCapabilities));
  res.json({ count: list.length, profiles: list });
});

app.post('/api/profiles',requireAuth,  async (req, res) => {
  const { twinId, twinType, owner, capabilities, supportedSkills, supportedApis, supportedEvents, supportedWorkflows, supportedPolicies } = req.body || {};
  if (!twinId || !twinType || !capabilities || !Array.isArray(capabilities)) {
    return res.status(400).json({ error: 'twinId, twinType, capabilities[] required' });
  }
  if (profiles.has(twinId)) return res.status(409).json({ error: 'profile already exists for this twinId' });

  // TwinOS validation: ensure twin exists
  const twinCheck = await validateTwinAgainstTwinOS(twinId);
  if (!twinCheck.ok) {
    return res.status(400).json({
      error: 'twin does not exist in TwinOS',
      twinId,
      twinOS: TWINOS_URL,
    });
  }

  // SkillOS validation: every declared skill must exist
  const skillCheck = await validateSkillsAgainstSkillOS(supportedSkills);
  if (!skillCheck.ok) {
    return res.status(400).json({
      error: 'one or more supportedSkills do not exist in SkillOS',
      missingSkillIds: skillCheck.missing,
      skillOS: SKILLOS_URL,
    });
  }

  const profile = {
    id: uuidv4(),
    twinId, twinType,
    owner: owner || 'anonymous',
    capabilities,
    supportedSkills: Array.isArray(supportedSkills) ? supportedSkills : [],
    supportedApis: Array.isArray(supportedApis) ? supportedApis : [],
    supportedEvents: Array.isArray(supportedEvents) ? supportedEvents : [],
    supportedWorkflows: Array.isArray(supportedWorkflows) ? supportedWorkflows : [],
    supportedPolicies: Array.isArray(supportedPolicies) ? supportedPolicies : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    capabilitiesDeclared: capabilities.length,
    capabilitiesByName: capabilities.map(c => c.name),
  };
  profiles.set(twinId, profile);
  reindex(twinId, capabilities);
  auditLog({ kind: 'profile-create', twinId, twinType, capabilityCount: capabilities.length });
  res.status(201).json(profile);
});

app.get('/api/profiles/:twinId', (req, res) => {
  const p = profiles.get(req.params.twinId);
  if (!p) return res.status(404).json({ error: 'profile not found' });
  res.json(p);
});

app.patch('/api/profiles/:twinId',requireAuth,  async (req, res) => {
  const p = profiles.get(req.params.twinId);
  if (!p) return res.status(404).json({ error: 'profile not found' });
  const allowed = ['capabilities', 'supportedSkills', 'supportedApis', 'supportedEvents', 'supportedWorkflows', 'supportedPolicies', 'owner'];
  const validate = req.query.validate === 'true' || req.query.validate === '1';

  // Optional validation (only if forced or supplied via query)
  if (validate) {
    if (req.body.supportedSkills) {
      const skillCheck = await validateSkillsAgainstSkillOS(req.body.supportedSkills);
      if (!skillCheck.ok) {
        return res.status(400).json({
          error: 'one or more supportedSkills do not exist in SkillOS',
          missingSkillIds: skillCheck.missing,
          skillOS: SKILLOS_URL,
        });
      }
    }
    if (req.body.twinId && req.body.twinId !== p.twinId) {
      const twinCheck = await validateTwinAgainstTwinOS(req.body.twinId);
      if (!twinCheck.ok) {
        return res.status(400).json({
          error: 'twin does not exist in TwinOS',
          twinId: req.body.twinId,
          twinOS: TWINOS_URL,
        });
      }
    }
  }

  for (const k of allowed) {
    if (k in (req.body || {})) p[k] = req.body[k];
  }
  if (req.body.capabilities) {
    reindex(req.params.twinId, req.body.capabilities);
    p.capabilitiesDeclared = req.body.capabilities.length;
    p.capabilitiesByName = req.body.capabilities.map(c => c.name);
  }
  if (!Array.isArray(p.supportedPolicies)) p.supportedPolicies = [];
  p.updatedAt = new Date().toISOString();
  auditLog({ kind: 'profile-update', twinId: req.params.twinId, validated: validate });
  res.json(p);
});

app.delete('/api/profiles/:twinId',requireAuth,  (req, res) => {
  const p = profiles.get(req.params.twinId);
  if (!p) return res.status(404).json({ error: 'profile not found' });
  reindex(req.params.twinId, []);
  profiles.delete(req.params.twinId);
  auditLog({ kind: 'profile-delete', twinId: req.params.twinId });
  res.status(204).end();
});

// ── Discovery: by capability name ─────────────────────────────��────────────

app.get('/api/discover/by-capability/:capability', (req, res) => {
  const set = capabilityIndex.get(req.params.capability);
  if (!set || set.size === 0) return res.json({ capability: req.params.capability, twins: [], count: 0 });
  const twins = Array.from(set).map((tid) => {
    const p = profiles.get(tid);
    if (!p) return null;
    const cap = p.capabilities.find(c => c.name === req.params.capability);
    return {
      twinId: p.twinId,
      twinType: p.twinType,
      owner: p.owner,
      capability: cap, // full capability detail
      sla: cap?.sla,
      authRequired: cap?.authRequired,
      supportedSkills: p.supportedSkills,
    };
  }).filter(Boolean);
  // sort by success rate desc, then latency asc
  twins.sort((a, b) => {
    if (b.sla?.successRate !== a.sla?.successRate) return (b.sla?.successRate || 0) - (a.sla?.successRate || 0);
    return (a.sla?.latencyMs || 99999) - (b.sla?.latencyMs || 99999);
  });
  res.json({ capability: req.params.capability, twins, count: twins.length });
});

app.get('/api/discover/by-twin-type/:twinType', (req, res) => {
  const list = Array.from(profiles.values()).filter(p => p.twinType === req.params.twinType);
  res.json({ twinType: req.params.twinType, twins: list, count: list.length });
});

// ── Search across all profiles ─────────────────────────────────────────────

app.get('/api/search', (req, res) => {
  const { q, capability, twinType, maxLatency, minSuccessRate } = req.query;
  let list = Array.from(profiles.values());
  if (twinType) list = list.filter(p => p.twinType === twinType);
  if (capability) list = list.filter(p => p.capabilitiesByName.includes(capability));
  if (maxLatency) list = list.filter(p => p.capabilities.some(c => (c.sla?.latencyMs || 99999) <= parseInt(maxLatency)));
  if (minSuccessRate) list = list.filter(p => p.capabilities.some(c => (c.sla?.successRate || 0) >= parseFloat(minSuccessRate)));
  if (q) {
    const needle = String(q).toLowerCase();
    list = list.filter(p =>
      p.twinId.toLowerCase().includes(needle) ||
      p.twinType.toLowerCase().includes(needle) ||
      p.capabilitiesByName.some(c => c.toLowerCase().includes(needle))
    );
  }
  res.json({ count: list.length, profiles: list });
});

// ── Capability graph (which capabilities exist, which twins provide each) ──

app.get('/api/capability-graph', (_req, res) => {
  const nodes = Array.from(capabilityIndex.keys()).map(name => ({
    capability: name,
    providedBy: capabilityIndex.get(name).size,
  }));
  res.json({
    totalCapabilities: capabilityIndex.size,
    totalProfiles: profiles.size,
    capabilities: nodes.sort((a, b) => b.providedBy - a.providedBy),
  });
});

// ── Audit ──────────────────────────────────────────────────────────────────

app.get('/api/audit', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 200, 1000);
  res.json({ entries: audit.slice(-limit) });
});

// =============================================================================
// POLICY-CHECK BRIDGE
// =============================================================================
// This service discovers capabilities and their SLAs. Before a consumer
// invokes a capability on a twin, they may want to check whether the
// invocation is allowed by policy. This endpoint is a thin proxy to
// PolicyOS that:
//   - accepts a capability name + actor + context
//   - looks up any policies matching that capability (by id or category)
//   - returns the first deny/allow decision
//
// Why a proxy and not a direct evaluate? Because PolicyOS doesn't know
// about twin capabilities. The bridge translates "can I invoke X on
// this twin?" into a policy context that PolicyOS can evaluate.
//
// Defaults to fail-CLOSED on PolicyOS error (same as flow-orchestrator).

app.post('/api/policy-check', requireAuth, async (req, res) => {
  const { policyId, capability, actor, twinId, context = {} } = req.body || {};
  if (!capability && !policyId) {
    return res.status(400).json({ error: 'capability or policyId is required' });
  }

  // Build the policy evaluation context. The capability name maps to
  // a synthetic policyId if no explicit policyId is given. This means
  // policies can target individual capabilities (e.g., "cap:acceptOrder")
  // without callers needing to know the policy id.
  const effectivePolicyId = policyId || `cap:${capability}`;
  const evalContext = {
    ...context,
    capability,
    actor,
    twinId,
  };

  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 1500);
    const r = await fetch(`${POLICYOS_URL}/api/policies/evaluate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ policyId: effectivePolicyId, context: evalContext }),
      signal: controller.signal,
    });
    clearTimeout(t);
    const text = await r.text();
    let body;
    try { body = JSON.parse(text); } catch { body = { raw: text }; }
    if (!r.ok || typeof body.allowed !== 'boolean') {
      // Fail-CLOSED on PolicyOS error (default behavior, see
      // flow-orchestrator/src/index.js policy.check for the rationale).
      return res.status(503).json({
        allowed: false,
        error: 'PolicyOS unreachable',
        policyId: effectivePolicyId,
      });
    }
    res.json({
      allowed: body.allowed,
      policyId: effectivePolicyId,
      reasons: body.reasons || [],
      source: 'policyos',
    });
  } catch (err) {
    // Fail-CLOSED on any error (network, timeout, parse, etc.)
    res.status(503).json({
      allowed: false,
      error: err.name === 'AbortError' ? 'PolicyOS timeout' : err.message,
      policyId: effectivePolicyId,
    });
  }
});

// =============================================================================
// 404 + error handling
// =============================================================================

app.use((_req, res) => res.status(404).json({ error: 'not found' }));
app.use((err, _req, res, _next) => {
  console.error('[twin-capability-profile]', err);
  res.status(500).json({ error: err.message || 'internal error' });
});

// =============================================================================
// START
// =============================================================================
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, () => {
  console.log(`[twin-capability-profile] listening on :${PORT}`);
});
installGracefulShutdown(server);

export default app;