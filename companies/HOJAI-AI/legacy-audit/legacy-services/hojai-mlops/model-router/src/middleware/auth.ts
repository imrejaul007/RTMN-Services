/**
 * Hojai Model Router - Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './error';

// Extend Express Request to include tenant info
export interface AuthenticatedRequest extends Request {
  tenantId?: string;
  userId?: string;
  serviceKey?: string;
}

// Parse environment variables with explicit access
const INTERNAL_SERVICE_TOKENS_JSON = process.env['INTERNAL_SERVICE_TOKENS_JSON'];
const INTERNAL_SERVICE_TOKENS = INTERNAL_SERVICE_TOKENS_JSON
  ? JSON.parse(INTERNAL_SERVICE_TOKENS_JSON) as Record<string, string>
  : {};

const INTERNAL_TOKEN = process.env['INTERNAL_SERVICE_TOKEN'] || '';
const API_KEY = process.env['API_KEY'] || '';
const NODE_ENV = process.env['NODE_ENV'] || 'development';

/**
 * Simple API key auth for internal services
 */
export function authMiddleware(
  req: AuthenticatedRequest,
  _res: Response,
  next: NextFunction
): void {
  // Check for internal service token
  const internalToken = req.headers['x-internal-token'] as string | undefined;
  const apiKey = req.headers['x-api-key'] as string | undefined;

  // Allow if internal token matches
  if (internalToken && INTERNAL_TOKEN && internalToken === INTERNAL_TOKEN) {
    return next();
  }

  // Check service tokens
  if (internalToken && INTERNAL_SERVICE_TOKENS) {
    const isValidServiceToken = Object.values(INTERNAL_SERVICE_TOKENS).includes(internalToken);
    if (isValidServiceToken) {
      return next();
    }
  }

  // Check API key
  if (apiKey && apiKey === API_KEY) {
    return next();
  }

  // For development, allow no auth
  if (NODE_ENV === 'development' && !internalToken && !apiKey) {
    return next();
  }

  next(new AppError('Unauthorized: Invalid or missing authentication', 401));
}
