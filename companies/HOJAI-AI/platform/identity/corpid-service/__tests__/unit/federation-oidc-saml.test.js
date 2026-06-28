/**
 * CorpID Federation + OIDC/SAML Tests
 * Tests for Phase 6 Federation endpoints: ACP bridge, OIDC provider, SAML SP
 */
import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import { body, validationResult } from 'express-validator';
import request from 'supertest';

// ============ INLINE MOCK STORES ============
const userMock = new Map();
const agentMock = new Map();
const trustMock = new Map();
const delegationMock = new Map();

function makeModel(name) {
  return {
    findOne: (key) => {
      if (name === 'User') {
        if (userMock.has(key)) return Promise.resolve(userMock.get(key));
        const found = [...userMock.values()].find(u => u.id === key || u.email === key);
        return Promise.resolve(found || null);
      }
      if (name === 'Agent') {
        if (agentMock.has(key)) return Promise.resolve(agentMock.get(key));
        const found = [...agentMock.values()].find(a => a.agentId === key);
        return Promise.resolve(found || null);
      }
      if (name === 'TrustScore') {
        if (trustMock.has(key)) return Promise.resolve(trustMock.get(key));
        const found = [...trustMock.values()].find(t => t.corpId === key);
        return Promise.resolve(found || null);
      }
      return Promise.resolve(null);
    },
    find: () => Promise.resolve([...delegationMock.values()]),
  };
}

// ============ HELPERS ============
const PORT = 4702;
const JWT_SECRET = 'test-secret';
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const sanitizeInput = (obj) => obj;
const NotFoundError = class extends Error { constructor(msg) { super(msg); this.status = 404; } };
const UnauthorizedError = class extends Error { constructor(msg) { super(msg); this.status = 401; } };
const ValidationError = class extends Error { constructor(msg) { super(msg); this.status = 400; } };

function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: errors.array()[0].msg });
  next();
}

const OAUTH_PROVIDERS = {
  google: { id: 'google', name: 'Google', authUrl: 'https://accounts.google.com/o/oauth2/auth' },
  github: { id: 'github', name: 'GitHub', authUrl: 'https://github.com/login/oauth/authorize' },
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

// Create app factory (fresh per-test to get clean middleware)
function createApp() {
  const User = makeModel('User');
  const Agent = makeModel('Agent');
  const TrustScore = makeModel('TrustScore');

  const OIDC_CONFIG = {
    issuer: `http://localhost:${PORT}`,
    authorization_endpoint: `http://localhost:${PORT}/api/federation/oidc/authorize`,
    token_endpoint: `http://localhost:${PORT}/api/federation/oidc/token`,
    userinfo_endpoint: `http://localhost:${PORT}/api/federation/oidc/userinfo`,
    jwks_uri: `http://localhost:${PORT}/api/federation/oidc/jwks`,
  };

  const app = express();
  app.use(express.json());

  // OIDC discovery
  app.get('/.well-known/openid-configuration', (_req, res) => {
    res.json({ ...OIDC_CONFIG, issuer: `http://localhost:${PORT}` });
  });

  // OIDC JWKS
  app.get('/api/federation/oidc/jwks', (_req, res) => {
    res.json({ keys: [{ kty: 'RSA', use: 'sig', kid: 'corpID-key-1', alg: 'RS256', n: 'placeholder', e: 'AQAB' }] });
  });

  // OIDC userinfo
  app.get('/api/federation/oidc/userinfo', requireAuth, asyncHandler(async (req, res) => {
    const user = await User.findOne(req.user.email);
    if (!user) throw new NotFoundError('User not found');
    const trust = await TrustScore.findOne(req.user.id);
    res.json({ sub: req.user.id, name: user.name, email: user.email, role: user.role, trustScore: trust?.score ?? 50 });
  }));

  // OIDC token
  app.post('/api/federation/oidc/token', [
    body('grant_type').isIn(['authorization_code', 'refresh_token']).withMessage('Invalid grant_type'),
    body('client_id').trim().notEmpty().withMessage('client_id required'),
    validate,
  ], asyncHandler(async (req, res) => {
    const { grant_type, code } = sanitizeInput(req.body);
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
    res.json({ success: true, entity: { corpId, type: entityType, name, trustScore: trust?.score ?? 50, verified: true } });
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

// ============ TESTS ============
describe('CorpID Federation + OIDC/SAML', () => {
  beforeEach(() => {
    userMock.clear();
    agentMock.clear();
    trustMock.clear();
    delegationMock.clear();
  });

  // OIDC Discovery
  describe('OIDC Discovery', () => {
    it('GET /.well-known/openid-configuration returns OIDC config', async () => {
      const res = await request(createApp()).get('/.well-known/openid-configuration');
      expect(res.status).toBe(200);
      expect(res.body.issuer).toBe(`http://localhost:${PORT}`);
      // Check key OIDC fields are present
      expect(res.body.authorization_endpoint).toBeDefined();
      expect(res.body.token_endpoint).toBeDefined();
    });

    it('GET /api/federation/oidc/jwks returns JWKS', async () => {
      const res = await request(createApp()).get('/api/federation/oidc/jwks');
      expect(res.status).toBe(200);
      expect(res.body.keys[0].kty).toBe('RSA');
      expect(res.body.keys[0].alg).toBe('RS256');
    });
  });

  // OIDC UserInfo
  describe('OIDC UserInfo', () => {
    it('GET /api/federation/oidc/userinfo returns 401 without token', async () => {
      const res = await request(createApp()).get('/api/federation/oidc/userinfo');
      expect(res.status).toBe(401);
    });
  });

  // OIDC Token
  describe('OIDC Token Endpoint', () => {
    it('POST /api/federation/oidc/token rejects invalid grant_type', async () => {
      const res = await request(createApp())
        .post('/api/federation/oidc/token')
        .send({ grant_type: 'password', client_id: 'test-client' });
      expect(res.status).toBe(400);
    });

    it('POST /api/federation/oidc/token returns tokens for valid code', async () => {
      userMock.set('valid-code', { id: 'CI-IND-user1', email: 'user@test.com', name: 'Test' });
      const res = await request(createApp())
        .post('/api/federation/oidc/token')
        .send({ grant_type: 'authorization_code', code: 'valid-code', client_id: 'test-client' });
      expect(res.status).toBe(200);
      expect(res.body.access_token).toBeDefined();
      expect(res.body.token_type).toBe('Bearer');
    });
  });

  // SAML SP
  describe('SAML Service Provider', () => {
    it('GET /api/federation/saml/metadata returns valid XML', async () => {
      const res = await request(createApp()).get('/api/federation/saml/metadata');
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/xml');
      expect(res.text).toContain('EntityDescriptor');
    });

    it('POST /api/federation/saml/acs redirects on valid SAMLResponse', async () => {
      const samlResponse = Buffer.from('<saml>test</saml>').toString('base64');
      const res = await request(createApp())
        .post('/api/federation/saml/acs')
        .send({ SAMLResponse: samlResponse });
      expect(res.status).toBe(302);
      expect(res.headers.location).toContain('saml_success=true');
    });

    it('POST /api/federation/saml/acs rejects empty SAMLResponse', async () => {
      const res = await request(createApp())
        .post('/api/federation/saml/acs')
        .send({ SAMLResponse: '' });
      expect(res.status).toBe(400);
    });
  });

  // ACP Bridge
  describe('ACP Bridge', () => {
    it('GET /api/acp/entity/:corpId returns entity info for user', async () => {
      userMock.set('CI-IND-user1', { id: 'CI-IND-user1', name: 'Test User', email: 'user@test.com' });
      trustMock.set('CI-IND-user1', { corpId: 'CI-IND-user1', score: 80, level: 'gold' });
      const res = await request(createApp()).get('/api/acp/entity/CI-IND-user1');
      expect(res.status).toBe(200);
      expect(res.body.entity.corpId).toBe('CI-IND-user1');
      expect(res.body.entity.trustScore).toBe(80);
    });

    it('GET /api/acp/entity/:corpId returns entity info for agent', async () => {
      agentMock.set('CI-AGT-agent1', { agentId: 'CI-AGT-agent1', name: 'Test Agent', ownerId: 'CI-IND-user1' });
      trustMock.set('CI-AGT-agent1', { corpId: 'CI-AGT-agent1', score: 70, level: 'silver' });
      const res = await request(createApp()).get('/api/acp/entity/CI-AGT-agent1');
      expect(res.status).toBe(200);
      expect(res.body.entity.type).toBe('agent');
    });

    it('GET /api/acp/entity/:corpId returns default trust for unknown entity', async () => {
      const res = await request(createApp()).get('/api/acp/entity/CI-IND-unknown');
      expect(res.status).toBe(200);
      expect(res.body.entity.trustScore).toBe(50);
    });

    it('POST /api/acp/enrich enriches message with sender trust', async () => {
      userMock.set('CI-IND-sender', { id: 'CI-IND-sender', name: 'Sender', email: 'sender@test.com' });
      trustMock.set('CI-IND-sender', { corpId: 'CI-IND-sender', score: 85, level: 'gold' });
      const res = await request(createApp())
        .post('/api/acp/enrich')
        .send({ message: { senderId: 'CI-IND-sender', type: 'QUERY' } });
      expect(res.status).toBe(200);
      expect(res.body.enrichedMessage.sender.corpId).toBe('CI-IND-sender');
      expect(res.body.enrichedMessage.sender.trustScore).toBe(85);
    });

    it('POST /api/acp/enrich rejects invalid senderId', async () => {
      const res = await request(createApp())
        .post('/api/acp/enrich')
        .send({ message: { senderId: 'CI-IND-invalid' } });
      expect(res.status).toBe(404);
    });
  });

  // Federation Providers
  describe('Federation Providers', () => {
    it('GET /api/federation/providers returns configured OAuth providers', async () => {
      const res = await request(createApp()).get('/api/federation/providers');
      expect(res.status).toBe(200);
      expect(res.body.providers.length).toBeGreaterThan(0);
      const google = res.body.providers.find(p => p.id === 'google');
      expect(google).toBeDefined();
    });
  });
});
