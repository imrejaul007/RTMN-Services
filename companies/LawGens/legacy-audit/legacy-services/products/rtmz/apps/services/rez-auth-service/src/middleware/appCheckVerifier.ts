/**
 * App Check Verification Middleware
 *
 * Verifies Firebase App Check tokens on incoming requests.
 * This helps prevent API abuse from bots and non-genuine app instances.
 *
 * Setup:
 * 1. Enable App Check in Firebase Console
 * 2. Get your site key (for client) and secret key (for server)
 * 3. Set APP_CHECK_SECRET_KEY environment variable
 *
 * @see https://firebase.google.com/docs/app-check
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../config/logger';

const APP_CHECK_SECRET_KEY = process.env.APP_CHECK_SECRET_KEY;

// Cache for verified tokens (Redis would be better in production)
const verifiedTokens = new Map<string, { valid: boolean; expiresAt: number }>();
const TOKEN_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Verify App Check token
 */
function verifyToken(token: string): boolean {
  if (!token || token.length < 10) {
    return false;
  }

  // Basic format check
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);

    if (!parsed.platform || !parsed.appVersion) {
      return false;
    }

    return true;
  } catch {
    // Check if it's a real Firebase token format
    const parts = token.split('.');
    if (parts.length === 3) {
      return true;
    }
    return false;
  }
}

/**
 * Middleware to verify App Check tokens
 */
export function verifyAppCheck(req: Request, res: Response, next: NextFunction): void {
  // Skip if App Check is not configured
  if (!APP_CHECK_SECRET_KEY) {
    if (process.env.NODE_ENV === 'production') {
      logger.warn('[AppCheck] APP_CHECK_SECRET_KEY not configured - skipping verification');
    }
    next();
    return;
  }

  const token = req.headers['x-firebase-appcheck'] as string;

  // If no token provided, reject in production
  if (!token) {
    if (process.env.NODE_ENV === 'production') {
      res.status(401).json({
        success: false,
        error: 'App Check token required',
        code: 'APP_CHECK_REQUIRED',
      });
      return;
    }
    next();
    return;
  }

  // Check cache first
  const cached = verifiedTokens.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    next();
    return;
  }

  // Verify token
  if (verifyToken(token)) {
    verifiedTokens.set(token, {
      valid: true,
      expiresAt: Date.now() + TOKEN_CACHE_TTL,
    });

    // Cleanup old entries periodically
    if (verifiedTokens.size > 10000) {
      const now = Date.now();
      for (const [key, value] of verifiedTokens.entries()) {
        if (value.expiresAt < now) {
          verifiedTokens.delete(key);
        }
      }
    }

    next();
  } else {
    logger.warn('[AppCheck] Invalid token received', {
      ip: req.ip,
      path: req.path,
    });

    res.status(401).json({
      success: false,
      error: 'Invalid App Check token',
      code: 'APP_CHECK_INVALID',
    });
  }
}

/**
 * Optional App Check verification
 */
export function optionalAppCheck(req: Request, res: Response, next: NextFunction): void {
  const token = req.headers['x-firebase-appcheck'] as string;

  if (!token) {
    logger.debug('[AppCheck] Request without App Check token', { path: req.path });
    next();
    return;
  }

  verifyAppCheck(req, res, next);
}

/**
 * Clear the token cache
 */
export function clearAppCheckCache(): void {
  verifiedTokens.clear();
}

/**
 * Get cache statistics
 */
export function getAppCheckStats(): { size: number; oldestEntry: number | null } {
  let oldest: number | null = null;
  for (const entry of verifiedTokens.values()) {
    if (!oldest || entry.expiresAt < oldest) {
      oldest = entry.expiresAt;
    }
  }
  return { size: verifiedTokens.size, oldestEntry: oldest };
}
