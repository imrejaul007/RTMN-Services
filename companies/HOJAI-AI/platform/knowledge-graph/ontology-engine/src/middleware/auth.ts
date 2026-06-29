/**
 * JWT Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { JwtPayload } from '../models/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'ontology-engine-secret-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '24h';

/**
 * Generate a JWT token
 */
export function generateToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify a JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

/**
 * Require authentication middleware
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({ error: 'No authorization header provided' });
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    res.status(401).json({ error: 'Invalid authorization format. Use: Bearer <token>' });
    return;
  }

  const payload = verifyToken(token);

  if (!payload) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  (req as Request & { user?: JwtPayload }).user = payload;
  next();
}

/**
 * Require specific roles middleware
 */
export function requireRoles(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const user = (req as Request & { user?: JwtPayload }).user;

    if (!user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }

    const hasRole = roles.some(role => user.roles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        error: 'Insufficient permissions',
        required: roles,
        current: user.roles
      });
      return;
    }

    next();
  };
}

/**
 * Optional authentication middleware
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    next();
    return;
  }

  const [scheme, token] = authHeader.split(' ');

  if (scheme === 'Bearer' && token) {
    const payload = verifyToken(token);
    if (payload) {
      (req as Request & { user?: JwtPayload }).user = payload;
    }
  }

  next();
}

/**
 * Internal service token authentication
 */
export function requireInternalService(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;

  if (expected && token === expected) {
    (req as Request & { user?: JwtPayload }).user = {
      sub: 'internal-service',
      type: 'service',
      roles: ['service'],
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    next();
    return;
  }

  // Fall back to regular auth
  requireAuth(req, res, next);
}

export default {
  generateToken,
  verifyToken,
  requireAuth,
  requireRoles,
  optionalAuth,
  requireInternalService
};
