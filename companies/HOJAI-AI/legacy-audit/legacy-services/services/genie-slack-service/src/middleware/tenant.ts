import { Request, Response, NextFunction } from 'express';
export function tenantMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) { res.status(400).json({ success: false, error: { code: 'MISSING_TENANT_ID', message: 'Required' } }); return; }
    req.tenantContext = { tenant_id: tenantId, namespace: `tenant_${tenantId}` };
    req.userId = (req.headers['x-user-id'] as string) || `user_${tenantId}`;
    next();
  };
}
