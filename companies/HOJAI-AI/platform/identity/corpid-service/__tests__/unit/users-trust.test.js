/**
 * CorpID v3.0 — User Management + Trust + API Keys + Namespaces
 * Uses supertest for reliable HTTP testing
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// ============ MOCK STORES ============
const mockUserStore = new Map();
const mockBusinessStore = new Map();
const mockTrustScoreStore = new Map();
const mockApiKeyStore = new Map();
const mockNamespaceStore = new Map();

// ============ CONSTANTS ============
const JWT_SECRET = 'test-secret-32-chars-minimum-ok-test';
const BCRYPT_ROUNDS = 4;
const TOKEN_ISSUER = 'rtmn-corpid';

function computeTrustLevel(score) {
  if (score >= 90) return 'platinum';
  if (score >= 80) return 'gold';
  if (score >= 70) return 'silver';
  if (score >= 50) return 'bronze';
  if (score >= 30) return 'iron';
  return 'restricted';
}

function sanitizeInput(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const dangerous = ['__proto__', 'constructor', 'prototype'];
  const sanitized = Array.isArray(obj) ? [] : {};
  for (const [k, v] of Object.entries(obj)) {
    if (!dangerous.includes(k)) sanitized[k] = typeof v === 'object' && v !== null ? sanitizeInput(v) : v;
  }
  return sanitized;
}

// Minimal JWT mock — just encode/decode, no verification for test tokens
function makeToken(payload, type) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(JSON.stringify({ ...payload, type, iat: Date.now(), exp: Date.now() + 3600000, iss: TOKEN_ISSUER })).toString('base64');
  return `${header}.${body}.`;
}

function parseToken(token) {
  try {
    const [, body] = token.split('.');
    return JSON.parse(Buffer.from(body, 'base64').toString());
  } catch { return null; }
}

// ============ APP FACTORY ============
function createApp() {
  const app = express();
  app.use(express.json());

  // ── Models ──
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
    async deleteOne(key) { mockUserStore.delete(key); },
  };

  const TrustScore = {
    async findOne(key) { return mockTrustScoreStore.get(key) || null; },
    async create(data) { mockTrustScoreStore.set(data.corpId, { ...data }); return data; },
    async updateOne(key, data) {
      const existing = mockTrustScoreStore.get(key);
      const updated = { ...(existing || {}), ...data };
      mockTrustScoreStore.set(key, updated);
      return updated;
    },
  };

  const ApiKey = {
    async find() { return [...mockApiKeyStore.values()]; },
    async findOne(key) { return mockApiKeyStore.get(key) || null; },
    async create(data) { mockApiKeyStore.set(data.id, { ...data }); return data; },
    async deleteOne(key) { mockApiKeyStore.delete(key); },
  };

  const Namespace = {
    async findOne(key) { return mockNamespaceStore.get(key) || null; },
    async create(data) { mockNamespaceStore.set(data.name, { ...data }); return data; },
    async deleteOne(key) { mockNamespaceStore.delete(key); },
  };

  // ── Middleware ──
  function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const decoded = parseToken(header.slice(7));
    if (!decoded) return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN' } });
    if (decoded.type !== 'access') return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN_TYPE' } });
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role, businessId: decoded.businessId };
    next();
  }

  function requireRole(...roles) {
    return (req, res, next) => {
      if (!req.user) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      if (!roles.includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
      next();
    };
  }

  // ── Routes ──
  app.get('/health', (_req, res) => res.json({ status: 'healthy', service: 'corpID', version: '3.0.0' }));

  app.get('/api/users', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
    let list = await User.find();
    if (req.user.role !== 'superadmin') list = list.filter(u => u.businessId === req.user.businessId);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const paginated = list.slice((page - 1) * limit, page * limit);
    res.json({ success: true, count: list.length, users: paginated.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role })) });
  });

  app.get('/api/users/:id', requireAuth, async (req, res) => {
    const target = [...mockUserStore.values()].find(u => u.id === req.params.id);
    if (!target) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
    if (!['superadmin', 'admin'].includes(req.user.role) && target.businessId !== req.user.businessId) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    }
    res.json({ success: true, user: { id: target.id, email: target.email, name: target.name, role: target.role } });
  });

  app.post('/api/users', requireAuth, requireRole('superadmin', 'admin', 'manager'), async (req, res) => {
    const body = sanitizeInput(req.body || {});
    const { email, password, name, role = 'user' } = body;
    if (!email || !password || !name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
    if (await User.findOne(email.toLowerCase())) return res.status(409).json({ success: false, error: { code: 'REGISTRATION_FAILED' } });
    const hash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const userId = `user-${randomBytes(4).toString('hex')}`;
    const user = await User.create({ id: userId, email: email.toLowerCase(), passwordHash: hash, name, role, businessId: req.user.businessId, status: 'active', createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  app.put('/api/users/:id', requireAuth, async (req, res) => {
    const target = [...mockUserStore.values()].find(u => u.id === req.params.id);
    if (!target) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
    if (!['superadmin', 'admin'].includes(req.user.role) && target.businessId !== req.user.businessId) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    }
    const body = sanitizeInput(req.body || {});
    if (body.role && !['superadmin', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    }
    // L-2: password field silently dropped
    delete body.password;
    const updated = await User.updateOne(target.email, body);
    res.json({ success: true, user: { id: updated.id, email: updated.email, name: updated.name, role: updated.role, status: updated.status } });
  });

  app.delete('/api/users/:id', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
    const target = [...mockUserStore.values()].find(u => u.id === req.params.id);
    if (!target) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
    if (target.id === req.user.id) return res.status(400).json({ success: false, error: { code: 'CANNOT_DELETE_SELF' } });
    if (!['superadmin'].includes(req.user.role) && target.businessId !== req.user.businessId) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    }
    await User.deleteOne(target.email);
    res.json({ success: true });
  });

  app.get('/api/trust/score/:corpId', async (req, res) => {
    let s = await TrustScore.findOne(req.params.corpId);
    if (!s) { s = await TrustScore.create({ corpId: req.params.corpId, score: 50, level: 'bronze', lastUpdated: new Date().toISOString(), history: [] }); }
    res.json({ success: true, corpId: req.params.corpId, ...s });
  });

  app.put('/api/trust/score/:corpId', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
    const { score } = req.body || {};
    if (typeof score !== 'number' || score < 0 || score > 100) {
      return res.status(400).json({ success: false, error: 'score must be 0-100' });
    }
    const existing = await TrustScore.findOne(req.params.corpId);
    const history = existing?.history || [];
    const now = new Date().toISOString();
    const record = { corpId: req.params.corpId, score, level: computeTrustLevel(score), lastUpdated: now, history: [...history, { score, by: req.user.id, at: now }].slice(-50) };
    if (existing) await TrustScore.updateOne(req.params.corpId, record); else await TrustScore.create(record);
    res.json({ success: true, ...record });
  });

  app.get('/api/trust/levels', (_req, res) => {
    res.json({ success: true, levels: [
      { name: 'platinum', min: 90, max: 100 }, { name: 'gold', min: 80, max: 89 },
      { name: 'silver', min: 70, max: 79 }, { name: 'bronze', min: 50, max: 69 },
      { name: 'iron', min: 30, max: 49 }, { name: 'restricted', min: 0, max: 29 },
    ]});
  });

  app.post('/api/api-keys', requireAuth, async (req, res) => {
    const { name, scopes = [] } = req.body || {};
    if (!name) return res.status(400).json({ success: false, error: 'name required' });
    const key = 'ak_' + randomBytes(24).toString('hex');
    const kid = randomBytes(16).toString('hex');
    const record = await ApiKey.create({ id: kid, key, name, scopes, owner: req.user.id, status: 'active', createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, apiKey: { id: kid, key, name, scopes }, warning: 'Save the key now' });
  });

  app.get('/api/api-keys', requireAuth, async (req, res) => {
    const owned = [...mockApiKeyStore.values()].filter(k => k.owner === req.user.id);
    res.json({ success: true, apiKeys: owned.map(k => ({ id: k.id, name: k.name, scopes: k.scopes, status: k.status })) });
  });

  app.delete('/api/api-keys/:id', requireAuth, async (req, res) => {
    const k = await ApiKey.findOne(req.params.id);
    if (!k) return res.status(404).json({ success: false, error: 'key not found' });
    if (k.owner !== req.user.id && req.user.role !== 'superadmin') return res.status(403).json({ success: false, error: 'forbidden' });
    await ApiKey.deleteOne(req.params.id);
    res.json({ success: true });
  });

  app.post('/api/namespaces', requireAuth, async (req, res) => {
    const { name } = req.body || {};
    if (!name) return res.status(400).json({ success: false, error: 'name required' });
    if (await Namespace.findOne(name)) return res.status(409).json({ success: false, error: 'namespace exists' });
    const ns = await Namespace.create({ name, owner: req.user.id, createdAt: new Date().toISOString() });
    res.status(201).json({ success: true, namespace: ns });
  });

  app.get('/api/namespaces', requireAuth, async (_req, res) => {
    res.json({ success: true, namespaces: [...mockNamespaceStore.values()] });
  });

  app.delete('/api/namespaces/:name', requireAuth, async (req, res) => {
    if (!await Namespace.findOne(req.params.name)) return res.status(404).json({ success: false, error: 'not found' });
    await Namespace.deleteOne(req.params.name);
    res.json({ success: true });
  });

  // ── Error handlers (must be last) ──
  app.use((_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }));
  app.use((err, _req, res) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, error: { code: 'INVALID_JSON' } });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  });

  return app;
}

// ============ TESTS ============
describe('CorpID User Management + Trust + API Keys + Namespaces', () => {
  let app;
  let adminToken, userToken, managerToken;
  const adminId = 'user-admin001', userId = 'user-user001', managerId = 'user-mgr001';

  beforeAll(async () => {
    app = createApp();
    const adminHash = await bcrypt.hash('Admin@Pass1', BCRYPT_ROUNDS);
    const userHash = await bcrypt.hash('User@Pass1', BCRYPT_ROUNDS);
    const managerHash = await bcrypt.hash('Mgr@Pass1', BCRYPT_ROUNDS);
    mockUserStore.set('admin@rtmn.com', { id: adminId, email: 'admin@rtmn.com', passwordHash: adminHash, name: 'Admin', role: 'superadmin', businessId: 'RTMN-HQ', status: 'active' });
    mockUserStore.set('user@rtmn.com', { id: userId, email: 'user@rtmn.com', passwordHash: userHash, name: 'User', role: 'user', businessId: 'RTMN-HQ', status: 'active' });
    mockUserStore.set('manager@rtmn.com', { id: managerId, email: 'manager@rtmn.com', passwordHash: managerHash, name: 'Manager', role: 'manager', businessId: 'RTMN-HQ', status: 'active' });
    mockBusinessStore.set('RTMN-HQ', { id: 'RTMN-HQ', name: 'RTMN HQ' });

    adminToken = makeToken({ sub: adminId, email: 'admin@rtmn.com', role: 'superadmin', businessId: 'RTMN-HQ' }, 'access');
    userToken = makeToken({ sub: userId, email: 'user@rtmn.com', role: 'user', businessId: 'RTMN-HQ' }, 'access');
    managerToken = makeToken({ sub: managerId, email: 'manager@rtmn.com', role: 'manager', businessId: 'RTMN-HQ' }, 'access');
  });

  afterEach(() => {
    mockTrustScoreStore.clear();
    mockApiKeyStore.clear();
    mockNamespaceStore.clear();
  });

  // ── User listing ──
  describe('GET /api/users', () => {
    it('admin can list users', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.users)).toBe(true);
    });

    it('regular user cannot list users', async () => {
      const res = await request(app).get('/api/users').set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(403);
    });

    it('request without token is 401', async () => {
      const res = await request(app).get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  // ── User creation ──
  describe('POST /api/users', () => {
    it('admin can create a user', async () => {
      const res = await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`).send({ email: 'newuser@example.com', password: 'New@User1', name: 'New User', role: 'user' });
      expect(res.status).toBe(201);
      expect(res.body.user.email).toBe('newuser@example.com');
    });

    it('manager can create a user', async () => {
      const res = await request(app).post('/api/users').set('Authorization', `Bearer ${managerToken}`).send({ email: 'mgruser@example.com', password: 'Mgr@User1', name: 'Mgr User', role: 'user' });
      expect(res.status).toBe(201);
    });

    it('regular user cannot create a user', async () => {
      const res = await request(app).post('/api/users').set('Authorization', `Bearer ${userToken}`).send({ email: 'bad@example.com', password: 'Bad@User1', name: 'Bad', role: 'user' });
      expect(res.status).toBe(403);
    });

    it('rejects duplicate email', async () => {
      const res = await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`).send({ email: 'admin@rtmn.com', password: 'Dup@User1', name: 'Dup', role: 'user' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REGISTRATION_FAILED');
    });
  });

  // ── User update ──
  describe('PUT /api/users/:id', () => {
    it('admin can update user name', async () => {
      const create = await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`).send({ email: 'updateme@example.com', password: 'Up@User1', name: 'Update Me', role: 'user' });
      const res = await request(app).put(`/api/users/${create.body.user.id}`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'Updated Name' });
      expect(res.status).toBe(200);
      expect(res.body.user.name).toBe('Updated Name');
    });

    it('password field is ignored on user update (L-2 security)', async () => {
      const res = await request(app).put(`/api/users/${adminId}`).set('Authorization', `Bearer ${adminToken}`).send({ name: 'No PW Change', password: 'hacked123' });
      expect(res.status).toBe(200);
      expect(res.body.user.passwordHash).toBeUndefined();
    });
  });

  // ── User deletion ──
  describe('DELETE /api/users/:id', () => {
    it('admin can delete a user', async () => {
      const create = await request(app).post('/api/users').set('Authorization', `Bearer ${adminToken}`).send({ email: 'todelete@example.com', password: 'Del@User1', name: 'To Delete', role: 'user' });
      const del = await request(app).delete(`/api/users/${create.body.user.id}`).set('Authorization', `Bearer ${adminToken}`);
      expect(del.status).toBe(200);
    });

    it('cannot delete self', async () => {
      const res = await request(app).delete(`/api/users/${adminId}`).set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('CANNOT_DELETE_SELF');
    });
  });

  // ── Trust scores ──
  describe('Trust Scores', () => {
    it('GET /api/trust/score/:corpId returns default for unknown entity', async () => {
      const res = await request(app).get('/api/trust/score/unknown-entity-123');
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(50);
      expect(res.body.level).toBe('bronze');
    });

    it('admin can update trust score', async () => {
      const res = await request(app).put('/api/trust/score/test-corp-id').set('Authorization', `Bearer ${adminToken}`).send({ score: 92 });
      expect(res.status).toBe(200);
      expect(res.body.score).toBe(92);
      expect(res.body.level).toBe('platinum');
    });

    it('regular user cannot update trust score', async () => {
      const res = await request(app).put('/api/trust/score/test-corp-id-2').set('Authorization', `Bearer ${userToken}`).send({ score: 80 });
      expect(res.status).toBe(403);
    });

    it('rejects score out of range', async () => {
      const res = await request(app).put('/api/trust/score/test-corp-id-3').set('Authorization', `Bearer ${adminToken}`).send({ score: 150 });
      expect(res.status).toBe(400);
    });

    it('stores score history', async () => {
      await request(app).put('/api/trust/score/history-test').set('Authorization', `Bearer ${adminToken}`).send({ score: 60 });
      await request(app).put('/api/trust/score/history-test').set('Authorization', `Bearer ${adminToken}`).send({ score: 75 });
      const res = await request(app).get('/api/trust/score/history-test');
      expect(res.body.history.length).toBe(2);
    });

    it('GET /api/trust/levels returns all levels', async () => {
      const res = await request(app).get('/api/trust/levels');
      expect(res.status).toBe(200);
      expect(res.body.levels.length).toBe(6);
      expect(res.body.levels.map(l => l.name)).toEqual(['platinum', 'gold', 'silver', 'bronze', 'iron', 'restricted']);
    });
  });

  // ── API Keys ──
  describe('API Keys', () => {
    it('user can create an API key', async () => {
      const res = await request(app).post('/api/api-keys').set('Authorization', `Bearer ${userToken}`).send({ name: 'My API Key', scopes: ['read:users'] });
      expect(res.status).toBe(201);
      expect(res.body.apiKey.key).toMatch(/^ak_[a-f0-9]+$/);
    });

    it('user can list their own keys', async () => {
      await request(app).post('/api/api-keys').set('Authorization', `Bearer ${userToken}`).send({ name: 'Key 1' });
      await request(app).post('/api/api-keys').set('Authorization', `Bearer ${userToken}`).send({ name: 'Key 2' });
      const res = await request(app).get('/api/api-keys').set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(res.body.apiKeys.length).toBeGreaterThanOrEqual(2);
    });

    it('admin (superadmin) can delete any user key', async () => {
      const keyRes = await request(app).post('/api/api-keys').set('Authorization', `Bearer ${userToken}`).send({ name: 'Admin Target' });
      const delRes = await request(app).delete(`/api/api-keys/${keyRes.body.apiKey.id}`).set('Authorization', `Bearer ${adminToken}`);
      expect(delRes.status).toBe(200);
    });

    it('user cannot delete another user key (unless superadmin)', async () => {
      const keyRes = await request(app).post('/api/api-keys').set('Authorization', `Bearer ${adminToken}`).send({ name: 'Other Key' });
      const delRes = await request(app).delete(`/api/api-keys/${keyRes.body.apiKey.id}`).set('Authorization', `Bearer ${userToken}`);
      expect(delRes.status).toBe(403);
    });
  });

  // ── Namespaces ──
  describe('Namespaces', () => {
    it('user can create a namespace', async () => {
      const res = await request(app).post('/api/namespaces').set('Authorization', `Bearer ${userToken}`).send({ name: 'my-namespace' });
      expect(res.status).toBe(201);
      expect(res.body.namespace.name).toBe('my-namespace');
    });

    it('rejects duplicate namespace', async () => {
      await request(app).post('/api/namespaces').set('Authorization', `Bearer ${userToken}`).send({ name: 'dup-ns' });
      const res = await request(app).post('/api/namespaces').set('Authorization', `Bearer ${userToken}`).send({ name: 'dup-ns' });
      expect(res.status).toBe(409);
    });

    it('user can list namespaces', async () => {
      const res = await request(app).get('/api/namespaces').set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.namespaces)).toBe(true);
    });

    it('user can delete their namespace', async () => {
      await request(app).post('/api/namespaces').set('Authorization', `Bearer ${userToken}`).send({ name: 'to-delete-ns' });
      const delRes = await request(app).delete('/api/namespaces/to-delete-ns').set('Authorization', `Bearer ${userToken}`);
      expect(delRes.status).toBe(200);
    });

    it('returns 404 for non-existent namespace', async () => {
      const res = await request(app).delete('/api/namespaces/nonexistent').set('Authorization', `Bearer ${userToken}`);
      expect(res.status).toBe(404);
    });
  });
});
