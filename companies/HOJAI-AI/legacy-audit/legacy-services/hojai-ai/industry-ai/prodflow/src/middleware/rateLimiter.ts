/**
 * PRODFLOW - Rate Limiting Middleware
 * Protection against abuse
 */

import rateLimit from 'express-rate-limit';
import { config } from '../utils/config';
import { logger } from '../utils/logger';

// ============================================
// STANDARD LIMITER
// ============================================

export const standardLimiter = rateLimit({
  windowMs: config.rateLimit.window,
  max: config.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method
    });

    res.status(429).json({
      success: false,
      error: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(config.rateLimit.window / 1000)
    });
  },
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/health/live';
  }
});

// ============================================
// AUTH LIMITER
// ============================================

export const authLimiter = rateLimit({
  windowMs: config.rateLimit.window,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn('Auth rate limit exceeded', {
      ip: req.ip,
      email: req.body?.email
    });

    res.status(429).json({
      success: false,
      error: 'Too many authentication attempts, please try again later',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(config.rateLimit.window / 1000)
    });
  }
});

export default {
  standardLimiter,
  authLimiter
};
