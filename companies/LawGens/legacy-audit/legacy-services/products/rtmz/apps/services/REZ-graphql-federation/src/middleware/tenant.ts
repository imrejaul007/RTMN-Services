import { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  tenant_id: string;
  user_id?: string;
  roles?: string[];
}

export interface TenantRequest extends Request {
  tenantContext?: TenantContext;
  userId?: string;
}

export function tenantMiddleware() {
  return (req: TenantRequest, res: Response, next: NextFunction): void => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const userId = req.headers['x-user-id'] as string;
    const rolesHeader = req.headers['x-user-roles'] as string;
    const roles = rolesHeader ? rolesHeader.split(',').map(r => r.trim()) : [];

    if (!tenantId && req.path !== '/health' && req.path !== '/health/live') {
      res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'X-Tenant-ID header is required'
        }
      });
      return;
    }

    req.tenantContext = {
      tenant_id: tenantId || 'default',
      user_id: userId,
      roles
    };

    if (userId) {
      req.userId = userId;
    }

    next();
  };
}

export function extractTenantId(req: Request): string {
  const tenantReq = req as TenantRequest;
  return tenantReq.tenantContext?.tenant_id ||
    req.headers['x-tenant-id'] as string ||
    'default';
}

export function extractUserId(req: Request): string | undefined {
  const tenantReq = req as TenantRequest;
  return tenantReq.tenantContext?.user_id || req.headers['x-user-id'] as string;
}

export function extractRoles(req: Request): string[] {
  const tenantReq = req as TenantRequest;
  return tenantReq.tenantContext?.roles || [];
}
