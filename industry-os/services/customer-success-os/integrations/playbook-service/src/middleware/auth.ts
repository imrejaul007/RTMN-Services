/**
 * Customer Success Playbook Service - Authentication & Security Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { randomUUID } from 'crypto';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function getServiceTokens(): Record<string, string> {
  const tokensJson = process.env.INTERNAL_SERVICE_TOKENS_JSON;
  if (!tokensJson) return {};
  try {
    return JSON.parse(tokensJson);
  } catch {
    return {};
  }
}

const SERVICE_TOKENS = getServiceTokens();
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 100;

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://rezapp.com', 'https://www.rezapp.com', 'http://localhost:3000'];

export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health' || req.path === '/health/live' || req.path === '/health/ready' || req.path === '/metrics') {
    return next();
  }

  const token = req.headers['x-internal-token'] as string;

  if (!token) {
    logger.warn(`[AUTH] Missing token from ${req.ip} for ${req.path}`);
    res.status(401).json({ error: 'Unauthorized', message: 'Token required' });
    return;
  }

  const isValid = Object.values(SERVICE_TOKENS).some(t => timingSafeEqual(t, token));
  if (!isValid) {
    logger.warn(`[AUTH] Invalid token from ${req.ip} for ${req.path}`);
    res.status(401).json({ error: 'Unauthorized', message: 'Invalid token' });
    return;
  }

  next();
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction): void {
  const key = `ratelimit:${req.ip || 'unknown'}:${req.path}`;
  const now = Date.now();

  let record = rateLimitStore.get(key);
  if (!record || now > record.resetTime) {
    record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };
    rateLimitStore.set(key, record);
  }

  record.count++;

  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - record.count)));
  res.setHeader('X-RateLimit-Reset', String(Math.ceil(record.resetTime / 1000)));

  if (record.count > RATE_LIMIT_MAX) {
    res.status(429).json({ success: false, error: 'Too many requests', retryAfter: Math.ceil((record.resetTime - now) / 1000) });
    return;
  }

  next();
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers['x-request-id'] as string) || `playbook-${Date.now()}-${randomUUID().replace(/-/g, '').substring(0, 9)}`;
  res.setHeader('X-Request-Id', requestId);
  (req as unknown).requestId = requestId;
  next();
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const errorId = `ERR-${Date.now()}-${randomUUID().replace(/-/g, '').substring(0, 9)}`;
  logger.error(`[${errorId}] Error:`, err.message, err.stack);
  logger.error(`Error handling request`, { errorId, path: req.path, message: err.message });
  res.status(500).json({ success: false, error: 'Internal server error', errorId });
}

export { ALLOWED_ORIGINS };