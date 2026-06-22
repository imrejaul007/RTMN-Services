/**
 * HOJAI Meeting Intelligence - Tenant Middleware
 */

import { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  tenantId: string;
  namespace: string;
  plan?: 'starter' | 'professional' | 'enterprise';
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

export function tenantMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({ success: false, error: { code: 'MISSING_TENANT_ID', message: 'X-Tenant-Id header required' } });
    }
    const uuidRegex = /^[a-zA-Z0-9-_]{8,64}$/;
    if (!uuidRegex.test(tenantId)) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_TENANT_ID', message: 'Invalid tenant ID format' } });
    }
    req.tenantContext = { tenantId, namespace: `tenant_${tenantId}` };
    next();
  };
}

export default tenantMiddleware;
