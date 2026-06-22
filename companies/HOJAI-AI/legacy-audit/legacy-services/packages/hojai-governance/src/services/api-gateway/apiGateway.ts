import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { v4 as uuid } from 'uuid';
import { authService } from '../auth/authService.js';
import { AuditAction } from '../../types/index.js';
import { auditLogger } from '../audit/auditLogger.js';

const router = express.Router();

// ============================================================================
// RATE LIMITING
// ============================================================================

const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute globally
  message: {
    success: false,
    error: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 login attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ============================================================================
// REQUEST LOGGING
// ============================================================================

const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  req.requestId = req.headers['x-request-id'] as string || uuid();
  res.setHeader('X-Request-ID', req.requestId);

  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`
    );
  });

  next();
};

// ============================================================================
// AUTH ROUTES
// ============================================================================

/**
 * POST /api/auth/register
 * Register a new user
 */
router.post(
  '/auth/register',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, email, password, name, phone } = req.body;

      if (!tenantId || !email || !password || !name) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: tenantId, email, password, name'
        });
        return;
      }

      const result = await authService.register({
        tenantId,
        email,
        password,
        name,
        phone
      });

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        res.status(409).json({
          success: false,
          error: error.message
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticate user
 */
router.post(
  '/auth/login',
  authLimiter,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, email, password } = req.body;

      if (!tenantId || !email || !password) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: tenantId, email, password'
        });
        return;
      }

      const result = await authService.login({
        tenantId,
        email,
        password,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      if (error.message.includes('Invalid credentials') || error.message.includes('locked')) {
        res.status(401).json({
          success: false,
          error: error.message
        });
        return;
      }
      next(error);
    }
  }
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/auth/refresh', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        error: 'Refresh token required'
      });
      return;
    }

    const tokens = await authService.refreshTokens(refreshToken);

    res.json({
      success: true,
      data: tokens
    });
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired refresh token'
    });
  }
});

/**
 * POST /api/auth/api-key
 * Create API key for tenant
 */
router.post(
  '/auth/api-key',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { tenantId, name, type, permissions, expiresInDays } = req.body;

      if (!tenantId || !name || !type) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: tenantId, name, type'
        });
        return;
      }

      const result = await authService.createApiKey({
        tenantId,
        name,
        type,
        permissions,
        expiresInDays
      });

      // Return raw key only once - it cannot be retrieved again
      res.status(201).json({
        success: true,
        data: {
          apiKey: result.apiKey,
          rawKey: result.rawKey // Only returned once!
        },
        message: 'Store this API key securely. It cannot be retrieved again.'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/auth/api-keys
 * List API keys for tenant
 */
router.get('/auth/api-keys', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    const apiKeys = await authService.listApiKeys(tenantId);

    // Mask sensitive data
    const maskedKeys = apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      type: key.type,
      status: key.status,
      keyPrefix: key.keyPrefix + '***',
      permissions: key.permissions,
      expiresAt: key.expiresAt,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt
    }));

    res.json({
      success: true,
      data: maskedKeys
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/auth/api-key/:id
 * Revoke API key
 */
router.delete(
  '/auth/api-key/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const tenantId = req.headers['x-tenant-id'] as string;
      const { id } = req.params;

      if (!tenantId) {
        res.status(400).json({
          success: false,
          error: 'Tenant ID required'
        });
        return;
      }

      await authService.revokeApiKey(tenantId, id);

      res.json({
        success: true,
        message: 'API key revoked'
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/change-password
 * Change user password
 */
router.post(
  '/auth/change-password',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { userId, currentPassword, newPassword } = req.body;

      if (!userId || !currentPassword || !newPassword) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
        return;
      }

      await authService.changePassword(userId, currentPassword, newPassword);

      res.json({
        success: true,
        message: 'Password changed successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }
);

// ============================================================================
// EXPORT ROUTER
// ============================================================================

export default router;
export { globalLimiter, authLimiter, requestLogger };
