/**
 * Authentication Middleware
 *
 * Handles API key and admin token authentication.
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthConfig {
  adminToken: string;
  apiKeys: string[];
}

export interface AuthenticatedRequest extends Request {
  serviceAuth?: {
    service: string;
    authenticated: boolean;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function timingSafeEqual(a: Buffer, b: Buffer): boolean {
  if (a.length !== b.length) {
    return false;
  }
  return crypto.timingSafeEqual(a, b);
}

function isValidKey(provided: string | undefined, expected: string[]): boolean {
  if (!provided || expected.length === 0) {
    return false;
  }

  const providedBuf = Buffer.from(provided);
  return expected.some((exp) => {
    const expectedBuf = Buffer.from(exp);
    return timingSafeEqual(providedBuf, expectedBuf);
  });
}

// ============================================================================
// MIDDLEWARE FACTORY
// ============================================================================

export function createAuthMiddleware(config: AuthConfig) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    // Check for admin token
    const adminToken = req.headers['x-admin-token'] as string | undefined;
    if (adminToken && timingSafeEqual(Buffer.from(adminToken), Buffer.from(config.adminToken))) {
      req.serviceAuth = { service: 'admin', authenticated: true };
      return next();
    }

    // Check for API key
    const apiKey = req.headers['x-api-key'] as string | undefined;
    if (isValidKey(apiKey, config.apiKeys)) {
      req.serviceAuth = { service: 'api-key', authenticated: true };
      return next();
    }

    // Check for Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      if (isValidKey(token, config.apiKeys)) {
        req.serviceAuth = { service: 'bearer', authenticated: true };
        return next();
      }
    }

    // Authentication failed
    res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Valid authentication required. Provide X-Admin-Token, X-API-Key, or Bearer token.',
    });
  };
}

// ============================================================================
// INTERNAL SERVICE AUTH
// ============================================================================

export function createInternalAuthMiddleware(validTokens: Record<string, string>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const serviceName = req.headers['x-internal-service'] as string | undefined;
    const token = (req.headers['x-internal-token'] || req.headers['x-internal-key']) as string | undefined;

    if (!serviceName || !token) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'x-internal-service and x-internal-token headers required',
      });
      return;
    }

    const expectedToken = validTokens[serviceName];
    if (!expectedToken || !isValidKey(token, [expectedToken])) {
      res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Invalid service token',
      });
      return;
    }

    req.serviceAuth = { service: serviceName, authenticated: true };
    next();
  };
}

// ============================================================================
// PUBLIC ENDPOINTS CONFIG
// ============================================================================

export const PUBLIC_ENDPOINTS = [
  '/health',
  '/health/live',
  '/ready',
  '/metrics',
];

export function isPublicEndpoint(path: string): boolean {
  return PUBLIC_ENDPOINTS.some((endpoint) => path.startsWith(endpoint));
}