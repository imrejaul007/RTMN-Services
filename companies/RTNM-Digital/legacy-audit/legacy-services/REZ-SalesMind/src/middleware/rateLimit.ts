/**
 * Rate Limiting Middleware
 */

import rateLimit from 'express-rate-limit';

// General API rate limiter
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: {
    error: 'Too many requests',
    message: 'Please try again in a minute',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limiter for write operations
export const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 write operations per minute
  message: {
    error: 'Too many requests',
    message: 'Please slow down on write operations',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Limiter for external API calls (protect downstream services)
export const externalApiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50, // 50 external calls per minute
  message: {
    error: 'External API rate limit',
    message: 'Too many external API calls, please try again later',
    retryAfter: 60
  },
  standardHeaders: true,
  legacyHeaders: false,
});
