import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger.js';

export interface AuthContext {
  userId?: string;
  tenantId: string;
  isAuthenticated: boolean;
  roles?: string[];
}

export interface AuthenticatedRequest extends Request {
  auth?: AuthContext;
}

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

export function authMiddleware() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      req.auth = {
        tenantId: req.headers['x-tenant-id'] as string || 'default',
        isAuthenticated: false
      };
      next();
      return;
    }

    const token = authHeader.startsWith('Bearer ')
      ? authHeader.substring(7)
      : authHeader;

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as {
        userId: string;
        tenantId?: string;
        roles?: string[];
      };

      req.auth = {
        userId: decoded.userId,
        tenantId: decoded.tenantId || req.headers['x-tenant-id'] as string || 'default',
        isAuthenticated: true,
        roles: decoded.roles
      };
    } catch (error) {
      if (req.path !== '/graphql' || !req.body?.query?.includes('IntrospectionQuery')) {
        logger.warn('auth_middleware_invalid_token', {
          error: error instanceof Error ? error.message : 'Unknown error',
          path: req.path
        });
      }
      req.auth = {
        tenantId: req.headers['x-tenant-id'] as string || 'default',
        isAuthenticated: false
      };
    }

    next();
  };
}

export function requireAuth() {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth?.isAuthenticated) {
      res.status(401).json({
        errors: [{
          message: 'Authentication required',
          extensions: { code: 'UNAUTHENTICATED' }
        }]
      });
      return;
    }
    next();
  };
}

export function requireRole(...roles: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.auth?.isAuthenticated) {
      res.status(401).json({
        errors: [{
          message: 'Authentication required',
          extensions: { code: 'UNAUTHENTICATED' }
        }]
      });
      return;
    }

    const userRoles = req.auth.roles || [];
    const hasRole = roles.some(role => userRoles.includes(role));

    if (!hasRole) {
      res.status(403).json({
        errors: [{
          message: 'Insufficient permissions',
          extensions: { code: 'FORBIDDEN' }
        }]
      });
      return;
    }

    next();
  };
}

// GraphQL context creator for auth
export function createGraphQLContext(auth: AuthContext | undefined) {
  return {
    userId: auth?.userId,
    tenantId: auth?.tenantId || 'default',
    isAuthenticated: auth?.isAuthenticated || false,
    roles: auth?.roles || []
  };
}
