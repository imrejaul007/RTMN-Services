/**
 * Rate limiting middleware for the RTMN Hub.
 *
 * Two limits:
 *   1. Per IP address  (default: 100 requests / minute)
 *   2. Per bearer token (default: 500 requests / minute)
 *
 * Limits are configurable via env vars. When a limit is exceeded, the Hub
 * returns HTTP 429 with a Retry-After header.
 *
 * Uses an in-memory sliding-window counter — suitable for single-instance
 * deployments. For multi-instance, replace with Redis.
 */

import { Request, Response, NextFunction } from 'express';

interface Window {
  count: number;
  resetAt: number;
}

const WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10);
const IP_LIMIT = parseInt(process.env.RATE_LIMIT_IP || '100', 10);
const TOKEN_LIMIT = parseInt(process.env.RATE_LIMIT_TOKEN || '500', 10);

// Track requests per IP
const ipWindows = new Map<string, Window>();
// Track requests per bearer token
const tokenWindows = new Map<string, Window>();

/*** Helper to get sliding window count */
function checkAndIncrement(
  windows: Map<string, Window>,
  key: string,
  limit: number,
): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const window = windows.get(key);

  if (!window || now > window.resetAt) {
    // New window
    windows.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, remaining: limit - 1, resetAt: now + WINDOW_MS };
  }

  if (window.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: window.resetAt };
  }

  window.count++;
  return { allowed: true, remaining: limit - window.count, resetAt: window.resetAt };
}

/** Extract bearer token from Authorization header */
function extractToken(headers: Record<string, string | string[] | undefined>): string | undefined {
  const auth = headers['authorization'];
  if (!auth) return undefined;
  const val = Array.isArray(auth) ? auth[0] : auth;
  if (!val?.startsWith('Bearer ')) return undefined;
  return val.slice(7);
}

/** Extract client IP from request */
function extractIP(headers: Record<string, string | string[] | undefined>): string {
  const forwarded = headers['x-forwarded-for'];
  if (forwarded) {
    const val = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    return (val?.split(',')[0] ?? 'unknown').trim();
  }
  return headers['x-real-ip'] as string || 'unknown';
}

/**
 * Express middleware that enforces per-IP and per-token rate limits.
 * Skips /health and /ready (always public).
 */
export function rateLimit(req: Request, res: Response, next: NextFunction) {
  if (req.path === '/health' || req.path === '/ready') {
    return next();
  }

  const ip = extractIP(req.headers as Record<string, string | string[] | undefined>);
  const token = extractToken(req.headers as Record<string, string | string[] | undefined>);

  // Check IP limit
  const ipResult = checkAndIncrement(ipWindows, ip, IP_LIMIT);
  res.setHeader('X-RateLimit-Limit-IP', IP_LIMIT.toString());
  res.setHeader('X-RateLimit-Remaining-IP', ipResult.remaining.toString());
  res.setHeader('X-RateLimit-Reset-IP', Math.floor(ipResult.resetAt / 1000).toString());

  if (!ipResult.allowed) {
    res.setHeader('Retry-After', Math.ceil((ipResult.resetAt - Date.now()) / 1000).toString());
    return res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: `IP rate limit exceeded. Try again in a moment.`,
        limit: IP_LIMIT,
        windowMs: WINDOW_MS,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  // Check token limit (if token present)
  if (token) {
    const tokenResult = checkAndIncrement(tokenWindows, token, TOKEN_LIMIT);
    res.setHeader('X-RateLimit-Limit-Token', TOKEN_LIMIT.toString());
    res.setHeader('X-RateLimit-Remaining-Token', tokenResult.remaining.toString());
    res.setHeader('X-RateLimit-Reset-Token', Math.floor(tokenResult.resetAt / 1000).toString());

    if (!tokenResult.allowed) {
      res.setHeader('Retry-After', Math.ceil((tokenResult.resetAt - Date.now()) / 1000).toString());
      return res.status(429).json({
        success: false,
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Token rate limit exceeded. Try again in a moment.`,
          limit: TOKEN_LIMIT,
          windowMs: WINDOW_MS,
        },
        meta: { timestamp: new Date().toISOString() },
      });
    }
  }

  next();
}
