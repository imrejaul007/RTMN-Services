/**
 * CorpID Cloud - Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../utils/constants.js';

/**
 * Auth rate limiter - strict for login/register
 */
export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH_WINDOW_MS,
  max: RATE_LIMITS.AUTH_MAX,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many authentication attempts. Please try again in 15 minutes.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip
});

/**
 * Default API rate limiter
 */
export const apiLimiter = rateLimit({
  windowMs: RATE_LIMITS.API_WINDOW_MS,
  max: RATE_LIMITS.API_MAX,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many requests. Please slow down.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Strict rate limiter for sensitive operations
 */
export const strictLimiter = rateLimit({
  windowMs: RATE_LIMITS.STRICT_WINDOW_MS,
  max: RATE_LIMITS.STRICT_MAX,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Rate limit exceeded for this operation.'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Create a custom rate limiter
 */
export function createLimiter(options) {
  return rateLimit({
    windowMs: options.windowMs || 60 * 1000,
    max: options.max || 100,
    message: options.message || {
      success: false,
      error: {
        code: 'RATE_LIMIT',
        message: 'Rate limit exceeded.'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: options.keyGenerator || ((req) => req.ip)
  });
}

export default {
  authLimiter,
  apiLimiter,
  strictLimiter,
  createLimiter
};
