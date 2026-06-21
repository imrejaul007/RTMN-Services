/**
 * @rtmn/security-shared — Rate Limiting Middleware
 *
 * Three tiers of rate limit, all using express-rate-limit. Each one is
 * designed for a specific use case.
 *
 *  - defaultLimiter: 100 req/min per IP — for general API routes
 *  - authLimiter: 10 req/15min per IP — for /login, /register, /forgot-password
 *  - strictLimiter: 5 req/15min per IP — for password reset, MFA verify,
 *    verification token confirm
 *
 * The auth and strict limiters are the audit's recommended fix for the
 * brute-force / OTP enumeration problems found in every system.
 *
 * All limiters use the standard `RateLimit-*` response headers. The store
 * is in-memory by default; for multi-replica deployments, pass a Redis
 * store (see `createRateLimit`).
 */

import rateLimit from 'express-rate-limit';

/**
 * Create a custom rate limiter. Most callers should use the pre-built
 * limiters below.
 *
 * @param {object} options
 * @param {number} options.windowMs
 * @param {number} options.max
 * @param {string} [options.message='Too many requests']
 * @param {function} [options.keyGenerator] - override the IP key
 * @param {object} [options.store] - Redis store for multi-replica deploys
 * @returns {Function} Express middleware
 */
export function createRateLimit(options) {
  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, error: options.message || 'Too many requests' },
    keyGenerator: options.keyGenerator || ((req) => req.ip),
    store: options.store,
  });
}

/**
 * Default limiter: 100 req/min per IP. Use for normal API routes.
 */
export const defaultLimiter = createRateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Too many requests',
});

/**
 * Auth limiter: 10 req/15min per IP. Use for /login, /register, /forgot-password.
 * The key is IP+path so attackers rotating between endpoints don't get
 * a fresh budget.
 */
export const authLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many authentication attempts, please try again later',
  keyGenerator: (req) => `${req.ip}:${req.path}`,
});

/**
 * Strict limiter: 5 req/15min per IP. Use for password reset, MFA verify,
 * email/phone verification confirm.
 */
export const strictLimiter = createRateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many attempts, please try again later',
  keyGenerator: (req) => `${req.ip}:${req.path}`,
});

/**
 * Internal endpoint limiter: 1000 req/min per IP. For service-to-service
 * calls. Looser than the default because internal callers batch.
 */
export const internalLimiter = createRateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Internal service rate limit exceeded',
});
