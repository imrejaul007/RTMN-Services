import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { logger } from '../utils/logger';

// ============================================
// CUSTOM ERROR TYPES
// ============================================

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: Array<{ field: string; message: string }>
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  constructor(resource: string) {
    super(`${resource} not found`);
    this.name = 'NotFoundError';
  }
}

// ============================================
// GENERIC VALIDATION MIDDLEWARE
// ============================================

export const validateBody = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));

        logger.warn('Request validation failed', { errors, path: req.path });

        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors
        });
        return;
      }
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));

        logger.warn('Query validation failed', { errors, path: req.path });

        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: errors
        });
        return;
      }
      next(error);
    }
  };
};

export const validateParams = (schema: ZodSchema) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = await schema.parseAsync(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }));

        logger.warn('Params validation failed', { errors, path: req.path });

        res.status(400).json({
          success: false,
          error: 'Invalid path parameters',
          details: errors
        });
        return;
      }
      next(error);
    }
  };
};

// ============================================
// AUTH VALIDATION
// ============================================

export interface AuthenticatedRequest extends Request {
  userId?: string;
  tenantId?: string;
  userRole?: string;
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      success: false,
      error: 'Authorization header required'
    });
    return;
  }

  // In production, validate the JWT token here
  // For now, extract basic info from header format: Bearer <token>
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Invalid authorization token'
    });
    return;
  }

  // TODO: Validate token and extract user info
  // const decoded = verifyToken(token);

  // For development, allow passing user info via headers
  const userId = req.headers['x-user-id'] as string;
  const tenantId = req.headers['x-tenant-id'] as string;
  const userRole = req.headers['x-user-role'] as string;

  if (userId) {
    (req as AuthenticatedRequest).userId = userId;
    (req as AuthenticatedRequest).tenantId = tenantId;
    (req as AuthenticatedRequest).userRole = userRole;
  }

  next();
};

export const requireRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.userRole) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    if (!allowedRoles.includes(authReq.userRole)) {
      res.status(403).json({
        success: false,
        error: 'Insufficient permissions'
      });
      return;
    }

    next();
  };
};

export const requireTenant = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.tenantId) {
    res.status(400).json({
      success: false,
      error: 'Tenant ID required'
    });
    return;
  }

  next();
};

// ============================================
// INPUT SANITIZATION
// ============================================

export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  // Remove any HTML tags from string inputs
  const sanitizeObject = (obj: Record<string, unknown>): Record<string, unknown> => {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        // Remove HTML tags and trim
        sanitized[key] = value.replace(/<[^>]*>/g, '').trim();
      } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        sanitized[key] = sanitizeObject(value as Record<string, unknown>);
      } else if (Array.isArray(value)) {
        sanitized[key] = value.map(item =>
          typeof item === 'string'
            ? item.replace(/<[^>]*>/g, '').trim()
            : typeof item === 'object' && item !== null
            ? sanitizeObject(item as Record<string, unknown>)
            : item
        );
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  };

  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeObject(req.body);
  }

  next();
};

// ============================================
// RATE LIMITING CUSTOMIZATION
// ============================================

export const createRateLimitKey = (req: Request): string => {
  const authReq = req as AuthenticatedRequest;
  const userId = authReq.userId || req.ip || 'unknown';
  return `${userId}:${req.path}`;
};

// ============================================
// ERROR HANDLER
// ============================================

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  if (err instanceof ValidationError) {
    res.status(400).json({
      success: false,
      error: err.message,
      details: err.errors
    });
    return;
  }

  if (err instanceof UnauthorizedError) {
    res.status(401).json({
      success: false,
      error: err.message
    });
    return;
  }

  if (err instanceof ForbiddenError) {
    res.status(403).json({
      success: false,
      error: err.message
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      error: err.message
    });
    return;
  }

  // Handle Mongoose validation errors
  if (err.name === 'ValidationError') {
    res.status(400).json({
      success: false,
      error: 'Validation error',
      details: err.message
    });
    return;
  }

  // Handle Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: 'Invalid ID format'
    });
    return;
  }

  // Default error response
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
};

// ============================================
// REQUEST LOGGING
// ============================================

export const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const authReq = req as AuthenticatedRequest;

    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userId: authReq.userId,
      tenantId: authReq.tenantId
    });
  });

  next();
};
