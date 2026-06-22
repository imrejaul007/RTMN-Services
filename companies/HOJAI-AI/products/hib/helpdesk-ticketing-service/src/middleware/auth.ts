/**
 * Authentication middleware for AdBazaar Services
 */

import { Request, Response, NextFunction } from 'express';
import logger from 'utils/logger.js';

export interface AuthUser {
  userId: string;
  email: string;
  role: 'admin' | 'agent' | 'customer';
  teamId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Simple API key validation (production would use JWT/OAuth)
export const apiKeyAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'] as string;
  const internalToken = req.headers['x-internal-token'] as string;

  // Allow internal service-to-service calls
  if (internalToken && internalToken === process.env.INTERNAL_SERVICE_TOKEN) {
    req.user = {
      userId: 'internal-service',
      email: 'service@adbazaar.com',
      role: 'admin',
    };
    return next();
  }

  // Validate API key
  if (apiKey && apiKey === process.env.API_KEY) {
    req.user = {
      userId: 'api-user',
      email: 'api@adbazaar.com',
      role: 'agent',
    };
    return next();
  }

  // For development, allow requests without auth
  if (process.env.NODE_ENV === 'development' || process.env.SKIP_AUTH === 'true') {
    req.user = {
      userId: 'dev-user',
      email: 'dev@adbazaar.com',
      role: 'admin',
    };
    return next();
  }

  logger.warn('Unauthorized access attempt', { path: req.path, ip: req.ip });
  res.status(401).json({ success: false, error: 'Unauthorized' });
};

// Role-based access control
export const requireRole = (...roles: AuthUser['role'][]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      logger.warn('Forbidden access attempt', { user: req.user, requiredRoles: roles });
      res.status(403).json({ success: false, error: 'Forbidden' });
      return;
    }

    next();
  };
};

// Admin-only middleware
export const adminOnly = requireRole('admin');

// Agent or admin middleware
export const agentOrAdmin = requireRole('admin', 'agent');

export default { apiKeyAuth, requireRole, adminOnly, agentOrAdmin };
