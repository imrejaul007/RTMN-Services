/**
 * Rate limiting middleware (express-rate-limit).
 *
 * Closes Phase 3.10 of NEXHA-DEEP-AUDIT.md.
 *
 * Two tiers:
 *   - defaultLimiter: 100 requests / minute / IP — applied to most routes
 *   - strictLimiter: 20 requests / minute / IP — applied to sensitive routes
 *     (login, register, password, corpid-issue, OTP send/verify)
 */

import rateLimit from 'express-rate-limit';

const WINDOW_MS = 60 * 1000; // 1 minute

export const defaultLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please slow down' },
});

export const strictLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests for this endpoint, please slow down' },
});

/**
 * Auth-specific limiter: 5 attempts / minute / IP for login + register.
 * Brute-force protection.
 */
export const authLimiter = rateLimit({
  windowMs: WINDOW_MS,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Only count failed attempts
  message: { success: false, error: 'Too many authentication attempts, please wait a minute' },
});
