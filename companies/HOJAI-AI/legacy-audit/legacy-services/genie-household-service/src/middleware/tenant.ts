/**
 * Tenant Middleware
 */

import { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  roles?: string[];
}

export function tenantMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;

    if (!tenantId) {
      if (req.path === '/health' || req.path === '/health/live') {
        next();
        return;
      }
      res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT', message: 'X-Tenant-Id header is required' },
      });
      return;
    }

    req.tenantContext = {
      tenant_id: tenantId,
      namespace: (req.headers['x-namespace'] as string) || 'default',
      user_id: userId,
      plan: req.headers['x-plan'] as TenantContext['plan'],
    };

    if (userId) req.userId = userId;
    next();
  };
}
