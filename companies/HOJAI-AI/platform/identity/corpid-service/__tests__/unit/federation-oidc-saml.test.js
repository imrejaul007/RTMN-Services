/**
 * CorpID Federation + OIDC/SAML Tests
 * Tests for Phase 6 Federation endpoints: ACP bridge, OIDC provider, SAML SP
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock persistent-store
vi.mock('../../../../shared/lib/persistent-store.js', () => {
  const store = new Map();
  const userStore = new Map();
  const agentStore = new Map();
  const trustStore = new Map();
  const delegationStore = new Map();

  const createStore = () => {
    const m = new Map();
    return {
      get: (k) => m.get(k),
      set: (k, v) => m.set(k, v),
      delete: (k) => m.delete(k),
      has: (k) => m.has(k),
      clear: () => m.clear(),
      _m: m,
    };
  };

  const userMock = createStore();
  const agentMock = createStore();
  const trustMock = createStore();
  const delegationMock = createStore();
  const fedLinkMock = createStore();

  const mockModel = (name) => ({
    findOne: vi.fn((key) => {
      if (name === 'User') return Promise.resolve(userMock._m.get(key) || null);
      if (name === 'Agent') return Promise.resolve(agentMock._m.get(key) || null);
      if (name === 'TrustScore') return Promise.resolve(trustMock._m.get(key) || null);
      if (name === 'Delegation') {
        if (typeof key === 'string') return Promise.resolve(delegationMock._m.get(key) || null);
        // Query by field
        const [field, value] = Object.entries(key)[0];
        return Promise.resolve([...delegationMock._m.values()].find(d => d[field] === value) || null);
      }
      if (name === 'FedLink') return Promise.resolve(fedLinkMock._m.get(key) || null);
      return Promise.resolve(null);
    }),
    find: vi.fn(() => {
      if (name === 'Delegation') return Promise.resolve([...delegationMock._m.values()]);
      if (name === 'FedLink') return Promise.resolve([...fedLinkMock._m.values()]);
      return Promise.resolve([]);
    }),
    create: vi.fn((data) => {
      if (name === 'Delegation') delegationMock._m.set(data.delegationId, data);
      if (name === 'FedLink') fedLinkMock._m.set(data.linkId, data);
      return Promise.resolve(data);
    }),
    updateOne: vi.fn(() => Promise.resolve({})),
    deleteOne: vi.fn(() => Promise.resolve()),
  });

  return {
    createModel: vi.fn((name) => mockModel(name)),
    _reset: () => {
      userMock._m.clear();
      agentMock._m.clear();
      trustMock._m.clear();
      delegationMock._m.clear();
      fedLinkMock._m.clear();
    },
    _stores: { userMock, agentMock, trustMock, delegationMock, fedLinkMock },
  };
});

vi.mock('../../../../shared/lib/logger.js', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    error: vi.fn(),
  }),
}));

// Import after mocks
const { createModel, _reset, _stores } = await import('../../../../shared/lib/persistent-store.js');
const { createLogger } = await import('../../../../shared/lib/logger.js');

// Inline minimal app factory to test specific routes
import express from 'express';
import { body, validationResult } from 'express-validator';

const PORT = 4702;
const JWT_SECRET = 'test-secret';
const JWT_EXPIRES_IN = '1h';
const REFRESH_EXPIRES_IN = '7d';
const TOKEN_ISSUER = 'rtmn-corpid';

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const NotFoundError = class extends Error { constructor(msg) { super(msg); this.status = 404; } };
const ValidationError = class extends Error { constructor(msg) { super(msg); this.status = 400; } };
const UnauthorizedError = class extends Error { constructor(msg) { super(msg); this.status = 401; } };
const ForbiddenError = class extends Error { constructor(msg) { super(msg); this.status = 403; } };
const ConflictError = class extends Error { constructor(msg) { super(msg); this.status = 409; } };

function sanitizeInput(obj) { return obj; }
function validate(req, res, next) { validationResult(req).throw(); next(); }

const OAUTH_PROVIDERS = {
  google: { id: 'google', name: 'Google', authUrl: 'https://accounts.google.com/o/oauth2/auth' },
  github: { id: 'github', name: 'GitHub', authUrl: 'https://github.com/login/oauth/authorize' },
};

const User = createModel('User');
const Agent = createModel('Agent');
const TrustScore = createModel('TrustScore');
const Delegation = createModel('Delegation');
const FedLink = createModel('FedLink');

const OIDC_CONFIG = {
  issuer: `http://localhost:${PORT}`,
  authorization_endpoint: `http://localhost:${PORT}/api/federation/oidc/authorize`,
  token_endpoint: `http://localhost:${PORT}/api/federation/oidc/token`,
  userinfo_endpoint: `http://localhost:${PORT}/api/federation/oidc/userinfo`,
  jwks_uri: `http://localhost:${PORT}/api/federation/oidc/jwks`,
};

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Unauthorized' });
  const token = auth.slice(7);
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch { res.status(401).json({ error: 'Invalid token' }); }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

function createTestApp() {
  const app = express();
  app.use(express.json());

  // OIDC discovery
  app.get('/.well-known/openid-configuration', (_req, res) => {
    res.json({ ...OIDC_CONFIG, issuer: `http://localhost:${PORT}` });
  });

  // OIDC JWKS
  app.get('/api/federation/oidc/jwks', (_req, res) => {
    res.json({
      keys: [{
        kty: 'RSA', use: 'sig', kid: 'corpID-key-1', alg: 'RS256',
        n: 'placeholder-modulus', e: 'AQAB',
      }],
    });
  });

  // OIDC userinfo
  app.get('/api/federation/oidc/userinfo', requireAuth, asyncHandler(async (req, res) => {
    const user = await User.findOne(req.user.email);
    if (!user) throw new NotFoundError('User not found');
    const trust = await TrustScore.findOne(req.user.id);
    res.json({
      sub: req.user.id, name: user.name, email: user.email,
      role: user.role, trustScore: trust?.score ?? 50,
    });
  }));

  // OIDC token
  app.post('/api/federation/oidc/token', [
    body('grant_type').isIn(['authorization_code', 'refresh_token']).withMessage('Invalid grant_type'),
    body('client_id').trim().notEmpty().withMessage('client_id required'),
    validate,
  ], asyncHandler(async (req, res) => {
    const { grant_type, code, client_id } = sanitizeInput(req.body);
    if (grant_type === 'authorization_code') {
      const user = await User.findOne(code);
      if (!user) throw new UnauthorizedError('Invalid authorization code');
      const jwt = require('jsonwebtoken');
      const accessToken = jwt.sign({ sub: user.id, type: 'access' }, JWT_SECRET, { expiresIn: '1h' });
      res.json({ access_token: accessToken, token_type: 'Bearer', expires_in: 3600 });
    } else {
      throw new ValidationError('Invalid grant_type');
    }
  }));

  // OIDC revoke
  app.post('/api/federation/oidc/revoke', asyncHandler(async (req, res) => {
    res.json({ success: true });
  }));

  // SAML metadata
  app.get('/api/federation/saml/metadata', (_req, res) => {
    res.type('application/xml');
    res.send(`<?xml version="1.0"?>
<md:EntityDescriptor xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata" entityID="http://localhost:${PORT}">
  <md:SPSSODescriptor protocolSupportEnumeration="urn:oasis:names:tc:SAML:2.0:protocol">
    <md:AssertionConsumerService Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST" Location="http://localhost:${PORT}/api/federation/saml/acs" index="0"/>
  </md:SPSSODescriptor>
</md:EntityDescriptor>`);
  });

  // SAML ACS
  app.post('/api/federation/saml/acs', [
    body('SAMLResponse').trim().notEmpty().withMessage('SAMLResponse required'),
    validate,
  ], asyncHandler(async (req, res) => {
    const { RelayState } = sanitizeInput(req.body);
    const redirectUrl = RelayState || '/';
    res.redirect(`${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}saml_success=true`);
  }));

  // ACP entity
  app.get('/api/acp/entity/:corpId', asyncHandler(async (req, res) => {
    const { corpId } = req.params;
    let user = await User.findOne(corpId);
    let entityType = 'user';
    let name = user?.name || corpId;
    if (!user) {
      const agent = await Agent.findOne(corpId);
      if (agent) { user = { id: agent.agentId, name: agent.name }; entityType = 'agent'; name = agent.name; }
    }
    const trust = await TrustScore.findOne(corpId);
    res.json({
      success: true,
      entity: { corpId, type: entityType, name, trustScore: trust?.score ?? 50, verified: true },
    });
  }));

  // ACP enrich
  app.post('/api/acp/enrich', [
    body('message.senderId').trim().notEmpty().withMessage('message.senderId required'),
    validate,
  ], asyncHandler(async (req, res) => {
    const { message } = sanitizeInput(req.body);
    const { senderId } = message;
    const user = await User.findOne(senderId);
    if (!user) throw new NotFoundError(`Invalid CorpID: ${senderId}`);
    const trust = await TrustScore.findOne(senderId);
    res.json({ success: true, enrichedMessage: { ...message, sender: { corpId: senderId, trustScore: trust?.score ?? 50, verified: true } } });
  }));

  // Federation providers
  app.get('/api/federation/providers', (_req, res) => {
    res.json({ success: true, providers: Object.entries(OAUTH_PROVIDERS).map(([id, p]) => ({ id, ...p })) });
  });

  // Error handler
  app.use((err, req, res, _next) => {
    res.status(err.status || 500).json({ error: err.message });
  });

  return app;
}

describe('CorpID Federation + OIDC/SAML', () => {
  let app;

  beforeEach(() => {
    _reset();
    app = createTestApp();
  });

  // ============ OIDC Discovery ============

  describe('OIDC Discovery', () => {
    it('GET /.well-known/openid-configuration returns OIDC config', async () => {
      const res = await require('supertest')(app).get('/.well-known/openid-configuration');
      expect(res.status).toBe(200);
      expect(res.body.issuer).toBe(`http://localhost:${PORT}`);
      expect(res.body.authorization_endpoint).toBeDefined();
      expect(res.body.token_endpoint).toBeDefined();
      expect(res.body.userinfo_endpoint).toBeDefined();
      expect(res.body.jwks_uri).toBeDefined();
      expect(res.body.scopes_supported).toContain('openid');
    });

    it('GET /api/federation/oidc/jwks returns JWKS', async () => {
      const res = await require('supertest')(app).get('/api/federation/oidc/jwks');
      expect(res.status).toBe(200);
      expect(res.body.keys).toBeInstanceOf(Array);
      expect(res.body.keys[0].kty).toBe('RSA');
      expect(res.body.keys[0].alg).toBe('RS256');
      expect(res.body.keys[0].kid).toBe('corpID-key-1');
    });
  });

  // ============ OIDC UserInfo ============

  describe('OIDC UserInfo', () => {
    it('GET /api/federation/oidc/userinfo returns 401 without token', async () => {
      const res = await require('supertest')(app).get('/api/federation/oidc/userinfo');
      expect(res.status).toBe(401);
    });

    it('GET /api/federation/oidc/userinfo returns user info with valid token', async () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ sub: 'CI-IND-user1', email: 'user1@test.com', role: 'user' }, JWT_SECRET);
      _stores.userMock._m.set('user1@test.com', { id: 'CI-IND-user1', email: 'user1@test.com', name: 'Test User', role: 'user' });
      _stores.trustMock._m.set('CI-IND-user1', { corpId: 'CI-IND-user1', score: 75, level: 'silver' });

      const res = await require('supertest')(app).get('/api/federation/oidc/userinfo').set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.sub).toBe('CI-IND-user1');
      expect(res.body.name).toBe('Test User');
      expect(res.body.trustScore).toBe(75);
    });
  });

  // ============ OIDC Token ============

  describe('OIDC Token Endpoint', () => {
    it('POST /api/federation/oidc/token rejects invalid grant_type', async () => {
      const res = await require('supertest')(app)
        .post('/api/federation/oidc/token')
        .send({ grant_type: 'password', client_id: 'test-client' });
      expect(res.status).toBe(400);
    });

    it('POST /api/federation/oidc/token returns tokens for valid code', async () => {
      _stores.userMock._m.set('valid-code', { id: 'CI-IND-user1', email: 'user@test.com', name: 'Test' });
      const res = await require('supertest')(app)
        .post('/api/federation/oidc/token')
        .send({ grant_type: 'authorization_code', code: 'valid-code', client_id: 'test-client' });
      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.token_type).toBe('Bearer');
      expect(res.body.expires_in).toBe(3600);
    });
  });

  // ============ SAML SP ============

  describe('SAML Service Provider', () => {
    it('GET /api/federation/saml/metadata returns valid XML', async () => {
      const res = await require('supertest')(app).get('/api/federation/saml/metadata');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/xml');
      expect(res.text).toContain('EntityDescriptor');
      expect(res.text).toContain('SPSSODescriptor');
      expect(res.text).toContain('AssertionConsumerService');
    });

    it('POST /api/federation/saml/acs redirects on valid SAMLResponse', async () => {
      const samlResponse = Buffer.from('<saml>test</saml>').toString('base64');
      const res = await require('supertest')(app)
        .post('/api/federation/saml/acs')
        .send({ SAMLResponse: samlResponse });
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('saml_success=true');
    });

    it('POST /api/federation/saml/acs rejects empty SAMLResponse', async () => {
      const res = await require('supertest')(app)
        .post('/api/federation/saml/acs')
        .send({ SAMLResponse: '' });
      expect(res.status).toBe(400);
    });
  });

  // ============ ACP Bridge ============

  describe('ACP Bridge', () => {
    it('GET /api/acp/entity/:corpId returns entity info for user', async () => {
      _stores.userMock._m.set('user@test.com', { id: 'CI-IND-user1', name: 'Test User', email: 'user@test.com' });
      _stores.trustMock._m.set('CI-IND-user1', { corpId: 'CI-IND-user1', score: 80, level: 'gold' });

      const res = await require('supertest')(app).get('/api/acp/entity/CI-IND-user1');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.entity.corpId).toBe('CI-IND-user1');
      expect(res.body.entity.type).toBe('user');
      expect(res.body.entity.trustScore).toBe(80);
      expect(res.body.entity.verified).toBe(true);
    });

    it('GET /api/acp/entity/:corpId returns entity info for agent', async () => {
      _stores.agentMock._m.set('CI-AGT-agent1', { agentId: 'CI-AGT-agent1', name: 'Test Agent', ownerId: 'CI-IND-user1' });
      _stores.trustMock._m.set('CI-AGT-agent1', { corpId: 'CI-AGT-agent1', score: 70, level: 'silver' });

      const res = await require('supertest')(app).get('/api/acp/entity/CI-AGT-agent1');
      expect(res.status).toBe(200);
      expect(res.body.entity.type).toBe('agent');
      expect(res.body.entity.name).toBe('Test Agent');
    });

    it('GET /api/acp/entity/:corpId returns default trust for unknown entity', async () => {
      const res = await require('supertest')(app).get('/api/acp/entity/CI-IND-unknown');
      expect(res.status).toBe(200);
      expect(res.body.entity.corpId).toBe('CI-IND-unknown');
      expect(res.body.entity.trustScore).toBe(50); // default
    });

    it('POST /api/acp/enrich enriches message with sender trust', async () => {
      _stores.userMock._m.set('sender@test.com', { id: 'CI-IND-sender', name: 'Sender', email: 'sender@test.com' });
      _stores.trustMock._m.set('CI-IND-sender', { corpId: 'CI-IND-sender', score: 85, level: 'gold' });

      const res = await require('supertest')(app)
        .post('/api/acp/enrich')
        .send({ message: { senderId: 'CI-IND-sender', type: 'QUERY' } });
      expect(res.status).toBe(200);
      expect(res.body.enrichedMessage.sender.corpId).toBe('CI-IND-sender');
      expect(res.body.enrichedMessage.sender.trustScore).toBe(85);
      expect(res.body.enrichedMessage.sender.verified).toBe(true);
    });

    it('POST /api/acp/enrich rejects invalid senderId', async () => {
      const res = await require('supertest')(app)
        .post('/api/acp/enrich')
        .send({ message: { senderId: 'CI-IND-invalid' } });
      expect(res.status).toBe(404);
    });
  });

  // ============ Federation Providers ============

  describe('Federation Providers', () => {
    it('GET /api/federation/providers returns configured OAuth providers', async () => {
      const res = await require('supertest')(app).get('/api/federation/providers');
      expect(res.status).toBe(200);
      expect(res.body.providers).toBeInstanceOf(Array);
      expect(res.body.providers.length).toBeGreaterThan(0);
      const google = res.body.providers.find(p => p.id === 'google');
      expect(google).toBeDefined();
      expect(google.name).toBe('Google');
      expect(google.authUrl).toBeDefined();
    });
  });
});
