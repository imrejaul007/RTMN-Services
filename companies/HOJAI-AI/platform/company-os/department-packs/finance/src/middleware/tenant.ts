/**
 * Tenant Isolation Middleware
 *
 * Ensures all requests are scoped to a specific tenant.
 */

import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../types';

declare global {
  namespace Express {
    interface Request {
      tenant?: TenantContext;
    }
  }
}

/**
 * Extract tenant ID from header or JWT
 */
export function extractTenantId(req: Request): string | null {
  // Check header first
  const headerTenant = req.headers['x-tenant-id'] as string;
  if (headerTenant) return headerTenant;

  // Check JWT payload (if authenticated)
  if (req.user && typeof req.user === 'object') {
    const user = req.user as { tenantId?: string };
    return user.tenantId || null;
  }

  return null;
}

/**
 * Tenant context middleware
 */
export function tenantMiddleware(req: Request, res: Response, next: NextFunction): void {
  const tenantId = extractTenantId(req);

  if (!tenantId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing tenant context',
    });
    return;
  }

  // Initialize tenant context
  req.tenant = {
    tenantId,
    companyId: req.headers['x-company-id'] as string || tenantId,
    config: {
      currency: (req.headers['x-currency'] as string) || 'INR',
      timezone: (req.headers['x-timezone'] as string) || 'Asia/Kolkata',
      fiscalYearStart: (req.headers['x-fiscal-start'] as string) || '04-01',
      gstEnabled: req.headers['x-gst-enabled'] !== 'false',
      tdsEnabled: req.headers['x-tds-enabled'] !== 'false',
      multiCurrency: req.headers['x-multi-currency'] === 'true',
    },
  };

  next();
}

/**
 * Optional tenant middleware (doesn't fail if missing)
 */
export function optionalTenantMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const tenantId = extractTenantId(req);

  if (tenantId) {
    req.tenant = {
      tenantId,
      companyId: req.headers['x-company-id'] as string || tenantId,
      config: {
        currency: (req.headers['x-currency'] as string) || 'INR',
        timezone: (req.headers['x-timezone'] as string) || 'Asia/Kolkata',
        fiscalYearStart: (req.headers['x-fiscal-start'] as string) || '04-01',
        gstEnabled: req.headers['x-gst-enabled'] !== 'false',
        tdsEnabled: req.headers['x-tds-enabled'] !== 'false',
        multiCurrency: req.headers['x-multi-currency'] === 'true',
      },
    };
  }

  next();
}

/**
 * Validate tenant ownership of a resource
 */
export function validateTenantOwnership(
  resourceTenantId: string,
  requestTenantId: string
): boolean {
  return resourceTenantId === requestTenantId;
}
