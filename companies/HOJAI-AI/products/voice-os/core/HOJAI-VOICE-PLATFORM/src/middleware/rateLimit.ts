// ============================================================================
// HOJAI VOICE PLATFORM - Rate Limiting Middleware
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { rateLimitConfig } from '../config';

// In-memory store for rate limiting (use Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

/**
 * Clean up expired rate limit entries
 */
function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, value] of requestCounts.entries()) {
    if (now > value.resetTime) {
      requestCounts.delete(key);
    }
  }
}

// Run cleanup every minute
setInterval(cleanupExpiredEntries, 60000);

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: Request): string {
  // Try to get user ID from authenticated request
  const authReq = req as Request & { user?: { id?: string; organizationId?: string } };
  if (authReq.user?.id) {
    return `user:${authReq.user.id}`;
  }

  // Fall back to IP address
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.socket.remoteAddress || 'unknown';

  return `ip:${ip}`;
}

/**
 * General rate limiting middleware
 */
export function rateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const clientId = getClientIdentifier(req);
  const now = Date.now();
  const windowMs = rateLimitConfig.windowMs;
  const maxRequests = rateLimitConfig.maxRequests;

  let clientData = requestCounts.get(clientId);

  if (!clientData || now > clientData.resetTime) {
    // Start new window
    clientData = {
      count: 1,
      resetTime: now + windowMs,
    };
    requestCounts.set(clientId, clientData);
    next();
    return;
  }

  clientData.count++;

  if (clientData.count > maxRequests) {
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests. Please try again later.',
        retryAfter,
      },
    });
    return;
  }

  // Add rate limit headers
  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
  res.setHeader('X-RateLimit-Reset', clientData.resetTime.toString());

  next();
}

/**
 * Rate limiting for calls endpoint
 */
export function callsRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const clientId = getClientIdentifier(req);
  const now = Date.now();
  const windowMs = rateLimitConfig.calls.windowMs;
  const maxRequests = rateLimitConfig.calls.maxRequests;

  let clientData = requestCounts.get(`${clientId}:calls`);

  if (!clientData || now > clientData.resetTime) {
    clientData = {
      count: 1,
      resetTime: now + windowMs,
    };
    requestCounts.set(`${clientId}:calls`, clientData);
    next();
    return;
  }

  clientData.count++;

  if (clientData.count > maxRequests) {
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many call requests. Please try again later.',
        retryAfter,
      },
    });
    return;
  }

  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
  res.setHeader('X-RateLimit-Reset', clientData.resetTime.toString());

  next();
}

/**
 * Rate limiting for sessions endpoint
 */
export function sessionsRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const clientId = getClientIdentifier(req);
  const now = Date.now();
  const windowMs = rateLimitConfig.sessions.windowMs;
  const maxRequests = rateLimitConfig.sessions.maxRequests;

  let clientData = requestCounts.get(`${clientId}:sessions`);

  if (!clientData || now > clientData.resetTime) {
    clientData = {
      count: 1,
      resetTime: now + windowMs,
    };
    requestCounts.set(`${clientId}:sessions`, clientData);
    next();
    return;
  }

  clientData.count++;

  if (clientData.count > maxRequests) {
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many session requests. Please try again later.',
        retryAfter,
      },
    });
    return;
  }

  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
  res.setHeader('X-RateLimit-Reset', clientData.resetTime.toString());

  next();
}

/**
 * Rate limiting for analytics endpoint
 */
export function analyticsRateLimitMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const clientId = getClientIdentifier(req);
  const now = Date.now();
  const windowMs = rateLimitConfig.analytics.windowMs;
  const maxRequests = rateLimitConfig.analytics.maxRequests;

  let clientData = requestCounts.get(`${clientId}:analytics`);

  if (!clientData || now > clientData.resetTime) {
    clientData = {
      count: 1,
      resetTime: now + windowMs,
    };
    requestCounts.set(`${clientId}:analytics`, clientData);
    next();
    return;
  }

  clientData.count++;

  if (clientData.count > maxRequests) {
    const retryAfter = Math.ceil((clientData.resetTime - now) / 1000);

    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many analytics requests. Please try again later.',
        retryAfter,
      },
    });
    return;
  }

  res.setHeader('X-RateLimit-Limit', maxRequests.toString());
  res.setHeader('X-RateLimit-Remaining', (maxRequests - clientData.count).toString());
  res.setHeader('X-RateLimit-Reset', clientData.resetTime.toString());

  next();
}

/**
 * Get current rate limit status for a client
 */
export function getRateLimitStatus(req: Request): {
  limit: number;
  remaining: number;
  reset: Date;
} {
  const clientId = getClientIdentifier(req);
  const clientData = requestCounts.get(clientId);

  if (!clientData || Date.now() > clientData.resetTime) {
    return {
      limit: rateLimitConfig.maxRequests,
      remaining: rateLimitConfig.maxRequests,
      reset: new Date(Date.now() + rateLimitConfig.windowMs),
    };
  }

  return {
    limit: rateLimitConfig.maxRequests,
    remaining: Math.max(0, rateLimitConfig.maxRequests - clientData.count),
    reset: new Date(clientData.resetTime),
  };
}
