/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// JWT payload schema
const jwtPayloadSchema = z.object({
  userId: z.string(),
  name: z.string(),
  role: z.enum(['customer', 'agent', 'admin']),
  agentId: z.string().optional(),
  iat: z.number(),
  exp: z.number(),
});

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: z.infer<typeof jwtPayloadSchema>;
    }
  }
}

/**
 * Simple JWT verification (without external library for lightweight auth)
 * In production, use jsonwebtoken library
 */
export function verifyToken(token: string): z.infer<typeof jwtPayloadSchema> | null {
  try {
    // Simple token format: base64(payload).base64(signature)
    // For demo purposes, we use a simple encoding
    // In production, use proper JWT with jsonwebtoken
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const payloadStr = Buffer.from(parts[0], 'base64').toString();
    const payload = JSON.parse(payloadStr);

    // Verify structure
    const result = jwtPayloadSchema.safeParse(payload);
    if (!result.success) return null;

    // Check expiration
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return result.data;
  } catch {
    return null;
  }
}

/**
 * Auth middleware for REST endpoints
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Authorization header required',
    });
    return;
  }

  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Token required',
    });
    return;
  }

  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
    return;
  }

  req.user = user;
  next();
}

/**
 * Optional auth - sets user if token present, continues otherwise
 */
export function optionalAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const user = verifyToken(token);
    if (user) {
      req.user = user;
    }
  }

  next();
}

/**
 * Agent-only middleware
 */
export function agentOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'agent' && req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Agent or admin access required',
    });
    return;
  }

  next();
}

/**
 * Admin-only middleware
 */
export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
    });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      success: false,
      error: 'Admin access required',
    });
    return;
  }

  next();
}

/**
 * Generate a simple token (for testing purposes)
 * In production, use proper JWT with secret
 */
export function generateToken(
  userId: string,
  name: string,
  role: 'customer' | 'agent' | 'admin',
  expiresInSeconds = 86400
): string {
  const payload = {
    userId,
    name,
    role,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresInSeconds,
  };

  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64');
  const signature = Buffer.from('signature').toString('base64'); // Simplified for demo

  return `${payloadStr}.${signature}`;
}
