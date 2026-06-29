/**
 * HOJAI Auth Service
 * JWT + RBAC + Multi-tenant
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');
const validator = require('validator');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'hojai-secret-key-change-in-production';
const JWT_EXPIRES = '7d';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// In-memory stores (replace with DB in production)
const users = new Map();
const tenants = new Map();
const sessions = new Map();
const apiKeys = new Map();
const refreshTokens = new Map();

// Roles & Permissions
const ROLES = {
  owner: ['*'],
  admin: ['users:*', 'agents:*', 'flows:*', 'workflows:*', 'billing:read', 'logs:*'],
  manager: ['users:read', 'agents:*', 'flows:*', 'workflows:*', 'logs:read'],
  member: ['agents:read', 'flows:read', 'workflows:read'],
  viewer: ['read'],
};

const PLANS = {
  starter: { workflows: 10, agents: 5, seats: 3, price: 9999 },
  growth: { workflows: 50, agents: 25, seats: 10, price: 29999 },
  enterprise: { workflows: -1, agents: -1, seats: -1, price: 99999 },
};

// Helper functions
function generateId() { return uuid(); }
function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}
function verifyToken(token) {
  try { return jwt.verify(token, JWT_SECRET); }
  catch { return null; }
}
function hashPassword(password) { return bcrypt.hashSync(password, 10); }
function comparePassword(password, hash) { return bcrypt.compareSync(password, hash); }
function isValidEmail(email) { return validator.isEmail(email); }
function isValidPassword(password) { return password && password.length >= 8; }

// Auth middleware
function authenticate(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = auth.slice(7);
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = decoded;
  req.tenant = decoded.tenantId;
  next();
}

// Permission check
function requirePermission(permission) {
  return (req, res, next) => {
    const user = req.user;
    const tenant = tenants.get(user.tenantId);

    if (!tenant) return res.status(403).json({ error: 'Tenant not found' });

    const role = user.role || 'member';
    const permissions = ROLES[role] || [];

    if (permissions.includes('*') || permissions.includes(permission) || permission.startsWith(permission.split(':')[0] + ':*')) {
      return next();
    }

    return res.status(403).json({ error: 'Permission denied' });
  };
}

// Routes

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ===== TENANT MANAGEMENT =====

// Create tenant (register)
app.post('/auth/register', async (req, res) => {
  const { email, password, name, companyName, plan = 'starter' } = req.body;

  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  if (!isValidPassword(password)) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // Check existing
  for (const user of users.values()) {
    if (user.email === email) {
      return res.status(400).json({ error: 'Email already registered' });
    }
  }

  // Create tenant
  const tenantId = generateId();
  const tenant = {
    id: tenantId,
    name: companyName || email.split('@')[0],
    plan: PLANS[plan] ? plan : 'starter',
    limits: PLANS[plan] || PLANS.starter,
    createdAt: new Date().toISOString(),
    status: 'active',
  };
  tenants.set(tenantId, tenant);

  // Create owner user
  const userId = generateId();
  const user = {
    id: userId,
    tenantId,
    email,
    name: name || email.split('@')[0],
    passwordHash: hashPassword(password),
    role: 'owner',
    status: 'active',
    createdAt: new Date().toISOString(),
  };
  users.set(userId, user);

  // Generate tokens
  const token = generateToken({ userId, email: user.email, tenantId, role: user.role });
  const refreshToken = uuid();
  refreshTokens.set(refreshToken, { userId, tenantId, expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000 });

  res.json({
    user: { id: userId, email: user.email, name: user.name, role: user.role },
    tenant: { id: tenantId, name: tenant.name, plan: tenant.plan },
    token,
    refreshToken,
    expiresIn: JWT_EXPIRES,
  });
});

// Login
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  let foundUser;
  for (const user of users.values()) {
    if (user.email === email) { foundUser = user; break; }
  }

  if (!foundUser || !comparePassword(password, foundUser.passwordHash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const tenant = tenants.get(foundUser.tenantId);
  if (!tenant || tenant.status !== 'active') {
    return res.status(403).json({ error: 'Account not active' });
  }

  const token = generateToken({
    userId: foundUser.id,
    email: foundUser.email,
    tenantId: foundUser.tenantId,
    role: foundUser.role,
  });

  const refreshToken = uuid();
  refreshTokens.set(refreshToken, {
    userId: foundUser.id,
    tenantId: foundUser.tenantId,
    expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    user: { id: foundUser.id, email: foundUser.email, name: foundUser.name, role: foundUser.role },
    tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan, limits: tenant.limits },
    token,
    refreshToken,
    expiresIn: JWT_EXPIRES,
  });
});

// Refresh token
app.post('/auth/refresh', (req, res) => {
  const { refreshToken } = req.body;

  const stored = refreshTokens.get(refreshToken);
  if (!stored || stored.expiresAt < Date.now()) {
    refreshTokens.delete(refreshToken);
    return res.status(401).json({ error: 'Refresh token expired' });
  }

  const user = users.get(stored.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  const tenant = tenants.get(stored.tenantId);
  const newToken = generateToken({
    userId: user.id,
    email: user.email,
    tenantId: user.tenantId,
    role: user.role,
  });

  res.json({ token: newToken, expiresIn: JWT_EXPIRES });
});

// Logout
app.post('/auth/logout', authenticate, (req, res) => {
  // Remove refresh tokens for user
  for (const [token, data] of refreshTokens.entries()) {
    if (data.userId === req.user.userId) {
      refreshTokens.delete(token);
    }
  }
  res.json({ success: true });
});

// ===== USER MANAGEMENT =====

// Get current user
app.get('/users/me', authenticate, (req, res) => {
  const user = users.get(req.user.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const tenant = tenants.get(req.user.tenantId);

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenant: { id: tenant.id, name: tenant.name, plan: tenant.plan },
  });
});

// List users in tenant
app.get('/users', authenticate, requirePermission('users:read'), (req, res) => {
  const tenantUsers = [];
  for (const user of users.values()) {
    if (user.tenantId === req.user.tenantId) {
      tenantUsers.push({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      });
    }
  }
  res.json({ users: tenantUsers });
});

// Invite user
app.post('/users/invite', authenticate, requirePermission('users:create'), async (req, res) => {
  const { email, name, role = 'member' } = req.body;

  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }

  // Check existing
  for (const user of users.values()) {
    if (user.email === email && user.tenantId === req.user.tenantId) {
      return res.status(400).json({ error: 'User already exists' });
    }
  }

  const userId = generateId();
  const tempPassword = uuid().slice(0, 8);
  const user = {
    id: userId,
    tenantId: req.user.tenantId,
    email,
    name: name || email.split('@')[0],
    passwordHash: hashPassword(tempPassword),
    role,
    status: 'invited',
    invitedBy: req.user.userId,
    createdAt: new Date().toISOString(),
  };

  users.set(userId, user);

  // TODO: Send invite email with tempPassword

  res.json({
    id: userId,
    email: user.email,
    role: user.role,
    tempPassword, // In production, send via email instead
  });
});

// Update user role
app.patch('/users/:userId', authenticate, requirePermission('users:write'), (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  const user = users.get(userId);
  if (!user || user.tenantId !== req.user.tenantId) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (role && ROLES[role]) {
    user.role = role;
  }

  res.json({ success: true, user: { id: user.id, role: user.role } });
});

// Remove user
app.delete('/users/:userId', authenticate, requirePermission('users:delete'), (req, res) => {
  const { userId } = req.params;

  const user = users.get(userId);
  if (!user || user.tenantId !== req.user.tenantId) {
    return res.status(404).json({ error: 'User not found' });
  }

  users.delete(userId);
  res.json({ success: true });
});

// ===== API KEYS =====

// Create API key
app.post('/api-keys', authenticate, (req, res) => {
  const { name, permissions = ['read'] } = req.body;

  const keyId = generateId();
  const key = `hojai_${keyId}_${uuid().replace(/-g, '')}`;
  const keyHash = hashPassword(key);

  apiKeys.set(keyId, {
    id: keyId,
    tenantId: req.user.tenantId,
    name: name || 'API Key',
    keyHash,
    permissions,
    createdBy: req.user.userId,
    createdAt: new Date().toISOString(),
    lastUsed: null,
  });

  res.json({ id: keyId, key, name, permissions }); // Show key only once!
});

// List API keys
app.get('/api-keys', authenticate, (req, res) => {
  const keys = [];
  for (const key of apiKeys.values()) {
    if (key.tenantId === req.user.tenantId) {
      keys.push({
        id: key.id,
        name: key.name,
        permissions: key.permissions,
        lastUsed: key.lastUsed,
        createdAt: key.createdAt,
      });
    }
  }
  res.json({ keys });
});

// Delete API key
app.delete('/api-keys/:keyId', authenticate, (req, res) => {
  const key = apiKeys.get(req.params.keyId);
  if (!key || key.tenantId !== req.user.tenantId) {
    return res.status(404).json({ error: 'API key not found' });
  }
  apiKeys.delete(req.params.keyId);
  res.json({ success: true });
});

// API key auth middleware
function authenticateApiKey(req, res, next) {
  const key = req.headers['x-api-key'];
  if (!key) return res.status(401).json({ error: 'API key required' });

  // Find key (in production, use hash lookup)
  let found;
  for (const k of apiKeys.values()) {
    if (k.id === key || k.keyHash === key) { found = k; break; }
  }

  if (!found) return res.status(401).json({ error: 'Invalid API key' });

  found.lastUsed = new Date().toISOString();
  req.user = { userId: found.createdBy, tenantId: found.tenantId, role: 'api_key' };
  req.permissions = found.permissions;
  next();
}

// ===== TENANT MANAGEMENT =====

// Get tenant info
app.get('/tenant', authenticate, (req, res) => {
  const tenant = tenants.get(req.user.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  res.json(tenant);
});

// Update tenant
app.patch('/tenant', authenticate, requirePermission('tenant:write'), (req, res) => {
  const tenant = tenants.get(req.user.tenantId);
  if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

  const { name, limits } = req.body;
  if (name) tenant.name = name;
  if (limits) tenant.limits = { ...tenant.limits, ...limits };

  res.json(tenant);
});

// Upgrade plan
app.post('/tenant/upgrade', authenticate, (req, res) => {
  const { plan } = req.body;
  if (!PLANS[plan]) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  const tenant = tenants.get(req.user.tenantId);
  tenant.plan = plan;
  tenant.limits = PLANS[plan];

  // TODO: Process payment

  res.json({ success: true, plan, limits: tenant.limits });
});

// Start server
app.listen(PORT, () => {
  console.log(`🔐 HOJAI Auth Service running on port ${PORT}`);
});
