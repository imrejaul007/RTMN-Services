/**
 * RTMN TwinOS Shared - Rate Limiting Middleware
 * Provides configurable rate limiting
 */

import rateLimit from 'express-rate-limit';

/**
 * Default rate limiter - 100 requests per minute
 */
export const defaultLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    res.status(429).json(options.message);
  }
});

/**
 * Strict rate limiter - 20 requests per minute
 * Use for sensitive operations
 */
export const strictLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many requests, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Auth rate limiter - 5 attempts per 15 minutes
 * Use for login/register endpoints
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT',
      message: 'Too many failed attempts, please try again later'
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Create custom rate limiter
 */
export function createLimiter(options) {
  const {
    windowMs = 60 * 1000,
    max = 100,
    message = 'Too many requests',
    keyGenerator = (req) => req.ip
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT',
        message
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator
  });
}

/**
 * Per-user rate limiter (requires auth middleware to run first)
 */
export function createUserLimiter(options) {
  const {
    windowMs = 60 * 1000,
    max = 100,
    message = 'Too many requests'
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT',
        message
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.id || req.ip
  });
}

/**
 * Per-business rate limiter (requires auth middleware to run first)
 */
export function createBusinessLimiter(options) {
  const {
    windowMs = 60 * 1000,
    max = 1000,
    message = 'Too many requests'
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      error: {
        code: 'RATE_LIMIT',
        message
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.businessId || req.ip
  });
}

export default {
  defaultLimiter,
  strictLimiter,
  authLimiter,
  createLimiter,
  createUserLimiter,
  createBusinessLimiter
};
