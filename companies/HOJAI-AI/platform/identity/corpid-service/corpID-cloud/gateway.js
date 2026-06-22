/**
 * CorpID Cloud - Unified Gateway
 * Single entry point for all CorpID services
 *
 * This gateway aggregates:
 * - Core (User, Auth, Session)
 * - Organization (Org, Dept, Team, Membership)
 * - RBAC (Roles, Permissions, Policies)
 * - Session Management
 * - API Identity
 * - Audit
 */

import express from 'express';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// ============ IMPORTS ============

// Shared middleware
import { authLimiter, apiLimiter, strictLimiter } from './shared/middleware/rate-limit.js';
import { requireAuth, requireAdmin, requireSuperadmin, optionalAuth } from './shared/middleware/auth.js';
import { errorHandler, notFoundHandler, asyncHandler, AppError } from './shared/middleware/error-handler.js';
import { createRequestLogger, logger } from './shared/utils/logger.js';

// Services
import organizationRoutes from './organization/src/routes/organization.routes.js';
import {
  organizationService,
  departmentService,
  teamService,
  membershipService,
  invitationService
} from './organization/src/services/organization.service.js';

import {
  roleService,
  permissionService,
  policyService,
  featureFlagService,
  accessControlService
} from './RBAC/src/services/rbac.service.js';

import apiIdentityRoutes from './api-identity/src/routes/api-identity.routes.js';

import deviceRoutes from './device/src/routes/device.routes.js';

import auditRoutes from './audit/src/routes/audit.routes.js';

// Phase 2 services
import consumerRoutes from './consumer/src/routes/consumer.routes.js';
import merchantRoutes from './merchant/src/routes/merchant.routes.js';
import agentRoutes from './agent/src/routes/agent.routes.js';
import trustRoutes from './trust/src/routes/trust.routes.js';

// Phase 3 services
import graphRoutes from './graph/src/routes/graph.routes.js';
import universalRoutes from './universal/src/routes/universal.routes.js';
import memoryRoutes from './memory/src/routes/memory.routes.js';
import timelineRoutes from './timeline/src/routes/timeline.routes.js';

// Phase 4 services
import kycRoutes from './kyc/src/routes/kyc.routes.js';
import consentRoutes from './consent/src/routes/consent.routes.js';
import federationRoutes from './federation/src/routes/federation.routes.js';
import twinRoutes from './twin/src/routes/twin.routes.js';
import developerRoutes from './developer/src/routes/developer.routes.js';
import verificationRoutes from './verification/src/routes/verification.routes.js';
import employeeRoutes from './employee/src/routes/employee.routes.js';

import { recordEvent as recordTimelineEvent } from './timeline/src/models/timeline.model.js';

import {
  users,
  getUserByEmail,
  getUserById,
  createUserWithPassword,
  createSession,
  getUserSessions,
  revokeSession,
  revokeAllUserSessions,
  updatePassword,
  getSessionByRefreshToken,
} from './core/src/models/user.model.js';

import {
  registerOrUpdateDevice
} from './device/src/models/device.model.js';

import {
  createAuditEvent,
  queryAuditEvents,
  getAuditStats
} from './audit/src/models/audit.model.js';

import { generateAccessToken, generateRefreshToken, verifyToken } from './shared/middleware/auth.js';
import { hashPassword, verifyPassword, checkPasswordStrength, generateToken, maskEmail } from './shared/utils/security.js';
import { auditLog, authAudit, dataAudit } from './shared/utils/logger.js';

// ============ APP SETUP ============

const app = express();

// Validate required env at startup
import { requireEnv } from '@rtmn/shared/lib/env';
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4702;
const SERVICE_NAME = 'CorpID Cloud Gateway';
// SECURITY FIX (CORPID L-8): read version from package.json so it stays in
// sync with the published version. The banner previously printed
// 'v4.0.0 - ALL PHASES COMPLETE' while package.json and the /health response
// said '1.0.0'. Single source of truth: package.json.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
const __dirname_ = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname_, 'package.json'), 'utf8'));
const SERVICE_VERSION = pkg.version;

// ============ MIDDLEWARE ============

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-API-Key']
}));

// Compression
app.use(compression());

// Request logging
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request ID
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Auto-register device on authenticated requests
app.use((req, res, next) => {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    const token = req.headers.authorization.slice(7);
    const decoded = verifyToken(token);
    if (decoded && decoded.type === 'access' && decoded.sub) {
      // Register/update device for this request
      try {
        const device = registerOrUpdateDevice(decoded.sub, {
          userAgent: req.headers['user-agent'],
          ip: req.ip,
          sessionId: null
        });
        req.device = device;
      } catch (err) {
        // Don't block on device registration errors
      }
    }
  }
  next();
});

// ============ HEALTH ENDPOINTS ============

app.get('/health', async (req, res) => {
  const apiIdentity = await import('./api-identity/src/models/api-key.model.js').catch(() => ({ apiKeys: { size: 0 }, webhooks: { size: 0 } }));
  const deviceModel = await import('./device/src/models/device.model.js').catch(() => ({ devices: { size: 0 } }));
  const auditModel = await import('./audit/src/models/audit.model.js').catch(() => ({ auditEvents: [] }));

  // SECURITY FIX (CORPID L-5): event-loop liveness probe. If the loop is
  // wedged, the setTimeout fires later than expected and we surface that as
  // a degraded health status. Without this, /health returned process.uptime()
  // and Map sizes but couldn't tell us the loop was stuck.
  const probeStart = Date.now();
  const eventLoopLagMs = await new Promise(resolve => {
    setImmediate(() => resolve(Date.now() - probeStart));
  });
  const healthy = eventLoopLagMs < 1000;

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    port: PORT,
    timestamp: new Date().toISOString(),
    eventLoopLagMs,
    stats: {
      users: users.size,
      organizations: 1,
      apiKeys: apiIdentity.apiKeys.size,
      devices: deviceModel.devices.size,
      webhooks: apiIdentity.webhooks.size,
      auditEvents: auditModel.auditEvents.length,
      uptime: process.uptime()
    }
  });
});

app.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    service: SERVICE_NAME,
    timestamp: new Date().toISOString()
  });
});

// ============ AUTH ROUTES ============

const authRouter = express.Router();

// Register
authRouter.post('/register',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, name, phone } = req.body;

    // Validate required fields
    if (!email || !password || !name) {
      throw new AppError('Email, password, and name are required', 400, 'VALIDATION_ERROR');
    }

    // Check password strength
    const strength = checkPasswordStrength(password);
    if (strength.score < 3) {
      throw new AppError(
        'Password is too weak. ' + strength.suggestions.join('. '),
        400,
        'WEAK_PASSWORD'
      );
    }

    // Check if user exists
    if (getUserByEmail(email)) {
      throw new AppError('User with this email already exists', 409, 'USER_EXISTS');
    }

    // Create user
    const user = await createUserWithPassword({ email, password, name, phone });

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: 'member'
    });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Create session
    createSession({
      userId: user.id,
      userEmail: user.email,
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
      userAgent: req.headers['user-agent'],
      clientIp: req.ip,
      clientType: 'web'
    });

    authAudit('register', req, 'success', { userId: user.id });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      accessToken,
      refreshToken,
      expiresIn: '1h',
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: 'member'
      }
    });
  })
);

// Login
authRouter.post('/login',
  authLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }

    const user = getUserByEmail(email);
    if (!user) {
      authAudit('login_failed', req, 'failure', { reason: 'user_not_found' });
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      authAudit('login_failed', req, 'failure', { reason: 'wrong_password', userId: user.id });
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate tokens
    const accessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role || 'member',
      organizationId: user.organizationId
    });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Create session
    createSession({
      userId: user.id,
      userEmail: user.email,
      accessToken,
      refreshToken,
      accessTokenExpiresAt: new Date(Date.now() + 3600000).toISOString(),
      refreshTokenExpiresAt: new Date(Date.now() + 7 * 24 * 3600000).toISOString(),
      userAgent: req.headers['user-agent'],
      clientIp: req.ip,
      clientType: 'web'
    });

    authAudit('login', req, 'success', { userId: user.id });

    // Record in timeline
    recordTimelineEvent({
      userId: user.id,
      type: 'auth.login',
      category: 'authentication',
      title: 'Login successful',
      description: `User logged in from ${req.ip}`,
      context: {
        ip: req.ip,
        userAgent: req.headers['user-agent']
      }
    });

    res.json({
      success: true,
      message: 'Login successful',
      accessToken,
      refreshToken,
      expiresIn: '1h',
      tokenType: 'Bearer',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role || 'member'
      }
    });
  })
);

// Refresh token.
// SECURITY FIX (C-6): Now checks the refresh token against the
// revocation store before issuing a new access token. If the session
// has been revoked (logout, password reset, admin action), the
// request is rejected — even if the JWT signature is still valid.
authRouter.post('/refresh',
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400, 'VALIDATION_ERROR');
    }

    const decoded = verifyToken(refreshToken);
    if (!decoded || decoded.type !== 'refresh') {
      throw new AppError('Invalid refresh token', 401, 'INVALID_TOKEN');
    }

    // SECURITY FIX (C-6): check that this refresh token is still active.
    const session = getSessionByRefreshToken(refreshToken);
    if (!session || !session.active) {
      throw new AppError('Refresh token revoked or expired', 401, 'TOKEN_REVOKED');
    }

    const user = getUserById(decoded.sub);
    if (!user) {
      throw new AppError('User not found', 401, 'USER_NOT_FOUND');
    }

    const newAccessToken = generateAccessToken({
      id: user.id,
      email: user.email,
      role: user.role || 'member'
    });

    res.json({
      success: true,
      accessToken: newAccessToken,
      expiresIn: '1h',
      tokenType: 'Bearer'
    });
  })
);

// Logout
authRouter.post('/logout',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (refreshToken) {
      revokeSessionByRefreshToken?.(refreshToken) || revokeAllUserSessions(req.user.id);
    }

    authAudit('logout', req, 'success');

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  })
);

// Get current user
authRouter.get('/me',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = getUserById(req.user.id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role || 'member',
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        mfaEnabled: user.mfaEnabled,
        preferences: user.preferences,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt
      }
    });
  })
);

// Change password
authRouter.put('/password',
  requireAuth(),
  strictLimiter,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400, 'VALIDATION_ERROR');
    }

    // Check new password strength
    const strength = checkPasswordStrength(newPassword);
    if (strength.score < 3) {
      throw new AppError(
        'New password is too weak. ' + strength.suggestions.join('. '),
        400,
        'WEAK_PASSWORD'
      );
    }

    const user = getUserById(req.user.id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AppError('Current password is incorrect', 401, 'INVALID_PASSWORD');
    }

    // Update password
    await updatePassword(req.user.id, newPassword);

    // Revoke all sessions
    revokeAllUserSessions(req.user.id, 'password_changed');

    authAudit('password_changed', req, 'success');

    res.json({
      success: true,
      message: 'Password changed successfully. Please login again.'
    });
  })
);

// Mount auth routes
app.use('/auth', authRouter);

// ============ USER ROUTES ============

const userRouter = express.Router();

// List users (admin only)
userRouter.get('/',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const { page = 1, limit = 20, role, status } = req.query;
    let allUsers = Array.from(users.values());

    if (role) allUsers = allUsers.filter(u => u.role === role);
    if (status) allUsers = allUsers.filter(u => u.status === status);

    const start = (page - 1) * limit;
    const paginatedUsers = allUsers.slice(start, start + parseInt(limit));

    res.json({
      success: true,
      count: allUsers.length,
      page: parseInt(page),
      limit: parseInt(limit),
      users: paginatedUsers.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role || 'member',
        status: u.status,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt
      }))
    });
  })
);

// Get user by ID
userRouter.get('/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const user = getUserById(req.params.id);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        avatar: user.avatar,
        role: user.role || 'member',
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        status: user.status,
        createdAt: user.createdAt
      }
    });
  })
);

// Mount user routes
app.use('/api/users', userRouter);

// ============ ROLE & PERMISSION ROUTES ============

const rbacRouter = express.Router();

// Get all roles
rbacRouter.get('/roles',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const roles = roleService.getAll({ customOnly: false });
    res.json({ success: true, count: roles.length, roles });
  })
);

// Get role by ID
rbacRouter.get('/roles/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const role = roleService.getById(req.params.id);
    res.json({ success: true, role });
  })
);

// Create custom role
rbacRouter.post('/roles',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const role = roleService.create(req.body, req.user.id);
    res.status(201).json({ success: true, role });
  })
);

// Update role
rbacRouter.put('/roles/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    const role = roleService.update(req.params.id, req.body, req.user.id);
    res.json({ success: true, role });
  })
);

// Delete role
rbacRouter.delete('/roles/:id',
  requireAuth(),
  requireAdmin(),
  asyncHandler(async (req, res) => {
    await roleService.delete(req.params.id, req.user.id);
    res.json({ success: true, message: 'Role deleted' });
  })
);

// Get all permissions
rbacRouter.get('/permissions',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { category } = req.query;
    const perms = category
      ? permissionService.getByCategory(category)
      : permissionService.getAll();
    res.json({ success: true, count: perms.length, permissions: perms });
  })
);

// Get all feature flags
rbacRouter.get('/features',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const flags = featureFlagService.getAll();
    res.json({ success: true, count: flags.length, flags });
  })
);

// Check feature flag
rbacRouter.get('/features/:key/evaluate',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const result = featureFlagService.check(req.params.key, req.user);
    res.json({ success: true, ...result });
  })
);

// Mount RBAC routes
app.use('/api', rbacRouter);

// ============ MOUNT ORGANIZATION ROUTES ============

app.use('/api/organizations', organizationRoutes);

// ============ MOUNT API IDENTITY ROUTES ============

app.use('/api', apiIdentityRoutes);

// ============ MOUNT DEVICE ROUTES ============

app.use('/api/devices', deviceRoutes);

// ============ MOUNT AUDIT ROUTES ============

app.use('/api/audit', auditRoutes);

// ============ PHASE 2: ENTERPRISE IDENTITY ROUTES ============

app.use('/api/consumers', consumerRoutes);
app.use('/api/merchants', merchantRoutes);
app.use('/api/agents', agentRoutes);
app.use('/api/trust', trustRoutes);

// ============ PHASE 3: ADVANCED IDENTITY ROUTES ============

app.use('/api/graph', graphRoutes);
app.use('/api/universal', universalRoutes);
app.use('/api/memory', memoryRoutes);
app.use('/api/timeline', timelineRoutes);

// ============ PHASE 4: COMPLIANCE & PLATFORM ROUTES ============

app.use('/api/kyc', kycRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/federation', federationRoutes);
app.use('/api/twin', twinRoutes);
app.use('/api/developer', developerRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/employee', employeeRoutes);

// ============ SESSIONS ROUTES ============

app.get('/api/auth/sessions',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const sessions = getUserSessions(req.user.id);
    res.json({
      success: true,
      count: sessions.length,
      sessions: sessions.map(s => ({
        id: s.id,
        deviceType: s.deviceType,
        deviceName: s.deviceName,
        clientType: s.clientType,
        country: s.country,
        city: s.city,
        lastActiveAt: s.lastActiveAt,
        createdAt: s.createdAt,
        current: s.userId === req.user.id
      }))
    });
  })
);

app.delete('/api/auth/sessions/:id',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const session = revokeSession(req.params.id, 'user_logout');
    if (!session) {
      throw new AppError('Session not found', 404, 'SESSION_NOT_FOUND');
    }
    res.json({ success: true, message: 'Session revoked' });
  })
);

app.delete('/api/auth/sessions',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const count = revokeAllUserSessions(req.user.id, 'user_logout_all');
    res.json({ success: true, message: `${count} sessions revoked` });
  })
);

// ============ ACCESS CHECK ============

app.post('/api/access/check',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { permission, context } = req.body;
    const result = accessControlService.checkPermission(req.user.id, permission, context);
    res.json({ success: true, ...result });
  })
);

app.post('/api/access/batch-check',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { permissions, context } = req.body;
    const results = accessControlService.batchCheckPermissions(req.user.id, permissions, context);
    res.json({ success: true, results });
  })
);

app.get('/api/access/permissions',
  requireAuth(),
  asyncHandler(async (req, res) => {
    const { category } = req.query;
    const perms = accessControlService.getUserPermissions(req.user.id, { category });
    res.json({ success: true, count: perms.length, permissions: perms });
  })
);

// ============ ERROR HANDLING ============

app.use(notFoundHandler);
app.use(errorHandler);

// ============ START SERVER ============

const server = app.listen(PORT, () => {
  // SECURITY FIX (CORPID L-9): route the boot banner through the structured
  // logger instead of console.log. console.log bypasses log levels, log
  // rotation, and the default metadata (service, version, requestId). Keep
  // the banner in human-readable form for local dev, and emit the same
  // information as a structured log line for production aggregation.
  const banner = [
    '╔═══════════════════════════════════════════════════���═══════════╗',
    '║                    CorpID Cloud Gateway                       ║',
    '╠═══════════════════════════════════════════════════════════════╣',
    '║  Status:   ✅ RUNNING                                        ║',
    `║  Port:     ${PORT.toString().padEnd(53)}║`,
    `║  Version:  ${SERVICE_VERSION.padEnd(53)}║`,
    `║  Time:     ${new Date().toISOString().slice(0, 19).padEnd(53)}║`,
    '╚═══════════════════════════════════════════════════════════════╝'
  ].join('\n');
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(banner);
  }
  logger.info('CorpID Cloud Gateway started', {
    port: PORT,
    version: SERVICE_VERSION,
    banner
  });
});
installGracefulShutdown(server);

export default app;
