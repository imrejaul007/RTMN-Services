/**
 * Hojai Core - JWT Authentication Middleware
 * Version: 1.0.0 | Date: June 12, 2026
 * Purpose: JWT token validation for protected routes
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// ============================================
// TYPES
// ============================================

export interface JWTPayload {
  sub: string;          // User ID
  tenantId: string;     // Tenant ID
  email?: string;
  roles?: string[];
  type: 'user' | 'api_key' | 'service';
  iat?: number;
  exp?: number;
}

export interface AuthenticatedUser {
  id: string;
  tenantId: string;
  email?: string;
  roles: string[];
  type: 'user' | 'api_key' | 'service';
}

export interface AuthRequest extends Request {
  user?: AuthenticatedUser;
  tenantContext?: {
    tenant_id: string;
    namespace: string;
    user_id?: string;
    roles?: string[];
  };
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ============================================
// CONFIGURATION
// ============================================

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_ALGORITHM = 'HS256';
const TOKEN_EXPIRY = '1h';

// Validate JWT_SECRET at module load time
if (!JWT_SECRET && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET environment variable is required in production');
}

// ============================================
// JWT SERVICE
// ============================================

export class JWTService {
  private secret: string;
  private algorithm: jwt.Algorithm;

  constructor(secret?: string) {
    this.secret = secret || JWT_SECRET || 'dev-secret-change-in-production';
    this.algorithm = JWT_ALGORITHM;
  }

  /**
   * Verify a JWT token
   */
  verify(token: string): AuthenticatedUser {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: [this.algorithm]
      }) as JWTPayload;

      return {
        id: decoded.sub,
        tenantId: decoded.tenantId,
        email: decoded.email,
        roles: decoded.roles || [],
        type: decoded.type || 'user'
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthError('TOKEN_EXPIRED', 'Token has expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthError('INVALID_TOKEN', 'Invalid token');
      }
      throw new AuthError('AUTH_ERROR', 'Authentication failed');
    }
  }

  /**
   * Generate a JWT token
   */
  sign(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, this.secret, {
      algorithm: this.algorithm,
      expiresIn: TOKEN_EXPIRY
    });
  }

  /**
   * Decode without verification (for debugging)
   */
  decode(token: string): JWTPayload | null {
    try {
      return jwt.decode(token) as JWTPayload;
    } catch {
      return null;
    }
  }
}

// ============================================
// AUTH ERROR
// ============================================

export class AuthError extends Error {
  constructor(
    public code: string,
    message: string
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

// ============================================
// MIDDLEWARE FACTORIES
// ============================================

/**
 * Create JWT authentication middleware
 * Validates Bearer token and attaches user to request
 */
export function authenticate(options?: {
  required?: boolean;
  allowedTypes?: ('user' | 'api_key' | 'service')[];
}) {
  const { required = true, allowedTypes } = options || {};

  return async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;

      // No token provided
      if (!authHeader) {
        if (required) {
          return res.status(401).json({
            success: false,
            error: {
              code: 'MISSING_TOKEN',
              message: 'Authorization header is required'
            }
          });
        }
        return next();
      }

      // Validate Bearer format
      if (!authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN_FORMAT',
            message: 'Authorization header must be in format: Bearer <token>'
          }
        });
      }

      const token = authHeader.substring(7);

      if (!token) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Token is required'
          }
        });
      }

      // Verify token
      const jwtService = new JWTService();
      const user = jwtService.verify(token);

      // Check allowed types
      if (allowedTypes && !allowedTypes.includes(user.type)) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'This action is not allowed for your token type'
          }
        });
      }

      // Attach user to request
      req.user = user;

      // Also update tenant context if present
      if (req.tenantContext) {
        req.tenantContext.tenant_id = user.tenantId;
        req.tenantContext.user_id = user.id;
        req.tenantContext.roles = user.roles;
      }

      next();
    } catch (error) {
      if (error instanceof AuthError) {
        return res.status(401).json({
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        });
      }

      // Unexpected error
      console.error('Auth middleware error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication error'
        }
      });
    }
  };
}

/**
 * Optional authentication - allows requests without token
 */
export function optionalAuth() {
  return authenticate({ required: false });
}

/**
 * Require specific roles
 */
export function requireRoles(...roles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (roles.length > 0) {
      const hasRole = roles.some(role => req.user!.roles.includes(role));
      if (!hasRole) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: `This action requires one of the following roles: ${roles.join(', ')}`
          }
        });
      }
    }

    next();
  };
}

/**
 * Require specific token types
 */
export function requireTokenType(...types: ('user' | 'api_key' | 'service')[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required'
        }
      });
    }

    if (!types.includes(req.user.type)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of the following token types: ${types.join(', ')}`
        }
      });
    }

    next();
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Extract token from Authorization header
 */
export function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

/**
 * Verify token and return payload (utility for non-middleware use)
 */
export function verifyToken(token: string): AuthenticatedUser {
  const jwtService = new JWTService();
  return jwtService.verify(token);
}

// ============================================
// DEFAULT EXPORTS
// ============================================

export const jwtService = new JWTService();
export default { authenticate, optionalAuth, requireRoles, requireTokenType, verifyToken };
