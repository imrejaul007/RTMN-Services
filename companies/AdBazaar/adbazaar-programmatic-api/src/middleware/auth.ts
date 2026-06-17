/**
 * Auth Middleware
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/index.js';

interface AuthRequest extends Request {
  auth?: { service: string; authenticated: boolean };
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function authenticateAny(req: AuthRequest, _res: Response, next: NextFunction): void {
  const token = (req.headers['x-internal-token'] || req.headers['authorization']?.replace('Bearer ', '')) as string | undefined;

  if (!token) {
    return next();
  }

  for (const [service, expectedToken] of Object.entries(config.internalServiceTokens)) {
    if (timingSafeCompare(token, expectedToken)) {
      req.auth = { service, authenticated: true };
      return next();
    }
  }

  next();
}

export function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  if (!req.auth?.authenticated) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }
  next();
}
