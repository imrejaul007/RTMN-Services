/**
 * Authentication Middleware
 * Validates tokens using RABTUL Auth Service
 */

import { Request, Response, NextFunction } from 'express';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'https://rez-auth-service.onrender.com';
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

// ============================================================================
// Types
// ============================================================================

export interface AuthenticatedUser {
  id: string;
  email: string;
  name?: string;
  role: 'admin' | 'distributor' | 'retailer' | 'merchant';
  merchantId?: string;
  distributorId?: string;
  businessName?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

// ============================================================================
// Token Validation
// ============================================================================

async function validateToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    const response = await fetch(`${AUTH_SERVICE_URL}/api/auth/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(INTERNAL_SERVICE_TOKEN ? { 'X-Internal-Token': INTERNAL_SERVICE_TOKEN } : {}),
      },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    if (data.valid && data.user) {
      return {
        id: data.user.id,
        email: data.user.email,
        name: data.user.name,
        role: data.user.role || 'merchant',
        merchantId: data.user.merchantId,
        distributorId: data.user.distributorId,
        businessName: data.user.businessName,
      };
    }

    return null;
  } catch (error) {
    console.error('[Auth] Token validation error:', error);
    return null;
  }
}

// ============================================================================
// Middleware
// ============================================================================

/**
 * Require authentication - validates Bearer token
 */
export function requireAuth() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No authentication token provided',
        },
      });
      return;
    }

    const token = authHeader.slice(7);
    const user = await validateToken(token);

    if (!user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
        },
      });
      return;
    }

    req.user = user;
    next();
  };
}

/**
 * Require specific role(s)
 */
export function requireRole(...roles: AuthenticatedUser['role'][]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: `Required role: ${roles.join(' or ')}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication - sets user if token provided
 */
export function optionalAuth() {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const user = await validateToken(token);
      if (user) {
        req.user = user;
      }
    }

    next();
  };
}

/**
 * Require internal service token (for service-to-service calls)
 */
export function requireInternalToken() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const internalToken = req.headers['x-internal-token'] as string;

    if (!internalToken) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Internal token required',
        },
      });
      return;
    }

    if (INTERNAL_SERVICE_TOKEN && internalToken !== INTERNAL_SERVICE_TOKEN) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid internal token',
        },
      });
      return;
    }

    next();
  };
}
