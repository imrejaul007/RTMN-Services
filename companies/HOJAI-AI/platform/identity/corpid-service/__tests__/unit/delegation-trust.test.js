/**
 * CorpID v3.0 — Delegation + Trust + Timeline + Federation Unit Tests
 * Tests: delegation CRUD, scope narrowing, trust evaluation, timeline, federation
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// ============ MOCK STORES ============

const mockUserStore = new Map();
const mockBusinessStore = new Map();
const mockDelegationStore = new Map();
const mockTrustEvalStore = new Map();
const mockIdentityEventStore = new Map();
const mockFedLinkStore = new Map();

// ============ CONSTANTS ============

const JWT_SECRET = 'test-secret-32-chars-minimum-ok';
const TOKEN_ISSUER = 'rtmn-corpid';

// ============ APP FACTORY ============

function createApp() {
  const app = express();
  app.use(express.json());

  // ── Models ──────────────────────────────────────────────────────────────
  const Delegation = {
    async find() { return [...mockDelegationStore.values()]; },
    async findOne(key) { return mockDelegationStore.get(key) || null; },
    async create(data) { mockDelegationStore.set(data.delegationId, { ...data }); return data; },
    async updateOne(key, data) {
      const k = typeof key === 'object' ? key.delegationId : key;
      const existing = mockDelegationStore.get(k);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      mockDelegationStore.set(k, updated);
      return updated;
    },
  };

  const TrustEvaluation = {
    async create(data) { mockTrustEvalStore.set(data.evaluationId, { ...data }); return data; },
  };

  const IdentityEvent = {
    async find() { return [...mockIdentityEventStore.values()]; },
    async create(data) { mockIdentityEventStore.set(data.eventId, { ...data }); return data; },
  };

  const FedLink = {
    async find() { return [...mockFedLinkStore.values()]; },
    async findOne(key) { return mockFedLinkStore.get(key) || null; },
    async create(data) { mockFedLinkStore.set(data.linkId, { ...data }); return data; },
    async deleteOne(key) { mockFedLinkStore.delete(typeof key === 'object' ? key.linkId : key); },
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  function sanitizeInput(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const dangerous = ['__proto__', 'constructor', 'prototype'];
    const sanitized = Array.isArray(obj) ? [] : {};
    for (const [k, v] of Object.entries(obj)) {
      if (!dangerous.includes(k)) sanitized[k] = typeof v === 'object' && v !== null ? sanitizeInput(v) : v;
    }
    return sanitized;
  }

  function verifyToken(token) {
    try { return jwt.verify(token, JWT_SECRET, { issuer: TOKEN_ISSUER }); }
    catch { return null; }
  }

  // ── Auth ───────────────────────────────────────────────────────────────
  function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const decoded = verifyToken(header.slice(7));
    if (!decoded) return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN' } });
    if (decoded.type !== 'access') return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN_TYPE' } });
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role, businessId: decoded.businessId };
    next();
  }

  const OAUTH_PROVIDERS = {
    google: { name: 'Google', icon: 'google', scopes: ['openid', 'email', 'profile'] },
    apple: { name: 'Apple', icon: 'apple', scopes: ['name', 'email'] },
    microsoft: { name: 'Microsoft', icon: 'microsoft', scopes: ['openid', 'email', 'profile'] },
  };

  // ── Routes ──────────────────────────────────────────────────────────────

  // DELEGATION routes
  function generateDelegationId() { return `DEL-${randomBytes(6).toString('hex')}`; }

  app.post('/api/delegations', requireAuth, async (req, res) => {
    try {
      const body = sanitizeInput(req.body);
      if (!body.delegateId || !body.scope || !Array.isArray(body.scope) || body.scope.length === 0) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'delegateId and non-empty scope required' } });
      }
      const delegationId = generateDelegationId();
      const now = new Date().toISOString();
      const d = await Delegation.create({
        delegationId,
        delegatorId: req.user.id,
        delegatorType: 'human',
        delegateId: body.delegateId,
        delegateName: body.delegateName || body.delegateId,
        scope: body.scope,
        attenuationFactor: body.attenuationFactor ?? 1.0,
        expiresAt: body.expiresAt || null,
        status: 'active',
        createdBy: req.user.id,
        createdAt: now,
        updatedAt: now,
        history: [{ event: 'created', by: req.user.id, at: now }],
      });
      res.status(201).json({ success: true, delegation: d });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  app.get('/api/delegations', requireAuth, async (req, res) => {
    const all = await Delegation.find();
    const mine = all.filter(d => d.delegatorId === req.user.id || d.delegateId === req.user.id);
    res.json({ success: true, count: mine.length, delegations: mine.map(d => ({ delegationId: d.delegationId, delegateId: d.delegateId, scope: d.scope, status: d.status })) });
  });

  app.get('/api/delegations/:id', requireAuth, async (req, res) => {
    const d = await Delegation.findOne(req.params.id);
    if (!d) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (d.delegatorId !== req.user.id && d.delegateId !== req.user.id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    res.json({ success: true, delegation: d });
  });

  app.put('/api/delegations/:id', requireAuth, async (req, res) => {
    const d = await Delegation.findOne(req.params.id);
    if (!d) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (d.delegatorId !== req.user.id) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    const body = sanitizeInput(req.body);
    // Scope narrowing only: can only remove scopes
    if (body.scope) {
      const existing = new Set(d.scope);
      const narrower = body.scope.filter(s => existing.has(s));
      if (narrower.length < body.scope.length) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
      d.scope = narrower;
    }
    d.updatedAt = new Date().toISOString();
    await Delegation.updateOne({ delegationId: req.params.id }, d);
    res.json({ success: true, delegation: d });
  });

  app.delete('/api/delegations/:id', requireAuth, async (req, res) => {
    const d = await Delegation.findOne(req.params.id);
    if (!d) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (d.delegatorId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    await Delegation.updateOne({ delegationId: req.params.id }, { status: 'revoked', updatedAt: new Date().toISOString() });
    res.json({ success: true, message: 'Delegation revoked' });
  });

  app.delete('/api/delegations/:id/expire', requireAuth, async (req, res) => {
    const d = await Delegation.findOne(req.params.id);
    if (!d) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (d.delegatorId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    await Delegation.updateOne({ delegationId: req.params.id }, { status: 'expired', updatedAt: new Date().toISOString() });
    res.json({ success: true, message: 'Delegation expired' });
  });

  // TRUST routes
  const TRUST_WEIGHTS = { identity: 0.25, behavior: 0.25, device: 0.15, transaction: 0.20, history: 0.15 };

  function evaluateTrustComponents(factors = {}) {
    const identityScore = Math.min(100, Math.max(0, 50 + (factors.identity?.verified ? 30 : 0)));
    const behaviorScore = Math.min(100, Math.max(0, 50 + (factors.behavior?.loginCount || 0) * 2 - (factors.behavior?.failedLogins || 0) * 5));
    const overall = Math.round(identityScore * 0.25 + behaviorScore * 0.25);
    return { identityScore, behaviorScore, overall };
  }

  app.post('/api/trust/evaluate', requireAuth, async (req, res) => {
    const { corpId, factors = {} } = sanitizeInput(req.body) || {};
    const targetId = corpId || req.user.id;
    const { identityScore, behaviorScore, overall } = evaluateTrustComponents(factors);
    const evaluationId = `TE-${randomBytes(6).toString('hex')}`;
    await TrustEvaluation.create({ evaluationId, corpId: targetId, components: { identityScore, behaviorScore }, overallScore: overall });
    res.json({ success: true, evaluation: { corpId: targetId, overallScore: overall, components: { identityScore, behaviorScore } } });
  });

  app.get('/api/trust/risk-check', requireAuth, async (req, res) => {
    const { corpId } = req.query;
    const flags = [];
    if (req.query.newIp === 'true') flags.push({ flag: 'new_ip', risk: 20 });
    if (req.query.tor === 'true') flags.push({ flag: 'tor_exit', risk: 50 });
    res.json({ success: true, corpId: corpId || req.user.id, flags, totalRisk: flags.reduce((s, f) => s + f.risk, 0) });
  });

  // TIMELINE routes
  app.post('/api/timeline/events', requireAuth, async (req, res) => {
    const body = sanitizeInput(req.body);
    if (!body.type || !body.category || !body.title) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
    const eventId = `EVT-${randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    await IdentityEvent.create({ eventId, corpId: req.user.id, type: body.type, category: body.category, title: body.title, createdAt: now });
    res.status(201).json({ success: true, event: { eventId, type: body.type, category: body.category, createdAt: now } });
  });

  app.get('/api/timeline/events', requireAuth, async (req, res) => {
    const { category, limit = 50 } = req.query;
    let all = await IdentityEvent.find();
    all = all.filter(e => e.corpId === req.user.id);
    if (category) all = all.filter(e => e.category === category);
    all.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const events = all.slice(0, parseInt(limit));
    res.json({ success: true, count: events.length, events });
  });

  // FEDERATION routes
  app.get('/api/federation/providers', async (_req, res) => {
    res.json({ success: true, providers: OAUTH_PROVIDERS });
  });

  app.get('/api/federation/me/links', requireAuth, async (req, res) => {
    const all = await FedLink.find();
    const links = all.filter(l => l.corpId === req.user.id);
    res.json({ success: true, count: links.length, links });
  });

  app.post('/api/federation/link', requireAuth, async (req, res) => {
    const body = sanitizeInput(req.body);
    if (!body.provider || !body.externalId) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
    if (!OAUTH_PROVIDERS[body.provider]) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid provider' } });
    const existing = [...mockFedLinkStore.values()].find(l => l.provider === body.provider && l.externalId === body.externalId);
    if (existing) return res.status(409).json({ success: false, error: { code: 'CONFLICT' } });
    const linkId = `FL-${randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    const link = await FedLink.create({ linkId, provider: body.provider, externalId: body.externalId, corpId: req.user.id, status: 'active', createdAt: now });
    res.status(201).json({ success: true, link });
  });

  app.delete('/api/federation/link/:linkId', requireAuth, async (req, res) => {
    const link = await FedLink.findOne(req.params.linkId);
    if (!link) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (link.corpId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    await FedLink.deleteOne({ linkId: req.params.linkId });
    res.json({ success: true, message: 'Link removed' });
  });

  return app;
}

// ============ FIXTURES ============

let app;
let userToken;
let user = { id: 'user-001', email: 'user@test.com', role: 'user', businessId: 'biz-001' };
let admin = { id: 'user-admin', email: 'admin@test.com', role: 'admin', businessId: 'biz-001' };
let adminToken;

beforeAll(() => {
  mockDelegationStore.clear();
  mockTrustEvalStore.clear();
  mockIdentityEventStore.clear();
  mockFedLinkStore.clear();

  app = createApp();
  userToken = jwt.sign({ sub: user.id, email: user.email, role: user.role, businessId: user.businessId, type: 'access' }, JWT_SECRET, { expiresIn: '1h', issuer: TOKEN_ISSUER });
  adminToken = jwt.sign({ sub: admin.id, email: admin.email, role: admin.role, businessId: admin.businessId, type: 'access' }, JWT_SECRET, { expiresIn: '1h', issuer: TOKEN_ISSUER });
});

afterEach(() => {
  mockDelegationStore.clear();
  mockTrustEvalStore.clear();
  mockIdentityEventStore.clear();
  mockFedLinkStore.clear();
});

// ============ DELEGATION TESTS ============

describe('Delegation — Create', () => {
  it('POST /api/delegations creates delegation with DEL- ID', async () => {
    const res = await request(app)
      .post('/api/delegations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ delegateId: 'CI-AGT-agent001', delegateName: 'Sales Bot', scope: ['leads:read', 'pricing:write'] });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.delegation.delegationId).toMatch(/^DEL-/);
    expect(res.body.delegation.delegatorId).toBe('user-001');
    expect(res.body.delegation.scope).toEqual(['leads:read', 'pricing:write']);
    expect(res.body.delegation.status).toBe('active');
  });

  it('POST /api/delegations rejects missing delegateId', async () => {
    const res = await request(app)
      .post('/api/delegations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ scope: ['read'] });

    expect(res.status).toBe(400);
  });

  it('POST /api/delegations rejects empty scope', async () => {
    const res = await request(app)
      .post('/api/delegations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ delegateId: 'CI-AGT-agent001', scope: [] });

    expect(res.status).toBe(400);
  });

  it('POST /api/delegations without token returns 401', async () => {
    const res = await request(app).post('/api/delegations').send({ delegateId: 'CI-AGT-a', scope: ['read'] });
    expect(res.status).toBe(401);
  });

  it('POST /api/delegations sanitizes prototype pollution', async () => {
    const res = await request(app)
      .post('/api/delegations')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ delegateId: 'CI-AGT-agent', scope: ['read'], __proto__: { admin: true } });

    expect(res.status).toBe(201);
    const d = [...mockDelegationStore.values()][0];
    expect(Object.keys(d)).not.toContain('__proto__');
  });
});

describe('Delegation — List & Get', () => {
  it('GET /api/delegations returns delegations I created or am delegate of', async () => {
    await request(app).post('/api/delegations').set('Authorization', `Bearer ${userToken}`).send({ delegateId: 'CI-AGT-a', scope: ['read'] });
    await request(app).post('/api/delegations').set('Authorization', `Bearer ${userToken}`).send({ delegateId: 'CI-AGT-b', scope: ['write'] });

    const res = await request(app)
      .get('/api/delegations')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });
});

describe('Delegation — Update', () => {
  it('PUT /api/delegations narrows scope (removes permissions)', async () => {
    const create = await request(app).post('/api/delegations').set('Authorization', `Bearer ${userToken}`).send({ delegateId: 'CI-AGT-a', scope: ['read', 'write', 'delete'] });
    const id = create.body.delegation.delegationId;

    const res = await request(app)
      .put(`/api/delegations/${id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ scope: ['read'] });

    expect(res.status).toBe(200);
    expect(res.body.delegation.scope).toEqual(['read']);
  });

  it('PUT /api/delegations rejects expanding scope', async () => {
    const create = await request(app).post('/api/delegations').set('Authorization', `Bearer ${userToken}`).send({ delegateId: 'CI-AGT-a', scope: ['read'] });
    const id = create.body.delegation.delegationId;

    const res = await request(app)
      .put(`/api/delegations/${id}`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ scope: ['read', 'write'] });

    expect(res.status).toBe(400);
  });

  it('PUT /api/delegations non-delegator returns 403', async () => {
    const create = await request(app).post('/api/delegations').set('Authorization', `Bearer ${userToken}`).send({ delegateId: 'CI-AGT-a', scope: ['read'] });
    const id = create.body.delegation.delegationId;

    const res = await request(app)
      .put(`/api/delegations/${id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ scope: ['admin'] });

    expect(res.status).toBe(403);
  });
});

describe('Delegation — Revoke & Expire', () => {
  it('DELETE /api/delegations/:id sets status=revoked', async () => {
    const create = await request(app).post('/api/delegations').set('Authorization', `Bearer ${userToken}`).send({ delegateId: 'CI-AGT-a', scope: ['read'] });
    const id = create.body.delegation.delegationId;

    const res = await request(app)
      .delete(`/api/delegations/${id}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Delegation revoked');
    const stored = mockDelegationStore.get(id);
    expect(stored.status).toBe('revoked');
  });

  it('DELETE /api/delegations/:id/expire sets status=expired', async () => {
    const create = await request(app).post('/api/delegations').set('Authorization', `Bearer ${userToken}`).send({ delegateId: 'CI-AGT-a', scope: ['read'] });
    const id = create.body.delegation.delegationId;

    const res = await request(app)
      .delete(`/api/delegations/${id}/expire`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(mockDelegationStore.get(id).status).toBe('expired');
  });

  it('DELETE /api/delegations/:id non-owner returns 403', async () => {
    const create = await request(app).post('/api/delegations').set('Authorization', `Bearer ${userToken}`).send({ delegateId: 'CI-AGT-a', scope: ['read'] });
    // Create another user token
    const other = jwt.sign({ sub: 'user-other', email: 'other@test.com', role: 'user', businessId: 'biz-002', type: 'access' }, JWT_SECRET, { expiresIn: '1h', issuer: TOKEN_ISSUER });

    const res = await request(app)
      .delete(`/api/delegations/${create.body.delegation.delegationId}`)
      .set('Authorization', `Bearer ${other}`);

    expect(res.status).toBe(403);
  });

  it('admin can revoke any delegation', async () => {
    const create = await request(app).post('/api/delegations').set('Authorization', `Bearer ${userToken}`).send({ delegateId: 'CI-AGT-a', scope: ['read'] });
    const res = await request(app)
      .delete(`/api/delegations/${create.body.delegation.delegationId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});

// ============ TRUST TESTS ============

describe('Trust Intelligence — Evaluate', () => {
  it('POST /api/trust/evaluate computes weighted score from factors', async () => {
    const res = await request(app)
      .post('/api/trust/evaluate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ factors: { identity: { verified: true, kycLevel: 3 }, behavior: { loginCount: 10, failedLogins: 0 }, transaction: { completedCount: 5 }, history: { accountAgeDays: 180 } } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Verified identity + high login count should push score above baseline
    expect(res.body.evaluation.components.identityScore).toBeGreaterThan(50);
    expect(res.body.evaluation.components.behaviorScore).toBeGreaterThan(50);
    expect(res.body.evaluation.overallScore).toBeGreaterThanOrEqual(0);
  });

  it('POST /api/trust/evaluate returns components', async () => {
    const res = await request(app)
      .post('/api/trust/evaluate')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.evaluation.components).toBeDefined();
  });
});

describe('Trust Intelligence — Risk Check', () => {
  it('GET /api/trust/risk-check flags newIp', async () => {
    const res = await request(app)
      .get('/api/trust/risk-check?newIp=true')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.flags.some(f => f.flag === 'new_ip')).toBe(true);
  });

  it('GET /api/trust/risk-check flags Tor exit node', async () => {
    const res = await request(app)
      .get('/api/trust/risk-check?tor=true')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.flags.some(f => f.flag === 'tor_exit')).toBe(true);
    expect(res.body.totalRisk).toBeGreaterThanOrEqual(50);
  });

  it('GET /api/trust/risk-check no flags returns empty', async () => {
    const res = await request(app)
      .get('/api/trust/risk-check')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.flags).toEqual([]);
    expect(res.body.totalRisk).toBe(0);
  });
});

// ============ TIMELINE TESTS ============

describe('Timeline — Record Events', () => {
  it('POST /api/timeline/events creates event with EVT- ID', async () => {
    const res = await request(app)
      .post('/api/timeline/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ type: 'login', category: 'authentication', title: 'User logged in' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.event.eventId).toMatch(/^EVT-/);
    expect(res.body.event.type).toBe('login');
    expect(res.body.event.category).toBe('authentication');
  });

  it('POST /api/timeline/events rejects missing fields', async () => {
    const res = await request(app)
      .post('/api/timeline/events')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ type: 'login' });

    expect(res.status).toBe(400);
  });
});

describe('Timeline — List Events', () => {
  it('GET /api/timeline/events returns my events sorted desc', async () => {
    await request(app).post('/api/timeline/events').set('Authorization', `Bearer ${userToken}`).send({ type: 'a', category: 'auth', title: 'First' });
    await request(app).post('/api/timeline/events').set('Authorization', `Bearer ${userToken}`).send({ type: 'b', category: 'auth', title: 'Second' });
    await request(app).post('/api/timeline/events').set('Authorization', `Bearer ${userToken}`).send({ type: 'c', category: 'action', title: 'Third' });

    const res = await request(app)
      .get('/api/timeline/events')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
    expect(res.body.events[0].type).toBe('c'); // most recent first
    expect(res.body.events[2].type).toBe('a');
  });

  it('GET /api/timeline/events?category filters correctly', async () => {
    await request(app).post('/api/timeline/events').set('Authorization', `Bearer ${userToken}`).send({ type: 'x', category: 'auth', title: 'A' });
    await request(app).post('/api/timeline/events').set('Authorization', `Bearer ${userToken}`).send({ type: 'y', category: 'action', title: 'B' });

    const res = await request(app)
      .get('/api/timeline/events?category=action')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.events.every(e => e.category === 'action')).toBe(true);
  });

  it('GET /api/timeline/events?limit=1 caps results', async () => {
    await request(app).post('/api/timeline/events').set('Authorization', `Bearer ${userToken}`).send({ type: 'x', category: 'a', title: 'A' });
    await request(app).post('/api/timeline/events').set('Authorization', `Bearer ${userToken}`).send({ type: 'y', category: 'b', title: 'B' });

    const res = await request(app)
      .get('/api/timeline/events?limit=1')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });
});

// ============ FEDERATION TESTS ============

describe('Federation — Providers', () => {
  it('GET /api/federation/providers returns supported OAuth providers', async () => {
    const res = await request(app).get('/api/federation/providers');

    expect(res.status).toBe(200);
    expect(res.body.providers.google).toBeDefined();
    expect(res.body.providers.apple).toBeDefined();
    expect(res.body.providers.google.scopes).toContain('email');
  });
});

describe('Federation — Account Linking', () => {
  it('POST /api/federation/link creates a federated link', async () => {
    const res = await request(app)
      .post('/api/federation/link')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ provider: 'google', externalId: 'google-12345', externalEmail: 'user@gmail.com' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.link.linkId).toMatch(/^FL-/);
    expect(res.body.link.provider).toBe('google');
    expect(res.body.link.corpId).toBe('user-001');
  });

  it('POST /api/federation/link rejects invalid provider', async () => {
    const res = await request(app)
      .post('/api/federation/link')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ provider: 'notreal', externalId: 'xyz' });

    expect(res.status).toBe(400);
  });

  it('POST /api/federation/link rejects duplicate link', async () => {
    await request(app).post('/api/federation/link').set('Authorization', `Bearer ${userToken}`).send({ provider: 'google', externalId: 'dup-123' });
    const res = await request(app)
      .post('/api/federation/link')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ provider: 'google', externalId: 'dup-123' });

    expect(res.status).toBe(409);
  });

  it('GET /api/federation/me/links returns my links', async () => {
    await request(app).post('/api/federation/link').set('Authorization', `Bearer ${userToken}`).send({ provider: 'google', externalId: 'g-1' });
    await request(app).post('/api/federation/link').set('Authorization', `Bearer ${userToken}`).send({ provider: 'apple', externalId: 'a-1' });

    const res = await request(app)
      .get('/api/federation/me/links')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2);
  });

  it('DELETE /api/federation/link/:linkId removes link', async () => {
    const create = await request(app).post('/api/federation/link').set('Authorization', `Bearer ${userToken}`).send({ provider: 'google', externalId: 'del-123' });
    const res = await request(app)
      .delete(`/api/federation/link/${create.body.link.linkId}`)
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Link removed');
    expect(mockFedLinkStore.has(create.body.link.linkId)).toBe(false);
  });

  it('DELETE /api/federation/link/:linkId non-owner returns 403', async () => {
    const create = await request(app).post('/api/federation/link').set('Authorization', `Bearer ${userToken}`).send({ provider: 'google', externalId: 'forbidden-123' });
    const other = jwt.sign({ sub: 'user-other', email: 'other@test.com', role: 'user', businessId: 'biz-002', type: 'access' }, JWT_SECRET, { expiresIn: '1h', issuer: TOKEN_ISSUER });

    const res = await request(app)
      .delete(`/api/federation/link/${create.body.link.linkId}`)
      .set('Authorization', `Bearer ${other}`);

    expect(res.status).toBe(403);
  });

  it('admin can delete any federated link', async () => {
    const create = await request(app).post('/api/federation/link').set('Authorization', `Bearer ${userToken}`).send({ provider: 'google', externalId: 'admin-del' });
    const res = await request(app)
      .delete(`/api/federation/link/${create.body.link.linkId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
  });
});
