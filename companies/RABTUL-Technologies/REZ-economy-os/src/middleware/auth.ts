// ============================================================================
// RABTUL Economy OS - JWT Authentication Middleware
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || process.env.AUTH_SECRET;
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

export interface AuthUser {
  id: string;
  email?: string;
  roles?: string[];
  scopes?: string[];
}

// Timing-safe comparison
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// JWT Authentication
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Missing Authorization header',
      code: 'AUTH_REQUIRED'
    });
    return;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({
      success: false,
      error: 'Invalid Authorization format. Use: Bearer <token>',
      code: 'INVALID_AUTH_FORMAT'
    });
    return;
  }

  if (!JWT_SECRET) {
    res.status(500).json({
      success: false,
      error: 'Server misconfiguration: JWT_SECRET not set',
      code: 'SERVER_ERROR'
    });
    return;
  }

  try {
    const payload = jwt.verify(match[1], JWT_SECRET) as any;

    (req as any).user = {
      id: payload.sub,
      email: payload.email,
      roles: payload.roles || [],
      scopes: payload.scopes || []
    };
    (req as any).userId = payload.sub;

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'Token expired', code: 'TOKEN_EXPIRED' });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'Invalid token', code: 'INVALID_TOKEN' });
    } else {
      res.status(500).json({ success: false, error: 'Authentication failed', code: 'AUTH_ERROR' });
    }
  }
}

// Optional auth
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) return next();

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return next();

  if (!JWT_SECRET) return next();

  try {
    const payload = jwt.verify(match[1], JWT_SECRET) as any;
    (req as any).user = { id: payload.sub, email: payload.email, roles: payload.roles || [], scopes: payload.scopes || [] };
    (req as any).userId = payload.sub;
  } catch {
    // Ignore invalid token
  }

  next();
}

// Internal service auth
export function internalAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'] as string;

  if (INTERNAL_TOKEN && token) {
    if (!timingSafeCompare(token, INTERNAL_TOKEN)) {
      res.status(401).json({ success: false, error: 'Invalid internal token', code: 'INVALID_INTERNAL_TOKEN' });
      return;
    }
    (req as any).isInternalService = true;
    return next();
  }

  // Fallback to JWT
  return authMiddleware(req, res, next);
}

// Scope check
export function requireScope(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as AuthUser | undefined;

    if (!user) {
      res.status(401).json({ success: false, error: 'Authentication required', code: 'AUTH_REQUIRED' });
      return;
    }

    const userScopes = user.scopes || [];
    const hasScope = requiredScopes.some(scope => userScopes.includes(scope));

    if (!hasScope) {
      res.status(403).json({
        success: false,
        error: `Missing required scope: ${requiredScopes.join(' or ')}`,
        code: 'INSUFFICIENT_SCOPE'
      });
      return;
    }

    next();
  };
}
