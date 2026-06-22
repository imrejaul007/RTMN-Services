import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface TenantContext {
  tenantId: string;
  userId?: string;
  clientType: 'REZ_ECOSYSTEM' | 'RABTUL_SAAS' | 'EXTERNAL';
}

export interface AuthenticatedRequest extends Request {
  tenant?: TenantContext;
}

export const TENANT_HEADER = 'x-tenant-id';
export const USER_HEADER = 'x-user-id';
export const CLIENT_TYPE_HEADER = 'x-client-type';

const VALID_CLIENT_TYPES = ['REZ_ECOSYSTEM', 'RABTUL_SAAS', 'EXTERNAL'] as const;

/**
 * Tenant isolation middleware
 * Extracts tenant context from request headers
 */
export const tenantMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const tenantId = req.headers[TENANT_HEADER] as string;
  const userId = req.headers[USER_HEADER] as string | undefined;
  const clientType = (req.headers[CLIENT_TYPE_HEADER] as string) || 'EXTERNAL';

  if (!tenantId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TENANT',
        message: 'Tenant ID is required in x-tenant-id header'
      }
    });
    return;
  }

  if (!VALID_CLIENT_TYPES.includes(clientType as typeof VALID_CLIENT_TYPES[number])) {
    res.status(400).json({
      success: false,
      error: {
        code: 'INVALID_CLIENT_TYPE',
        message: `Client type must be one of: ${VALID_CLIENT_TYPES.join(', ')}`
      }
    });
    return;
  }

  req.tenant = {
    tenantId,
    userId,
    clientType: clientType as TenantContext['clientType']
  };

  next();
};

/**
 * User authentication middleware (requires user ID)
 */
export const requireUser = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.tenant?.userId) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_USER',
        message: 'User ID is required in x-user-id header'
      }
    });
    return;
  }
  next();
};

/**
 * Internal service token validation
 */
export const INTERNAL_SERVICE_TOKEN_HEADER = 'x-internal-token';

export const internalServiceMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  const token = req.headers[INTERNAL_SERVICE_TOKEN_HEADER] as string;

  // In production, validate against stored service tokens
  if (!token) {
    res.status(401).json({
      success: false,
      error: {
        code: 'MISSING_TOKEN',
        message: 'Internal service token is required'
      }
    });
    return;
  }

  // Token validation would happen here in production
  // For now, accept any non-empty token
  next();
};

/**
 * Zod validation error handler
 */
export const validationErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.errors.map(e => ({
          path: e.path.join('.'),
          message: e.message
        }))
      }
    });
    return;
  }
  next(err);
};
