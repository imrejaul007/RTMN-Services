/**
 * Hojai Core - Enhanced Tenant Middleware
 * Version: 1.1.0 | Date: June 12, 2026
 * Purpose: Tenant context extraction with JWT validation
 */

import { Request, Response, NextFunction } from 'express';
import { authenticate, AuthRequest, extractToken, verifyToken } from './auth.js';

export interface TenantContext {
  tenant_id: string;
  namespace: string;
  user_id?: string;
  plan?: 'starter' | 'professional' | 'enterprise';
  roles?: string[];
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

// ============================================
// TENANT MIDDLEWARE
// ============================================

/**
 * Enhanced tenant middleware with JWT validation
 *
 * Validates:
 * 1. X-Tenant-Id header is present
 * 2. If JWT token is provided, validates it and extracts tenant from token
 * 3. Ensures X-Tenant-Id matches token's tenant (if token provided)
 */
export function tenantMiddleware() {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const tenantIdHeader = req.headers['x-tenant-id'] as string;
    const authHeader = req.headers.authorization;

    // Extract tenant from JWT if token provided
    let tokenTenantId: string | undefined;
    let tokenUserId: string | undefined;
    let tokenRoles: string[] | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = extractToken(authHeader);
        if (token) {
          const user = verifyToken(token);
          tokenTenantId = user.tenantId;
          tokenUserId = user.id;
          tokenRoles = user.roles;
        }
      } catch {
        // Token invalid - continue without token tenant info
        // Will be rejected if X-Tenant-Id is also missing
      }
    }

    // Require either header or token
    if (!tenantIdHeader && !tokenTenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT_ID',
          message: 'X-Tenant-Id header or valid JWT token is required'
        }
      });
    }

    // Use header tenant if present, otherwise fall back to token
    const tenantId = tenantIdHeader || tokenTenantId!;

    // If both provided, validate they match
    if (tenantIdHeader && tokenTenantId && tenantIdHeader !== tokenTenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'TENANT_MISMATCH',
          message: 'X-Tenant-Id header does not match token tenant'
        }
      });
    }

    // Validate tenant ID format
    if (!isValidTenantId(tenantId)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_TENANT_ID',
          message: 'Invalid tenant ID format'
        }
      });
    }

    req.tenantContext = {
      tenant_id: tenantId,
      namespace: `tenant_${tenantId}`,
      user_id: tokenUserId,
      roles: tokenRoles
    };

    next();
  };
}

/**
 * Optional tenant middleware - allows requests without tenant
 */
export function optionalTenantMiddleware() {
  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const tenantId = req.headers['x-tenant-id'] as string;
    const authHeader = req.headers.authorization;

    if (!tenantId) {
      // Try to extract from token
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = extractToken(authHeader);
          if (token) {
            const user = verifyToken(token);
            req.tenantContext = {
              tenant_id: user.tenantId,
              namespace: `tenant_${user.tenantId}`,
              user_id: user.id,
              roles: user.roles
            };
          }
        } catch {
          // Ignore invalid token for optional middleware
        }
      }
    } else {
      req.tenantContext = {
        tenant_id: tenantId,
        namespace: `tenant_${tenantId}`
      };
    }

    next();
  };
}

/**
 * Require specific tenant (for cross-tenant operations)
 */
export function requireTenant(tenantId: string) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.tenantContext || req.tenantContext.tenant_id !== tenantId) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access to this tenant is forbidden'
        }
      });
    }
    next();
  };
}

/**
 * Validate tenant ID format
 * Allows alphanumeric, underscore, and hyphen. 3-50 characters.
 */
export function isValidTenantId(tenantId: string): boolean {
  return /^[a-zA-Z0-9_-]{3,50}$/.test(tenantId);
}

// ============================================
// COMBINED AUTH + TENANT MIDDLEWARE
// ============================================

/**
 * Combined authentication and tenant middleware
 * Use this when you need both auth and tenant context
 */
export function authTenantMiddleware() {
  const authMw = authenticate();
  const tenantMw = tenantMiddleware();

  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    // Run auth first
    await new Promise<void>((resolve) => {
      authMw(req, res, () => {
        if (res.headersSent) {
          resolve();
          return;
        }
        // Run tenant middleware
        tenantMw()(req, res, () => {
          resolve();
        });
      });
    });

    if (!res.headersSent) {
      next();
    }
  };
}

// ============================================
// EXPORTS
// ============================================

export default {
  tenantMiddleware,
  optionalTenantMiddleware,
  requireTenant,
  authTenantMiddleware,
  isValidTenantId
};
