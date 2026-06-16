import { Request, Response, NextFunction } from 'express';

// Tenant isolation middleware
export function tenantMiddleware(req: Request, res: Response, next: NextFunction) {
  // Extract tenant from JWT or header
  const tenantId = req.auth?.tenantId || req.headers['x-tenant-id'];

  if (!tenantId) {
    // For public routes, allow through
    if (!req.path.startsWith('/api/')) {
      return next();
    }
    return res.status(400).json({
      success: false,
      error: 'Tenant ID required'
    });
  }

  // Attach tenant context to request
  (req as any).tenant = {
    tenantId: tenantId as string,
    projectId: req.auth?.projectId || req.headers['x-project-id'] as string,
    userId: req.auth?.userId,
    userRole: req.auth?.role
  };

  next();
}

// Ensure all database queries are tenant-scoped
export function attachTenantFilter(query: Record<string, unknown>, tenantId: string) {
  return {
    ...query,
    tenantId
  };
}
