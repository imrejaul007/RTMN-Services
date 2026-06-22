/**
 * HOJAI FounderOS - JWT Auth Middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'development-secret';

export interface JWTPayload {
  sub: string;
  tenantId: string;
  email?: string;
  name?: string;
  roles?: string[];
  iat?: number;
  exp?: number;
}

export function authMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        success: false,
        error: { code: 'MISSING_AUTH', message: 'Authorization header required' }
      });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_AUTH_FORMAT', message: 'Authorization header must be Bearer token' }
      });
    }

    const token = parts[1];

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;

      if (req.tenantContext) {
        req.tenantContext.userId = decoded.sub;
      }

      next();
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        return res.status(401).json({
          success: false,
          error: { code: 'TOKEN_EXPIRED', message: 'Token has expired' }
        });
      }
      if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
          success: false,
          error: { code: 'INVALID_TOKEN', message: 'Invalid token' }
        });
      }
      return res.status(401).json({
        success: false,
        error: { code: 'AUTH_ERROR', message: 'Authentication failed' }
      });
    }
  };
}

export default authMiddleware;
