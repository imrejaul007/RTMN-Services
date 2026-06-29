/**
 * Shared Tenant Isolation Middleware
 *
 * Reusable tenant context for all department packs.
 */

import { Request, Response, NextFunction } from 'express';

export interface TenantContext {
  tenantId: string;
  companyId: string;
  config: Record<string, unknown>;
}

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

/**
 * Extract tenant ID from request
 */
export function extractTenantId(req: Request): string | null {
  // Check header
  const headerTenant = req.headers['x-tenant-id'] as string;
  if (headerTenant) return headerTenant;

  // Check JWT payload
  if (req.user && typeof req.user === 'object') {
    const user = req.user as { tenantId?: string };
    return user.tenantId || null;
  }

  return null;
}

/**
 * Required tenant middleware
 */
export function requireTenant(req: Request, res: Response, next: NextFunction): void {
  const tenantId = extractTenantId(req);

  if (!tenantId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-Tenant-ID header',
    });
    return;
  }

  req.tenant = {
    tenantId,
    companyId: (req.headers['x-company-id'] as string) || tenantId,
    config: extractConfig(req),
  };

  next();
}

/**
 * Optional tenant middleware
 */
export function optionalTenant(req: Request, _res: Response, next: NextFunction): void {
  const tenantId = extractTenantId(req);

  if (tenantId) {
    req.tenant = {
      tenantId,
      companyId: (req.headers['x-company-id'] as string) || tenantId,
      config: extractConfig(req),
    };
  }

  next();
}

/**
 * Extract config from headers
 */
function extractConfig(req: Request): Record<string, unknown> {
  return {
    currency: req.headers['x-currency'] || 'INR',
    timezone: req.headers['x-timezone'] || 'Asia/Kolkata',
  };
}

/**
 * Validate tenant ownership
 */
export function isSameTenant(resourceTenantId: string, requestTenantId: string): boolean {
  return resourceTenantId === requestTenantId;
}
