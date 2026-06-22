import { Request, Response, NextFunction } from 'express';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitStore {
  [key: string]: RateLimitEntry;
}

const store: RateLimitStore = {};

const DEFAULT_WINDOW_MS = 60 * 1000; // 1 minute
const DEFAULT_MAX_REQUESTS = 100;

export interface RateLimitConfig {
  windowMs?: number;
  maxRequests?: number;
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
  handler?: (req: Request, res: Response) => void;
}

export function createRateLimiter(config: RateLimitConfig = {}) {
  const {
    windowMs = DEFAULT_WINDOW_MS,
    maxRequests = DEFAULT_MAX_REQUESTS,
    keyGenerator = defaultKeyGenerator,
    handler = defaultHandler,
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    // Get or create entry
    let entry = store[key];

    if (!entry || now > entry.resetTime) {
      entry = {
        count: 0,
        resetTime: now + windowMs,
      };
      store[key] = entry;
    }

    entry.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - entry.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000));

    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      handler(req, res);
      return;
    }

    next();
  };
}

function defaultKeyGenerator(req: Request): string {
  // Use IP address as the key
  const forwarded = req.headers['x-forwarded-for'];
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0] : forwarded[0])
    : req.ip || req.socket.remoteAddress || 'unknown';
  return `rate:${ip}`;
}

function defaultHandler(req: Request, res: Response): void {
  res.status(429).json({
    success: false,
    error: 'Too many requests, please try again later',
    timestamp: new Date().toISOString(),
  });
}

// Stricter rate limiter for sensitive endpoints
export function createStrictRateLimiter(maxRequests: number = 10, windowMs: number = 60 * 1000) {
  return createRateLimiter({
    maxRequests,
    windowMs,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: 'Rate limit exceeded for this operation',
        timestamp: new Date().toISOString(),
      });
    },
  });
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  let cleaned = 0;

  for (const key of Object.keys(store)) {
    if (now > store[key].resetTime + 60000) {
      delete store[key];
      cleaned++;
    }
  }

  if (cleaned > 0) {
    console.log(`[RateLimiter] Cleaned up ${cleaned} expired entries`);
  }
}, 60000); // Run every minute

// Export store for testing
export function getRateLimitStore(): RateLimitStore {
  return { ...store };
}

export function clearRateLimitStore(): void {
  for (const key of Object.keys(store)) {
    delete store[key];
  }
}
