import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export interface AuthedRequest extends Request {
  corpId?: string;
  role?: 'supplier' | 'buyer' | 'admin' | 'system' | 'guest';
  authMethod?: 'corpid-jwt' | 'internal-key' | 'guest-otp' | 'public';
}

const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';

/**
 * Lightweight auth middleware.
 *
 * Real deployments would verify a JWT minted by rez-auth-service. For
 * the commerce-identity service we accept either:
 *   1. x-internal-key header (service-to-service)
 *   2. x-corp-id + x-role headers (already-authenticated upstream)
 *   3. x-guest-id + x-otp header (guest supplier endpoints)
 * Routes can opt in or out via the `mode` parameter.
 */
export function requireAuth(mode: 'strict' | 'guest' | 'public' = 'strict') {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    if (mode === 'public') {
      req.authMethod = 'public';
      return next();
    }

    const internalKey = req.header('x-internal-key');
    if (internalKey && INTERNAL_KEY && crypto.timingSafeEqual(Buffer.from(internalKey), Buffer.from(INTERNAL_KEY))) {
      req.corpId = req.header('x-corp-id') || 'system';
      req.role = (req.header('x-role') as AuthedRequest['role']) || 'system';
      req.authMethod = 'internal-key';
      return next();
    }

    const corpId = req.header('x-corp-id');
    if (corpId) {
      req.corpId = corpId;
      req.role = req.header('x-role') as AuthedRequest['role'];
      req.authMethod = 'corpid-jwt';
      return next();
    }

    if (mode === 'guest') {
      const guestId = req.header('x-guest-id');
      const otp = req.header('x-otp');
      if (guestId && otp) {
        req.corpId = guestId;
        req.role = 'guest';
        req.authMethod = 'guest-otp';
        return next();
      }
    }

    res.status(401).json({
      success: false,
      error: 'Authentication required',
      hint: mode === 'guest'
        ? 'Provide x-internal-key, x-corp-id, or x-guest-id + x-otp'
        : 'Provide x-internal-key or x-corp-id',
    });
  };
}
