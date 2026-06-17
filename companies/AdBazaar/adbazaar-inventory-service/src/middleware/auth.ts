/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { config } from '../config/index.js';

interface AuthenticatedRequest extends Request {
  serviceAuth?: {
    service: string;
    authenticated: boolean;
  };
}

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

export function authenticateAny(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  const serviceName = req.headers['x-internal-service'] as string | undefined;
  const token = (req.headers['x-internal-token'] || req.headers['x-internal-key']) as string | undefined;

  if (!serviceName && !token) {
    // No auth provided, continue without auth
    return next();
  }

  const expectedToken = serviceName ? config.internalServiceTokens[serviceName] : undefined;

  if (expectedToken && token && timingSafeCompare(token, expectedToken)) {
    req.serviceAuth = { service: serviceName!, authenticated: true };
    return next();
  }

  // Check legacy token
  const legacyToken = Object.values(config.internalServiceTokens)[0];
  if (legacyToken && token && timingSafeCompare(token, legacyToken)) {
    req.serviceAuth = { service: 'legacy', authenticated: true };
    return next();
  }

  next();
}
