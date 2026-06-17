/**
 * Auth Middleware
 */
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/index.js';

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function verifyInternal(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'] as string | undefined;

  if (!token) {
    res.status(401).json({ success: false, error: 'Unauthorized' });
    return;
  }

  if (timingSafeCompare(token, config.internalToken)) {
    return next();
  }

  if (config.adminToken && timingSafeCompare(token, config.adminToken)) {
    return next();
  }

  res.status(401).json({ success: false, error: 'Invalid token' });
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  next();
}
