import { NextRequest, NextResponse } from 'next/server';

/**
 * Rate limiting middleware for NextaBizz API routes
 *
 * Uses an in-memory Map to track request counts per IP address.
 * Resets after WINDOW_MS (1 minute by default).
 *
 * Configuration:
 * - WINDOW_MS: Time window for rate limiting (default: 60 seconds)
 * - MAX_REQUESTS: Maximum requests per window per IP (default: 100)
 */

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS = 100;

// Cleanup old entries periodically to prevent memory leaks
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
let lastCleanup = Date.now();

function cleanupExpiredEntries(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;

  lastCleanup = now;
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}

/**
 * Extracts client IP from request headers
 * Supports common proxy headers and falls back to 'unknown'
 */
function getClientIP(request: Request): string {
  // Check common headers used by proxies and load balancers
  const xForwardedFor = request.headers.get('x-forwarded-for');
  if (xForwardedFor) {
    // x-forwarded-for may contain multiple IPs, take the first one
    const ips = xForwardedFor.split(',').map(ip => ip.trim());
    return ips[0];
  }

  const xRealIP = request.headers.get('x-real-ip');
  if (xRealIP) {
    return xRealIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  const xClientIP = request.headers.get('x-client-ip');
  if (xClientIP) {
    return xClientIP;
  }

  return 'unknown';
}

/**
 * Rate limit middleware function
 *
 * @param request - The incoming request
 * @returns NextResponse with 429 status if rate limited, null otherwise
 */
export function rateLimitMiddleware(request: Request): NextResponse | null {
  // Periodic cleanup
  cleanupExpiredEntries();

  const ip = getClientIP(request);
  const key = `rate:${ip}`;
  const now = Date.now();

  let record = rateLimitMap.get(key);

  // Create new record or reset if window has expired
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + WINDOW_MS };
    rateLimitMap.set(key, record);
  }

  record.count++;

  // Check if rate limit exceeded
  if (record.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return NextResponse.json(
      {
        error: 'Too many requests',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      },
      {
        status: 429,
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': record.resetTime.toString(),
        },
      }
    );
  }

  return null;
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(record: { count: number; resetTime: number }): Record<string, string> {
  return {
    'X-RateLimit-Limit': MAX_REQUESTS.toString(),
    'X-RateLimit-Remaining': Math.max(0, MAX_REQUESTS - record.count).toString(),
    'X-RateLimit-Reset': record.resetTime.toString(),
  };
}

/**
 * Get current rate limit record for an IP
 */
export function getRateLimitRecord(request: Request): { count: number; resetTime: number } | undefined {
  const ip = getClientIP(request);
  const key = `rate:${ip}`;
  return rateLimitMap.get(key);
}

/**
 * Configuration for rate limiter
 */
export const rateLimitConfig = {
  windowMs: WINDOW_MS,
  maxRequests: MAX_REQUESTS,
};
