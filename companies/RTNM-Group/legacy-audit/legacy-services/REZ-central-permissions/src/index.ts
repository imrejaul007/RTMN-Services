/**
 * REZ Central Permissions System
 * Main Entry Point and API Server
 *
 * A comprehensive RBAC + ABAC hybrid permission engine for REZ Commerce OS
 */

import express, { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  PermissionEngine,
  getPermissionEngine,
} from './PermissionEngine';
import {
  PermissionRequest,
  PermissionResult,
  PermissionCheck,
  Policy,
  AuditEntry,
  PermissionConfig,
} from './types';
import { createPolicyFromTemplate, getTemplateNames } from './policies/PolicyTemplates';

// Express app setup
const app = express();
app.use(express.json());

// =============================================================================
// SECURITY - Authentication
// =============================================================================

const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const TOKENS_JSON = process.env.INTERNAL_SERVICE_TOKENS_JSON || '{}';

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

function verifyToken(token: string): boolean {
  if (INTERNAL_TOKEN && timingSafeCompare(token, INTERNAL_TOKEN)) return true;
  try {
    const tokens = JSON.parse(TOKENS_JSON);
    return Object.values(tokens).some((t: string) => timingSafeCompare(token, t));
  } catch {
    return false;
  }
}

function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'] as string;

  if (!token) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!verifyToken(token)) {
    res.status(403).json({ error: 'Invalid token' });
    return;
  }

  next();
}

// Initialize engine
let engine: PermissionEngine;

// Configuration
interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  rateLimit: {
    maxRequests: number;
    windowMs: number;
  };
}

const config: ServerConfig = {
  port: parseInt(process.env.PORT || '3001'),
  host: process.env.HOST || '0.0.0.0',
  corsOrigins: (() => {
    const isProduction = process.env.NODE_ENV === 'production';
    const origins = process.env.CORS_ORIGINS?.split(',') || [];
    if (isProduction && (origins.length === 0 || origins.includes('*'))) {
      throw new Error('CORS_ORIGINS must be explicitly configured in production (wildcard "*" not allowed)');
    }
    return origins.length > 0 ? origins : ['http://localhost:3000'];
  })(),
  rateLimit: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000'),
  },
};

// Simple in-memory rate limiter
const rateLimiter = new Map<string, { count: number; resetAt: number }>();
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimiter.get(ip);

  if (!record || now > record.resetAt) {
    rateLimiter.set(ip, { count: 1, resetAt: now + config.rateLimit.windowMs });
    return true;
  }

  if (record.count >= config.rateLimit.maxRequests) {
    return false;
  }

  record.count++;
  return true;
}

// Simple structured logger
const log = {
  info: (msg: string, meta?: Record<string, unknown>) => {
    console.log(JSON.stringify({ level: 'info', timestamp: new Date().toISOString(), message: msg, ...meta }));
  },
  warn: (msg: string, meta?: Record<string, unknown>) => {
    console.warn(JSON.stringify({ level: 'warn', timestamp: new Date().toISOString(), message: msg, ...meta }));
  },
  error: (msg: string, meta?: Record<string, unknown>) => {
    console.error(JSON.stringify({ level: 'error', timestamp: new Date().toISOString(), message: msg, ...meta }));
  }
};

// Error handler middleware
function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  log.error('Request error', { error: err.message, stack: err.stack });
  res.status(500).json({
    error: 'Internal Server Error',
    requestId: require('uuid').v4(), // For debugging with logs
  });
}

// Request logger middleware
function requestLogger(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    log.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: _res.statusCode,
      durationMs: duration
    });
  });
  next();
}

// ============== API Routes ==============

/**
 * Health check endpoint
 */
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'REZ Central Permissions',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  });
});

/**
 * Check permission
 * POST /api/v1/permissions/check
 * SECURITY: Added requireAuth
 */
app.post('/api/v1/permissions/check', requireAuth, async (req: Request, res: Response) => {
  try {
    // Rate limit check
    const clientIp = req.ip || 'unknown';
    if (!checkRateLimit(clientIp)) {
      res.status(429).json({
        error: 'Too Many Requests',
        message: 'Rate limit exceeded',
      });
      return;
    }

    const request: PermissionRequest = req.body;

    // Validate request
    if (!request.user_id || !request.user_type || !request.resource || !request.action) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'Missing required fields: user_id, user_type, resource, action',
      });
      return;
    }

    const result: PermissionResult = await engine.check(request);
    res.json(result);
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Check permission (full response)
 * POST /api/v1/permissions/check-full
 */
app.post('/api/v1/permissions/check-full', requireAuth, async (req: Request, res: Response) => {
  try {
    const request: PermissionRequest = req.body;
    const result: PermissionCheck = await engine.checkFull(request);
    res.json(result);
  } catch (error) {
    console.error('Permission check error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Batch permission check
 * POST /api/v1/permissions/check-batch
 */
app.post('/api/v1/permissions/check-batch', requireAuth, async (req: Request, res: Response) => {
  try {
    const request: PermissionRequest = req.body;
    const results = await engine.checkBatch(request);

    const formatted = new Map<string, PermissionResult>();
    results.forEach((value, key) => {
      formatted.set(key, value);
    });

    res.json(Object.fromEntries(formatted));
  } catch (error) {
    console.error('Batch permission check error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get permission engine configuration
 * GET /api/v1/permissions/config
 */
app.get('/api/v1/permissions/config', requireAuth, (_req: Request, res: Response) => {
  const config = engine.getConfig();
  res.json(config);
});

/**
 * Update permission engine configuration
 * PUT /api/v1/permissions/config
 */
app.put('/api/v1/permissions/config', requireAuth, (req: Request, res: Response) => {
  try {
    const updates: Partial<PermissionConfig> = req.body;
    engine.updateConfig(updates);
    res.json(engine.getConfig());
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Invalidate cache
 * POST /api/v1/permissions/cache/invalidate
 */
app.post('/api/v1/permissions/cache/invalidate', requireAuth, async (req: Request, res: Response) => {
  try {
    const { user_id, resource } = req.body;
    await engine.invalidateCache(user_id, resource);
    res.json({ success: true, message: 'Cache invalidated' });
  } catch (error) {
    console.error('Cache invalidation error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ============== Policy Routes ==============

/**
 * Get all policies
 * GET /api/v1/policies
 */
app.get('/api/v1/policies', requireAuth, async (_req: Request, res: Response) => {
  try {
    const policies = await engine.getPolicies();
    res.json(policies);
  } catch (error) {
    console.error('Get policies error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Add new policy
 * POST /api/v1/policies
 */
app.post('/api/v1/policies', requireAuth, async (req: Request, res: Response) => {
  try {
    const policy: Policy = req.body;
    await engine.addPolicy(policy);
    res.status(201).json({ success: true, policy });
  } catch (error) {
    console.error('Add policy error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Remove policy
 * DELETE /api/v1/policies/:id
 */
app.delete('/api/v1/policies/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await engine.removePolicy(id);
    res.json({ success: true, message: `Policy ${id} removed` });
  } catch (error) {
    console.error('Remove policy error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Create policy from template
 * POST /api/v1/policies/from-template
 */
app.post('/api/v1/policies/from-template', requireAuth, async (req: Request, res: Response) => {
  try {
    const { template, params } = req.body;
    const policy = createPolicyFromTemplate(template, params);
    await engine.addPolicy(policy);
    res.status(201).json({ success: true, policy });
  } catch (error) {
    console.error('Create policy from template error:', error);
    res.status(400).json({
      error: 'Bad Request',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get available policy templates
 * GET /api/v1/policies/templates
 */
app.get('/api/v1/policies/templates', (_req: Request, res: Response) => {
  const templates = getTemplateNames();
  res.json(templates);
});

// ============== Audit Routes ==============

/**
 * Query audit log
 * POST /api/v1/audit/query
 */
app.post('/api/v1/audit/query', requireAuth, async (req: Request, res: Response) => {
  try {
    const filters = req.body;
    const entries = await engine.getAuditLog(filters);
    res.json(entries);
  } catch (error) {
    console.error('Audit query error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get audit statistics
 * GET /api/v1/audit/stats
 */
app.get('/api/v1/audit/stats', requireAuth, async (req: Request, res: Response) => {
  try {
    const { start_date, end_date } = req.query;
    const entries = await engine.getAuditLog({
      start_date: start_date as string,
      end_date: end_date as string,
      limit: 10000,
    });

    // Calculate stats
    const stats = {
      total: entries.length,
      granted: entries.filter((e: AuditEntry) => e.decision === 'granted').length,
      denied: entries.filter((e: AuditEntry) => e.decision === 'denied').length,
      byResource: {} as Record<string, number>,
      byUser: {} as Record<string, number>,
    };

    for (const entry of entries) {
      stats.byResource[entry.resource] = (stats.byResource[entry.resource] || 0) + 1;
      stats.byUser[entry.user_id] = (stats.byUser[entry.user_id] || 0) + 1;
    }

    res.json(stats);
  } catch (error) {
    console.error('Audit stats error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Apply middleware
app.use(requestLogger);
app.use(errorHandler);

// ============== Server Start ==============

/**
 * Initialize and start the server
 */
async function start(): Promise<void> {
  try {
    // Initialize permission engine
    engine = getPermissionEngine({
      cacheEnabled: true,
      cacheTTL: 300,
      auditEnabled: true,
      defaultDeny: true,
      policyCombineAlgorithm: 'deny-overrides',
    });

    console.log('REZ Central Permissions Engine initialized');

    // Start server
    app.listen(config.port, config.host, () => {
      logger.info(
========================================
  REZ Central Permissions Service
========================================
  Status:    Running
  Host:      ${config.host}
  Port:      ${config.port}
  Environment: ${process.env.NODE_ENV || 'development'}
========================================

  Endpoints:
  - GET  /health                          - Health check
  - POST /api/v1/permissions/check       - Check permission
  - POST /api/v1/permissions/check-full  - Check permission (full)
  - POST /api/v1/permissions/check-batch - Batch check
  - GET  /api/v1/permissions/config      - Get config
  - PUT  /api/v1/permissions/config      - Update config
  - POST /api/v1/permissions/cache/invalidate - Invalidate cache
  - GET  /api/v1/policies                - List policies
  - POST /api/v1/policies                - Add policy
  - DELETE /api/v1/policies/:id          - Remove policy
  - POST /api/v1/policies/from-template   - Create from template
  - GET  /api/v1/policies/templates      - List templates
  - POST /api/v1/audit/query             - Query audit log
  - GET  /api/v1/audit/stats             - Audit statistics

========================================
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Handle shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start if run directly
if (require.main === module) {
  start();
}

// Export for testing
export { app, engine, start };
