/**
 * HOJAI Studio - Social Auth Service
 * Google, Apple, Passwordless login
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}
const PORT = 4752;
app.use(express.json());

const providers = new Map(); // projectId -> provider config
const users = new Map(); // userId -> user data
const sessions = new Map(); // sessionId -> session
const magicLinks = []; // magic link requests

// Supported providers
const PROVIDERS = ['google', 'apple', 'facebook', 'twitter', 'github', 'linkedin'];

// REST API - Configure Provider
app.post('/api/providers', requireInternal, (req, res) => {
  const { projectId, provider, config } = req.body;
  if (!PROVIDERS.includes(provider)) return res.status(400).json({ error: 'Invalid provider' });

  if (!providers.has(projectId)) providers.set(projectId, {});
  providers.get(projectId)[provider] = {
    ...config,
    enabled: true,
    createdAt: new Date().toISOString()
  };
  res.json({ provider, enabled: true });
});

app.get('/api/providers', (req, res) => {
  const { projectId } = req.query;
  const projectProviders = providers.get(projectId) || {};
  const all = PROVIDERS.map(p => ({ provider: p, enabled: !!projectProviders[p], config: projectProviders[p] }));
  res.json(all);
});

// REST API - OAuth Start
app.post('/api/oauth/:provider/start', requireInternal, (req, res) => {
  const { provider } = req.params;
  const { projectId, redirectUri, state } = req.body;

  const projectProviders = providers.get(projectId);
  if (!projectProviders?.[provider]) return res.status(404).json({ error: 'Provider not configured' });

  const authUrls = {
    google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${projectProviders[provider].clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email%20profile`,
    apple: `https://appleid.apple.com/auth/authorize?client_id=${projectProviders[provider].clientId}&redirect_uri=${redirectUri}&response_type=code&scope=email`,
    facebook: `https://www.facebook.com/v12.0/dialog/oauth?client_id=${projectProviders[provider].clientId}&redirect_uri=${redirectUri}&scope=email`,
    github: `https://github.com/login/oauth/authorize?client_id=${projectProviders[provider].clientId}&redirect_uri=${redirectUri}&scope=user:email`
  };

  res.json({ authUrl: authUrls[provider], state });
});

// REST API - OAuth Callback
app.post('/api/oauth/:provider/callback', requireInternal, async (req, res) => {
  const { provider } = req.params;
  const { code, projectId } = req.body;

  // Simulate OAuth exchange
  await new Promise(r => setTimeout(r, 100));

  const userId = uuidv4();
  const user = {
    id: userId,
    provider,
    email: `user_${userId.slice(0, 8)}@example.com`,
    name: 'Demo User',
    avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`,
    createdAt: new Date().toISOString()
  };

  users.set(userId, user);
  const sessionId = createSession(userId, projectId);

  res.json({ user, sessionId, token: sessionId });
});

// REST API - Magic Link (Passwordless)
app.post('/api/magic-link', requireInternal, (req, res) => {
  const { projectId, email } = req.body;

  const token = uuidv4();
  const magicLink = {
    token,
    projectId,
    email,
    used: false,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 mins
    createdAt: new Date().toISOString()
  };
  magicLinks.push(magicLink);

  // In production, send email with link
  res.json({
    token,
    link: `https://app.hojai.app/auth/magic?token=${token}`,
    expiresIn: '15 minutes'
  });
});

app.post('/api/magic-link/verify', requireInternal, (req, res) => {
  const { token } = req.body;

  const magicLink = magicLinks.find(m => m.token === token && !m.used);
  if (!magicLink) return res.status(400).json({ error: 'Invalid or expired token' });
  if (new Date() > new Date(magicLink.expiresAt)) return res.status(400).json({ error: 'Link expired' });

  magicLink.used = true;
  magicLink.usedAt = new Date().toISOString();

  // Find or create user
  let user = Array.from(users.values()).find(u => u.email === magicLink.email);
  if (!user) {
    const userId = uuidv4();
    user = {
      id: userId,
      provider: 'magic-link',
      email: magicLink.email,
      name: magicLink.email.split('@')[0],
      createdAt: new Date().toISOString()
    };
    users.set(userId, user);
  }

  const sessionId = createSession(user.id, magicLink.projectId);
  res.json({ user, sessionId, token: sessionId });
});

// REST API - Session Management
app.get('/api/sessions/:sessionId', (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });
  res.json(session);
});

app.delete('/api/sessions/:sessionId', requireInternal, (req, res) => {
  sessions.delete(req.params.sessionId);
  res.json({ deleted: true });
});

app.post('/api/sessions/:sessionId/refresh', requireInternal, (req, res) => {
  const session = sessions.get(req.params.sessionId);
  if (!session) return res.status(404).json({ error: 'Session not found' });

  session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  res.json(session);
});

// REST API - User Management
app.get('/api/users/me', (req, res) => {
  const { sessionId } = req.query;
  const session = sessions.get(sessionId);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const user = users.get(session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  res.json(user);
});

app.patch('/api/users/me', requireInternal, (req, res) => {
  const { sessionId } = req.query;
  const session = sessions.get(sessionId);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const user = users.get(session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  Object.assign(user, req.body);
  res.json(user);
});

app.post('/api/users/me/avatar', requireInternal, (req, res) => {
  const { sessionId } = req.query;
  const { avatar } = req.body;
  const session = sessions.get(sessionId);
  if (!session) return res.status(401).json({ error: 'Unauthorized' });

  const user = users.get(session.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.avatar = avatar;
  res.json({ avatar });
});

// REST API - Password Auth
app.post('/api/password/login', requireInternal, (req, res) => {
  const { email, password, projectId } = req.body;

  // Find user (in production, verify password hash)
  let user = Array.from(users.values()).find(u => u.email === email && u.passwordHash);

  if (!user) {
    // Create new user with password
    const userId = uuidv4();
    user = {
      id: userId,
      provider: 'password',
      email,
      passwordHash: 'hashed_password',
      createdAt: new Date().toISOString()
    };
    users.set(userId, user);
  }

  const sessionId = createSession(user.id, projectId);
  res.json({ user, sessionId, token: sessionId });
});

app.post('/api/password/register', requireInternal, (req, res) => {
  const { email, password, name, projectId } = req.body;

  if (Array.from(users.values()).find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  const userId = uuidv4();
  const user = {
    id: userId,
    provider: 'password',
    email,
    name,
    passwordHash: 'hashed_password',
    createdAt: new Date().toISOString()
  };
  users.set(userId, user);

  const sessionId = createSession(userId, projectId);
  res.json({ user, sessionId, token: sessionId });
});

function createSession(userId, projectId) {
  const sessionId = uuidv4();
  sessions.set(sessionId, {
    id: sessionId,
    userId,
    projectId,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  });
  return sessionId;
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'social-auth', users: users.size, sessions: sessions.size }));
app.listen(PORT, () => console.log(`Social Auth running on port ${PORT}`));
