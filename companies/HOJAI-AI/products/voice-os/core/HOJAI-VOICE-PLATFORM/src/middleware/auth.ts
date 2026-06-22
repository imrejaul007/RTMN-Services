// ============================================================================
// HOJAI VOICE PLATFORM - Authentication Middleware
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authConfig } from '../config';
import { AuthenticatedRequest, TokenPayload } from '../types';

/**
 * Authentication middleware
 * Extracts and validates JWT token from Authorization header
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authorization header is required',
      },
    });
    return;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      error: {
        code: 'INVALID_TOKEN_FORMAT',
        message: 'Authorization header must be in format: Bearer <token>',
      },
    });
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, authConfig.jwt.secret) as TokenPayload;

    // Attach user info to request
    (req as AuthenticatedRequest).user = {
      id: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'Token has expired',
        },
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid token',
        },
      });
      return;
    }

    res.status(500).json({
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error',
      },
    });
  }
}

/**
 * Optional authentication middleware
 * Extracts user info if token is present, but doesn't require it
 */
export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    next();
    return;
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, authConfig.jwt.secret) as TokenPayload;

    (req as AuthenticatedRequest).user = {
      id: decoded.userId,
      organizationId: decoded.organizationId,
      role: decoded.role,
    };
  } catch {
    // Ignore token errors in optional auth
  }

  next();
}

/**
 * Role-based access control middleware
 */
export function requireRole(...roles: Array<'admin' | 'user' | 'viewer'>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const authReq = req as AuthenticatedRequest;
    const user = authReq.user;

    if (!user) {
      res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
        },
      });
      return;
    }

    if (!roles.includes(user.role)) {
      res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: `This action requires one of the following roles: ${roles.join(', ')}`,
        },
      });
      return;
    }

    next();
  };
}

/**
 * Organization validation middleware
 */
export function requireOrganization(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;
  const user = authReq.user;

  if (!user) {
    res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
    return;
  }

  if (!user.organizationId) {
    res.status(400).json({
      error: {
        code: 'MISSING_ORGANIZATION',
        message: 'Organization ID is required',
      },
    });
    return;
  }

  next();
}

/**
 * Generate JWT token (for testing/development)
 */
export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, authConfig.jwt.secret, {
    expiresIn: authConfig.jwt.expiresIn,
  });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, authConfig.jwt.secret) as TokenPayload;
  } catch {
    return null;
  }
}
