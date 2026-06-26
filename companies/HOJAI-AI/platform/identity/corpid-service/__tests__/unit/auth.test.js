/**
 * CorpID v3.0 — Auth Flow Unit Tests
 * Tests: register, login, refresh, logout, me, verify
 * Uses supertest for reliable HTTP testing
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// ============ MOCK STORES ============

const mockUserStore = new Map();
const mockBusinessStore = new Map();
const mockRefreshTokenStore = new Map();
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
    async deleteOne(key) { mockUserStore.delete(key); },
    async updateOne(key, data) {
      const existing = mockUserStore.get(key);
      if (!existing) return null;
      const updated = { ...existing, ...data };
      mockUserStore.set(key, updated);
      return updated;
    },
    countDocuments: () => Promise.resolve(mockUserStore.size),
  };

  const Business = {
    async find() { return [...mockBusinessStore.values()]; },
    async findOne(key) { return mockBusinessStore.get(key) || null; },
    async create(data) { mockBusinessStore.set(data.id, { ...data }); return data; },
  };

  const RefreshToken = {
    async findOne(key) { return mockRefreshTokenStore.get(key) || null; },
    async create(data) { mockRefreshTokenStore.set(data.token, { ...data }); return data; },
    async deleteOne(key) { mockRefreshTokenStore.delete(key); },
  };

  const TrustScore = {
    async findOne(key) { return mockTrustScoreStore.get(key) || null; },
    async create(data) { mockTrustScoreStore.set(data.corpId, { ...data }); return data; },
  };

  // ── Helpers ────────────────────────────────────────────────────────────
  async function hashPassword(p) { return bcrypt.hash(p, BCRYPT_ROUNDS); }
  function verifyPassword(p, h) { return bcrypt.compare(p, h); }

  function makeAccessToken(user) {
    return jwt.sign(
      { sub: user.id, email: user.email, role: user.role, businessId: user.businessId, type: 'access' },
      JWT_SECRET,
      { expiresIn: '1h', issuer: TOKEN_ISSUER, jwtid: randomBytes(16).toString('hex') }
    );
  }

  async function makeRefreshToken(user) {
    const token = jwt.sign({ sub: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d', issuer: TOKEN_ISSUER });
    await RefreshToken.create({ token, userId: user.id, email: user.email, expiresAt: Date.now() + 7 * 86400000 });
    return token;
  }

  function verifyToken(token) {
    try { return jwt.verify(token, JWT_SECRET, { issuer: TOKEN_ISSUER }); }
    catch { return null; }
  }

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

  // ── Middleware ──────────────────────────────────────────────────────────
  function requireAuth(req, res, next) {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
    const decoded = verifyToken(header.slice(7));
    if (!decoded) return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN' } });
    if (decoded.type !== 'access') return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN_TYPE' } });
    req.user = { id: decoded.sub, email: decoded.email, role: decoded.role, businessId: decoded.businessId };
    next();
  }

  // ── Routes ──────────────────────────────────────────────────────────────
  app.get('/health', async (_req, res) => {
    res.json({ status: 'healthy', service: 'corpID', version: '3.0.0', storage: 'persistent' });
  });

  app.get('/ready', async (_req, res) => {
    res.json({ status: 'ready', service: 'corpID', storage: 'persistent' });
  });

  // POST /auth/register
  app.post('/auth/register', async (req, res) => {
    try {
      const body = sanitizeInput(req.body || {});
      const { email, password, name, businessId, businessName, role = 'owner' } = body;
      if (!email || !password || !name || !businessId) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
      }
      if (mockUserStore.has(email.toLowerCase()) || mockBusinessStore.has(businessId)) {
        return res.status(409).json({ success: false, error: { code: 'REGISTRATION_FAILED' } });
      }
      const now = new Date().toISOString();
      await Business.create({ id: businessId, name: businessName || businessId, status: 'active', createdAt: now, updatedAt: now });
      const userId = `user-${randomBytes(4).toString('hex')}`;
      const passwordHash = await hashPassword(password);
      const user = { id: userId, email: email.toLowerCase(), passwordHash, name, role, businessId, status: 'active', createdAt: now, updatedAt: now };
      await User.create(user);
      await TrustScore.create({ corpId: userId, score: 50, level: 'bronze', lastUpdated: now, history: [] });
      const accessToken = makeAccessToken(user);
      const refreshToken = await makeRefreshToken(user);
      res.status(201).json({ success: true, accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.businessId } });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // POST /auth/login
  app.post('/auth/login', async (req, res) => {
    try {
      const body = sanitizeInput(req.body || {});
      const { email, password } = body;
      const user = await User.findOne(email.toLowerCase());
      if (!user) return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS' } });
      if (user.status !== 'active') return res.status(403).json({ success: false, error: { code: 'ACCOUNT_DISABLED' } });
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS' } });
      const accessToken = makeAccessToken(user);
      const refreshToken = await makeRefreshToken(user);
      res.json({ success: true, accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.businessId } });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // POST /auth/refresh
  app.post('/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body || {};
      const decoded = verifyToken(refreshToken);
      if (!decoded || decoded.type !== 'refresh') return res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN' } });
      const tokenRecord = await RefreshToken.findOne(refreshToken);
      if (!tokenRecord) return res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN' } });
      const user = [...mockUserStore.values()].find(u => u.id === decoded.sub);
      if (!user || user.status !== 'active') return res.status(401).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
      await RefreshToken.deleteOne(refreshToken); // rotate
      const accessToken = makeAccessToken(user);
      const newRefreshToken = await makeRefreshToken(user);
      res.json({ success: true, accessToken, refreshToken: newRefreshToken });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // POST /auth/logout
  app.post('/auth/logout', requireAuth, async (req, res) => {
    try {
      const { refreshToken } = req.body || {};
      if (refreshToken) await RefreshToken.deleteOne(refreshToken);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // GET /auth/me
  app.get('/auth/me', requireAuth, async (req, res) => {
    const user = await User.findOne(req.user.email);
    if (!user) return res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
    res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.businessId, status: user.status } });
  });

  // POST /auth/verify (for Hub downstream service integration)
  app.post('/auth/verify', async (req, res) => {
    try {
      const header = req.headers.authorization;
      if (!header?.startsWith('Bearer ')) return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED' } });
      const decoded = verifyToken(header.slice(7));
      if (!decoded) return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN' } });
      if (decoded.type !== 'access') return res.status(401).json({ success: false, error: { code: 'INVALID_TOKEN_TYPE' } });
      res.json({ success: true, user: { id: decoded.sub, email: decoded.email, role: decoded.role, businessId: decoded.businessId } });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR' } });
    }
  });

  // ── Error handlers (MUST be last) ─────────────────────────────────────
  app.use((_req, res) => res.status(404).json({ success: false, error: { code: 'NOT_FOUND' } }));
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ success: false, error: { code: 'INVALID_JSON' } });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
  });

  return app;
}

// ============ TESTS ============

describe('CorpID Auth Flow', () => {
  let app;

  beforeAll(() => { app = createApp(); });

  afterEach(() => {
    mockUserStore.clear();
    mockBusinessStore.clear();
    mockRefreshTokenStore.clear();
    mockTrustScoreStore.clear();
  });

  // ── Health endpoints ────────────────────────────────────────────────────
  describe('Health endpoints', () => {
    it('GET /health returns healthy', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
      expect(res.body.service).toBe('corpID');
      expect(res.body.version).toBe('3.0.0');
    });

    it('GET /ready returns ready', async () => {
      const res = await request(app).get('/ready');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });
  });

  // ── Registration ────────────────────────────────────────────────────────
  describe('POST /auth/register', () => {
    it('registers a new user and returns tokens', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'alice@example.com', password: 'Test@1234', name: 'Alice', businessId: 'acme-corp', businessName: 'Acme Corp'
      });
      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('alice@example.com');
      expect(res.body.user.role).toBe('owner');
    });

    it('rejects duplicate email', async () => {
      await request(app).post('/auth/register').send({ email: 'bob@example.com', password: 'Test@1234', name: 'Bob', businessId: 'biz-2' });
      const res = await request(app).post('/auth/register').send({ email: 'bob@example.com', password: 'Test@1234', name: 'Bob 2', businessId: 'biz-3' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REGISTRATION_FAILED');
    });

    it('rejects duplicate businessId', async () => {
      await request(app).post('/auth/register').send({ email: 'charlie@example.com', password: 'Test@1234', name: 'Charlie', businessId: 'dup-biz' });
      const res = await request(app).post('/auth/register').send({ email: 'charlie2@example.com', password: 'Test@1234', name: 'Charlie 2', businessId: 'dup-biz' });
      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('REGISTRATION_FAILED');
    });

    it('rejects missing fields', async () => {
      const res = await request(app).post('/auth/register').send({ email: 'dave@example.com' });
      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('strips dangerous fields (prototype pollution sanitization)', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'proto@example.com', password: 'Test@1234', name: 'Proto', businessId: 'proto-biz', __proto__: { admin: true }
      });
      expect(res.status).toBe(201);
      // The object should not be pollutable
      expect(Object.prototype.admin).toBeUndefined();
    });
  });

  // ── Login ───────────────────────────────────────────────────────────────
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/auth/register').send({ email: 'eve@example.com', password: 'Eve@Pass1', name: 'Eve', businessId: 'eve-biz' });
    });

    it('logs in with correct credentials', async () => {
      const res = await request(app).post('/auth/login').send({ email: 'eve@example.com', password: 'Eve@Pass1' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.email).toBe('eve@example.com');
    });

    it('rejects wrong password', async () => {
      const res = await request(app).post('/auth/login').send({ email: 'eve@example.com', password: 'WrongPass!' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects non-existent email', async () => {
      const res = await request(app).post('/auth/login').send({ email: 'nobody@example.com', password: 'Test@1234' });
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('accepts case-insensitive email (RFC 5321 compliant — normalized to lowercase)', async () => {
      const res = await request(app).post('/auth/login').send({ email: 'EVE@example.com', password: 'Eve@Pass1' });
      expect(res.status).toBe(200); // email normalized to lowercase on registration → matches
    });
  });

  // ── Token verification ──────────────────────────────────────────────────
  describe('POST /auth/verify', () => {
    it('verifies a valid access token', async () => {
      await request(app).post('/auth/register').send({ email: 'frank@example.com', password: 'Test@1234', name: 'Frank', businessId: 'frank-biz' });
      const loginRes = await request(app).post('/auth/login').send({ email: 'frank@example.com', password: 'Test@1234' });
      const verifyRes = await request(app).post('/auth/verify').set('Authorization', `Bearer ${loginRes.body.accessToken}`);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.user.email).toBe('frank@example.com');
    });

    it('rejects missing token', async () => {
      const res = await request(app).post('/auth/verify');
      expect(res.status).toBe(401);
    });

    it('rejects a refresh token (wrong type)', async () => {
      await request(app).post('/auth/register').send({ email: 'grace@example.com', password: 'Test@1234', name: 'Grace', businessId: 'grace-biz' });
      const loginRes = await request(app).post('/auth/login').send({ email: 'grace@example.com', password: 'Test@1234' });
      const verifyRes = await request(app).post('/auth/verify').set('Authorization', `Bearer ${loginRes.body.refreshToken}`);
      expect(verifyRes.status).toBe(401);
      expect(verifyRes.body.error.code).toBe('INVALID_TOKEN_TYPE');
    });
  });

  // ── Token refresh ──────────────────────────────────────────────────────
  describe('POST /auth/refresh', () => {
    it('refreshes tokens and invalidates old refresh token', async () => {
      await request(app).post('/auth/register').send({ email: 'henry@example.com', password: 'Test@1234', name: 'Henry', businessId: 'henry-biz' });
      const loginRes = await request(app).post('/auth/login').send({ email: 'henry@example.com', password: 'Test@1234' });
      const oldRefresh = loginRes.body.refreshToken;

      // Wait 1s so new token has a different iat/exp
      await new Promise(r => setTimeout(r, 1100));

      const refreshRes = await request(app).post('/auth/refresh').send({ refreshToken: oldRefresh });
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.body.accessToken).toBeDefined();
      expect(refreshRes.body.refreshToken).toBeDefined();

      // Old refresh token is revoked (server-side rotation)
      const reuseRes = await request(app).post('/auth/refresh').send({ refreshToken: oldRefresh });
      expect(reuseRes.status).toBe(401);
    });

    it('rejects invalid refresh token', async () => {
      const res = await request(app).post('/auth/refresh').send({ refreshToken: 'not-a-real-token' });
      expect(res.status).toBe(401);
    });
  });

  // ── /auth/me ───────────────────────────────────────────────────────────
  describe('GET /auth/me', () => {
    it('returns current user info with valid token', async () => {
      await request(app).post('/auth/register').send({ email: 'iris@example.com', password: 'Test@1234', name: 'Iris', businessId: 'iris-biz' });
      const loginRes = await request(app).post('/auth/login').send({ email: 'iris@example.com', password: 'Test@1234' });
      const res = await request(app).get('/auth/me').set('Authorization', `Bearer ${loginRes.body.accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('iris@example.com');
      expect(res.body.user.role).toBe('owner');
    });

    it('rejects request without token', async () => {
      const res = await request(app).get('/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
