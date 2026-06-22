import { Request, Response, NextFunction } from 'express';
export interface TenantContext { tenant_id: string; user_id?: string }
export function tenantMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    if (!tenantId && req.path !== '/health') { res.status(400).json({ success: false, error: { code: 'MISSING_TENANT', message: 'X-Tenant-Id required' } }); return; }
    req.tenantContext = { tenant_id: tenantId || 'default', user_id: userId };
    if (userId) req.userId = userId;
    next();
  };
}
