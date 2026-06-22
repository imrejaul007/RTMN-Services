/**
 * GENIE Meeting Service - Tenant Middleware
 * Version: 1.0.0 | Date: June 13, 2026
 */

import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../types.js';

/**
 * Tenant Middleware
 * Extracts tenant context from request headers
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
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
        },
      });
      return;
    }

    req.tenantContext = {
      tenant_id: tenantId,
      namespace: `tenant_${tenantId}`,
      user_id: userId,
    } as TenantContext;

    req.userId = userId || `user_${tenantId}`;
    next();
  };
}
