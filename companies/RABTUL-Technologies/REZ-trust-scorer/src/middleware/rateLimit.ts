// ============================================================================
// RABTUL Trust Scorer - Rate Limiting Middleware
// ============================================================================

import { Request, Response, NextFunction } from 'express';

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) rateLimitStore.delete(key);
  }
}, 60000);

export function rateLimit(options: { windowMs?: number; max?: number } = {}): (req: Request, res: Response, next: NextFunction) => void {
  const windowMs = options.windowMs || 60000;
  const max = options.max || 100;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    let record = rateLimitStore.get(key);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
      rateLimitStore.set(key, record);
    }

    record.count++;

    res.setHeader('X-RateLimit-Limit', max.toString());
    res.setHeader('X-RateLimit-Remaining', Math.max(0, max - record.count).toString());
    res.setHeader('X-RateLimit-Reset', new Date(record.resetTime).toISOString());

    if (record.count > max) {
      res.status(429).json({ success: false, error: 'Too many requests', code: 'RATE_LIMITED', retryAfter: Math.ceil((record.resetTime - now) / 1000) });
      return;
    }

    next();
  };
}
