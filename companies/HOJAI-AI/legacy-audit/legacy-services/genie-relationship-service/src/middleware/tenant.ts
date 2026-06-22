/**
 * GENIE Relationship Service - Tenant Middleware
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Tenant context extraction from headers
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Tenant Context Interface
 */
export interface TenantContext {
  tenant_id: string;
  namespace: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  roles?: string[];
}

/**
 * Tenant middleware - extracts tenant context from headers
 */
export function tenantMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'X-Tenant-Id header is required',
        },
      });
      return;
    }

    if (!userId) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_USER_ID',
          message: 'X-User-Id header is required',
        },
      });
      return;
    }

    req.tenantContext = {
      tenant_id: tenantId,
      namespace: `tenant_${tenantId}`,
    };

    req.userId = userId;

    next();
  };
}

/**
 * Optional tenant middleware - allows requests without tenant context
 */
export function optionalTenantMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (tenantId) {
      req.tenantContext = {
        tenant_id: tenantId,
        namespace: `tenant_${tenantId}`,
      };
    }

    if (userId) {
      req.userId = userId;
    }

    next();
  };
}

/**
 * Validate tenant access
 */
export function validateTenantAccess(tenantId: string, userId: string): void {
  if (!tenantId || !userId) {
    throw new Error('Invalid tenant or user context');
  }
}
