import { logger } from '../../shared/logger';
/**
 * @rez/auth-middleware - Unified Authentication Middleware for NeXha Services
 *
 * Provides authentication and authorization for all NeXha microservices:
 * - Token validation via RABTUL Auth Service
 * - Role-based access control (RBAC)
 * - Internal service token verification
 * - Timing-safe token comparison
 *
 * @example
 * ```typescript
 * import { requireAuth, requireRole, requireInternalToken } from '@rez/auth-middleware';
 *
 * // All endpoints require auth
 * app.get('/api/protected', requireAuth(), handler);
 *
 * // Role-based access
 * app.post('/api/admin', requireAuth(), requireRole('admin', 'super_admin'), handler);
 *
 * // Internal service endpoints
 * app.post('/internal/sync', requireInternalToken(), handler);
 * ```
 */

import crypto from 'crypto';

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: NeXhaRole;
  merchantId?: string;
  distributorId?: string;
  franchiseId?: string;
  manufacturerId?: string;
  businessName?: string;
  permissions?: string[];
}

export type NeXhaRole =
  | 'super_admin'
  | 'admin'
  | 'distributor_owner'
  | 'distributor_manager'
  | 'franchise_owner'
  | 'franchise_manager'
  | 'supplier_owner'
  | 'supplier_manager'
  | 'merchant_owner'
  | 'merchant_staff'
  | 'auditor'
  | 'support';

export interface AuthResult {
  success: boolean;
  user?: AuthenticatedUser;
  error?: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ============================================================================
// Configuration
// ============================================================================

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://rez-auth-service.onrender.com';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || '';
const REQUEST_TIMEOUT = parseInt(process.env.AUTH_TIMEOUT_MS || '5000', 10);

// ============================================================================
// Token Validation
// ============================================================================

/**
 * Validate JWT token with RABTUL Auth Service
 */
async function validateToken(token: string): Promise<AuthResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_SERVICE_TOKEN ? { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN } : {}),
      },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { success: false, error: `Auth service returned ${response.status}` };
    }

    const data = await response.json();
    if (data.valid && data.user) {
      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          name: data.user.name,
          role: mapToNexhaRole(data.user.role),
          merchantId: data.user.merchantId,
          distributorId: data.user.distributorId,
          franchiseId: data.user.franchiseId,
          manufacturerId: data.user.manufacturerId,
          businessName: data.user.businessName,
        },
      };
    }

    return { success: false, error: 'Invalid token' };
  } catch (error) {
    clearTimeout(timeout);
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Auth service timeout' };
    }
    logger.error('[Auth] Token validation error:', error);
    return { success: false, error: 'Authentication failed' };
  }
}

/**
 * Map external roles to NeXha roles
 */
function mapToNexhaRole(role: string): NeXhaRole {
  const roleMap: Record<string, NeXhaRole> = {
    'super_admin': 'super_admin',
    'admin': 'admin',
    'distributor': 'distributor_owner',
    'distributor_owner': 'distributor_owner',
    'distributor_manager': 'distributor_manager',
    'franchise': 'franchise_owner',
    'franchise_owner': 'franchise_owner',
    'franchise_manager': 'franchise_manager',
    'supplier': 'supplier_owner',
    'supplier_owner': 'supplier_owner',
    'supplier_manager': 'supplier_manager',
    'merchant': 'merchant_owner',
    'merchant_owner': 'merchant_owner',
    'merchant_staff': 'merchant_staff',
    'manufacturer': 'manufacturer',
    'auditor': 'auditor',
    'support': 'support',
  };
  return roleMap[role] || 'merchant_owner';
}

// ============================================================================
// Timing-Safe Comparison
// ============================================================================

/**
 * Compare tokens using timing-safe comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return crypto.timingSafeEqual(bufA, bufB);
}

// ============================================================================
// Middleware Factories
// ============================================================================

/**
 * Require authentication - validates Bearer token
 */
export function requireAuth() {
  return async (
    req: { headers: { authorization?: string }; user?: AuthenticatedUser },
    res: { status: (code: number) => { json: (data: object) => void } },
    next: () => void
  ): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No authentication token provided' },
      });
      return;
    }

    const token = authHeader.slice(7);
    const result = await validateToken(token);

    if (!result.success || !result.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: result.error || 'Invalid or expired token' },
      });
      return;
    }

    req.user = result.user;
    next();
  };
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: NeXhaRole[]) {
  return (
    req: { user?: AuthenticatedUser },
    res: { status: (code: number) => { json: (data: object) => void } },
    next: () => void
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Required role: ${roles.join(' or ')}` },
      });
      return;
    }

    next();
  };
}

/**
 * Require specific permission
 */
export function requirePermission(resource: string, action: string) {
  return (
    req: { user?: AuthenticatedUser },
    res: { status: (code: number) => { json: (data: object) => void } },
    next: () => void
  ): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
      });
      return;
    }

    // Check role permissions
    const permissions = getRolePermissions(req.user.role);
    const requiredPermission = `${resource}:${action}`;

    if (!permissions.includes(requiredPermission) && !permissions.includes('*')) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Permission denied: ${requiredPermission}` },
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication - sets user if token provided, but doesn't require it
 */
export function optionalAuth() {
  return async (
    req: { headers: { authorization?: string }; user?: AuthenticatedUser },
    res: unknown,
    next: () => void
  ): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const result = await validateToken(token);
      if (result.success && result.user) {
        req.user = result.user;
      }
    }

    next();
  };
}

/**
 * Require internal service token (for service-to-service calls)
 * Uses timing-safe comparison to prevent timing attacks
 */
export function requireInternalToken() {
  return (
    req: { headers: { 'x-internal-token'?: string } },
    res: { status: (code: number) => { json: (data: object) => void } },
    next: () => void
  ): void => {
    const token = req.headers['x-internal-token'];

    if (!token) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Internal token required' },
      });
      return;
    }

    // Use timing-safe comparison to prevent timing attacks
    if (!INTERNAL_SERVICE_TOKEN || !timingSafeEqual(token, INTERNAL_SERVICE_TOKEN)) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid internal token' },
      });
      return;
    }

    next();
  };
}

/**
 * Combined auth + role check
 */
export function requireAuthRole(...roles: NeXhaRole[]) {
  return async (
    req: { headers: { authorization?: string }; user?: AuthenticatedUser },
    res: { status: (code: number) => { json: (data: object) => void } },
    next: () => void
  ): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No authentication token provided' },
      });
      return;
    }

    const token = authHeader.slice(7);
    const result = await validateToken(token);

    if (!result.success || !result.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: result.error || 'Invalid or expired token' },
      });
      return;
    }

    if (!roles.includes(result.user.role)) {
      res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: `Required role: ${roles.join(' or ')}` },
      });
      return;
    }

    req.user = result.user;
    next();
  };
}

// ============================================================================
// Permission System
// ============================================================================

/**
 * Get permissions for a role
 */
function getRolePermissions(role: NeXhaRole): string[] {
  const rolePermissions: Record<NeXhaRole, string[]> = {
    super_admin: ['*'],
    admin: [
      'distributors:*', 'franchises:*', 'suppliers:*', 'manufacturers:*',
      'orders:*', 'payments:*', 'reports:*', 'users:*', 'settings:*',
    ],
    distributor_owner: [
      'distributors:read', 'distributors:update',
      'orders:create', 'orders:read', 'orders:update',
      'reports:read', 'inventory:read',
    ],
    distributor_manager: [
      'distributors:read',
      'orders:create', 'orders:read', 'orders:update',
      'inventory:read', 'inventory:update',
    ],
    franchise_owner: [
      'franchises:read', 'franchises:update',
      'orders:create', 'orders:read',
      'reports:read',
    ],
    franchise_manager: [
      'franchises:read',
      'orders:create', 'orders:read',
      'inventory:read', 'inventory:update',
    ],
    supplier_owner: [
      'suppliers:read', 'suppliers:update',
      'rfqs:read', 'rfqs:create', 'quotes:create',
      'orders:read',
    ],
    supplier_manager: [
      'suppliers:read',
      'rfqs:read', 'quotes:create',
    ],
    merchant_owner: [
      'orders:create', 'orders:read', 'orders:update',
      'payments:read',
    ],
    merchant_staff: [
      'orders:create', 'orders:read',
    ],
    auditor: [
      'reports:read', 'users:read',
    ],
    support: [
      'users:read', 'orders:read',
    ],
  };

  return rolePermissions[role] || [];
}

/**
 * Check if user has permission
 */
export function hasPermission(user: AuthenticatedUser, resource: string, action: string): boolean {
  const permissions = getRolePermissions(user.role);
  if (permissions.includes('*')) return true;
  return permissions.includes(`${resource}:${action}`) || permissions.includes(`${resource}:*`);
}

/**
 * Get all permissions for a role
 */
export function getPermissions(role: NeXhaRole): string[] {
  return getRolePermissions(role);
}

// ============================================================================
// Express Middleware Adapter
// ============================================================================

import { Request, Response, NextFunction } from 'express';

/**
 * Express adapter for requireAuth
 */
export const expressRequireAuth = () => {
  const middleware = requireAuth();
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req as unknown as { headers: { authorization?: string }; user?: AuthenticatedUser }, res as unknown as { status: (code: number) => { json: (data: object) => void } }, next);
  };
};

/**
 * Express adapter for requireRole
 */
export const expressRequireRole = (...roles: NeXhaRole[]) => {
  const middleware = requireRole(...roles);
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req as unknown as { user?: AuthenticatedUser }, res as unknown as { status: (code: number) => { json: (data: object) => void } }, next);
  };
};

/**
 * Express adapter for requirePermission
 */
export const expressRequirePermission = (resource: string, action: string) => {
  const middleware = requirePermission(resource, action);
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req as unknown as { user?: AuthenticatedUser }, res as unknown as { status: (code: number) => { json: (data: object) => void } }, next);
  };
};

/**
 * Express adapter for requireInternalToken
 */
export const expressRequireInternalToken = () => {
  const middleware = requireInternalToken();
  return (req: Request, res: Response, next: NextFunction) => {
    middleware(req as unknown as { headers: { 'x-internal-token'?: string } }, res as unknown as { status: (code: number) => { json: (data: object) => void } }, next);
  };
};
