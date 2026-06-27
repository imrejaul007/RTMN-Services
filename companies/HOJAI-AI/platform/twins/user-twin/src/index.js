/**
 * RTMN User Twin Service
 * Digital twin for platform users - manages user profiles, devices, sessions, permissions, trust levels, and biometrics
 */

import express from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import { requireAuth } from '@rtmn/shared/auth';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';

// Import TwinOS shared utilities
import {
  defaultLimiter,
  strictLimiter,
  sanitizeObject,
  preventPrototypePollution,
  asyncHandler,
  notFoundHandler,
  errorHandler,
  requestId,
  requestLogger,
  logger,
  Errors,
  createBaseTwinService,
  PAGINATION,
  platform,
  publishAsync,
  installPhase5
} from '@rtmn/twinos-shared';

const TWIN_STATUS = { ACTIVE: 'active', INACTIVE: 'inactive', ARCHIVED: 'archived' };

// =============================================================================
// SERVICE CONFIGURATION
// =============================================================================

const PORT = process.env.PORT || 4889;
const SERVICE_NAME = 'user-twin';
const SERVICE_VERSION = '1.0.0';

// =============================================================================
// TWIN TYPES
// =============================================================================

const TWIN_TYPES = {
  USER: 'user',
  DEVICE: 'device',
  SESSION: 'session',
  PERMISSION: 'permission',
  TRUST: 'trust',
  BIOMETRIC: 'biometric'
};

const DEVICE_TYPES = {
  PHONE: 'phone',
  WATCH: 'watch',
  TABLET: 'tablet',
  DESKTOP: 'desktop',
  EARBODS: 'earbuds',
  GLASSES: 'glasses',
  CAR: 'car',
  OTHER: 'other'
};

const TRUST_LEVELS = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  FULL: 4
};

const SESSION_STATUS = {
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
};

// =============================================================================
// STORAGE (In-memory for demo - use database in production)
// =============================================================================

const userStorage = new PersistentMap('user-storage', { serviceName: 'user-twin' });
const deviceStorage = new PersistentMap('device-storage', { serviceName: 'user-twin' });
const sessionStorage = new PersistentMap('session-storage', { serviceName: 'user-twin' });
const permissionStorage = new PersistentMap('permission-storage', { serviceName: 'user-twin' });
const securityLogStorage = new PersistentMap('security-log-storage', { serviceName: 'user-twin' });
const activityStorage = new PersistentMap('activity-storage', { serviceName: 'user-twin' });

// Create twin services
const userTwinService = createBaseTwinService({
  name: 'user',
  storage: userStorage,
  idPrefix: 'user'
});

const deviceTwinService = createBaseTwinService({
  name: 'device',
  storage: deviceStorage,
  idPrefix: 'device'
});

const sessionTwinService = createBaseTwinService({
  name: 'session',
  storage: sessionStorage,
  idPrefix: 'session'
});

// =============================================================================
// HELPERS
// =============================================================================

function sanitizeInput(obj, allowedFields) {
  return sanitizeObject(obj, allowedFields);
}

function validateBusinessScope(user, requiredScope) {
  if (!user?.businessId) {
    throw Errors.FORBIDDEN('Business scope required');
  }
  return true;
}

function logSecurityEvent(type, userId, details) {
  const event = {
    id: `sec-${uuidv4().slice(0, 8)}`,
    type,
    userId,
    details,
    timestamp: new Date().toISOString(),
    ip: '0.0.0.0'
  };
  securityLogStorage.set(event.id, event);
  logger.info(`Security event: ${type}`, { userId, eventId: event.id });
  return event;
}

function logActivity(userId, action, resource, details = {}) {
  const activity = {
    id: `act-${uuidv4().slice(0, 8)}`,
    userId,
    action,
    resource,
    details,
    timestamp: new Date().toISOString()
  };

  // Store in user's activity list
  if (!activityStorage.has(userId)) {
    activityStorage.set(userId, []);
  }
  activityStorage.get(userId).push(activity);

  // Limit stored activities
  const activities = activityStorage.get(userId);
  if (activities.length > 1000) {
    activityStorage.set(userId, activities.slice(-500));
  }

  return activity;
}

function calculateTrustScore(userId) {
  const activities = activityStorage.get(userId) || [];
  const devices = Array.from(deviceStorage.values()).filter(d => d.userId === userId);
  const sessions = Array.from(sessionStorage.values()).filter(s => s.userId === userId && s.status === SESSION_STATUS.ACTIVE);

  let score = TRUST_LEVELS.MEDIUM; // Base score

  // Device factor
  if (devices.length > 0) score += 1;
  if (devices.length >= 3) score += 1;

  // Session factor
  if (sessions.length > 0) score += 1;
  if (sessions.length >= 2) score += 1;

  // Recent activity factor (last 24 hours)
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentActivities = activities.filter(a => new Date(a.timestamp) > dayAgo);
  if (recentActivities.length > 10) score += 1;

  // Cap at FULL
  return Math.min(score, TRUST_LEVELS.FULL);
}

// =============================================================================
// VALIDATORS
// =============================================================================

const userValidators = {
  create: [
    { field: 'email', type: 'string', required: true },
    { field: 'name', type: 'string', required: true },
    { field: 'phone', type: 'string', required: false },
    { field: 'role', type: 'string', required: false }
  ],
  update: [
    { field: 'name', type: 'string', required: false },
    { field: 'phone', type: 'string', required: false },
    { field: 'preferences', type: 'object', required: false },
    { field: 'avatar', type: 'string', required: false }
  ]
};

const deviceValidators = {
  create: [
    { field: 'userId', type: 'string', required: true },
    { field: 'type', type: 'string', required: true },
    { field: 'name', type: 'string', required: true },
    { field: 'os', type: 'string', required: false },
    { field: 'model', type: 'string', required: false }
  ]
};

const permissionValidators = {
  update: [
    { field: 'roles', type: 'array', required: false },
    { field: 'scopes', type: 'array', required: false },
    { field: 'resourcePermissions', type: 'object', required: false }
  ]
};

// =============================================================================
// EXPRESS APP
// =============================================================================

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



// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(compression());

// Parsing
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));

// Request handling
app.use(requestId);
app.use(requestLogger);
app.use(preventPrototypePollution);

// Morgan logging
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// =============================================================================
// HEALTH ENDPOINTS
// =============================================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  const stats = {
    users: userStorage.size,
    devices: deviceStorage.size,
    sessions: sessionStorage.size
  };

  res.json({
    ready: true,
    service: SERVICE_NAME,
    ...stats
  });
});

app.get('/metrics', (req, res) => {
  const metrics = {
    users: userStorage.size,
    devices: deviceStorage.size,
    sessions: sessionStorage.size,
    securityEvents: securityLogStorage.size,
    uptime: process.uptime()
  };
  res.json(metrics);
});

// =============================================================================
// USER TWINS - CRUD
// =============================================================================

// List users
app.get('/api/twins/users', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, status } = req.query;

  let results = Array.from(userStorage.values());

  if (search) {
    const term = search.toLowerCase();
    results = results.filter(u =>
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.id?.toLowerCase().includes(term)
    );
  }

  if (status) {
    results = results.filter(u => u.status === status);
  }

  const total = results.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  res.json({
    success: true,
    data: results.slice(start, start + Number(limit)),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}));

// Create user
app.post('/api/twins/users',requireAuth,  defaultLimiter, asyncHandler(async (req, res) => {
  const sanitized = sanitizeInput(req.body, ['email', 'name', 'phone', 'role', 'businessId', 'preferences']);

  if (!sanitized.email || !sanitized.name) {
    throw Errors.VALIDATION('Email and name are required');
  }

  // Check for duplicate email
  const existing = Array.from(userStorage.values()).find(u => u.email === sanitized.email);
  if (existing) {
    throw Errors.CONFLICT('User with this email already exists');
  }

  const user = await userTwinService.create({
    ...sanitized,
    type: TWIN_TYPES.USER,
    id: `user-${uuidv4().slice(0, 8)}`,
    createdBy: req.user?.id,
    preferences: sanitized.preferences || {},
    settings: sanitized.settings || {}
  });

  logSecurityEvent('USER_CREATED', user.id, { email: user.email });
  logActivity(user.id, 'CREATE', 'user', { userId: user.id });

  // Platform integration
  platform.bridge.autoBind(user.id, 'episodic');
  platform.memory.recordEvent('user.created', { userId: user.id, email: user.email }, user.id);
  platform.policy.audit('create', 'user', { userId: user.id });
  publishAsync('user.user.created', { id: user.id, email: user.email });

  logger.info('User created', { userId: user.id, email: user.email });

  res.status(201).json({
    success: true,
    data: user
  });
}));

// Get user by ID
app.get('/api/twins/user/:id', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const user = userStorage.get(req.params.id);

  if (!user) {
    throw Errors.NOT_FOUND('User not found');
  }

  logActivity(req.params.id, 'READ', 'user', { userId: req.params.id });

  res.json({
    success: true,
    data: user
  });
}));

// Update user
app.put('/api/twins/user/:id', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const sanitized = sanitizeInput(req.body, ['name', 'phone', 'preferences', 'settings', 'avatar', 'bio', 'timezone', 'language']);

  const user = userStorage.get(req.params.id);
  if (!user) {
    throw Errors.NOT_FOUND('User not found');
  }

  const updated = await userTwinService.update(req.params.id, sanitized);

  logSecurityEvent('USER_UPDATED', req.params.id, { fields: Object.keys(sanitized) });
  logActivity(req.params.id, 'UPDATE', 'user', { userId: req.params.id, fields: Object.keys(sanitized) });

  // Platform integration: publish update event
  publishAsync('user.user.updated', { id: req.params.id, fields: Object.keys(sanitized) });

  res.json({
    success: true,
    data: updated
  });
}));

// =============================================================================
// DEVICE MANAGEMENT
// =============================================================================

// List devices for user
app.get('/api/twins/devices', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const { userId, type, status } = req.query;

  let results = Array.from(deviceStorage.values());

  if (userId) {
    results = results.filter(d => d.userId === userId);
  }
  if (type) {
    results = results.filter(d => d.type === type);
  }
  if (status) {
    results = results.filter(d => d.status === status);
  }

  res.json({
    success: true,
    data: results,
    count: results.length
  });
}));

// Register device
app.post('/api/twins/devices', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const sanitized = sanitizeInput(req.body, ['userId', 'type', 'name', 'os', 'model', 'version', 'pushToken']);

  if (!sanitized.userId || !sanitized.type || !sanitized.name) {
    throw Errors.VALIDATION('userId, type, and name are required');
  }

  if (!Object.values(DEVICE_TYPES).includes(sanitized.type)) {
    throw Errors.VALIDATION('Invalid device type');
  }

  const device = await deviceTwinService.create({
    ...sanitized,
    type: TWIN_TYPES.DEVICE,
    id: `device-${uuidv4().slice(0, 8)}`,
    registeredAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    status: TWIN_STATUS.ACTIVE
  });

  logSecurityEvent('DEVICE_REGISTERED', sanitized.userId, { deviceId: device.id, type: device.type });
  logActivity(sanitized.userId, 'REGISTER', 'device', { deviceId: device.id, type: device.type });

  // Platform integration: publish device-registered event
  publishAsync('user.device.registered', { id: device.id, userId: sanitized.userId, type: device.type });

  logger.info('Device registered', { deviceId: device.id, userId: sanitized.userId });

  res.status(201).json({
    success: true,
    data: device
  });
}));

// Get device
app.get('/api/twins/devices/:id', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const device = deviceStorage.get(req.params.id);

  if (!device) {
    throw Errors.NOT_FOUND('Device not found');
  }

  res.json({
    success: true,
    data: device
  });
}));

// Update device
app.put('/api/twins/devices/:id', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const sanitized = sanitizeInput(req.body, ['name', 'pushToken', 'status', 'version']);

  const device = deviceStorage.get(req.params.id);
  if (!device) {
    throw Errors.NOT_FOUND('Device not found');
  }

  const updated = await deviceTwinService.update(req.params.id, {
    ...sanitized,
    lastSeen: new Date().toISOString()
  });

  res.json({
    success: true,
    data: updated
  });
}));

// Delete device
app.delete('/api/twins/devices/:id', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const device = deviceStorage.get(req.params.id);

  if (!device) {
    throw Errors.NOT_FOUND('Device not found');
  }

  await deviceTwinService.remove(req.params.id);

  logSecurityEvent('DEVICE_REMOVED', device.userId, { deviceId: device.id });
  logActivity(device.userId, 'DELETE', 'device', { deviceId: device.id });

  logger.info('Device removed', { deviceId: device.id, userId: device.userId });

  res.json({
    success: true,
    message: 'Device removed'
  });
}));

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

// List sessions
app.get('/api/twins/sessions', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const { userId, status } = req.query;

  let results = Array.from(sessionStorage.values());

  if (userId) {
    results = results.filter(s => s.userId === userId);
  }
  if (status) {
    results = results.filter(s => s.status === status);
  } else {
    // Default: show only active sessions
    results = results.filter(s => s.status === SESSION_STATUS.ACTIVE);
  }

  res.json({
    success: true,
    data: results,
    count: results.length
  });
}));

// Create session
app.post('/api/twins/sessions',requireAuth,  defaultLimiter, asyncHandler(async (req, res) => {
  const { userId, deviceId, ipAddress, userAgent } = req.body;

  if (!userId) {
    throw Errors.VALIDATION('userId is required');
  }

  const session = {
    id: `session-${uuidv4().slice(0, 8)}`,
    type: TWIN_TYPES.SESSION,
    userId,
    deviceId,
    status: SESSION_STATUS.ACTIVE,
    ipAddress: ipAddress || '0.0.0.0',
    userAgent: userAgent || 'unknown',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    lastActivity: new Date().toISOString()
  };

  sessionStorage.set(session.id, session);

  logSecurityEvent('SESSION_CREATED', userId, { sessionId: session.id });

  res.status(201).json({
    success: true,
    data: session
  });
}));

// Get session
app.get('/api/twins/sessions/:id', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const session = sessionStorage.get(req.params.id);

  if (!session) {
    throw Errors.NOT_FOUND('Session not found');
  }

  res.json({
    success: true,
    data: session
  });
}));

// Delete session
app.delete('/api/twins/sessions/:id', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const session = sessionStorage.get(req.params.id);

  if (!session) {
    throw Errors.NOT_FOUND('Session not found');
  }

  session.status = SESSION_STATUS.REVOKED;
  session.revokedAt = new Date().toISOString();
  session.revokedBy = req.user?.id;

  logSecurityEvent('SESSION_REVOKED', session.userId, { sessionId: session.id });

  res.json({
    success: true,
    message: 'Session revoked'
  });
}));

// =============================================================================
// PERMISSION MANAGEMENT
// =============================================================================

// Get user permissions
app.get('/api/twins/user/:id/permissions', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const user = userStorage.get(req.params.id);

  if (!user) {
    throw Errors.NOT_FOUND('User not found');
  }

  const permissions = permissionStorage.get(req.params.id) || {
    userId: req.params.id,
    roles: [],
    scopes: [],
    resourcePermissions: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: permissions
  });
}));

// Update user permissions
app.put('/api/twins/user/:id/permissions', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const user = userStorage.get(req.params.id);

  if (!user) {
    throw Errors.NOT_FOUND('User not found');
  }

  const sanitized = sanitizeInput(req.body, ['roles', 'scopes', 'resourcePermissions']);

  const permissions = {
    userId: req.params.id,
    ...sanitized,
    updatedAt: new Date().toISOString()
  };

  if (!permissionStorage.has(req.params.id)) {
    permissions.createdAt = new Date().toISOString();
    permissionStorage.set(req.params.id, permissions);
  } else {
    const existing = permissionStorage.get(req.params.id);
    permissions.createdAt = existing.createdAt;
    permissionStorage.set(req.params.id, permissions);
  }

  logSecurityEvent('PERMISSIONS_UPDATED', req.params.id, {
    roles: sanitized.roles,
    scopes: sanitized.scopes
  });

  res.json({
    success: true,
    data: permissions
  });
}));

// =============================================================================
// TRUST LEVEL ASSESSMENT
// =============================================================================

// Get user trust level
app.get('/api/twins/user/:id/trust', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const user = userStorage.get(req.params.id);

  if (!user) {
    throw Errors.NOT_FOUND('User not found');
  }

  const trustScore = calculateTrustScore(req.params.id);
  const devices = Array.from(deviceStorage.values()).filter(d => d.userId === req.params.id);
  const sessions = Array.from(sessionStorage.values()).filter(s => s.userId === req.params.id);

  const trustAssessment = {
    userId: req.params.id,
    score: trustScore,
    level: Object.entries(TRUST_LEVELS).find(([k, v]) => v === trustScore)?.[0] || 'MEDIUM',
    factors: {
      deviceCount: devices.length,
      activeSessions: sessions.length,
      hasVerifiedEmail: !!user.email,
      hasVerifiedPhone: !!user.phone
    },
    assessedAt: new Date().toISOString()
  };

  res.json({
    success: true,
    data: trustAssessment
  });
}));

// =============================================================================
// ACTIVITY HISTORY
// =============================================================================

// Get user activity
app.get('/api/twins/user/:id/activity', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const { page = 1, limit = 50, action, resource } = req.query;

  let activities = activityStorage.get(req.params.id) || [];

  if (action) {
    activities = activities.filter(a => a.action === action);
  }
  if (resource) {
    activities = activities.filter(a => a.resource === resource);
  }

  // Sort by timestamp descending
  activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const total = activities.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  res.json({
    success: true,
    data: activities.slice(start, start + Number(limit)),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1
    }
  });
}));

// =============================================================================
// BIOMETRIC ENROLLMENT
// =============================================================================

// Get user biometrics
app.get('/api/twins/user/:id/biometric', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const user = userStorage.get(req.params.id);

  if (!user) {
    throw Errors.NOT_FOUND('User not found');
  }

  const biometric = {
    userId: req.params.id,
    enrolled: user.biometricEnrolled || false,
    methods: user.biometricMethods || [],
    lastVerified: user.biometricLastVerified || null,
    enrolledAt: user.biometricEnrolledAt || null
  };

  res.json({
    success: true,
    data: biometric
  });
}));

// Enroll biometric
app.post('/api/twins/user/:id/biometric', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const { method, referenceId } = req.body;

  if (!method || !referenceId) {
    throw Errors.VALIDATION('method and referenceId are required');
  }

  const user = userStorage.get(req.params.id);
  if (!user) {
    throw Errors.NOT_FOUND('User not found');
  }

  const biometricMethods = user.biometricMethods || [];
  if (!biometricMethods.includes(method)) {
    biometricMethods.push(method);
  }

  await userTwinService.update(req.params.id, {
    biometricEnrolled: true,
    biometricMethods,
    biometricEnrolledAt: new Date().toISOString(),
    biometricLastVerified: new Date().toISOString()
  });

  logSecurityEvent('BIOMETRIC_ENROLLED', req.params.id, { method });

  res.json({
    success: true,
    message: 'Biometric enrolled successfully',
    data: {
      method,
      enrolledAt: new Date().toISOString()
    }
  });
}));

// =============================================================================
// USER PREFERENCES
// =============================================================================

// Get user preferences
app.get('/api/twins/user/:id/preferences', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const user = userStorage.get(req.params.id);

  if (!user) {
    throw Errors.NOT_FOUND('User not found');
  }

  res.json({
    success: true,
    data: {
      preferences: user.preferences || {},
      settings: user.settings || {}
    }
  });
}));

// Update user preferences
app.put('/api/twins/user/:id/preferences', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const sanitized = sanitizeInput(req.body, ['preferences', 'settings']);

  const user = userStorage.get(req.params.id);
  if (!user) {
    throw Errors.NOT_FOUND('User not found');
  }

  const updated = await userTwinService.update(req.params.id, {
    preferences: { ...user.preferences, ...sanitized.preferences },
    settings: { ...user.settings, ...sanitized.settings }
  });

  logActivity(req.params.id, 'UPDATE', 'preferences', {
    fields: Object.keys(sanitized)
  });

  res.json({
    success: true,
    data: {
      preferences: updated.preferences,
      settings: updated.settings
    }
  });
}));

// =============================================================================
// ANALYTICS
// =============================================================================

// User analytics
app.get('/api/analytics/users', defaultLimiter, requireAuth, asyncHandler(async (req, res) => {
  const users = Array.from(userStorage.values());

  const analytics = {
    total: users.length,
    byStatus: {},
    byRole: {},
    withDevices: 0,
    withSessions: 0,
    withBiometric: 0,
    averageTrustScore: 0
  };

  let totalTrust = 0;

  users.forEach(user => {
    // By status
    analytics.byStatus[user.status] = (analytics.byStatus[user.status] || 0) + 1;

    // By role
    const role = user.role || 'user';
    analytics.byRole[role] = (analytics.byRole[role] || 0) + 1;

    // Device count
    const devices = Array.from(deviceStorage.values()).filter(d => d.userId === user.id);
    if (devices.length > 0) analytics.withDevices++;

    // Session count
    const sessions = Array.from(sessionStorage.values()).filter(s => s.userId === user.id);
    if (sessions.length > 0) analytics.withSessions++;

    // Biometric
    if (user.biometricEnrolled) analytics.withBiometric++;

    // Trust score
    totalTrust += calculateTrustScore(user.id);
  });

  analytics.averageTrustScore = users.length > 0
    ? Math.round(totalTrust / users.length * 100) / 100
    : 0;

  res.json({
    success: true,
    data: analytics
  });
}));

// =============================================================================
// SECURITY LOGS
// =============================================================================

// Get security logs
app.get('/api/twins/security-logs', strictLimiter, requireAuth, asyncHandler(async (req, res) => {
  const { userId, type, limit = 100 } = req.query;

  let logs = Array.from(securityLogStorage.values());

  if (userId) {
    logs = logs.filter(l => l.userId === userId);
  }
  if (type) {
    logs = logs.filter(l => l.type === type);
  }

  // Sort by timestamp descending
  logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json({
    success: true,
    data: logs.slice(0, Number(limit)),
    count: logs.length
  });
}));

// =============================================================================
// ERROR HANDLING
// =============================================================================

// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============
const phase5Cleanup = installPhase5(app, {
  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',
  twinType: 'user',
  store: typeof userStorage !== 'undefined' ? userStorage : null,
  version: process.env.SERVICE_VERSION || '2.0.0',
  stats: () => ({ count: userStorage.size }),
})

app.use(notFoundHandler);
app.use(errorHandler);

// =============================================================================
// START SERVER
// =============================================================================


;
const server = app.listen(PORT, () => {
  logger.info(`User Twin Service started`, {
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT
  });
  console.log(`User Twin Service running on port ${PORT}`);
});
installGracefulShutdown(server, phase5Cleanup);

export default app;
