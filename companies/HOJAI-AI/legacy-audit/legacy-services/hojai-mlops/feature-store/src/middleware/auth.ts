/**
 * Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import config from '../config';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      internalToken?: string;
    }
  }
}

/**
 * Verify internal service token
 * Used for service-to-service communication
 */
export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers['x-internal-token'] as string;

  if (!token) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Missing X-Internal-Token header',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Timing-safe comparison
  const expectedToken = config.internalServiceToken;
  const tokenBuffer = Buffer.from(token);
  const expectedBuffer = Buffer.from(expectedToken);

  if (
    tokenBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
  ) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid internal service token',
      statusCode: 401,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  req.internalToken = token;
  next();
}

/**
 * Optional auth - sets internalToken if present but doesn't require it
 */
export function optionalAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const token = req.headers['x-internal-token'] as string;

  if (token) {
    const expectedToken = config.internalServiceToken;
    const tokenBuffer = Buffer.from(token);
    const expectedBuffer = Buffer.from(expectedToken);

    if (
      tokenBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
    ) {
      req.internalToken = token;
    }
  }

  next();
}
