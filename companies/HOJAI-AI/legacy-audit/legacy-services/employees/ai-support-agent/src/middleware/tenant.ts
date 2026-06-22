/**
 * HOJAI AI Support Agent - Tenant Middleware
 * Version: 1.0.0 | Date: May 30, 2026
 * Purpose: Multi-tenant isolation for support operations
 */

import { Request, Response, NextFunction } from 'express';
import { TenantContext } from '../types.js';

/**
 * Default tenant configuration
 */
const DEFAULT_TENANT: TenantContext = {
  tenant_id: 'default',
  namespace: 'default',
  plan: 'starter',
  roles: ['user'],
};

/**
 * Extract tenant context from request headers
 */
function extractTenantContext(req: Request): TenantContext {
  const tenantId = req.headers['x-tenant-id'] as string;
  const userId = req.headers['x-user-id'] as string | undefined;
  const namespace = req.headers['x-namespace'] as string | undefined;
  const plan = req.headers['x-plan'] as TenantContext['plan'] | undefined;
  const rolesHeader = req.headers['x-roles'] as string | undefined;

  if (!tenantId) {
    return DEFAULT_TENANT;
  }

  return {
    tenant_id: tenantId,
    namespace: namespace || tenantId,
    user_id: userId,
    plan: plan || 'starter',
    roles: rolesHeader ? rolesHeader.split(',') : ['user'],
  };
}

/**
 * Validate tenant context
 */
function validateTenantContext(context: TenantContext): { valid: boolean; error?: string } {
  if (!context.tenant_id || context.tenant_id.trim() === '') {
    return { valid: false, error: 'Tenant ID is required' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(context.tenant_id)) {
    return { valid: false, error: 'Invalid tenant ID format' };
  }

  const validPlans = ['starter', 'professional', 'enterprise'];
  if (context.plan && !validPlans.includes(context.plan)) {
    return { valid: false, error: 'Invalid plan type' };
  }

  return { valid: true };
}

/**
 * Tenant middleware factory
 */
export function tenantMiddleware() {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const tenantContext = extractTenantContext(req);

    // Attach tenant context to request
    req.tenantContext = tenantContext;

    // Attach user ID if present
    if (tenantContext.user_id) {
      req.userId = tenantContext.user_id;
    }

    // Log tenant context for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.debug('[Tenant Middleware]', {
        tenantId: tenantContext.tenant_id,
        userId: tenantContext.user_id,
        namespace: tenantContext.namespace,
      });
    }

    next();
  };
}

/**
 * Validate tenant context middleware
 */
export function validateTenant() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantContext = req.tenantContext || DEFAULT_TENANT;
    const validation = validateTenantContext(tenantContext);

    if (!validation.valid) {
      res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TENANT',
          message: validation.error || 'Invalid tenant context',
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Require specific roles middleware
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantContext = req.tenantContext || DEFAULT_TENANT;
    const userRoles = tenantContext.roles || [];

    const hasRequiredRole = roles.some(role => userRoles.includes(role));

    if (!hasRequiredRole) {
      res.status(403).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_PERMISSIONS',
          message: `Required role: ${roles.join(' or ')}`,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Require specific plan tier middleware
 */
export function requirePlan(...plans: TenantContext['plan'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenantContext = req.tenantContext || DEFAULT_TENANT;
    const userPlan = tenantContext.plan || 'starter';

    if (!plans.includes(userPlan)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'PLAN_REQUIRED',
          message: `Required plan: ${plans.join(' or ')}`,
          currentPlan: userPlan,
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: `req_${Date.now()}`,
        },
      });
      return;
    }

    next();
  };
}

export { extractTenantContext, validateTenantContext, DEFAULT_TENANT };
