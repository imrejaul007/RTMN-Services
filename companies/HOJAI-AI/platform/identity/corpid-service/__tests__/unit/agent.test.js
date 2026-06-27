/**
 * CorpID v3.0 — Agent Passport Unit Tests
 * Tests: create, list, get, update, revoke, suspend, resume,
 *        permissions, budget, interactions, capabilities
 * Uses supertest for reliable HTTP testing
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';

// ============ MOCK STORES ============

const mockUserStore = new Map();
const mockBusinessStore = new Map();
const mockAgentStore = new Map();
const mockInteractionStore = new Map();
const mockTrustScoreStore = new Map();

// ============ CONSTANTS ============

const JWT_SECRET = 'test-secret-32-chars-minimum-ok';
const BCRYPT_ROUNDS = 4;
const TOKEN_ISSUER = 'rtmn-corpid';

// ============ APP FACTORY ============

function createApp() {
  const app = express();
  app.use(express.json());

  // ── Models ──────────────────────────────────────────────────────────────
  const User = {
    async find() { return [...mockUserStore.values()]; },
    async findOne(key) { return mockUserStore.get(key) || null; },
    async create(data) { mockUserStore.set(data.email, { ...data }); return data; },
    async updateOne(key, data) {
      const existing = mockUserStore.get(key);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      mockUserStore.set(key, updated);
      return updated;
    },
  };

  const Business = {
    async findOne(key) { return mockBusinessStore.get(key) || null; },
    async create(data) { mockBusinessStore.set(data.id, { ...data }); return data; },
  };

  const Agent = {
    async find() { return [...mockAgentStore.values()]; },
    async findOne(key) { return mockAgentStore.get(key) || null; },
    async create(data) { mockAgentStore.set(data.agentId, { ...data }); return data; },
    async updateOne(key, data) {
      const actualKey = typeof key === 'object' ? key.agentId : key;
      const existing = mockAgentStore.get(actualKey);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      mockAgentStore.set(actualKey, updated);
      return updated;
    },
  };

  const AgentInteraction = {
    async find() { return [...mockInteractionStore.values()]; },
    async create(data) { mockInteractionStore.set(data.id, { ...data }); return data; },
  };

  const TrustScore = {
    async findOne(key) { return mockTrustScoreStore.get(key) || null; },
    async create(data) { mockTrustScoreStore.set(data.corpId, { ...data }); return data; },
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

  function computeTrustLevel(score) {
    if (score >= 90) return 'platinum';
    if (score >= 80) return 'gold';
    if (score >= 70) return 'silver';
    if (score >= 50) return 'bronze';
    if (score >= 30) return 'iron';
    return 'restricted';
  }

  function verifyToken(token) {
    try { return jwt.verify(token, JWT_SECRET, { issuer: TOKEN_ISSUER }); }
    catch { return null; }
  }

  // ── Auth helpers ───────────────────────────────────────────────────────
  function makeAccessToken(user) {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role, businessId: user.businessId, type: 'access' },
      JWT_SECRET,
      { expiresIn: '1h', issuer: TOKEN_ISSUER, jwtid: randomBytes(16).toString('hex') }
    );
  }

  function makeAgentToken(agent) {
    return jwt.sign(
      { sub: agent.agentId, type: 'agent_access', owner: agent.ownerId, businessId: agent.businessId, permissions: agent.permissions || [], scopes: agent.scopes || [] },
      JWT_SECRET,
      { expiresIn: '1h', issuer: TOKEN_ISSUER }
    );
  }

  function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const decoded = verifyToken(header.slice(7));
    if (!decoded) return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN' } });
    if (decoded.type !== 'access') return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN_TYPE' } });
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role, businessId: decoded.businessId };
    next();
  }

  function requireHumanOrAgent(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const decoded = verifyToken(header.slice(7));
    if (!decoded) return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN' } });
    if (decoded.type === 'access') req.principal = { type: 'human', id: decoded.sub, email: decoded.email, role: decoded.role, businessId: decoded.businessId };
    else if (decoded.type === 'agent_access') req.principal = { type: 'agent', id: decoded.sub, owner: decoded.owner, businessId: decoded.businessId, permissions: decoded.permissions || [], scopes: decoded.scopes || [] };
    else return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN_TYPE' } });
    next();
  }

  const AGENT_CAPABILITIES = {
    'web-search': { name: 'Web Search', risk: 'low', requiresConsent: false },
    'code-execution': { name: 'Code Execution', risk: 'medium', requiresConsent: true },
    'email-send': { name: 'Send Email', risk: 'high', requiresConsent: true },
    'payment-initiate': { name: 'Initiate Payment', risk: 'critical', requiresConsent: true },
  };

  function generateAgentToken(agent) {
    return jwt.sign(
      { sub: agent.agentId, type: 'agent_access', owner: agent.ownerId, businessId: agent.businessId, permissions: agent.permissions || [] },
      JWT_SECRET,
      { expiresIn: '1h', issuer: TOKEN_ISSUER }
    );
  }

  // ── Routes ──────────────────────────────────────────────────────────────

  app.get('/api/agents/capabilities', async (_req, res) => {
    res.json({ success: true, capabilities: AGENT_CAPABILITIES });
  });

  app.post('/api/agents', requireAuth, async (req, res) => {
    try {
      const body = sanitizeInput(req.body);
      const now = new Date().toISOString();
      const agentId = `CI-AGT-${randomBytes(6).toString('hex')}`;
      const agent = await Agent.create({
        agentId,
        name: body.name,
        description: body.description || '',
        type: body.type || 'assistant',
        category: body.category || 'business',
        model: body.model || 'unknown',
        provider: body.provider || 'internal',
        ownerId: req.user.id,
        businessId: req.user.businessId,
        permissions: body.permissions || [],
        scopes: body.scopes || [],
        rateLimit: body.rateLimit || { requestsPerMinute: 60, requestsPerDay: 10000 },
        budget: body.budget || { monthly: 100000, spent: 0, currency: 'USD' },
        status: 'active',
        suspensionReason: null,
        revokedAt: null,
        trustScore: 50,
        trustLevel: 'bronze',
        capabilities: body.capabilities || [],
        tags: body.tags || [],
        agentOsId: null,
        createdAt: now,
        updatedAt: now,
        lastActiveAt: null,
        history: [{ event: 'created', by: req.user.id, at: now, details: {} }],
      });
      const agentToken = generateAgentToken(agent);
      res.status(201).json({ success: true, message: 'Agent passport created', agent: { agentId: agent.agentId, name: agent.name, type: agent.type, ownerId: agent.ownerId, status: agent.status }, agentToken });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  app.get('/api/agents', requireAuth, async (req, res) => {
    let all = await Agent.find();
    if (req.user.role !== 'superadmin') all = all.filter(a => a.businessId === req.user.businessId);
    const { status, type, category } = req.query;
    if (status) all = all.filter(a => a.status === status);
    if (type) all = all.filter(a => a.type === type);
    if (category) all = all.filter(a => a.category === category);
    res.json({ success: true, count: all.length, agents: all.map(a => ({ agentId: a.agentId, name: a.name, type: a.type, status: a.status })) });
  });

  app.get('/api/agents/:agentId', requireAuth, async (req, res) => {
    const agent = await Agent.findOne(req.params.agentId);
    if (!agent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Agent not found' } });
    if (req.user.role !== 'superadmin' && agent.businessId !== req.user.businessId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
    res.json({ success: true, agent });
  });

  app.put('/api/agents/:agentId', requireAuth, async (req, res) => {
    const agent = await Agent.findOne(req.params.agentId);
    if (!agent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    const body = sanitizeInput(req.body);
    const updates = {};
    for (const field of ['name', 'description', 'capabilities', 'permissions', 'scopes', 'rateLimit', 'budget', 'tags']) {
      if (body[field] !== undefined) updates[field] = body[field];
    }
    updates.updatedAt = new Date().toISOString();
    updates.history = [...(agent.history || []), { event: 'updated', by: req.user.id, at: updates.updatedAt }];
    const updated = await Agent.updateOne({ agentId: req.params.agentId }, updates);
    res.json({ success: true, agent: updated });
  });

  app.delete('/api/agents/:agentId', requireAuth, async (req, res) => {
    const agent = await Agent.findOne(req.params.agentId);
    if (!agent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    const now = new Date().toISOString();
    await Agent.updateOne({ agentId: req.params.agentId }, { status: 'revoked', revokedAt: now, updatedAt: now });
    res.json({ success: true, message: 'Agent passport revoked' });
  });

  app.post('/api/agents/:agentId/suspend', requireAuth, async (req, res) => {
    const agent = await Agent.findOne(req.params.agentId);
    if (!agent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    const now = new Date().toISOString();
    const updated = await Agent.updateOne({ agentId: req.params.agentId }, { status: 'suspended', suspensionReason: req.body.reason || null, updatedAt: now });
    res.json({ success: true, agent: updated });
  });

  app.post('/api/agents/:agentId/resume', requireAuth, async (req, res) => {
    const agent = await Agent.findOne(req.params.agentId);
    if (!agent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    const now = new Date().toISOString();
    const updated = await Agent.updateOne({ agentId: req.params.agentId }, { status: 'active', suspensionReason: null, updatedAt: now });
    res.json({ success: true, agent: updated });
  });

  app.get('/api/agents/:agentId/permissions', requireAuth, async (req, res) => {
    const agent = await Agent.findOne(req.params.agentId);
    if (!agent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (req.user.role !== 'superadmin' && agent.businessId !== req.user.businessId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    res.json({ success: true, agentId: agent.agentId, permissions: agent.permissions || [], scopes: agent.scopes || [] });
  });

  app.post('/api/agents/:agentId/permissions', requireAuth, async (req, res) => {
    const agent = await Agent.findOne(req.params.agentId);
    if (!agent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    const { permissions = [], scopes = [] } = sanitizeInput(req.body) || {};
    const now = new Date().toISOString();
    const updated = await Agent.updateOne({ agentId: req.params.agentId }, {
      permissions: [...new Set([...(agent.permissions || []), ...permissions])],
      scopes: [...new Set([...(agent.scopes || []), ...scopes])],
      updatedAt: now,
    });
    res.json({ success: true, permissions: updated.permissions, scopes: updated.scopes });
  });

  app.get('/api/agents/:agentId/budget', requireAuth, async (req, res) => {
    const agent = await Agent.findOne(req.params.agentId);
    if (!agent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (req.user.role !== 'superadmin' && agent.businessId !== req.user.businessId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    res.json({ success: true, agentId: agent.agentId, budget: agent.budget || { monthly: 0, spent: 0, currency: 'USD' } });
  });

  app.post('/api/agents/:agentId/budget/reset', requireAuth, async (req, res) => {
    const agent = await Agent.findOne(req.params.agentId);
    if (!agent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (agent.ownerId !== req.user.id && !['superadmin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    const now = new Date().toISOString();
    const updated = await Agent.updateOne({ agentId: req.params.agentId }, {
      budget: { ...(agent.budget || { monthly: 100000, currency: 'USD' }), spent: 0 },
      updatedAt: now,
    });
    res.json({ success: true, budget: updated.budget });
  });

  app.post('/api/agents/:agentId/interactions', requireHumanOrAgent, async (req, res) => {
    const agent = await Agent.findOne(req.params.agentId);
    if (!agent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (agent.status !== 'active') return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Agent is not active' } });
    const body = sanitizeInput(req.body) || {};
    const interaction = await AgentInteraction.create({
      id: randomBytes(8).toString('hex'),
      agentId: req.params.agentId,
      type: body.type || 'query',
      success: body.success !== false,
      actorId: req.principal.id,
      actorType: req.principal.type,
      duration: body.duration || 0,
      tokensUsed: body.tokensUsed || 0,
      timestamp: new Date().toISOString(),
    });
    await Agent.updateOne({ agentId: req.params.agentId }, { lastActiveAt: interaction.timestamp, updatedAt: new Date().toISOString() });
    res.json({ success: true, interaction });
  });

  app.get('/api/agents/:agentId/interactions', requireAuth, async (req, res) => {
    const agent = await Agent.findOne(req.params.agentId);
    if (!agent) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } });
    if (req.user.role !== 'superadmin' && agent.businessId !== req.user.businessId) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
    const { limit = 50 } = req.query;
    const all = await AgentInteraction.find();
    const interactions = all.filter(i => i.agentId === req.params.agentId).sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, parseInt(limit));
    res.json({ success: true, count: interactions.length, interactions });
  });

  return app;
}

// ============ FIXTURE HELPERS ============

let app;
let ownerToken;
let ownerUser = { id: 'user-owner001', email: 'owner@test.com', role: 'owner', businessId: 'biz-001' };
let adminUser = { id: 'user-admin001', email: 'admin@test.com', role: 'admin', businessId: 'biz-001' };
let otherUser = { id: 'user-other001', email: 'other@test.com', role: 'user', businessId: 'biz-002' };

beforeAll(() => {
  // Clear any stale data from previous test file runs
  mockAgentStore.clear();
  mockInteractionStore.clear();
  mockUserStore.clear();
  mockBusinessStore.clear();
  mockAgentStore.clear();
  mockInteractionStore.clear();
  mockTrustScoreStore.clear();

  // Seed businesses
  mockBusinessStore.set('biz-001', { id: 'biz-001', name: 'Test Business', status: 'active' });
  mockBusinessStore.set('biz-002', { id: 'biz-002', name: 'Other Business', status: 'active' });

  // Seed users
  mockUserStore.set('owner@test.com', { ...ownerUser });
  mockUserStore.set('admin@test.com', { ...adminUser });
  mockUserStore.set('other@test.com', { ...otherUser });

  app = createApp();
  ownerToken = makeAccessToken(ownerUser);
});

afterEach(() => {
  mockAgentStore.clear();
  mockInteractionStore.clear();
});

function makeAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, businessId: user.businessId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '1h', issuer: TOKEN_ISSUER, jwtid: randomBytes(16).toString('hex') }
  );
}

// ============ TESTS ============

describe('Agent Passport — Capabilities', () => {
  it('GET /api/agents/capabilities returns AGENT_CAPABILITIES map', async () => {
    const res = await request(app).get('/api/agents/capabilities');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.capabilities['web-search']).toBeDefined();
    expect(res.body.capabilities['web-search'].risk).toBe('low');
    expect(res.body.capabilities['payment-initiate'].risk).toBe('critical');
    expect(res.body.capabilities['payment-initiate'].requiresConsent).toBe(true);
  });
});

describe('Agent Passport — Create', () => {
  it('POST /api/agents creates agent with CI-AGT- ID and returns agentToken', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Sales Bot', type: 'autonomous', capabilities: ['web-search', 'email-send'] });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.agent.agentId).toMatch(/^CI-AGT-/);
    expect(res.body.agent.name).toBe('Sales Bot');
    expect(res.body.agent.status).toBe('active');
    expect(res.body.agentToken).toBeDefined();
    expect(res.body.agentToken.split('.').length).toBe(3); // JWT = 3 parts
  });

  it('POST /api/agents sets ownerId from JWT, not body', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Test Agent', ownerId: 'CI-IND-hijacked' }); // attempt injection

    expect(res.status).toBe(201);
    expect(res.body.agent.ownerId).toBe('user-owner001'); // from token, not body
  });

  it('POST /api/agents sets businessId from JWT', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'Biz Agent' });

    expect(res.status).toBe(201);
    // Check via GET
    const get = await request(app)
      .get(`/api/agents/${res.body.agent.agentId}`)
      .set('Authorization', `Bearer ${ownerToken}`);
    expect(get.body.agent.businessId).toBe('biz-001');
  });

  it('POST /api/agents without token returns 401', async () => {
    const res = await request(app).post('/api/agents').send({ name: 'No Auth' });
    expect(res.status).toBe(401);
  });

    it('POST /api/agents sanitizes dangerous prototype-pollution keys', async () => {
    const res = await request(app)
      .post('/api/agents')
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'ProtoAgent', description: 'test', __proto__: { admin: true }, constructor: { prototype: { evil: true } } });

    expect(res.status).toBe(201);
    // sanitizeInput strips dangerous keys — verify they don't end up in the agent object
    const agent = [...mockAgentStore.values()].find(a => a.name === 'ProtoAgent');
    expect(agent).toBeDefined();
    // Object.prototype keys exist on all JS objects; the test checks our code removed them
    expect(Object.keys(agent)).not.toContain('__proto__');
    expect(Object.keys(agent)).not.toContain('constructor');
  });
});

describe('Agent Passport — List & Get', () => {
  it('GET /api/agents returns business-scoped agents', async () => {
    // Create agents in biz-001
    await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Agent A' });
    await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Agent B' });

    // Create agent in biz-002 (admin)
    const otherToken = makeAccessToken(otherUser);
    mockUserStore.set('other@test.com', { ...otherUser });
    await request(app).post('/api/agents').set('Authorization', `Bearer ${otherToken}`).send({ name: 'Agent C' });

    const res = await request(app)
      .get('/api/agents')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(2); // only biz-001 agents
    expect(res.body.agents.every(a => a.agentId.startsWith('CI-AGT-'))).toBe(true);
  });

  it('GET /api/agents?status=suspended filters correctly', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Suspend Me' });
    await request(app).post(`/api/agents/${create.body.agent.agentId}/suspend`).set('Authorization', `Bearer ${ownerToken}`).send({ reason: 'testing' });

    const res = await request(app)
      .get('/api/agents?status=suspended')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
    expect(res.body.agents[0].status).toBe('suspended');
  });

  it('GET /api/agents/:agentId returns full agent', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Detail Agent' });
    const res = await request(app)
      .get(`/api/agents/${create.body.agent.agentId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.agent.agentId).toBe(create.body.agent.agentId);
    expect(res.body.agent.name).toBe('Detail Agent');
    expect(res.body.agent.history).toBeDefined();
  });

  it('GET /api/agents/:agentId cross-business returns 403', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Private Agent' });
    const otherToken = makeAccessToken(otherUser);
    const res = await request(app)
      .get(`/api/agents/${create.body.agent.agentId}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
  });

  it('GET /api/agents/:agentId unknown ID returns 404', async () => {
    const res = await request(app)
      .get('/api/agents/CI-AGT-nonexistent00000000')
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(404);
  });
});

describe('Agent Passport — Update & Revoke', () => {
  it('PUT /api/agents/:agentId updates name and capabilities', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Old Name' });
    const res = await request(app)
      .put(`/api/agents/${create.body.agent.agentId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ name: 'New Name', capabilities: ['web-search'] });

    expect(res.status).toBe(200);
    expect(res.body.agent.name).toBe('New Name');
    expect(res.body.agent.capabilities).toContain('web-search');
    expect(res.body.agent.history.length).toBeGreaterThan(1);
  });

  it('PUT /api/agents/:agentId non-owner returns 403', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Owner Only' });
    const otherToken = makeAccessToken(otherUser);
    const res = await request(app)
      .put(`/api/agents/${create.body.agent.agentId}`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ name: 'Hijacked' });

    expect(res.status).toBe(403);
  });

  it('admin can update agent (not owner)', async () => {
    const adminToken = makeAccessToken(adminUser);
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Admin Update' });
    const res = await request(app)
      .put(`/api/agents/${create.body.agent.agentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Admin Changed It' });

    expect(res.status).toBe(200);
    expect(res.body.agent.name).toBe('Admin Changed It');
  });

  it('DELETE /api/agents/:agentId sets status to revoked', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Revoke Me' });
    const res = await request(app)
      .delete(`/api/agents/${create.body.agent.agentId}`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Agent passport revoked');
    const stored = mockAgentStore.get(create.body.agent.agentId);
    expect(stored.status).toBe('revoked');
    expect(stored.revokedAt).toBeDefined();
  });
});

describe('Agent Passport — Suspend & Resume', () => {
  it('POST /api/agents/:agentId/suspend sets status=suspended', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Suspend Test' });
    const res = await request(app)
      .post(`/api/agents/${create.body.agent.agentId}/suspend`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ reason: 'violated policy' });

    expect(res.status).toBe(200);
    expect(res.body.agent.status).toBe('suspended');
    expect(res.body.agent.suspensionReason).toBe('violated policy');
  });

  it('POST /api/agents/:agentId/resume sets status=active', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Resume Test' });
    await request(app).post(`/api/agents/${create.body.agent.agentId}/suspend`).set('Authorization', `Bearer ${ownerToken}`).send({});

    const res = await request(app)
      .post(`/api/agents/${create.body.agent.agentId}/resume`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.agent.status).toBe('active');
    expect(res.body.agent.suspensionReason).toBeNull();
  });
});

describe('Agent Passport — Permissions', () => {
  it('GET /api/agents/:agentId/permissions returns permissions array', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Perm Test', permissions: ['leads:read', 'pricing:write'] });
    const res = await request(app)
      .get(`/api/agents/${create.body.agent.agentId}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.permissions).toContain('leads:read');
    expect(res.body.permissions).toContain('pricing:write');
  });

  it('POST /api/agents/:agentId/permissions appends new permissions', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Perm Add', permissions: ['read:basic'] });
    const res = await request(app)
      .post(`/api/agents/${create.body.agent.agentId}/permissions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ permissions: ['write:orders', 'delete:logs'] });

    expect(res.status).toBe(200);
    expect(res.body.permissions).toContain('read:basic');
    expect(res.body.permissions).toContain('write:orders');
    expect(res.body.permissions).toContain('delete:logs');
    expect(res.body.permissions.length).toBe(3); // deduplicated
  });
});

describe('Agent Passport — Budget', () => {
  it('GET /api/agents/:agentId/budget returns budget object', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Budget Test', budget: { monthly: 50000, spent: 12000, currency: 'USD' } });
    const res = await request(app)
      .get(`/api/agents/${create.body.agent.agentId}/budget`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.budget.monthly).toBe(50000);
    expect(res.body.budget.spent).toBe(12000);
    expect(res.body.budget.currency).toBe('USD');
  });

  it('POST /api/agents/:agentId/budget/reset resets spent to 0', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Reset Budget', budget: { monthly: 100000, spent: 85000, currency: 'USD' } });
    const res = await request(app)
      .post(`/api/agents/${create.body.agent.agentId}/budget/reset`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.budget.spent).toBe(0);
    expect(res.body.budget.monthly).toBe(100000); // unchanged
  });
});

describe('Agent Passport — Interactions', () => {
  it('POST /api/agents/:agentId/interactions with human token records interaction', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Interact Test' });
    const res = await request(app)
      .post(`/api/agents/${create.body.agent.agentId}/interactions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ type: 'query', success: true, duration: 150, tokensUsed: 500 });

    expect(res.status).toBe(200);
    expect(res.body.interaction.type).toBe('query');
    expect(res.body.interaction.actorType).toBe('human');
    expect(res.body.interaction.actorId).toBe('user-owner001');
  });

  it('POST /api/agents/:agentId/interactions with agent token records interaction', async () => {
    // First create an agent and get its token
    const agentCreate = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Agent Actor' });
    const agentToken = agentCreate.body.agentToken;

    // Create a second agent
    const targetCreate = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Target Agent' });

    // Agent calls interactions endpoint
    const res = await request(app)
      .post(`/api/agents/${targetCreate.body.agent.agentId}/interactions`)
      .set('Authorization', `Bearer ${agentToken}`)
      .send({ type: 'action', success: true });

    expect(res.status).toBe(200);
    expect(res.body.interaction.actorType).toBe('agent');
    expect(res.body.interaction.actorId).toBe(agentCreate.body.agent.agentId);
  });

  it('POST /api/agents/:agentId/interactions on suspended agent returns 403', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'No Interact' });
    await request(app).post(`/api/agents/${create.body.agent.agentId}/suspend`).set('Authorization', `Bearer ${ownerToken}`).send({});

    const res = await request(app)
      .post(`/api/agents/${create.body.agent.agentId}/interactions`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .send({ type: 'query' });

    expect(res.status).toBe(403);
  });

  it('GET /api/agents/:agentId/interactions returns sorted interactions', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'List Interactions' });

    // Record 3 interactions
    await request(app).post(`/api/agents/${create.body.agent.agentId}/interactions`).set('Authorization', `Bearer ${ownerToken}`).send({ type: 'query' });
    await request(app).post(`/api/agents/${create.body.agent.agentId}/interactions`).set('Authorization', `Bearer ${ownerToken}`).send({ type: 'action' });
    await request(app).post(`/api/agents/${create.body.agent.agentId}/interactions`).set('Authorization', `Bearer ${ownerToken}`).send({ type: 'command' });

    const res = await request(app)
      .get(`/api/agents/${create.body.agent.agentId}/interactions`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(3);
    // Most recent first (sorted desc by timestamp)
    expect(res.body.interactions[0].type).toBe('command');
    expect(res.body.interactions[2].type).toBe('query');
  });

  it('GET /api/agents/:agentId/interactions?limit=1 caps results', async () => {
    const create = await request(app).post('/api/agents').set('Authorization', `Bearer ${ownerToken}`).send({ name: 'Limit Test' });
    await request(app).post(`/api/agents/${create.body.agent.agentId}/interactions`).set('Authorization', `Bearer ${ownerToken}`).send({ type: 'a' });
    await request(app).post(`/api/agents/${create.body.agent.agentId}/interactions`).set('Authorization', `Bearer ${ownerToken}`).send({ type: 'b' });

    const res = await request(app)
      .get(`/api/agents/${create.body.agent.agentId}/interactions?limit=1`)
      .set('Authorization', `Bearer ${ownerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.count).toBe(1);
  });
});
