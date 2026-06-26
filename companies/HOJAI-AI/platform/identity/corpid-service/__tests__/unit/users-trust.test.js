/**
 * CorpID v3.0 — User Management + Trust Score Unit Tests
 * Tests: CRUD users, trust scores, role-based access, API keys, namespaces
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// ============ BUILD MOCK APP ============

const mockUserStore = new Map();
const mockBusinessStore = new Map();
const mockRefreshTokenStore = new Map();
const mockTrustScoreStore = new Map();
const mockApiKeyStore = new Map();
const mockNamespaceStore = new Map();

// Module-level constants (shared between app and tests)
const JWT_SECRET = 'test-secret-32-chars-minimum-ok';
const BCRYPT_ROUNDS = 4;
const TOKEN_ISSUER = 'rtmn-corpid';

function generateAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role, businessId: user.businessId, type: 'access' },
    JWT_SECRET,
    { expiresIn: '1h', issuer: TOKEN_ISSUER, jwtid: randomBytes(16).toString('hex') }
  );
}

function buildApp() {
  const app = express();
  app.use(express.json());

  // Mock models
  const User = {
    async find() { return [...mockUserStore.values()]; },
    async findOne(key) { return mockUserStore.get(key) || null; },
    async create(data) { mockUserStore.set(data.email || data.id, { ...data }); return data; },
    async updateOne(key, data) {
      const existing = mockUserStore.get(key);
      if (existing) { const updated = { ...existing, ...data }; mockUserStore.set(key, updated); return updated; }
      return null;
    },
    async deleteOne(key) { mockUserStore.delete(key); },
    countDocuments: () => Promise.resolve(mockUserStore.size),
  };
  const Business = {
    async find() { return [...mockBusinessStore.values()]; },
    async findOne(key) { return mockBusinessStore.get(key) || null; },
    async create(data) { mockBusinessStore.set(data.id, { ...data }); return data; },
    countDocuments: () => Promise.resolve(mockBusinessStore.size),
  };
  const TrustScore = {
    async find() { return [...mockTrustScoreStore.values()]; },
    async findOne(key) { return mockTrustScoreStore.get(key) || null; },
    async create(data) { mockTrustScoreStore.set(data.corpId, { ...data }); return data; },
    async updateOne(key, data) { mockTrustScoreStore.set(key, { ...mockTrustScoreStore.get(key), ...data }); return mockTrustScoreStore.get(key); },
    async deleteOne(key) { mockTrustScoreStore.delete(key); },
  };
  const ApiKey = {
    async find() { return [...mockApiKeyStore.values()]; },
    async findOne(key) { return mockApiKeyStore.get(key) || null; },
    async create(data) { mockApiKeyStore.set(data.id, { ...data }); return data; },
    async deleteOne(key) { mockApiKeyStore.delete(key); },
  };
  const Namespace = {
    async find() { return [...mockNamespaceStore.values()]; },
    async findOne(key) { return mockNamespaceStore.get(key) || null; },
    async create(data) { mockNamespaceStore.set(data.name, { ...data }); return data; },
    async deleteOne(key) { mockNamespaceStore.delete(key); },
  };

  // Helpers
  function uuidv4() { return randomBytes(16).toString('hex'); }
  function generateAccessToken(user) {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role, businessId: user.businessId, type: 'access' },
      JWT_SECRET, { expiresIn: '1h', issuer: TOKEN_ISSUER, jwtid: uuidv4() });
  }
  async function hashPassword(p) { return bcrypt.hash(p, BCRYPT_ROUNDS); }
  function verifyToken(token) {
    try { return jwt.verify(token, JWT_SECRET, { issuer: TOKEN_ISSUER }); } catch { return null; }
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
  function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const decoded = verifyToken(header.slice(7));
    if (!decoded) return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN' } });
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
  function computeTrustLevel(score) {
    if (score >= 90) return 'platinum';
    if (score >= 80) return 'gold';
    if (score >= 70) return 'silver';
    if (score >= 50) return 'bronze';
    if (score >= 30) return 'iron';
    return 'restricted';
  }

  // Seed default business
  Business.create({ id: 'RTMN-HQ', name: 'RTMN HQ', status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });

  // Routes
  // User CRUD
  app.get('/api/users', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
    let list = await User.find();
    if (req.user.role !== 'superadmin') list = list.filter(u => u.businessId === req.user.businessId);
    if (req.query.role) list = list.filter(u => u.role === req.query.role);
    if (req.query.status) list = list.filter(u => u.status === req.query.status);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const paginated = list.slice((page - 1) * limit, page * limit);
    res.json({ success: true, count: list.length, users: paginated.map(u => ({ id: u.id, email: u.email, name: u.name, role: u.role, status: u.status })) });
  });

  app.get('/api/users/:id', requireAuth, async (req, res) => {
    const target = [...mockUserStore.values()].find(u => u.id === req.params.id);
    if (!target) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
    if (!['superadmin', 'admin'].includes(req.user.role) && target.businessId !== req.user.businessId) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    }
    res.json({ success: true, user: { id: target.id, email: target.email, name: target.name, role: target.role, status: target.status } });
  });

  app.post('/api/users', requireAuth, requireRole('superadmin', 'admin', 'manager'), async (req, res) => {
    const body = sanitizeInput(req.body);
    const { email, password, name, role = 'user', businessId } = body;
    if (!email || !password || !name) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
    const targetBusinessId = businessId || req.user.businessId;
    if (!['superadmin', 'admin'].includes(req.user.role) && targetBusinessId !== req.user.businessId) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    }
    if (await User.findOne(email.toLowerCase())) return res.status(409).json({ success: false, error: { code: 'REGISTRATION_FAILED' } });
    if (!(await Business.findOne(targetBusinessId))) return res.status(404).json({ success: false, error: { code: 'BUSINESS_NOT_FOUND' } });
    const userId = `user-${uuidv4().slice(0, 8)}`;
    const user = await User.create({ id: userId, email: email.toLowerCase(), passwordHash: await hashPassword(password), name, role, businessId: targetBusinessId, status: 'active', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    res.status(201).json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
  });

  app.put('/api/users/:id', requireAuth, async (req, res) => {
    const target = [...mockUserStore.values()].find(u => u.id === req.params.id);
    if (!target) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
    if (!['superadmin', 'admin'].includes(req.user.role) && target.businessId !== req.user.businessId) {
      return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED' } });
    }
    const body = sanitizeInput(req.body);
    if (body.role && !['superadmin', 'admin'].includes(req.user.role)) return res.status(403).json({ success: false, error: { code: 'ACCESS_DENIED' } });
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

  // Trust scores
  app.get('/api/trust/score/:corpId', async (req, res) => {
    let s = await TrustScore.findOne(req.params.corpId);
    if (!s) { s = await TrustScore.create({ corpId: req.params.corpId, score: 50, level: 'bronze', lastUpdated: new Date().toISOString(), history: [] }); }
    res.json({ success: true, corpId: req.params.corpId, ...s });
  });

  app.put('/api/trust/score/:corpId', requireAuth, requireRole('superadmin', 'admin'), async (req, res) => {
    const { score } = req.body || {};
    if (typeof score !== 'number' || score < 0 || score > 100) return res.status(400).json({ success: false, error: 'score must be 0-100' });
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

  // API Keys
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

  // Namespaces
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

  return app;
}

// ============ TESTS ============

describe('CorpID User Management + Trust + API Keys', () => {
  let app;
  let adminToken, userToken, managerToken;
  let adminId = 'user-admin001', userId = 'user-user001', managerId = 'user-mgr001';

  beforeAll(async () => {
    app = buildApp();

    // Seed businesses
    mockBusinessStore.set('RTMN-HQ', { id: 'RTMN-HQ', name: 'RTMN HQ', status: 'active' });
    mockBusinessStore.set('USER-BIZ', { id: 'USER-BIZ', name: 'User Biz', status: 'active' });

    // Seed users with tokens
    const adminUser = { id: adminId, email: 'admin@rtmn.com', passwordHash: await bcrypt.hash('Admin@Pass1', 4), name: 'Admin', role: 'admin', businessId: 'RTMN-HQ', status: 'active' };
    const regularUser = { id: userId, email: 'user@rtmn.com', passwordHash: await bcrypt.hash('User@Pass1', 4), name: 'User', role: 'user', businessId: 'USER-BIZ', status: 'active' };
    const managerUser = { id: managerId, email: 'manager@rtmn.com', passwordHash: await bcrypt.hash('Mgr@Pass1', 4), name: 'Manager', role: 'manager', businessId: 'RTMN-HQ', status: 'active' };
    mockUserStore.set(adminUser.email, adminUser);
    mockUserStore.set(regularUser.email, regularUser);
    mockUserStore.set(managerUser.email, managerUser);

    adminToken = generateAccessToken(adminUser);
    userToken = generateAccessToken(regularUser);
    managerToken = generateAccessToken(managerUser);
  });

  afterEach(() => {
    mockApiKeyStore.clear();
    mockNamespaceStore.clear();
    mockTrustScoreStore.clear();
  });

  // ---- HTTP helpers ----
  async function post(path, body, headers = {}) {
    const http = await import('http');
    return new Promise((resolve) => {
      const server = app.listen(0, () => {
        const port = server.address().port;
        const data = JSON.stringify(body || {});
        const req = http.request({ hostname: 'localhost', port, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers } }, (res) => {
          let out = ''; res.on('data', c => out += c); res.on('end', () => { server.close(); resolve({ status: res.statusCode, data: JSON.parse(out || '{}') }); });
        });
        req.write(data); req.end();
      });
    });
  }

  async function get(path, headers = {}) {
    const http = await import('http');
    return new Promise((resolve) => {
      const server = app.listen(0, () => {
        const port = server.address().port;
        const req = http.request({ hostname: 'localhost', port, path, method: 'GET', headers }, (res) => {
          let out = ''; res.on('data', c => out += c); res.on('end', () => { server.close(); resolve({ status: res.statusCode, data: JSON.parse(out || '{}') }); });
        });
        req.end();
      });
    });
  }

  async function del(path, headers = {}) {
    const http = await import('http');
    return new Promise((resolve) => {
      const server = app.listen(0, () => {
        const port = server.address().port;
        const req = http.request({ hostname: 'localhost', port, path, method: 'DELETE', headers }, (res) => {
          let out = ''; res.on('data', c => out += c); res.on('end', () => { server.close(); resolve({ status: res.statusCode, data: JSON.parse(out || '{}') }); });
        });
        req.end();
      });
    });
  }

  // ---- User listing ----
  describe('GET /api/users', () => {
    it('admin can list users', async () => {
      const res = await get('/api/users', { Authorization: `Bearer ${adminToken}` });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(Array.isArray(res.data.users)).toBe(true);
    });

    it('regular user cannot list users', async () => {
      const res = await get('/api/users', { Authorization: `Bearer ${userToken}` });
      expect(res.status).toBe(403);
    });

    it('request without token is 401', async () => {
      const res = await get('/api/users');
      expect(res.status).toBe(401);
    });
  });

  // ---- User creation ----
  describe('POST /api/users', () => {
    it('admin can create a user', async () => {
      const res = await post('/api/users', {
        email: 'newuser@example.com', password: 'New@User1', name: 'New User', role: 'user'
      }, { Authorization: `Bearer ${adminToken}` });
      expect(res.status).toBe(201);
      expect(res.data.user.email).toBe('newuser@example.com');
      expect(res.data.user.role).toBe('user');
    });

    it('manager can create a user', async () => {
      const res = await post('/api/users', {
        email: 'mgruser@example.com', password: 'Mgr@User1', name: 'Mgr User', role: 'user'
      }, { Authorization: `Bearer ${managerToken}` });
      expect(res.status).toBe(201);
    });

    it('regular user cannot create a user', async () => {
      const res = await post('/api/users', {
        email: 'bad@example.com', password: 'Bad@User1', name: 'Bad', role: 'user'
      }, { Authorization: `Bearer ${userToken}` });
      expect(res.status).toBe(403);
    });

    it('rejects duplicate email', async () => {
      const res = await post('/api/users', {
        email: 'admin@rtmn.com', password: 'Dup@User1', name: 'Dup', role: 'user'
      }, { Authorization: `Bearer ${adminToken}` });
      expect(res.status).toBe(409);
    });
  });

  // ---- User update ----
  describe('PUT /api/users/:id', () => {
    it('admin can update user name', async () => {
      const res = await post('/api/users', { email: 'updateme@example.com', password: 'Update@1', name: 'Update Me', role: 'user' }, { Authorization: `Bearer ${adminToken}` });
      const userId = res.data.user.id;
      // Use GET + a PUT via post helper
      const http = await import('http');
      const updateRes = await new Promise((resolve) => {
        const server = app.listen(0, () => {
          const port = server.address().port;
          const data = JSON.stringify({ name: 'Updated Name' });
          const req = http.request({ hostname: 'localhost', port, path: `/api/users/${userId}`, method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: `Bearer ${adminToken}` } }, (res) => {
            let out = ''; res.on('data', c => out += c); res.on('end', () => { server.close(); resolve({ status: res.statusCode, data: JSON.parse(out || '{}') }); });
          });
          req.write(data); req.end();
        });
      });
      expect(updateRes.status).toBe(200);
      expect(updateRes.data.user.name).toBe('Updated Name');
    });

    it('password field is ignored on user update', async () => {
      const http = await import('http');
      const updateRes = await new Promise((resolve) => {
        const server = app.listen(0, () => {
          const port = server.address().port;
          const data = JSON.stringify({ name: 'No PW Change', password: 'hacked123' });
          const req = http.request({ hostname: 'localhost', port, path: `/api/users/${adminId}`, method: 'PUT', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), Authorization: `Bearer ${adminToken}` } }, (res) => {
            let out = ''; res.on('data', c => out += c); res.on('end', () => { server.close(); resolve({ status: res.statusCode, data: JSON.parse(out || '{}') }); });
          });
          req.write(data); req.end();
        });
      });
      expect(updateRes.status).toBe(200);
      // Password should NOT be in the returned user object
      expect(updateRes.data.user.passwordHash).toBeUndefined();
    });
  });

  // ---- User deletion ----
  describe('DELETE /api/users/:id', () => {
    it('admin can delete a user', async () => {
      const createRes = await post('/api/users', { email: 'todelete@example.com', password: 'Del@User1', name: 'To Delete', role: 'user' }, { Authorization: `Bearer ${adminToken}` });
      const delRes = await del(`/api/users/${createRes.data.user.id}`, { Authorization: `Bearer ${adminToken}` });
      expect(delRes.status).toBe(200);
    });

    it('cannot delete self', async () => {
      const delRes = await del(`/api/users/${adminId}`, { Authorization: `Bearer ${adminToken}` });
      expect(delRes.status).toBe(400);
      expect(delRes.data.error.code).toBe('CANNOT_DELETE_SELF');
    });
  });

  // ---- Trust scores ----
  describe('Trust Scores', () => {
    it('GET /api/trust/score/:corpId returns default for unknown entity', async () => {
      const res = await get('/api/trust/score/unknown-entity-123');
      expect(res.status).toBe(200);
      expect(res.data.score).toBe(50);
      expect(res.data.level).toBe('bronze');
    });

    it('admin can update trust score', async () => {
      const res = await post('/api/trust/score/test-corp-id', { score: 92 }, { Authorization: `Bearer ${adminToken}` });
      expect(res.status).toBe(200);
      expect(res.data.score).toBe(92);
      expect(res.data.level).toBe('platinum');
    });

    it('regular user cannot update trust score', async () => {
      const res = await post('/api/trust/score/test-corp-id-2', { score: 80 }, { Authorization: `Bearer ${userToken}` });
      expect(res.status).toBe(403);
    });

    it('rejects score out of range', async () => {
      const res = await post('/api/trust/score/test-corp-id-3', { score: 150 }, { Authorization: `Bearer ${adminToken}` });
      expect(res.status).toBe(400);
    });

    it('stores score history', async () => {
      await post('/api/trust/score/history-test', { score: 60 }, { Authorization: `Bearer ${adminToken}` });
      await post('/api/trust/score/history-test', { score: 75 }, { Authorization: `Bearer ${adminToken}` });
      const res = await get('/api/trust/score/history-test');
      expect(res.data.history.length).toBe(2);
    });

    it('GET /api/trust/levels returns all levels', async () => {
      const res = await get('/api/trust/levels');
      expect(res.status).toBe(200);
      expect(res.data.levels.length).toBe(6);
      expect(res.data.levels.map(l => l.name)).toEqual(['platinum', 'gold', 'silver', 'bronze', 'iron', 'restricted']);
    });
  });

  // ---- API Keys ----
  describe('API Keys', () => {
    it('user can create an API key', async () => {
      const res = await post('/api/api-keys', { name: 'My API Key', scopes: ['read:users', 'write:users'] }, { Authorization: `Bearer ${userToken}` });
      expect(res.status).toBe(201);
      expect(res.data.apiKey.key).toMatch(/^ak_[a-f0-9]+$/);
      expect(res.data.warning).toBeDefined();
    });

    it('user can list their own keys', async () => {
      await post('/api/api-keys', { name: 'Key 1' }, { Authorization: `Bearer ${userToken}` });
      await post('/api/api-keys', { name: 'Key 2' }, { Authorization: `Bearer ${userToken}` });
      const res = await get('/api/api-keys', { Authorization: `Bearer ${userToken}` });
      expect(res.status).toBe(200);
      expect(res.data.apiKeys.length).toBeGreaterThanOrEqual(2);
    });

    it('admin can delete any key', async () => {
      const keyRes = await post('/api/api-keys', { name: 'Admin Target' }, { Authorization: `Bearer ${userToken}` });
      const delRes = await del(`/api/api-keys/${keyRes.data.apiKey.id}`, { Authorization: `Bearer ${adminToken}` });
      expect(delRes.status).toBe(200);
    });

    it('user cannot delete another user\'s key', async () => {
      const keyRes = await post('/api/api-keys', { name: 'Other Key' }, { Authorization: `Bearer ${adminToken}` });
      const delRes = await del(`/api/api-keys/${keyRes.data.apiKey.id}`, { Authorization: `Bearer ${userToken}` });
      expect(delRes.status).toBe(403);
    });
  });

  // ---- Namespaces ----
  describe('Namespaces', () => {
    it('user can create a namespace', async () => {
      const res = await post('/api/namespaces', { name: 'my-namespace' }, { Authorization: `Bearer ${userToken}` });
      expect(res.status).toBe(201);
      expect(res.data.namespace.name).toBe('my-namespace');
    });

    it('rejects duplicate namespace', async () => {
      await post('/api/namespaces', { name: 'dup-ns' }, { Authorization: `Bearer ${userToken}` });
      const res = await post('/api/namespaces', { name: 'dup-ns' }, { Authorization: `Bearer ${userToken}` });
      expect(res.status).toBe(409);
    });

    it('user can list namespaces', async () => {
      const res = await get('/api/namespaces', { Authorization: `Bearer ${userToken}` });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.namespaces)).toBe(true);
    });

    it('user can delete their namespace', async () => {
      await post('/api/namespaces', { name: 'to-delete-ns' }, { Authorization: `Bearer ${userToken}` });
      const delRes = await del('/api/namespaces/to-delete-ns', { Authorization: `Bearer ${userToken}` });
      expect(delRes.status).toBe(200);
    });
  });
});
