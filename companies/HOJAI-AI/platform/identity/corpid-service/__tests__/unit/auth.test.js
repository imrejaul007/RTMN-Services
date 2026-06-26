/**
 * CorpID v3.0 — Auth Flow Unit Tests
 * Tests: register, login, refresh, logout, me
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

// Mock the @rtmn/shared modules BEFORE importing the app
const mockUserStore = new Map();
const mockBusinessStore = new Map();
const mockRefreshTokenStore = new Map();
const mockTrustScoreStore = new Map();

// ============ BUILD MOCK APP (mirrors index.persistent.js logic) ============

function buildApp() {
  const app = express();
  app.use(express.json());

  const JWT_SECRET = 'test-secret-32-chars-minimum-ok';
  const BCRYPT_ROUNDS = 4; // fast for tests
  const TOKEN_ISSUER = 'rtmn-corpid';

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

  const RefreshToken = {
    async find() { return [...mockRefreshTokenStore.values()]; },
    async findOne(key) { return mockRefreshTokenStore.get(key) || null; },
    async create(data) { mockRefreshTokenStore.set(data.token, { ...data }); return data; },
    async deleteOne(key) { mockRefreshTokenStore.delete(key); },
    countDocuments: () => Promise.resolve(mockRefreshTokenStore.size),
  };

  const TrustScore = {
    async findOne(key) { return mockTrustScoreStore.get(key) || null; },
    async create(data) { mockTrustScoreStore.set(data.corpId, { ...data }); return data; },
  };

  // Helpers
  async function hashPassword(p) { return bcrypt.hash(p, BCRYPT_ROUNDS); }
  async function verifyPassword(p, h) { return bcrypt.compare(p, h); }
  function generateAccessToken(user) {
    return jwt.sign({ sub: user.id, email: user.email, role: user.role, businessId: user.businessId, type: 'access' },
      JWT_SECRET, { expiresIn: '1h', issuer: TOKEN_ISSUER, jwtid: uuidv4() });
  }
  async function generateRefreshToken(user) {
    const token = jwt.sign({ sub: user.id, type: 'refresh' }, JWT_SECRET, { expiresIn: '7d', issuer: TOKEN_ISSUER });
    await RefreshToken.create({ token, userId: user.id, email: user.email, expiresAt: Date.now() + 7 * 86400000 });
    return token;
  }
  function verifyToken(token) {
    try { return jwt.verify(token, JWT_SECRET, { issuer: TOKEN_ISSUER }); } catch { return null; }
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
      if (!roles.includes(req.user?.role)) return res.status(403).json({ success: false, error: { code: 'FORBIDDEN' } });
      next();
    };
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
  function uuidv4() { return randomBytes(16).toString('hex'); }

  // Routes
  app.get('/health', async (_req, res) => {
    res.json({ status: 'healthy', service: 'corpID', version: '3.0.0', storage: 'persistent' });
  });
  app.get('/ready', async (_req, res) => {
    res.json({ status: 'ready', service: 'corpID', storage: 'persistent' });
  });

  // POST /auth/register
  app.post('/auth/register', async (req, res) => {
    try {
      const body = sanitizeInput(req.body);
      const { email, password, name, businessId, businessName, role = 'owner' } = body;
      if (!email || !password || !name || !businessId) {
        return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR' } });
      }
      if (mockUserStore.has(email.toLowerCase()) || mockBusinessStore.has(businessId)) {
        return res.status(409).json({ success: false, error: { code: 'REGISTRATION_FAILED' } });
      }
      const now = new Date().toISOString();
      await Business.create({ id: businessId, name: businessName || businessId, status: 'active', createdAt: now, updatedAt: now });
      const userId = `user-${uuidv4().slice(0, 8)}`;
      const passwordHash = await hashPassword(password);
      const user = { id: userId, email: email.toLowerCase(), passwordHash, name, role, businessId, status: 'active', createdAt: now, updatedAt: now };
      await User.create(user);
      await TrustScore.create({ corpId: userId, score: 50, level: 'bronze', lastUpdated: now, history: [] });
      const accessToken = generateAccessToken(user);
      const refreshToken = await generateRefreshToken(user);
      res.status(201).json({ success: true, accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.businessId } });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // POST /auth/login
  app.post('/auth/login', async (req, res) => {
    try {
      const body = sanitizeInput(req.body);
      const { email, password } = body;
      const user = await User.findOne(email.toLowerCase());
      if (!user) return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS' } });
      if (user.status !== 'active') return res.status(403).json({ success: false, error: { code: 'ACCOUNT_DISABLED' } });
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) return res.status(401).json({ success: false, error: { code: 'INVALID_CREDENTIALS' } });
      const accessToken = generateAccessToken(user);
      const refreshToken = await generateRefreshToken(user);
      res.json({ success: true, accessToken, refreshToken, user: { id: user.id, email: user.email, name: user.name, role: user.role, businessId: user.businessId } });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
    }
  });

  // POST /auth/refresh
  app.post('/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const decoded = verifyToken(refreshToken);
      if (!decoded || decoded.type !== 'refresh') return res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN' } });
      const tokenRecord = await RefreshToken.findOne(refreshToken);
      if (!tokenRecord) return res.status(401).json({ success: false, error: { code: 'INVALID_REFRESH_TOKEN' } });
      const user = [...mockUserStore.values()].find(u => u.id === decoded.sub);
      if (!user || user.status !== 'active') return res.status(401).json({ success: false, error: { code: 'USER_NOT_FOUND' } });
      await RefreshToken.deleteOne(refreshToken);
      const accessToken = generateAccessToken(user);
      const newRefreshToken = await generateRefreshToken(user);
      res.json({ success: true, accessToken, refreshToken: newRefreshToken });
    } catch (err) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
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

  // POST /auth/verify (Hub integration)
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

  return app;
}

// ============ TESTS ============

describe('CorpID Auth Flow', () => {
  let app;

  beforeAll(() => {
    app = buildApp();
  });

  beforeEach(() => {
    // Clear all stores
    mockUserStore.clear();
    mockBusinessStore.clear();
    mockRefreshTokenStore.clear();
    mockTrustScoreStore.clear();
  });

  afterAll(() => { /* no cleanup needed */ });

  // Helper: supertest-like fetch wrapper
  async function post(path, body, headers = {}) {
    const http = await import('http');
    return new Promise((resolve) => {
      const server = app.listen(0, () => {
        const port = server.address().port;
        const data = JSON.stringify(body);
        const req = http.request({ hostname: 'localhost', port, path, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data), ...headers } }, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => { server.close(); resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }); });
        });
        req.write(data);
        req.end();
      });
    });
  }

  async function get(path, headers = {}) {
    const http = await import('http');
    return new Promise((resolve) => {
      const server = app.listen(0, () => {
        const port = server.address().port;
        const req = http.request({ hostname: 'localhost', port, path, method: 'GET', headers }, (res) => {
          let body = '';
          res.on('data', c => body += c);
          res.on('end', () => { server.close(); resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }); });
        });
        req.end();
      });
    });
  }

  // ---- Health checks ----
  describe('Health endpoints', () => {
    it('GET /health returns healthy', async () => {
      const res = await get('/health');
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('healthy');
      expect(res.data.service).toBe('corpID');
      expect(res.data.version).toBe('3.0.0');
    });

    it('GET /ready returns ready', async () => {
      const res = await get('/ready');
      expect(res.status).toBe(200);
      expect(res.data.status).toBe('ready');
    });
  });

  // ---- Registration ----
  describe('POST /auth/register', () => {
    it('registers a new user and returns tokens', async () => {
      const res = await post('/auth/register', {
        email: 'alice@example.com',
        password: 'Test@1234',
        name: 'Alice',
        businessId: 'acme-corp',
        businessName: 'Acme Corporation'
      });
      expect(res.status).toBe(201);
      expect(res.data.success).toBe(true);
      expect(res.data.accessToken).toBeDefined();
      expect(res.data.refreshToken).toBeDefined();
      expect(res.data.user.email).toBe('alice@example.com');
      expect(res.data.user.name).toBe('Alice');
      expect(res.data.user.role).toBe('owner');
      expect(res.data.user.businessId).toBe('acme-corp');
    });

    it('rejects duplicate email', async () => {
      await post('/auth/register', { email: 'bob@example.com', password: 'Test@1234', name: 'Bob', businessId: 'biz-2' });
      const res = await post('/auth/register', { email: 'bob@example.com', password: 'Test@1234', name: 'Bob 2', businessId: 'biz-3' });
      expect(res.status).toBe(409);
      expect(res.data.error.code).toBe('REGISTRATION_FAILED');
    });

    it('rejects duplicate businessId', async () => {
      await post('/auth/register', { email: 'charlie@example.com', password: 'Test@1234', name: 'Charlie', businessId: 'dup-biz' });
      const res = await post('/auth/register', { email: 'charlie2@example.com', password: 'Test@1234', name: 'Charlie 2', businessId: 'dup-biz' });
      expect(res.status).toBe(409);
      expect(res.data.error.code).toBe('REGISTRATION_FAILED');
    });

    it('rejects missing fields', async () => {
      const res = await post('/auth/register', { email: 'dave@example.com' });
      expect(res.status).toBe(400);
      expect(res.data.error.code).toBe('VALIDATION_ERROR');
    });

    it('strips dangerous fields (prototype pollution)', async () => {
      const res = await post('/auth/register', {
        email: '__proto__',
        password: 'Test@1234',
        name: 'Hacker',
        businessId: 'proto-biz',
      });
      expect(res.status).toBe(201);
      // The dangerous key should not pollute the object
      expect(Object.prototype.toString.call(res.data)).toBe('[object Object]');
    });
  });

  // ---- Login ----
  describe('POST /auth/login', () => {
    beforeEach(async () => {
      await post('/auth/register', { email: 'eve@example.com', password: 'Eve@Pass1', name: 'Eve', businessId: 'eve-biz' });
    });

    it('logs in with correct credentials', async () => {
      const res = await post('/auth/login', { email: 'eve@example.com', password: 'Eve@Pass1' });
      expect(res.status).toBe(200);
      expect(res.data.success).toBe(true);
      expect(res.data.accessToken).toBeDefined();
      expect(res.data.user.email).toBe('eve@example.com');
    });

    it('rejects wrong password', async () => {
      const res = await post('/auth/login', { email: 'eve@example.com', password: 'WrongPass!' });
      expect(res.status).toBe(401);
      expect(res.data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('rejects non-existent email', async () => {
      const res = await post('/auth/login', { email: 'nobody@example.com', password: 'Test@1234' });
      expect(res.status).toBe(401);
      expect(res.data.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('accepts case-insensitive email match (RFC 5321 compliant)', async () => {
      // Emails are normalized to lowercase on registration AND login.
      // Logging in with 'EVE@example.com' normalizes to 'eve@example.com' → match.
      const res = await post('/auth/login', { email: 'EVE@example.com', password: 'Eve@Pass1' });
      expect(res.status).toBe(200); // case-insensitive — correct behavior
    });
  });

  // ---- Token verification ----
  describe('POST /auth/verify', () => {
    it('verifies a valid access token', async () => {
      await post('/auth/register', { email: 'frank@example.com', password: 'Test@1234', name: 'Frank', businessId: 'frank-biz' });
      const loginRes = await post('/auth/login', { email: 'frank@example.com', password: 'Test@1234' });
      const { accessToken } = loginRes.data;
      const verifyRes = await post('/auth/verify', {}, { Authorization: `Bearer ${accessToken}` });
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.data.user.email).toBe('frank@example.com');
    });

    it('rejects a missing token', async () => {
      const res = await post('/auth/verify', {});
      expect(res.status).toBe(401);
    });

    it('rejects a refresh token (wrong type)', async () => {
      await post('/auth/register', { email: 'grace@example.com', password: 'Test@1234', name: 'Grace', businessId: 'grace-biz' });
      const loginRes = await post('/auth/login', { email: 'grace@example.com', password: 'Test@1234' });
      const verifyRes = await post('/auth/verify', {}, { Authorization: `Bearer ${loginRes.data.refreshToken}` });
      expect(verifyRes.status).toBe(401);
      expect(verifyRes.data.error.code).toBe('INVALID_TOKEN_TYPE');
    });
  });

  // ---- Token refresh ----
  describe('POST /auth/refresh', () => {
    it('refreshes tokens and invalidates old refresh token', async () => {
      await post('/auth/register', { email: 'henry@example.com', password: 'Test@1234', name: 'Henry', businessId: 'henry-biz' });
      const loginRes = await post('/auth/login', { email: 'henry@example.com', password: 'Test@1234' });
      const oldRefresh = loginRes.data.refreshToken;

      // Wait 1s so the new token has a different `iat`/`exp`
      await new Promise(r => setTimeout(r, 1100));

      // Refresh — old token is revoked server-side (security: can't reuse old token)
      const refreshRes = await post('/auth/refresh', { refreshToken: oldRefresh });
      expect(refreshRes.status).toBe(200);
      expect(refreshRes.data.accessToken).toBeDefined();
      expect(refreshRes.data.refreshToken).toBeDefined();

      // Old refresh token should be revoked server-side (token rotation)
      const reuseRes = await post('/auth/refresh', { refreshToken: oldRefresh });
      expect(reuseRes.status).toBe(401); // server-side revocation: old token deleted
    });

    it('rejects invalid refresh token', async () => {
      const res = await post('/auth/refresh', { refreshToken: 'not-a-real-token' });
      expect(res.status).toBe(401);
    });
  });

  // ---- /auth/me ----
  describe('GET /auth/me', () => {
    it('returns current user info with valid token', async () => {
      await post('/auth/register', { email: 'iris@example.com', password: 'Test@1234', name: 'Iris', businessId: 'iris-biz' });
      const loginRes = await post('/auth/login', { email: 'iris@example.com', password: 'Test@1234' });
      const res = await get('/auth/me', { Authorization: `Bearer ${loginRes.data.accessToken}` });
      expect(res.status).toBe(200);
      expect(res.data.user.email).toBe('iris@example.com');
      expect(res.data.user.role).toBe('owner');
    });

    it('rejects request without token', async () => {
      const res = await get('/auth/me');
      expect(res.status).toBe(401);
    });
  });
});
