/**
 * Authentication Middleware
 *
 * Validates internal service tokens.
 */

import { Request, Response, NextFunction } from 'express';
import { config } from '../config/index.js';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedRequest extends Request {
  serviceAuth?: {
    service: string;
    authenticated: boolean;
  };
}

// ============================================================================
// HELPER
// ============================================================================

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

export function authenticateAny(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  // Get service name and token
  const serviceName = req.headers['x-internal-service'] as string | undefined;
  const token = (req.headers['x-internal-token'] || req.headers['x-internal-key']) as string | undefined;

  // If no auth provided, allow (auth is optional for some endpoints)
  if (!serviceName && !token) {
    return next();
  }

  // Validate token
  const expectedToken = serviceName ? config.internalServiceTokens[serviceName] : undefined;

  if (expectedToken && token && timingSafeEqual(token, expectedToken)) {
    req.serviceAuth = { service: serviceName!, authenticated: true };
    return next();
  }

  // Also check legacy single token
  const legacyToken = Object.values(config.internalServiceTokens)[0];
  if (legacyToken && token && timingSafeEqual(token, legacyToken)) {
    req.serviceAuth = { service: 'legacy', authenticated: true };
    return next();
  }

  // No valid auth found, but continue (optional auth)
  next();
}

export function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.serviceAuth?.authenticated) {
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Valid authentication required',
    });
    return;
  }
  next();
}