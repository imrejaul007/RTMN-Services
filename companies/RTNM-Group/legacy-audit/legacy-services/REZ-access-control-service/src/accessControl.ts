/**
 * REZ Access Control Service
 *
 * RBAC (Role-Based Access Control) for admin services
 *
 * Roles:
 * - super_admin: Full access
 * - admin: All read, limited write
 * - operator: Service management
 * - analyst: Read-only
 * - support: Support operations
 * - merchant: Merchant operations
 * - viewer: Read-only limited
 */

import express from 'express';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const app = express();
app.use(express.json());

// ============================================
// MODELS
// ============================================

// User model
const UserSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'operator', 'analyst', 'support', 'merchant', 'viewer'],
    default: 'viewer'
  },
  permissions: [String],
  company_id: String,
  is_active: { type: Boolean, default: true },
  last_login: Date,
  created_at: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);

// Role model
const RoleSchema = new mongoose.Schema({
  role_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: String,
  permissions: [String],
  is_system: { type: Boolean, default: false }
});

const Role = mongoose.model('Role', RoleSchema);

// Audit log model
const AuditSchema = new mongoose.Schema({
  action: String,
  user_id: String,
  user_email: String,
  role: String,
  resource: String,
  resource_id: String,
  method: String,
  path: String,
  ip_address: String,
  user_agent: String,
  request_body: mongoose.Schema.Types.Mixed,
  response_status: Number,
  timestamp: { type: Date, default: Date.now }
});

const AuditLog = mongoose.model('AuditLog', AuditSchema);

// API Key model
const APIKeySchema = new mongoose.Schema({
  key_id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  user_id: String,
  permissions: [String],
  services: [String],
  expires_at: Date,
  last_used: Date,
  usage_count: { type: Number, default: 0 },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now }
});

const APIKey = mongoose.model('APIKey', APIKeySchema);

// ============================================
// PERMISSIONS MAP
// ============================================

const PERMISSIONS = {
  // Users
  'users.read': 'Read users',
  'users.write': 'Create/update users',
  'users.delete': 'Delete users',
  'users.admin': 'Manage all users',

  // Services
  'services.read': 'Read service status',
  'services.restart': 'Restart services',
  'services.deploy': 'Deploy services',

  // Analytics
  'analytics.read': 'Read analytics',
  'analytics.export': 'Export analytics',

  // Customers
  'customers.read': 'Read customer data',
  'customers.write': 'Update customer data',
  'customers.delete': 'Delete customer data',

  // Fraud
  'fraud.read': 'View fraud cases',
  'fraud.approve': 'Approve fraud decisions',
  'fraud.blacklist': 'Manage blacklist',

  // Karma
  'karma.read': 'View karma data',
  'karma.adjust': 'Adjust karma points',

  // Support
  'support.read': 'View support tickets',
  'support.write': 'Reply to tickets',
  'support.escalate': 'Escalate tickets',

  // Audit
  'audit.read': 'View audit logs',

  // API Keys
  'apikeys.read': 'View API keys',
  'apikeys.write': 'Create/manage API keys',

  // Settings
  'settings.read': 'Read settings',
  'settings.write': 'Modify settings'
};

// Role permissions
const ROLE_PERMISSIONS = {
  super_admin: Object.keys(PERMISSIONS),
  admin: [
    'users.read', 'users.write',
    'services.read', 'services.restart',
    'analytics.read', 'analytics.export',
    'customers.read', 'customers.write',
    'fraud.read', 'fraud.approve',
    'karma.read', 'karma.adjust',
    'support.read', 'support.write', 'support.escalate',
    'audit.read',
    'settings.read'
  ],
  operator: [
    'services.read', 'services.restart',
    'analytics.read',
    'support.read', 'support.write'
  ],
  analyst: [
    'analytics.read', 'analytics.export',
    'customers.read',
    'audit.read'
  ],
  support: [
    'customers.read',
    'support.read', 'support.write', 'support.escalate'
  ],
  merchant: [
    'customers.read', 'customers.write',
    'analytics.read'
  ],
  viewer: [
    'analytics.read'
  ]
};

// ============================================
// MIDDLEWARE
// ============================================

// Auth middleware
export function authenticate(req: any, res: any, next: any) {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
    req.user = decoded;
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Permission check middleware
export function authorize(...requiredPermissions: string[]) {
  return (req: any, res: any, next: any) => {
    const user = req.user;

    if (!user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Super admin has all permissions
    if (user.role === 'super_admin') {
      return next();
    }

    // Get user permissions
    const userPermissions = ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [];

    // Check if user has all required permissions
    const hasAll = requiredPermissions.every(p => userPermissions.includes(p));

    if (!hasAll) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: requiredPermissions,
        user_role: user.role
      });
    }

    next();
  };
}

// Audit middleware
export async function auditLog(req: any, res: any, next: any) {
  const originalSend = res.send;

  res.send = function(body: any) {
    const user = req.user;
    const status = res.statusCode;

    // Log async (don't block response)
    AuditLog.create({
      action: `${req.method} ${req.path}`,
      user_id: user?.user_id,
      user_email: user?.email,
      role: user?.role,
      resource: req.path.split('/')[1],
      method: req.method,
      path: req.path,
      ip_address: req.ip,
      user_agent: req.headers['user-agent'],
      request_body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined,
      response_status: status
    }).catch(console.error);

    return originalSend.call(this, body);
  };

  next();
}

// ============================================
// API ROUTES
// ============================================

// Auth
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, is_active: true });
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  user.last_login = new Date();
  await user.save();

  const token = jwt.sign({
    user_id: user.user_id,
    email: user.email,
    role: user.role,
    permissions: ROLE_PERMISSIONS[user.role] || []
  }, process.env.JWT_SECRET || 'secret', { expiresIn: '24h' });

  res.json({
    token,
    user: {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
      permissions: ROLE_PERMISSIONS[user.role] || []
    }
  });
});

// Users
app.post('/users', authenticate, authorize('users.write'), async (req, res) => {
  const { email, password, role = 'viewer', company_id } = req.body;

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ error: 'User already exists' });
  }

  const password_hash = await bcrypt.hash(password, 10);
  const user_id = `usr_${Date.now()}`;

  const user = await User.create({
    user_id,
    email,
    password_hash,
    role,
    company_id
  });

  res.status(201).json({ user_id, email, role });
});

app.get('/users', authenticate, authorize('users.read'), async (req, res) => {
  const { role, is_active } = req.query;

  const query: any = {};
  if (role) query.role = role;
  if (is_active !== undefined) query.is_active = is_active === 'true';

  const users = await User.find(query).select('-password_hash');

  res.json({ users, count: users.length });
});

app.get('/users/:id', authenticate, authorize('users.read'), async (req, res) => {
  const user = await User.findOne({ user_id: req.params.id }).select('-password_hash');

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json(user);
});

app.delete('/users/:id', authenticate, authorize('users.delete'), async (req, res) => {
  await User.updateOne({ user_id: req.params.id }, { is_active: false });
  res.json({ success: true });
});

// Roles
app.get('/roles', authenticate, async (req, res) => {
  const roles = await Role.find();
  res.json({
    roles,
    permissions: PERMISSIONS,
    role_permissions: ROLE_PERMISSIONS
  });
});

// API Keys
app.post('/apikeys', authenticate, authorize('apikeys.write'), async (req, res) => {
  const { name, permissions = [], services = [], expires_days = 365 } = req.body;

  const key_id = `ak_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const api_key = `rez_${crypto.randomBytes(32).toString('hex')}`;

  const key = await APIKey.create({
    key_id,
    name,
    user_id: req.user.user_id,
    permissions,
    services,
    expires_at: new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000)
  });

  res.json({
    key_id,
    api_key, // Only shown once!
    permissions,
    services,
    expires_at: key.expires_at
  });
});

app.get('/apikeys', authenticate, authorize('apikeys.read'), async (req, res) => {
  const keys = await APIKey.find().select('-api_key');
  res.json({ keys, count: keys.length });
});

app.delete('/apikeys/:id', authenticate, authorize('apikeys.write'), async (req, res) => {
  await APIKey.updateOne({ key_id: req.params.id }, { is_active: false });
  res.json({ success: true });
});

// Audit logs
app.get('/audit', authenticate, authorize('audit.read'), async (req, res) => {
  const { user_id, action, from, to, limit = 100 } = req.query;

  const query: any = {};
  if (user_id) query.user_id = user_id;
  if (action) query.action = { $regex: action as string };
  if (from || to) {
    query.timestamp = {};
    if (from) query.timestamp.$gte = new Date(from as string);
    if (to) query.timestamp.$lte = new Date(to as string);
  }

  const logs = await AuditLog.find(query)
    .sort({ timestamp: -1 })
    .limit(Number(limit));

  res.json({ logs, count: logs.length });
});

// Permissions check
app.get('/permissions/check', authenticate, async (req, res) => {
  const { permission } = req.query;

  const userPermissions = ROLE_PERMISSIONS[req.user.role as keyof typeof ROLE_PERMISSIONS] || [];
  const hasPermission = userPermissions.includes(permission as string) || req.user.role === 'super_admin';

  res.json({
    has_permission: hasPermission,
    user_role: req.user.role
  });
});

// Health
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'access-control' });
});

// ============================================
// START
// ============================================

async function start() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/access-control');

  // Seed default roles
  const roles = [
    { role_id: 'super_admin', name: 'Super Admin', description: 'Full system access', permissions: Object.keys(PERMISSIONS), is_system: true },
    { role_id: 'admin', name: 'Admin', description: 'Administrative access', permissions: ROLE_PERMISSIONS.admin, is_system: true },
    { role_id: 'operator', name: 'Operator', description: 'Service operations', permissions: ROLE_PERMISSIONS.operator, is_system: true },
    { role_id: 'analyst', name: 'Analyst', description: 'Analytics access', permissions: ROLE_PERMISSIONS.analyst, is_system: true },
    { role_id: 'support', name: 'Support', description: 'Support operations', permissions: ROLE_PERMISSIONS.support, is_system: true },
    { role_id: 'merchant', name: 'Merchant', description: 'Merchant operations', permissions: ROLE_PERMISSIONS.merchant, is_system: true },
    { role_id: 'viewer', name: 'Viewer', description: 'Read-only access', permissions: ROLE_PERMISSIONS.viewer, is_system: true }
  ];

  for (const role of roles) {
    await Role.findOneAndUpdate({ role_id: role.role_id }, role, { upsert: true });
  }

  const PORT = process.env.PORT || 4010;
  app.listen(PORT, () => {
    logger.info(Access Control Service running on port ${PORT}`);
  });
}

start().catch(console.error);
