/**
 * TwinOS Hub v4.0 - Extended Features Module
 * ------------------------------------------
 * Adds the following on top of v3.0:
 *
 *   1. Twin Templates (CRUD + instantiate)
 *   2. Semantic & Relationship Search
 *   3. Versioning with snapshot + rollback
 *   4. Digital Shadow event publishing (event-bus, port 4510)
 *   5. Capability Profile link (twin-capability-profile, port 4150)
 *
 * This module exports a single `registerV4Features(app, ctx)` function that
 * wires all the new routes onto an existing Express app. The `ctx` object
 * exposes the same in-memory stores the v3.0 server uses, so the new code can
 * read/write twin state without duplicating it.
 */

import { v4 as uuidv4 } from 'uuid';

// =====================
// Configuration
// =====================
const EVENT_BUS_URL = process.env.EVENT_BUS_URL || 'http://localhost:4510';
const CAPABILITY_PROFILE_URL = process.env.CAPABILITY_PROFILE_URL || 'http://localhost:4150';
const EVENT_PUBLISH_TIMEOUT_MS = parseInt(process.env.EVENT_PUBLISH_TIMEOUT_MS || '1500', 10);

// =====================
// Built-in Twin Templates
// =====================

const BUILTIN_TEMPLATES = {
  Person: {
    name: 'Person',
    entityType: 'person',
    description: 'A human being - employee, customer, guest, etc.',
    defaultProfile: {
      basicInfo: { name: '', email: '', phone: '', dateOfBirth: null },
      attributes: { gender: '', nationality: '', language: 'en' },
      configuration: { notifications: true, privacy: 'standard' },
      properties: { preferences: {}, skills: [], interests: [] },
      dynamicFields: {},
      tags: ['person'],
      labels: []
    },
    defaultRelationships: [],
    defaultLifecycle: 'active',
    defaultContext: 'unknown'
  },
  Merchant: {
    name: 'Merchant',
    entityType: 'merchant',
    description: 'A business / merchant entity (restaurant, shop, hotel, etc.)',
    defaultProfile: {
      basicInfo: { businessName: '', legalName: '', taxId: '', website: '' },
      attributes: { industry: '', size: 'small', yearFounded: null },
      configuration: { acceptsOnlineOrders: true, currency: 'USD' },
      properties: { hours: {}, locations: [], paymentMethods: [] },
      dynamicFields: {},
      tags: ['merchant', 'business'],
      labels: []
    },
    defaultRelationships: [],
    defaultLifecycle: 'active',
    defaultContext: 'unknown'
  },
  Product: {
    name: 'Product',
    entityType: 'product',
    description: 'A sellable product or service',
    defaultProfile: {
      basicInfo: { sku: '', name: '', description: '', brand: '' },
      attributes: { category: '', price: 0, currency: 'USD', stock: 0 },
      configuration: { taxable: true, shippable: true },
      properties: { images: [], variants: [], reviews: [] },
      dynamicFields: {},
      tags: ['product', 'catalog'],
      labels: []
    },
    defaultRelationships: [],
    defaultLifecycle: 'active',
    defaultContext: 'unknown'
  },
  Vehicle: {
    name: 'Vehicle',
    entityType: 'vehicle',
    description: 'A car, truck, or other transport vehicle',
    defaultProfile: {
      basicInfo: { vin: '', make: '', model: '', year: null, plate: '' },
      attributes: { color: '', fuelType: 'gasoline', mileage: 0, transmission: 'automatic' },
      configuration: { insured: true, registered: true },
      properties: { owner: null, serviceHistory: [], accidents: [] },
      dynamicFields: {},
      tags: ['vehicle', 'asset'],
      labels: []
    },
    defaultRelationships: [],
    defaultLifecycle: 'active',
    defaultContext: 'unknown'
  },
  Hotel: {
    name: 'Hotel',
    entityType: 'hotel',
    description: 'A hotel property (a Merchant that hosts guests)',
    defaultProfile: {
      basicInfo: { name: '', address: '', starRating: 3, totalRooms: 0 },
      attributes: { chain: '', checkInTime: '15:00', checkOutTime: '11:00' },
      configuration: { acceptsPets: false, hasPool: false, hasWifi: true },
      properties: { amenities: [], roomTypes: [], policies: {} },
      dynamicFields: {},
      tags: ['hotel', 'hospitality'],
      labels: []
    },
    defaultRelationships: [],
    defaultLifecycle: 'active',
    defaultContext: 'unknown'
  },
  Company: {
    name: 'Company',
    entityType: 'company',
    description: 'A corporate organization (parent of merchants, departments, etc.)',
    defaultProfile: {
      basicInfo: { legalName: '', tradeName: '', taxId: '', incorporationDate: null },
      attributes: { industry: '', size: 'small', headquarters: '' },
      configuration: { publicCompany: false, fiscalYearEnd: '12-31' },
      properties: { subsidiaries: [], board: [], departments: [] },
      dynamicFields: {},
      tags: ['company', 'corporate'],
      labels: []
    },
    defaultRelationships: [],
    defaultLifecycle: 'active',
    defaultContext: 'unknown'
  },
  Order: {
    name: 'Order',
    entityType: 'order',
    description: 'A customer order (food, retail, service, etc.)',
    defaultProfile: {
      basicInfo: { orderNumber: '', status: 'pending', placedAt: null },
      attributes: { total: 0, currency: 'USD', itemCount: 0, channel: 'online' },
      configuration: { giftOrder: false, expeditedShipping: false },
      properties: { items: [], shippingAddress: null, billingAddress: null },
      dynamicFields: {},
      tags: ['order', 'commerce'],
      labels: []
    },
    defaultRelationships: [],
    defaultLifecycle: 'active',
    defaultContext: 'unknown'
  }
};

// =====================
// Helper: Jaccard similarity on token sets
// =====================
function tokenize(s) {
  if (!s) return new Set();
  return new Set(
    String(s)
      .toLowerCase()
      .replace(/[^a-z0-9\s._-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );
}

function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

function twinTokenSet(twin, profile) {
  const tokens = new Set();
  if (twin.id) tokens.add(...tokenize(twin.id));
  if (twin.name) tokens.add(...tokenize(twin.name));
  if (twin.type) tokens.add(...tokenize(twin.type));
  if (twin.category) tokens.add(...tokenize(twin.category));
  if (twin.service) tokens.add(...tokenize(twin.service));
  if (Array.isArray(twin.tags)) {
    for (const t of twin.tags) tokens.add(...tokenize(t));
  }
  if (profile) {
    const bi = profile.basicInfo || {};
    if (bi.name) tokens.add(...tokenize(bi.name));
    if (bi.businessName) tokens.add(...tokenize(bi.businessName));
    if (bi.productName) tokens.add(...tokenize(bi.productName));
    if (Array.isArray(profile.tags)) {
      for (const t of profile.tags) tokens.add(...tokenize(t));
    }
    if (Array.isArray(profile.labels)) {
      for (const t of profile.labels) tokens.add(...tokenize(t));
    }
    const attrs = profile.attributes || {};
    for (const v of Object.values(attrs)) {
      if (typeof v === 'string') tokens.add(...tokenize(v));
    }
  }
  return tokens;
}

// =====================
// Helper: Fire-and-forget HTTP POST (for event-bus)
// =====================
async function fireAndForgetPublish(eventType, source, payload) {
  // Dynamic import so we don't slow down startup. Use global fetch (Node 18+).
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), EVENT_PUBLISH_TIMEOUT_MS);
    fetch(`${EVENT_BUS_URL}/api/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: eventType, source, payload }),
      signal: controller.signal
    })
      .then(() => clearTimeout(t))
      .catch(() => clearTimeout(t));
  } catch (e) {
    // Never throw from publish helper
  }
}

// =====================
// Helper: snapshot a twin's full record before mutation
// =====================
function snapshotTwin(ctx, twin, reason = 'update') {
  const store = ctx.twinVersions;
  if (!store.has(twin.id)) store.set(twin.id, []);
  const list = store.get(twin.id);
  // Find next version number (1-indexed, monotonic)
  const nextVersion = list.length === 0 ? 1 : Math.max(...list.map(v => v.version)) + 1;
  const snap = {
    version: nextVersion,
    at: new Date().toISOString(),
    reason,
    twin: JSON.parse(JSON.stringify(twin))
  };
  list.push(snap);
  // Cap history length to avoid unbounded growth
  if (list.length > 200) list.shift();
  store.set(twin.id, list);
  return nextVersion;
}

// =====================
// Helper: auto-bump version + append timeline-style version event
// =====================
function bumpVersion(ctx, twin) {
  twin.version = (twin.version || 1) + 1;
  twin.updatedAt = new Date().toISOString();
  return twin.version;
}

// =====================
// Main: register all v4 features
// =====================

export function registerV4Features(app, ctx) {
  // ctx = {
  //   twinRegistry, twinStates, twinRelationships, twinProfiles,
  //   twinContexts, twinLifecycles, twinVersions, appendTimeline, bumpUsage,
  //   asyncHandler, preventPrototypePollution, requireAuth, optionalAuth,
  //   defaultLimiter, strictLimiter, logger
  // }

  // In-memory template store (built-in + custom)
  const twinTemplates = new Map();
  for (const [name, tpl] of Object.entries(BUILTIN_TEMPLATES)) {
    twinTemplates.set(name, { ...tpl, builtin: true, createdAt: new Date().toISOString() });
  }

  // In-memory capability-profile link cache (twinId -> profileId)
  const capabilityLinks = new Map();

  // ========== 1. TWIN TEMPLATES ==========

  // GET /api/twin-templates - list all templates
  app.get('/api/twin-templates', ctx.optionalAuth, ctx.asyncHandler(async (req, res) => {
    const list = Array.from(twinTemplates.values()).map(t => ({
      name: t.name,
      entityType: t.entityType,
      description: t.description,
      defaultProfile: t.defaultProfile,
      defaultRelationships: t.defaultRelationships,
      defaultLifecycle: t.defaultLifecycle,
      defaultContext: t.defaultContext,
      builtin: t.builtin,
      createdAt: t.createdAt
    }));
    res.json({ success: true, count: list.length, templates: list });
  }));

  // POST /api/twin-templates - register custom template
  app.post('/api/twin-templates', ctx.requireAuth, ctx.strictLimiter, ctx.asyncHandler(async (req, res) => {
    const body = ctx.preventPrototypePollution(req.body);
    const { name, entityType, description, defaultProfile, defaultRelationships, defaultLifecycle, defaultContext } = body;
    if (!name || !entityType) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name and entityType are required' }
      });
    }
    if (twinTemplates.has(name)) {
      return res.status(409).json({
        success: false,
        error: { code: 'TEMPLATE_EXISTS', message: `Template '${name}' already exists` }
      });
    }
    const tpl = {
      name,
      entityType,
      description: description || '',
      defaultProfile: defaultProfile || {
        basicInfo: {},
        attributes: {},
        configuration: {},
        properties: {},
        dynamicFields: {},
        tags: [name.toLowerCase()],
        labels: []
      },
      defaultRelationships: Array.isArray(defaultRelationships) ? defaultRelationships : [],
      defaultLifecycle: defaultLifecycle || 'active',
      defaultContext: defaultContext || 'unknown',
      builtin: false,
      createdAt: new Date().toISOString()
    };
    twinTemplates.set(name, tpl);
    res.status(201).json({ success: true, template: tpl });
  }));

  // GET /api/twin-templates/:name - get template details
  app.get('/api/twin-templates/:name', ctx.optionalAuth, ctx.asyncHandler(async (req, res) => {
    const tpl = twinTemplates.get(req.params.name);
    if (!tpl) {
      return res.status(404).json({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: `Template '${req.params.name}' not found` }
      });
    }
    res.json({ success: true, template: tpl });
  }));

  // POST /api/twin-templates/:name/instantiate - create a twin from template
  app.post('/api/twin-templates/:name/instantiate', ctx.requireAuth, ctx.strictLimiter, ctx.asyncHandler(async (req, res) => {
    const tpl = twinTemplates.get(req.params.name);
    if (!tpl) {
      return res.status(404).json({
        success: false,
        error: { code: 'TEMPLATE_NOT_FOUND', message: `Template '${req.params.name}' not found` }
      });
    }
    const body = ctx.preventPrototypePollution(req.body || {});
    const { ownerId, name, id, type, category, port, service, businessId, tags, attributes, properties, metadata } = body;
    if (!ownerId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'ownerId is required' }
      });
    }

    // Generate twin id if not provided
    const twinId = id || `${tpl.entityType}-${uuidv4().slice(0, 8)}`;

    if (ctx.twinRegistry.has(twinId)) {
      return res.status(409).json({
        success: false,
        error: { code: 'TWIN_EXISTS', message: `Twin '${twinId}' already exists` }
      });
    }

    const now = new Date().toISOString();

    // Build profile from template defaults
    const baseProfile = JSON.parse(JSON.stringify(tpl.defaultProfile || {}));
    if (name) baseProfile.basicInfo = { ...(baseProfile.basicInfo || {}), name };
    if (attributes) baseProfile.attributes = { ...(baseProfile.attributes || {}), ...attributes };
    if (properties) baseProfile.properties = { ...(baseProfile.properties || {}), ...properties };
    if (tags) baseProfile.tags = [...new Set([...(baseProfile.tags || []), ...tags])];

    // Identity
    ctx.twinProfiles.set(twinId, {
      twinId,
      basicInfo: baseProfile.basicInfo,
      attributes: baseProfile.attributes,
      configuration: baseProfile.configuration,
      properties: baseProfile.properties,
      dynamicFields: baseProfile.dynamicFields,
      tags: baseProfile.tags,
      labels: baseProfile.labels
    });

    ctx.twinContexts.set(twinId, {
      current: tpl.defaultContext || 'unknown',
      since: now,
      history: []
    });

    ctx.twinLifecycles.set(twinId, {
      state: tpl.defaultLifecycle || 'active',
      since: now,
      history: [{ state: tpl.defaultLifecycle || 'active', at: now, by: ownerId, reason: 'instantiated from template' }]
    });

    // Build top-level twin
    const twin = {
      id: twinId,
      name: name || twinId,
      service: service || null,
      type: type || tpl.entityType,
      category: category || 'custom',
      port: port || 0,
      status: tpl.defaultLifecycle || 'active',
      health: 'healthy',
      version: 1,
      syncCount: 0,
      metadata: metadata || {},
      relationships: [...(tpl.defaultRelationships || [])],
      tags: baseProfile.tags || [],
      owner: ownerId,
      businessId: businessId || null,
      entityId: twinId,
      corpidLink: null,
      entityType: tpl.entityType,
      namespace: 'rtmn.global',
      ownership: ownerId,
      tenant: businessId || 'public',
      createdAt: now,
      updatedAt: now,
      fromTemplate: req.params.name
    };

    ctx.twinRegistry.set(twinId, twin);
    if (!ctx.twinStates.has(twinId)) ctx.twinStates.set(twinId, { data: null, timestamp: null });

    res.status(201).json({ success: true, twin, template: req.params.name });
  }));

  // ========== 2. SEMANTIC / SIMILARITY SEARCH ==========

  // GET /api/twins/search/semantic - rank twins by token-set similarity
  app.get('/api/twins/search/semantic', ctx.optionalAuth, ctx.asyncHandler(async (req, res) => {
    // Accept q from either query string or body (POST-friendly)
    const q = (req.query.q || (req.body && req.body.q) || '').toString();
    const twinType = (req.query.twinType || (req.body && req.body.twinType) || '').toString() || null;
    const limit = parseInt(req.query.limit || (req.body && req.body.limit) || 10, 10);

    const queryTokens = tokenize(q);
    const results = [];
    for (const twin of ctx.twinRegistry.values()) {
      if (twinType && twin.type !== twinType) continue;
      const profile = ctx.twinProfiles.get(twin.id);
      const twinTokens = twinTokenSet(twin, profile);
      const score = jaccard(queryTokens, twinTokens);
      if (score > 0) {
        results.push({
          twin: { id: twin.id, name: twin.name, type: twin.type, category: twin.category, tags: twin.tags },
          score: Number(score.toFixed(4)),
          matchedTokens: Array.from(queryTokens).filter(t => twinTokens.has(t))
        });
      }
    }
    results.sort((a, b) => b.score - a.score);
    res.json({
      success: true,
      query: q,
      count: results.length,
      results: results.slice(0, limit)
    });
  }));

  // POST variant for the same endpoint (more RESTful for body)
  app.post('/api/twins/search/semantic', ctx.optionalAuth, ctx.asyncHandler(async (req, res) => {
    const body = ctx.preventPrototypePollution(req.body || {});
    const q = (body.q || '').toString();
    const twinType = body.twinType || null;
    const limit = parseInt(body.limit || 10, 10);

    const queryTokens = tokenize(q);
    const results = [];
    for (const twin of ctx.twinRegistry.values()) {
      if (twinType && twin.type !== twinType) continue;
      const profile = ctx.twinProfiles.get(twin.id);
      const twinTokens = twinTokenSet(twin, profile);
      const score = jaccard(queryTokens, twinTokens);
      if (score > 0) {
        results.push({
          twin: { id: twin.id, name: twin.name, type: twin.type, category: twin.category, tags: twin.tags },
          score: Number(score.toFixed(4)),
          matchedTokens: Array.from(queryTokens).filter(t => twinTokens.has(t))
        });
      }
    }
    results.sort((a, b) => b.score - a.score);
    res.json({
      success: true,
      query: q,
      count: results.length,
      results: results.slice(0, limit)
    });
  }));

  // GET /api/twins/search/relationship - walk relationship graph by relation type
  app.get('/api/twins/search/relationship', ctx.optionalAuth, ctx.asyncHandler(async (req, res) => {
    const twinId = (req.query.twinId || (req.body && req.body.twinId) || '').toString();
    const relation = (req.query.relation || (req.body && req.body.relation) || '').toString();
    const depth = parseInt(req.query.depth || (req.body && req.body.depth) || 1, 10);

    if (!twinId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'twinId is required' } });
    }
    if (!ctx.twinRegistry.has(twinId)) {
      return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
    }

    const visited = new Set([twinId]);
    const results = [];
    let frontier = [twinId];

    for (let d = 0; d < Math.min(depth, 5); d++) {
      const next = [];
      for (const id of frontier) {
        const rels = ctx.twinRelationships.get(id) || [];
        for (const r of rels) {
          if (relation && r.type !== relation) continue;
          const neighbor = r.sourceId === id ? r.targetId : r.sourceId;
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            const twin = ctx.twinRegistry.get(neighbor);
            results.push({
              twin: twin ? { id: twin.id, name: twin.name, type: twin.type, category: twin.category } : { id: neighbor },
              relation: r.type,
              depth: d + 1,
              viaRelationship: r.id,
              targetId: r.targetId,
              sourceId: r.sourceId
            });
            next.push(neighbor);
          }
        }
      }
      frontier = next;
    }

    res.json({ success: true, root: twinId, relation, depth, count: results.length, results });
  }));

  // POST variant for relationship search (body-friendly)
  app.post('/api/twins/search/relationship', ctx.optionalAuth, ctx.asyncHandler(async (req, res) => {
    const body = ctx.preventPrototypePollution(req.body || {});
    const twinId = (body.twinId || '').toString();
    const relation = (body.relation || '').toString();
    const depth = parseInt(body.depth || 1, 10);

    if (!twinId) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'twinId is required' } });
    }
    if (!ctx.twinRegistry.has(twinId)) {
      return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
    }

    const visited = new Set([twinId]);
    const results = [];
    let frontier = [twinId];

    for (let d = 0; d < Math.min(depth, 5); d++) {
      const next = [];
      for (const id of frontier) {
        const rels = ctx.twinRelationships.get(id) || [];
        for (const r of rels) {
          if (relation && r.type !== relation) continue;
          const neighbor = r.sourceId === id ? r.targetId : r.sourceId;
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            const twin = ctx.twinRegistry.get(neighbor);
            results.push({
              twin: twin ? { id: twin.id, name: twin.name, type: twin.type, category: twin.category } : { id: neighbor },
              relation: r.type,
              depth: d + 1,
              viaRelationship: r.id,
              targetId: r.targetId,
              sourceId: r.sourceId
            });
            next.push(neighbor);
          }
        }
      }
      frontier = next;
    }

    res.json({ success: true, root: twinId, relation, depth, count: results.length, results });
  }));

  // ========== 3. VERSIONING WITH SNAPSHOT + ROLLBACK ==========

  // GET /api/twins/:id/versions - version history
  app.get('/api/twins/:id/versions', ctx.optionalAuth, ctx.asyncHandler(async (req, res) => {
    const twin = ctx.twinRegistry.get(req.params.id);
    if (!twin) {
      return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
    }
    const versions = ctx.twinVersions.get(req.params.id) || [];
    // Return summaries (don't bloat with full snapshot unless ?full=1)
    const includeFull = req.query.full === '1' || req.query.full === 'true';
    const summary = versions.map(v => ({
      version: v.version,
      at: v.at,
      reason: v.reason,
      snapshot: includeFull ? v.twin : undefined
    }));
    res.json({ success: true, twinId: req.params.id, currentVersion: twin.version, count: versions.length, versions: summary });
  }));

  // POST /api/twins/:id/rollback - restore to a prior version
  app.post('/api/twins/:id/rollback', ctx.requireAuth, ctx.strictLimiter, ctx.asyncHandler(async (req, res) => {
    const twin = ctx.twinRegistry.get(req.params.id);
    if (!twin) {
      return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
    }
    if (twin.businessId && twin.owner !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED', message: 'Only owner or admin can rollback' } });
    }
    const body = ctx.preventPrototypePollution(req.body || {});
    const targetVersion = parseInt(body.version, 10);
    if (!targetVersion) {
      return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'version (number) is required' } });
    }
    const versions = ctx.twinVersions.get(req.params.id) || [];
    const snap = versions.find(v => v.version === targetVersion);
    if (!snap) {
      return res.status(404).json({ success: false, error: { code: 'VERSION_NOT_FOUND', message: `Version ${targetVersion} not found` } });
    }

    // Snapshot current state BEFORE rollback (so rollback is itself reversible)
    snapshotTwin(ctx, twin, `rollback from v${twin.version} to v${targetVersion}`);

    // Restore fields from snapshot
    const restored = JSON.parse(JSON.stringify(snap.twin));
    // Preserve immutable-ish bookkeeping
    restored.version = twin.version; // we already bumped
    restored.updatedAt = new Date().toISOString();
    // Don't carry over a transient rollback reason
    ctx.twinRegistry.set(req.params.id, restored);
    if (ctx.twinProfiles.has(req.params.id)) {
      // also restore profile if the snapshot had profile info
    }
    if (ctx.twinStates.has(req.params.id)) {
      // state stays as-is unless snapshot had it
    }

    res.json({ success: true, twin: restored, restoredFrom: targetVersion, currentVersion: restored.version });
  }));

  // ========== 4. DIGITAL SHADOW EVENT PUBLISHING ==========
  // Helper exposed via ctx so other endpoints can also call it
  ctx.publishTwinEvent = (action, twin) => {
    const type = `twin.${action}.${twin.type || 'entity'}`;
    const payload = {
      twinId: twin.id,
      type: twin.type,
      name: twin.name,
      version: twin.version,
      status: twin.status,
      category: twin.category,
      twin
    };
    fireAndForgetPublish(type, 'twinos-hub', payload);
  };

  // ========== 5. CAPABILITY PROFILE LINK ==========
  // Helper: try to create a capability profile for a twin (fire-and-forget)
  ctx.linkCapabilityProfile = (twinId, twinType, profile) => {
    if (!profile || !Array.isArray(profile.capabilities) || profile.capabilities.length === 0) return;
    const body = {
      twinId,
      twinType: twinType || 'entity',
      owner: profile.owner || 'twinos-hub',
      capabilities: profile.capabilities,
      supportedSkills: profile.supportedSkills || [],
      supportedApis: profile.supportedApis || [],
      supportedEvents: profile.supportedEvents || [],
      supportedWorkflows: profile.supportedWorkflows || []
    };
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), EVENT_PUBLISH_TIMEOUT_MS);
      fetch(`${CAPABILITY_PROFILE_URL}/api/profiles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      })
        .then(async (r) => {
          clearTimeout(t);
          if (r.ok) {
            try {
              const data = await r.json();
              if (data && data.twinId) capabilityLinks.set(twinId, data);
            } catch (_) {}
          }
        })
        .catch(() => clearTimeout(t));
    } catch (e) {
      // never throw
    }
  };

  // GET /api/twins/:id/capabilities - fetch from capability-profile
  app.get('/api/twins/:id/capabilities', ctx.optionalAuth, ctx.asyncHandler(async (req, res) => {
    const twin = ctx.twinRegistry.get(req.params.id);
    if (!twin) {
      return res.status(404).json({ success: false, error: { code: 'TWIN_NOT_FOUND', message: 'Twin not found' } });
    }
    // Try cache first
    if (capabilityLinks.has(req.params.id)) {
      return res.json({ success: true, source: 'cache', profile: capabilityLinks.get(req.params.id) });
    }
    // Else fetch from capability-profile
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), EVENT_PUBLISH_TIMEOUT_MS);
      const r = await fetch(`${CAPABILITY_PROFILE_URL}/api/profiles/${encodeURIComponent(req.params.id)}`, {
        signal: controller.signal
      });
      clearTimeout(t);
      if (r.ok) {
        const data = await r.json();
        capabilityLinks.set(req.params.id, data);
        return res.json({ success: true, source: 'capability-profile', profile: data });
      }
      if (r.status === 404) {
        return res.status(404).json({ success: false, error: { code: 'CAPABILITY_PROFILE_NOT_FOUND', message: 'No capability profile for this twin' } });
      }
      return res.status(502).json({ success: false, error: { code: 'CAPABILITY_PROFILE_UPSTREAM_ERROR', message: `Upstream returned ${r.status}` } });
    } catch (e) {
      return res.status(503).json({ success: false, error: { code: 'CAPABILITY_PROFILE_UNREACHABLE', message: e.message } });
    }
  }));

  // Expose internals for the main app to call into
  ctx.snapshotTwin = snapshotTwin;
  ctx.bumpVersion = bumpVersion;
  ctx.twinTemplates = twinTemplates;
  ctx.capabilityLinks = capabilityLinks;
}
