/**
 * Security Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function getServiceTokens(): Record<string, string> {
  const tokensJson = process.env.INTERNAL_SERVICE_TOKENS_JSON;
  if (!tokensJson) return {};
  try { return JSON.parse(tokensJson); } catch { return {}; }
}

const SERVICE_TOKENS = getServiceTokens();
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function auth(req: Request, res: Response, next: NextFunction): void {
  if (req.path === '/health') return next();
  const token = req.headers['x-internal-token'] as string;
  if (!token) { res.status(401).json({ error: 'Unauthorized', message: 'Token required' }); return; }
  const isValid = Object.values(SERVICE_TOKENS).some(t => timingSafeEqual(t, token));
  if (!isValid) { res.status(401).json({ error: 'Unauthorized' }); return; }
  next();
}

export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const key = `${req.ip}:${req.path}`;
  const now = Date.now();
  let record = rateLimitStore.get(key);
  if (!record || now > record.resetTime) { record = { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS }; rateLimitStore.set(key, record); }
  record.count++;
  res.setHeader('X-RateLimit-Limit', String(RATE_LIMIT_MAX));
  res.setHeader('X-RateLimit-Remaining', String(Math.max(0, RATE_LIMIT_MAX - record.count)));
  if (record.count > RATE_LIMIT_MAX) { res.status(429).json({ error: 'Too many requests' }); return; }
  next();
}

export function requestId(req: Request, res: Response, next: NextFunction): void {
  // FIX: Use crypto.randomUUID() instead of Math.random() for request ID generation
  // Math.random() is predictable and could allow request ID enumeration
  const requestId = (req.headers['x-request-id'] as string) || `economic-${Date.now()}-${randomUUID().replace(/-/g, '').substring(0, 9)}`;
  res.setHeader('X-Request-Id', requestId);
  (req as unknown).requestId = requestId;
  next();
}

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  // FIX: Use crypto.randomUUID() instead of Math.random() for error ID generation
  // Math.random() is predictable and could allow error ID enumeration
  const errorId = `ERR-${Date.now()}-${randomUUID().replace(/-/g, '').substring(0, 9)}`;
  logger.error(`[${errorId}] Error:`, err.message);
  res.status(500).json({ success: false, error: 'Internal server error', errorId });
}
