/**
 * SUTAR OS Shared JWT Auth Middleware
 * Used by all SUTAR OS services for authentication
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Get JWT secret from environment or generate warning
function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.AUTH_SECRET;
  if (!secret || secret === 'change-me-in-production') {
    console.warn('⚠️ JWT_SECRET not set or using default value. Set JWT_SECRET in environment!');
    return process.env.JWT_SECRET || 'fallback-secret-do-not-use-in-prod';
  }
  return secret;
}

// JWT payload interface
export interface JwtPayload {
  sub: string;           // Subject (user/agent ID)
  aud?: string;          // Audience (service ID)
  scope?: string[];      // Permissions/scopes
  type?: 'user' | 'agent' | 'service' | 'internal';
  iat?: number;          // Issued at
  exp?: number;          // Expiration
}

/**
 * Verify JWT token from Authorization header
 */
export function verifyToken(req: Request, res: Response, next: NextFunction): void {
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

  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(match[1], secret) as JwtPayload;

    // Attach payload to request
    (req as any).user = payload;
    (req as any).userId = payload.sub;

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({
        success: false,
        error: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Token verification failed',
        code: 'AUTH_ERROR'
      });
    }
  }
}

/**
 * Optional auth - attaches user if token present, continues otherwise
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return next();
  }

  try {
    const secret = getJwtSecret();
    const payload = jwt.verify(match[1], secret) as JwtPayload;
    (req as any).user = payload;
    (req as any).userId = payload.sub;
  } catch {
    // Ignore invalid token for optional auth
  }

  next();
}

/**
 * Internal service auth - validates internal service token
 */
export function internalServiceAuth(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'] as string;
  const expectedToken = process.env.INTERNAL_SERVICE_TOKEN;

  if (!expectedToken) {
    // Fallback to JWT auth
    return verifyToken(req, res, next);
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Missing internal service token',
      code: 'INTERNAL_TOKEN_REQUIRED'
    });
    return;
  }

  if (!timingSafeCompare(token, expectedToken)) {
    res.status(401).json({
      success: false,
      error: 'Invalid internal service token',
      code: 'INVALID_INTERNAL_TOKEN'
    });
    return;
  }

  (req as any).isInternalService = true;
  next();
}

/**
 * Scope/permission check middleware factory
 */
export function requireScope(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as any).user as JwtPayload | undefined;

    if (!user) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
      return;
    }

    const userScopes = user.scope || [];
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

/**
 * Rate limiting helper (simple in-memory implementation)
 * For production, use Redis-based rate limiting
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function rateLimit(options: { windowMs: number; max: number } = { windowMs: 60000, max: 100 }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + options.windowMs };
      rateLimitStore.set(key, record);
    }

    record.count++;

    if (record.count > options.max) {
      res.status(429).json({
        success: false,
        error: 'Too many requests',
        code: 'RATE_LIMITED',
        retryAfter: Math.ceil((record.resetTime - now) / 1000)
      });
      return;
    }

    res.setHeader('X-RateLimit-Limit', options.max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - record.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    next();
  };
}

// Timing-safe string comparison to prevent timing attacks
function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export default { verifyToken, optionalAuth, internalServiceAuth, requireScope, rateLimit };
