/**
 * Authentication Middleware
 */
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
const INTERNAL_TOKENS = parseInternalTokens();

function parseInternalTokens(): Record<string, string> {
  try {
    return JSON.parse(process.env.INTERNAL_SERVICE_TOKENS_JSON || '{}');
  } catch {
    const legacy = process.env.INTERNAL_SERVICE_TOKEN;
    return legacy ? { default: legacy } : {};
  }
}

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
    res.status(401).json({ error: 'Unauthorized - token required' });
    return;
  }

  // Check against admin token
  if (ADMIN_TOKEN && timingSafeCompare(token, ADMIN_TOKEN)) {
    return next();
  }

  // Check against internal tokens
  for (const expected of Object.values(INTERNAL_TOKENS)) {
    if (timingSafeCompare(token, expected)) {
      return next();
    }
  }

  res.status(401).json({ error: 'Unauthorized - invalid token' });
}

export function verifyAdmin(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-admin-token'] as string | undefined;

  if (!token || !ADMIN_TOKEN) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  if (!timingSafeCompare(token, ADMIN_TOKEN)) {
    res.status(401).json({ error: 'Unauthorized - invalid admin token' });
    return;
  }

  next();
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  // Just pass through, auth is optional
  next();
}
