/**
 * SUTAR Flow OS - JWT Authentication Middleware
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'sutar-flow-os-secret-key-change-in-production';

export interface JWTPayload {
  sub: string;
  tenantId: string;
  iat: number;
  exp: number;
}

export interface AuthContext {
  userId: string;
  tenantId: string;
  roles: string[];
}

declare global {
  namespace Express {
    interface Request {
      authContext?: AuthContext;
    }
  }
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

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      req.authContext = {
        userId: decoded.sub,
        tenantId: decoded.tenantId,
        roles: []
      };
      next();
    } catch (error) {
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_TOKEN', message: 'Invalid or expired token' }
      });
    }
  };
}

export function optionalAuthMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return next();
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JWTPayload;
      req.authContext = {
        userId: decoded.sub,
        tenantId: decoded.tenantId,
        roles: []
      };
    } catch {
      // Token invalid, but auth is optional
    }
    next();
  };
}

export default authMiddleware;
