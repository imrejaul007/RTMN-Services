/**
 * Rate Limiting — Per-IP and Per-API-Key request throttling
 * Uses Cloudflare KV for distributed rate limit state
 *
 * Supports two modes:
 * 1. IP-based: Standard rate limiting by client IP
 * 2. API Key-based: Rate limiting by API key (for partner apps)
 *
 * API Key rate limits override IP-based if both are present
 */

import type { Middleware } from 'itty-router';

interface RateLimitConfig {
  auth: number; // requests per minute
  api: number;
}

interface APIKeyTier {
  name: string;
  limit: number; // requests per minute
}

const RATE_LIMIT_KV = 'rate_limits';
const WINDOW_MS = 60 * 1000; // 1-minute window

// API Key tiers (configurable via env var)
const API_KEY_TIERS: Record<string, number> = {
  free: 60,      // 60 req/min for free tier
  standard: 300, // 300 req/min for standard
  premium: 1000, // 1000 req/min for premium partners
  internal: 5000, // 5000 req/min for internal services
};

async function getRateLimitKV(env: Env): Promise<R2Bucket | null> {
  try {
    return env.RATE_LIMIT_KV as unknown as R2Bucket;
  } catch {
    return null;
  }
}

async function checkRateLimit(
  key: string,
  limit: number,
  kv: R2Bucket | null,
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / WINDOW_MS) * WINDOW_MS;
  const kvKey = `rl:${key}:${windowStart}`;

  // Try KV store first (distributed)
  if (kv) {
    try {
      const existing = await kv.get(kvKey, 'text');
      const count = existing ? parseInt(existing, 10) : 0;

      if (count >= limit) {
        return {
          allowed: false,
          remaining: 0,
          resetAt: windowStart + WINDOW_MS,
        };
      }

      await kv.put(kvKey, String(count + 1), {
        expirationTtl: 120, // Expire after 2 minutes
      });

      return {
        allowed: true,
        remaining: Math.max(0, limit - count - 1),
        resetAt: windowStart + WINDOW_MS,
      };
    } catch {
      // KV unavailable — allow request but log
      console.warn('[RateLimit] KV unavailable, allowing request');
    }
  }

  // Fallback: allow (don't block on rate limiter failures)
  return { allowed: true, remaining: limit, resetAt: windowStart + WINDOW_MS };
}

/**
 * Extract API key from request headers
 * Priority: X-API-Key > Authorization: Bearer (if it looks like an API key)
 */
function extractAPIKey(request: Request): string | null {
  // Check X-API-Key header
  const apiKeyHeader = request.headers.get('X-API-Key');
  if (apiKeyHeader) {
    return apiKeyHeader;
  }

  // Check Authorization header for API key format
  const authHeader = request.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    // API keys are typically longer and don't have JWT dot structure
    if (token.length > 40 && !token.includes('.')) {
      return token;
    }
  }

  return null;
}

/**
 * Get rate limit tier from API key
 * In production, this should query a KV store or upstream service
 */
function getTierLimit(apiKey: string): number {
  // Check for known internal service keys
  if (apiKey.startsWith('rez-internal-')) {
    return API_KEY_TIERS.internal;
  }

  // Check for partner keys
  if (apiKey.startsWith('rez-partner-')) {
    return API_KEY_TIERS.premium;
  }

  // Default tier based on key length (simple heuristic)
  if (apiKey.length > 64) {
    return API_KEY_TIERS.standard;
  }

  return API_KEY_TIERS.free;
}

export function withRateLimit(type: 'auth' | 'api'): Middleware {
  return async (request: Request, env: Env): Promise<Response | undefined> => {
    // Skip rate limit for health checks
    const url = new URL(request.url);
    if (url.pathname === '/health' || url.pathname.startsWith('/health/')) {
      return undefined;
    }

    const ip = request.headers.get('CF-Connecting-IP') ||
               request.headers.get('X-Real-IP') ||
               'unknown';

    const config: RateLimitConfig = {
      auth: 10,
      api: 100,
    };

    let limit = config[type];
    let rateLimitKey = `ip:${ip}:${type}`;

    // Check for API key-based rate limiting
    const apiKey = extractAPIKey(request);
    if (apiKey) {
      const tierLimit = getTierLimit(apiKey);
      // Use the higher of the two limits (more lenient for valid API keys)
      limit = Math.max(limit, tierLimit);
      rateLimitKey = `key:${apiKey.slice(0, 8)}:${type}`; // Use prefix for privacy

      console.info('[RateLimit] Using API key rate limit', {
        tierLimit,
        effectiveLimit: limit,
        keyPrefix: apiKey.slice(0, 8),
      });
    }

    const kv = await getRateLimitKV(env);
    const { allowed, remaining, resetAt } = await checkRateLimit(rateLimitKey, limit, kv);

    const headers: Record<string, string> = {
      'X-RateLimit-Limit': String(limit),
      'X-RateLimit-Remaining': String(remaining),
      'X-RateLimit-Reset': String(resetAt),
    };

    if (!allowed) {
      const retryAfter = Math.ceil((resetAt - Date.now()) / 1000);
      headers['Retry-After'] = String(Math.max(1, retryAfter));

      console.warn('[RateLimit] Rate limit exceeded', {
        ip,
        type,
        limit,
        apiKey: apiKey?.slice(0, 8),
      });

      return new Response(JSON.stringify({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${retryAfter} seconds.`,
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter,
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
          'Cache-Control': 'no-store',
        },
      });
    }

    // Add rate limit headers to response
    (request as any).__rateLimitHeaders = headers;
    return undefined;
  };
}

/**
 * Export tier limits for documentation
 */
export function getRateLimitTiers() {
  return API_KEY_TIERS;
}
