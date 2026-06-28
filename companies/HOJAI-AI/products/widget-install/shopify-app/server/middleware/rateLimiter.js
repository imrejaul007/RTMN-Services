/**
 * Rate Limiter Middleware
 * Token bucket rate limiting with Redis support
 */

import NodeCache from 'node-cache';
import { logger } from '../utils/logger.js';

// In-memory rate limit store (use Redis in production)
const rateLimitStore = new NodeCache({
  stdTTL: 60, // 1 minute TTL
  checkperiod: 10
});

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds
 * @param {number} options.max - Maximum requests per window
 * @param {string} options.keyPrefix - Key prefix for Redis/memory
 * @param {boolean} options.skipFailedRequests - Skip counting failed requests
 * @param {Array} options.skipPaths - Paths to skip rate limiting
 */
export function rateLimiter(options = {}) {
  const {
    windowMs = 60000, // 1 minute
    max = 100,
    keyPrefix = 'rl',
    skipFailedRequests = false,
    skipPaths = ['/health', '/ready']
  } = options;

  // Use Redis if available (Redis client would be passed in production)
  // For now, using in-memory store

  return async (req, res, next) => {
    // Skip rate limiting for certain paths
    if (skipPaths.includes(req.path)) {
      return next();
    }

    // Generate rate limit key
    const key = `${keyPrefix}_${getClientIdentifier(req)}`;

    try {
      // Get current request count
      let requestData = rateLimitStore.get(key);

      if (!requestData) {
        // First request in this window
        requestData = {
          count: 1,
          resetTime: Date.now() + windowMs
        };
      } else {
        // Check if window has expired
        if (Date.now() > requestData.resetTime) {
          // Reset window
          requestData = {
            count: 1,
            resetTime: Date.now() + windowMs
          };
        } else {
          // Increment count
          requestData.count++;
        }
      }

      // Store updated data
      rateLimitStore.set(key, requestData, Math.ceil((requestData.resetTime - Date.now()) / 1000));

      // Set rate limit headers
      const remaining = Math.max(0, max - requestData.count);
      const resetTime = Math.ceil(requestData.resetTime / 1000);

      res.set({
        'X-RateLimit-Limit': max,
        'X-RateLimit-Remaining': remaining,
        'X-RateLimit-Reset': resetTime
      });

      // Check if limit exceeded
      if (requestData.count > max) {
        logger.warn('Rate limit exceeded', {
          key,
          count: requestData.count,
          max,
          ip: req.ip
        });

        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Too many requests. Please try again later.',
            retryAfter: Math.ceil((requestData.resetTime - Date.now()) / 1000)
          }
        });
      }

      // Handle successful requests
      res.on('finish', () => {
        // Skip counting if request failed and option is set
        if (skipFailedRequests && res.statusCode >= 400) {
          const currentData = rateLimitStore.get(key);
          if (currentData && currentData.count > 0) {
            rateLimitStore.set(key, {
              ...currentData,
              count: currentData.count - 1
            }, Math.ceil((currentData.resetTime - Date.now()) / 1000));
          }
        }
      });

      next();
    } catch (error) {
      // If rate limiting fails, allow the request through
      logger.error('Rate limiter error', { error: error.message });
      next();
    }
  };
}

/**
 * Get client identifier for rate limiting
 * Uses a combination of IP and user ID if available
 */
function getClientIdentifier(req) {
  // Try to use authenticated user ID first
  if (req.user?.id) {
    return `user_${req.user.id}`;
  }

  // Fall back to shop domain
  if (req.query?.shop) {
    return `shop_${req.query.shop}`;
  }

  // Fall back to IP address
  const ip = req.ip || req.connection?.remoteAddress || 'unknown';
  return `ip_${ip.replace(/:/g, '_')}`;
}

/**
 * Create a stricter rate limiter for sensitive endpoints
 */
export function strictRateLimiter() {
  return rateLimiter({
    windowMs: 60000, // 1 minute
    max: 10, // Only 10 requests per minute
    keyPrefix: 'rl_strict'
  });
}

/**
 * Create a webhook-specific rate limiter
 */
export function webhookRateLimiter() {
  return rateLimiter({
    windowMs: 60000,
    max: 60, // Higher limit for webhooks
    keyPrefix: 'rl_webhook'
  });
}