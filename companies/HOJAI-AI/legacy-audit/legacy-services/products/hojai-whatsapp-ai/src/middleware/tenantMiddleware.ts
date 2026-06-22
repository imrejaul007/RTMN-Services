import { Request, Response, NextFunction } from 'express';
import { MerchantModel } from '../services/merchantService.js';

/**
 * Tenant isolation middleware
 *
 * Ensures all database queries are scoped to the current tenant.
 * This prevents data leakage between merchants.
 */

declare global {
  namespace Express {
    interface Request {
      tenantId: string;
      merchantId: string;
      merchant?: any;
    }
  }
}

/**
 * Extract tenant from API key
 */
export async function tenantMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API key required',
      hint: 'Include X-API-Key header'
    });
  }

  try {
    const merchant = await MerchantModel.findOne({ apiKey }).lean();

    if (!merchant) {
      return res.status(401).json({
        success: false,
        error: 'Invalid API key'
      });
    }

    // Attach tenant info to request
    req.tenantId = merchant.tenantId;
    req.merchantId = (merchant as any)._id.toString();
    req.merchant = merchant;

    next();
  } catch (error) {
    console.error('[Tenant Middleware] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Authentication failed'
    });
  }
}

/**
 * Verify tenant has active subscription
 */
export async function subscriptionMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.merchant) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required'
    });
  }

  const { status, subscriptionEndsAt } = req.merchant;

  // Check status
  if (status === 'suspended') {
    return res.status(403).json({
      success: false,
      error: 'Account suspended',
      hint: 'Please contact support'
    });
  }

  if (status === 'inactive') {
    return res.status(403).json({
      success: false,
      error: 'Account inactive',
      hint: 'Please renew your subscription'
    });
  }

  // Check subscription expiry
  if (subscriptionEndsAt && new Date(subscriptionEndsAt) < new Date()) {
    return res.status(403).json({
      success: false,
      error: 'Subscription expired',
      hint: 'Please renew your subscription'
    });
  }

  next();
}

/**
 * Rate limiting per tenant
 */
const tenantRateLimits = new Map<string, { count: number; resetAt: number }>();

export function tenantRateLimit(
  maxRequests: number = 100,
  windowMs: number = 60000
) {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.tenantId;
    const now = Date.now();
    const record = tenantRateLimits.get(tenantId);

    if (!record || now > record.resetAt) {
      tenantRateLimits.set(tenantId, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded',
        hint: `Maximum ${maxRequests} requests per minute`
      });
    }

    record.count++;
    next();
  };
}

/**
 * Tenant-scoped query helper
 */
export function scopeToTenant<T extends Record<string, any>>(
  query: T,
  tenantId: string
): T {
  return { ...query, tenantId };
}

/**
 * Tenant-scoped MongoDB aggregation
 */
export function getTenantAggregation(tenantId: string, pipeline: any[]): any[] {
  return [
    { $match: { tenantId } },
    ...pipeline
  ];
}
