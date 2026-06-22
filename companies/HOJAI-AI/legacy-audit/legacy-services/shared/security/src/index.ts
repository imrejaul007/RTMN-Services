/**
 * @rez/security - Security Utilities
 *
 * Features:
 * - JWT authentication middleware
 * - RBAC authorization
 * - Input validation (Zod)
 * - Rate limiting
 * - CORS configuration
 * - Helmet security headers
 * - Secure token generation
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z, ZodSchema, ZodError } from 'zod';
import cors from 'cors';
import helmet from 'helmet';

// Types
export interface TokenPayload {
  userId: string;
  role?: string;
  permissions?: string[];
  [key: string]: unknown;
}

export interface AuthConfig {
  secret: string;
  expiresIn?: string;
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
}

// ============================================
// JWT Authentication
// ============================================

/**
 * Create secure JWT token using crypto
 */
export function createToken(payload: TokenPayload, secret: string, expiresIn = '24h'): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const expires = now + parseDuration(expiresIn);

  const data = {
    ...payload,
    iat: now,
    exp: expires,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedData = base64UrlEncode(JSON.stringify(data));

  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${encodedHeader}.${encodedData}`)
    .digest('base64url');

  return `${encodedHeader}.${encodedData}.${signature}`;
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string, secret: string): TokenPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedData, signature] = parts;

    // Verify signature
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${encodedHeader}.${encodedData}`)
      .digest('base64url');

    if (signature !== expectedSignature) return null;

    // Decode payload
    const payload = JSON.parse(base64UrlDecode(encodedData)) as TokenPayload;

    // Check expiration
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Auth middleware
 */
export function authMiddleware(config: AuthConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'MISSING_TOKEN',
      });
    }

    const token = authHeader.slice(7);
    const payload = verifyToken(token, config.secret);

    if (!payload) {
      return res.status(401).json({
        error: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
      });
    }

    (req as Request & { user: TokenPayload }).user = payload;
    next();
  };
}

// ============================================
// RBAC Authorization
// ============================================

const ROLE_HIERARCHY: Record<string, string[]> = {
  super_admin: ['admin', 'operator', 'analyst', 'support', 'merchant', 'viewer'],
  admin: ['operator', 'analyst', 'support', 'merchant', 'viewer'],
  operator: ['analyst', 'support', 'viewer'],
  analyst: ['support', 'viewer'],
  support: ['viewer'],
  merchant: ['viewer'],
  viewer: [],
};

/**
 * Require specific role
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: TokenPayload }).user;

    if (!user?.role) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'NO_ROLE',
      });
    }

    const userRole = user.role.toLowerCase();
    const hasRole = roles.some(role => {
      const roleLower = role.toLowerCase();
      return userRole === roleLower || ROLE_HIERARCHY[userRole]?.includes(roleLower);
    });

    if (!hasRole) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'FORBIDDEN',
      });
    }

    next();
  };
}

/**
 * Require specific permission
 */
export function requirePermission(...permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as Request & { user?: TokenPayload }).user;

    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'NOT_AUTHENTICATED',
      });
    }

    const userPermissions = user.permissions ?? [];

    // Super admin has all permissions
    if (user.role?.toLowerCase() === 'super_admin') {
      return next();
    }

    const hasPermission = permissions.every(p => userPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        code: 'PERMISSION_DENIED',
      });
    }

    next();
  };
}

// ============================================
// Input Validation
// ============================================

/**
 * Validation middleware using Zod
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.body);
      req.body = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: error.errors.map(e => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
}

/**
 * Validate query params
 */
export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = schema.parse(req.query);
      req.query = result;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Invalid query parameters',
          code: 'VALIDATION_ERROR',
          details: error.errors,
        });
      }
      next(error);
    }
  };
}

// ============================================
// Security Headers
// ============================================

/**
 * Secure CORS configuration
 */
export function secureCors(options: cors.CorsOptions = {}) {
  const defaults: cors.CorsOptions = {
    origin: process.env.ALLOWED_ORIGINS?.split(',') ?? false,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    maxAge: 86400,
    ...options,
  };

  return cors(defaults);
}

/**
 * Helmet security headers
 */
export function secureHeaders() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
    frameguard: { action: 'deny' },
    xssFilter: true,
    noSniff: true,
    hidePoweredBy: true,
  });
}

// ============================================
// Secure Token Generation
// ============================================

/**
 * Generate secure random token
 */
export function generateToken(length = 32): string {
  return crypto.randomBytes(length).toString('base64url');
}

/**
 * Generate UUID v4
 */
export function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Hash sensitive data
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('base64url');
}

/**
 * Constant-time comparison for tokens
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

// ============================================
// PII Masking
// ============================================

/**
 * Mask PII data
 */
export function maskPII(data: Record<string, unknown>): Record<string, unknown> {
  const PII_PATTERNS: Record<string, (value: string) => string> = {
    email: (v) => v.replace(/^(.{2}).*(@.*)$/, '$1***$2'),
    phone: (v) => v.replace(/^(\+\d{1,3})?[\s-]?(\d{3})[\s-]?(\d{3})[\s-]?(\d{4})$/, '$1***-***-$4'),
    aadhaar: (v) => v.replace(/^(\d{4})\d{4}(\d{4})$/, '$1****$2'),
    pan: (v) => v.replace(/^([A-Z]{5})\d{4}([A-Z]{1})$/, '$1****$2'),
    password: () => '[REDACTED]',
    apikey: () => '[REDACTED]',
    secret: () => '[REDACTED]',
    token: () => '[REDACTED]',
    creditcard: () => '[REDACTED]',
    ssn: () => '[REDACTED]',
  };

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    let masked = false;

    for (const [pattern, masker] of Object.entries(PII_PATTERNS)) {
      if (lowerKey.includes(pattern.toLowerCase())) {
        result[key] = typeof value === 'string' ? masker(value) : '[REDACTED]';
        masked = true;
        break;
      }
    }

    if (!masked) {
      result[key] = typeof value === 'object' && value !== null
        ? maskPII(value as Record<string, unknown>)
        : value;
    }
  }

  return result;
}

// ============================================
// Utilities
// ============================================

function base64UrlEncode(str: string): string {
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) return 86400;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };

  return value * multipliers[unit];
}

// Re-export Zod
export { z };

export default {
  createToken,
  verifyToken,
  authMiddleware,
  requireRole,
  requirePermission,
  validate,
  validateQuery,
  secureCors,
  secureHeaders,
  generateToken,
  generateUUID,
  hash,
  secureCompare,
  maskPII,
  z,
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'security',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
