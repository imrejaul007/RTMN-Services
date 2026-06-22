/**
 * Tenant Middleware
 * Extracts tenant context from headers
 */

import { Request, Response, NextFunction } from 'express';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('tenant-middleware');

/**
 * Tenant context interface
 */
export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  roles?: string[];
}

/**
 * Extract tenant from headers
 */
export function tenantMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const namespace = req.headers['x-namespace'] as string || 'default';
    const plan = req.headers['x-plan'] as TenantContext['plan'];
    const rolesHeader = req.headers['x-roles'] as string;

    if (!tenantId) {
      // Allow requests without tenant for health checks
      if (req.path === '/health' || req.path === '/health/live') {
        next();
        return;
      }

      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'X-Tenant-Id header is required',
        },
      });
      return;
    }

    // Parse roles if present
    const roles = rolesHeader ? rolesHeader.split(',').map((r) => r.trim()) : undefined;

    // Attach tenant context to request
    req.tenantContext = {
      tenant_id: tenantId,
      namespace,
      user_id: userId,
      plan,
      roles,
    };

    if (userId) {
      req.userId = userId;
    }

    logger.debug('tenant_context_set', {
      tenantId,
      userId,
      namespace,
    });

    next();
  };
}

/**
 * Optional tenant middleware - doesn't fail if no tenant
 */
export function optionalTenantMiddleware() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (tenantId) {
      req.tenantContext = {
        tenant_id: tenantId,
        namespace: (req.headers['x-namespace'] as string) || 'default',
        user_id: userId,
        plan: req.headers['x-plan'] as TenantContext['plan'],
      };

      if (userId) {
        req.userId = userId;
      }
    }

    next();
  };
}
