import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { verifyToken, JwtPayload, issueSystemToken } from '../services/auth.service';

export interface AuthedRequest extends Request {
  corpId?: string;
  role?: 'supplier' | 'buyer' | 'admin' | 'system' | 'guest';
  guestId?: string;
  authMethod?: 'jwt' | 'internal-key' | 'guest-token' | 'public';
  token?: string;
}

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';

/**
 * Production-grade auth middleware with JWT verification.
 *
 * Checks in priority order:
 *   1. Bearer token (JWT) — validated against JWT_SECRET + issuer/audience
 *   2. x-internal-key — timing-safe comparison, for service-to-service
 *   3. x-guest-token — short-lived JWT for verified guests
 *   4. public — no auth needed
 *
 * Routes opt in with `mode`:
 *   'strict' — JWT or internal-key required
 *   'guest'  — JWT, internal-key, or guest-token allowed
 *   'public' — no auth (health, corpId issue, guest onboarding)
 */
export function requireAuth(mode: 'strict' | 'guest' | 'public' = 'strict') {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (mode === 'public') {
      req.authMethod = 'public';
      return next();
    }

    // --- 1. Bearer token (JWT) ---
    const authHeader = req.header('authorization');
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7);
      const result = verifyToken(token);
      if (result.valid) {
        req.corpId = result.payload.sub;
        req.role = result.payload.role;
        req.guestId = result.payload.guestId;
        req.authMethod = 'jwt';
        req.token = token;
        return next();
      }
      // JWT invalid — return 401 (don't fall through to other modes)
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token',
        reason: result.reason,
        hint: 'Re-login to get a fresh token',
      });
      return;
    }

    // --- 2. Internal service-to-service key ---
    const internalKey = req.header('x-internal-key');
    if (internalKey && INTERNAL_KEY) {
      // timing-safe compare; if no key configured, skip
      if (Buffer.from(internalKey).length === Buffer.from(INTERNAL_KEY).length
          && crypto.timingSafeEqual(Buffer.from(internalKey), Buffer.from(INTERNAL_KEY))) {
        req.corpId = req.header('x-corp-id') || 'system';
        req.role = (req.header('x-role') as AuthedRequest['role']) || 'system';
        req.authMethod = 'internal-key';
        return next();
      }
    }

    // --- 3. Guest token (short-lived JWT for verified guests) ---
    if (mode === 'guest') {
      const guestToken = req.header('x-guest-token');
      if (guestToken) {
        const result = verifyToken(guestToken);
        if (result.valid && result.payload.role === 'guest') {
          req.corpId = result.payload.guestId!;
          req.role = 'guest';
          req.guestId = result.payload.guestId;
          req.authMethod = 'guest-token';
          req.token = guestToken;
          return next();
        }
      }
    }

    // --- Auth required but nothing matched ---
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      hint: mode === 'guest'
        ? 'Provide Authorization: Bearer <token>, x-internal-key, or x-guest-token'
        : 'Provide Authorization: Bearer <token> or x-internal-key',
    });
  };
}

/**
 * Require admin role. Call after requireAuth.
 */
export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.role !== 'admin') {
    res.status(403).json({ success: false, error: 'Admin access required' });
    return;
  }
  next();
}

/**
 * Require system role. Used for auto-scoring endpoints.
 */
export function requireSystem(req: AuthedRequest, res: Response, next: NextFunction): void {
  if (req.role !== 'system' && req.role !== 'admin') {
    res.status(403).json({ success: false, error: 'System access required' });
    return;
  }
  next();
}

/**
 * Get a system token for the current process.
 * Useful for internal service calls within the process.
 */
export function getSystemToken(): string {
  return issueSystemToken('commerce-identity');
}
