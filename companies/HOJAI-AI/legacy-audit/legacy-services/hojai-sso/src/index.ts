/**
 * HOJAI SSO
 * OIDC/SAML enterprise login
 * Port: 4603
 */

import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4603;

app.use(express.json({ limit: "10kb" }));
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// ============================================
// TYPES
// ============================================

interface SSOProvider {
  id: string;
  type: 'oidc' | 'saml' | 'google' | 'github' | 'azure';
  name: string;
  clientId?: string;
  issuer?: string;
  enabled: boolean;
  config: Record<string, unknown>;
}

interface User {
  id: string;
  email: string;
  name: string;
  provider: string;
  providerId?: string;
  role: 'admin' | 'editor' | 'viewer';
  lastLogin?: Date;
  mfaEnabled: boolean;
}

interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: Date;
  ip?: string;
  userAgent?: string;
}

interface Token {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

const providers = new Map();
const users = new Map();
const sessions = new Map();

// Seed demo provider
function seed() {
  const demoProvider: SSOProvider = {
    id: 'google',
    type: 'google',
    name: 'Google Workspace',
    enabled: true,
    config: {
      clientId: 'xxx',
      issuer: 'https://accounts.google.com'
    }
  };
  providers.set('google', demoProvider);
}

// ============================================
// ENDPOINTS
// ============================================

app.get('/health', (_, res) => res.json({
  service: 'hojai-sso',
  status: 'healthy',
  port: PORT,
  tagline: 'OIDC/SAML enterprise login'
}));

// Providers
app.get('/api/providers', (_, res) => {
  res.json({ success: true, data: Array.from(providers.values()) });
});

app.post('/api/providers', (req, res) => {
  const { type, name, config } = req.body;

  const provider: SSOProvider = {
    id: uuidv4().slice(0, 8),
    type,
    name,
    enabled: true,
    config: config || {}
  };

  providers.set(provider.id, provider);

  res.status(201).json({ success: true, data: provider });
});

// OIDC Discovery
app.get('/.well-known/openid-configuration', (_, res) => {
  res.json({
    issuer: `https://sso.hojai.ai`,
    authorization_endpoint: `https://sso.hojai.ai/authorize`,
    token_endpoint: `https://sso.hojai.ai/token`,
    userinfo_endpoint: `https://sso.hojai.ai/userinfo`,
    jwks_uri: `https://sso.hojai.ai/.well-known/jwks.json`
  });
});

// Authorization
app.get('/authorize', (req, res) => {
  const { client_id, redirect_uri, response_type, scope, state } = req.query;

  // In production, redirect to provider
  res.json({
    success: true,
    message: 'Redirect to provider',
    authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${client_id}&redirect_uri=${redirect_uri}`
  });
});

// Token exchange
app.post('/token', (req, res) => {
  const { grant_type, code, refresh_token } = req.body;

  const token: Token = {
    accessToken: uuidv4(),
    refreshToken: uuidv4(),
    expiresIn: 3600,
    tokenType: 'Bearer'
  };

  res.json(token);
});

// User info
app.get('/userinfo', (req, res) => {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.json({
    sub: 'user-123',
    email: 'user@hojai.ai',
    name: 'Demo User',
    role: 'admin'
  });
});

// Users
app.get('/api/users', (_, res) => {
  res.json({ success: true, data: Array.from(users.values()) });
});

app.post('/api/users', (req, res) => {
  const { email, name, role } = req.body;

  const user: User = {
    id: uuidv4().slice(0, 8),
    email,
    name,
    provider: 'local',
    role: role || 'viewer',
    mfaEnabled: false
  };

  users.set(user.id, user);

  res.status(201).json({ success: true, data: user });
});

// Sessions
app.post('/api/sessions', (req, res) => {
  const { userId } = req.body;

  const session: Session = {
    id: uuidv4().slice(0, 8),
    userId,
    token: uuidv4(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
  };

  sessions.set(session.id, session);

  res.status(201).json({ success: true, data: session });
});

app.get('/api/sessions/:id', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  if (new Date() > session.expiresAt) {
    sessions.delete(req.params.id);
    return res.status(401).json({ error: 'Session expired' });
  }

  res.json({ success: true, data: session });
});

app.post('/api/sessions/:id/refresh', (req, res) => {
  const session = sessions.get(req.params.id);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  sessions.set(session.id, session);

  res.json({ success: true, data: session });
});

app.post('/api/sessions/:id/logout', (req, res) => {
  sessions.delete(req.params.id);
  res.json({ success: true, message: 'Logged out' });
});

// SAML endpoints
app.get('/saml/:provider/metadata', (req, res) => {
  const provider = providers.get(req.params.provider);

  if (!provider) {
    return res.status(404).json({ error: 'Provider not found' });
  }

  res.set('Content-Type', 'application/xml');
  res.send(`<?xml version="1.0"?>
<EntityDescriptor xmlns="urn:oasis:names:tc:SAML:2.0:metadata" entityID="${provider.issuer}">
  <SPSSODescriptor>
    <AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="https://hojai.ai/saml/${provider.id}/acs"
      index="1"/>
  </SPSSODescriptor>
</EntityDescriptor>`);
});

app.post('/saml/:provider/slo', (req, res) => {
  res.json({ success: true, message: 'Single logout initiated' });
});

seed();
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════╗
║   HOJAI SSO                                ║
║   OIDC/SAML enterprise login              ║
║   Port: ${PORT}                               ║
╚═══════════════════════════════════════════════╝
  `);
});

export default app;
