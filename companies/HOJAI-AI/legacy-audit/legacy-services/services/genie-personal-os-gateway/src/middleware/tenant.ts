/**
 * GENIE Personal OS Gateway - Tenant Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../types.js';

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
