/**
 * Auth Middleware
 */
import { Request, Response, NextFunction } from 'express';

export function authenticateAny(req: Request, _res: Response, next: NextFunction): void {
  const token = req.headers['x-internal-token'] as string | undefined;
  if (!token) return next();
  // In production, validate token
  next();
}
