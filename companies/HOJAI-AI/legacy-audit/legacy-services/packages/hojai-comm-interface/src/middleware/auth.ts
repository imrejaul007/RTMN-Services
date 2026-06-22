import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { AuthContext, Source } from '../types/index.js';

// ============================================================================
// CONFIG
// ============================================================================

const JWT_SECRET = process.env.JWT_SECRET || 'hojai-comm-interface-secret-key';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-service-token';

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const TenantHeaderSchema = z.object({
  'x-tenant-id': z.string().uuid('Invalid tenant ID format'),
  'x-internal-token': z.string().optional(),
  'x-user-id': z.string().optional(),
  'x-source': z.enum(['whatsapp', 'web', 'api']).optional()
});

const AuthTokenPayloadSchema = z.object({
  tenantId: z.string().uuid(),
  userId: z.string().optional(),
  role: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  type: z.enum(['user', 'service', 'admin'])
});

// ============================================================================
// INTERFACES
// ============================================================================

export interface AuthenticatedRequest extends Request {
  tenantContext: AuthContext;
  requestId: string;
}

export interface ServiceAuthRequest extends Request {
  tenantId: string;
  isInternalService: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a JWT token for a user
 */
export function generateToken(payload: {
  tenantId: string;
  userId?: string;
  role?: string;
  permissions?: string[];
}): string {
  return jwt.sign(
    {
      ...payload,
      type: payload.userId ? 'user' : 'service',
      iat: Math.floor(Date.now() / 1000)
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): AuthContext | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as z.infer<typeof AuthTokenPayloadSchema>;
    return {
      tenantId: payload.tenantId,
      userId: payload.userId,
      role: payload.role,
      permissions: payload.permissions
    };
  } catch {
    return null;
  }
}

/**
 * Validate internal service token
 */
export function validateInternalToken(token: string): boolean {
  if (!INTERNAL_TOKEN || INTERNAL_TOKEN === 'internal-service-token') {
    console.warn('[Auth] Using default internal token - not secure for production');
    return token === INTERNAL_TOKEN;
  }
  return timingSafeEqual(token, INTERNAL_TOKEN);
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

/**
 * Extract and validate tenant context from headers
 */
export function tenantContext(req: Request, res: Response, next: NextFunction): void {
  const result = TenantHeaderSchema.safeParse(req.headers);

  if (!result.success) {
    res.status(400).json({
      success: false,
      error: 'Invalid or missing tenant headers',
      details: result.error.issues
    });
    return;
  }

  const headers = result.data;

  // Check for internal service token first
  if (headers['x-internal-token']) {
    if (!validateInternalToken(headers['x-internal-token'])) {
      res.status(401).json({
        success: false,
        error: 'Invalid internal service token'
      });
      return;
    }
  }

  (req as ServiceAuthRequest).tenantId = headers['x-tenant-id'];
  (req as ServiceAuthRequest).isInternalService = !!headers['x-internal-token'];
  next();
}

/**
 * Authenticate user requests via JWT
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Missing authorization header'
    });
    return;
  }

  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    res.status(401).json({
      success: false,
      error: 'Invalid authorization format. Use: Bearer <token>'
    });
    return;
  }

  const context = verifyToken(token);

  if (!context) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
    return;
  }

  // Validate tenant context
  if (!context.tenantId) {
    res.status(401).json({
      success: false,
      error: 'Token missing tenant context'
    });
    return;
  }

  // Check header tenant matches token tenant (for multi-tenant security)
  const headerTenant = req.headers['x-tenant-id'];
  if (headerTenant && headerTenant !== context.tenantId) {
    res.status(403).json({
      success: false,
      error: 'Tenant mismatch'
    });
    return;
  }

  const source = (req.headers['x-source'] as Source) || Source.API;

  (req as AuthenticatedRequest).tenantContext = {
    tenantId: context.tenantId,
    userId: context.userId,
    role: context.role,
    permissions: context.permissions
  };

  // Add request ID
  (req as AuthenticatedRequest).requestId = (req.headers['x-request-id'] as string) || generateRequestId();

  next();
}

/**
 * Combined auth middleware - validates both JWT and internal tokens
 */
export function authenticateAny(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const internalToken = req.headers['x-internal-token'];

  // Internal service request
  if (internalToken) {
    if (!validateInternalToken(internalToken as string)) {
      res.status(401).json({
        success: false,
        error: 'Invalid internal service token'
      });
      return;
    }

    const tenantId = req.headers['x-tenant-id'];
    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Missing tenant ID for internal service'
      });
      return;
    }

    (req as ServiceAuthRequest).tenantId = tenantId as string;
    (req as ServiceAuthRequest).isInternalService = true;
    (req as AuthenticatedRequest).requestId = (req.headers['x-request-id'] as string) || generateRequestId();
    (req as AuthenticatedRequest).tenantContext = {
      tenantId: tenantId as string
    };
    return next();
  }

  // User request with JWT
  if (authHeader) {
    return authenticate(req, res, next);
  }

  res.status(401).json({
    success: false,
    error: 'Missing authentication. Provide either Bearer token or X-Internal-Token header'
  });
}

/**
 * Optional authentication - doesn't fail if no auth provided
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    // No auth provided - continue as anonymous
    next();
    return;
  }

  authenticate(req, res, next);
}

/**
 * Role-based access control middleware
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.tenantContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const userRole = authReq.tenantContext.role;

    if (!userRole || !roles.includes(userRole)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions',
        required: roles,
        current: userRole
      });
      return;
    }

    next();
  };
}

/**
 * Permission-based access control middleware
 */
export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.tenantContext) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    const userPermissions = authReq.tenantContext.permissions || [];
    const hasAllPermissions = permissions.every(p => userPermissions.includes(p));

    if (!hasAllPermissions) {
      res.status(403).json({
        success: false,
        error: 'Missing required permissions',
        required: permissions,
        current: userPermissions
      });
      return;
    }

    next();
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Rate limiting key generator based on tenant and user
 */
export function rateLimitKey(req: Request): string {
  const tenantId = req.headers['x-tenant-id'] || 'unknown';
  const userId = req.headers['x-user-id'] || req.ip || 'unknown';
  return `${tenantId}:${userId}`;
}
