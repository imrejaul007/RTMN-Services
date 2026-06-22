import { Request, Response, NextFunction } from 'express';
import { authService } from '../../services/auth/authService.js';
import { rbacService } from '../../services/rbac/rbacService.js';
import { auditLogger, AuditLogParams } from '../../services/audit/auditLogger.js';
import { Permission, AuditAction, OrgRole, TenantType } from '../../types/index.js';
import { TenantModel } from '../../services/tenant/tenantManager.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      tenantType?: TenantType;
      userId?: string;
      userEmail?: string;
      userRole?: OrgRole;
      permissions?: Permission[];
      apiKeyId?: string;
      isPrivileged?: boolean;
      requestId?: string;
    }
  }
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

/**
 * Extract and verify JWT token from Authorization header
 */
export const authenticateJWT = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({
        success: false,
        error: 'Missing or invalid authorization header'
      });
      return;
    }

    const token = authHeader.substring(7);

    try {
      const payload = authService.verifyAccessToken(token);

      // Attach user info to request
      req.userId = payload.sub;
      req.tenantId = payload.tenantId;
      req.userEmail = payload.email;
      req.requestId = req.headers['x-request-id'] as string;

      // Check if tenant is privileged (REZ ecosystem)
      const tenant = await TenantModel.findById(payload.tenantId);
      req.isPrivileged = tenant?.type === TenantType.REZ_ECOSYSTEM;

      next();
    } catch (error) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
      return;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate using API key
 */
export const authenticateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      res.status(401).json({
        success: false,
        error: 'Missing API key'
      });
      return;
    }

    // API key format: hojai_<key>
    if (!apiKey.startsWith('hojai_')) {
      res.status(401).json({
        success: false,
        error: 'Invalid API key format'
      });
      return;
    }

    // Extract tenant ID from header or query
    const tenantId = (req.headers['x-tenant-id'] as string) || req.query.tenantId as string;

    if (!tenantId) {
      res.status(400).json({
        success: false,
        error: 'Tenant ID required with API key'
      });
      return;
    }

    const verifiedKey = await authService.verifyApiKey(tenantId, apiKey);

    if (!verifiedKey) {
      res.status(401).json({
        success: false,
        error: 'Invalid or expired API key'
      });
      return;
    }

    // Check IP restrictions
    if (verifiedKey.allowedIPs && verifiedKey.allowedIPs.length > 0) {
      const clientIP = getClientIP(req);
      if (!verifiedKey.allowedIPs.includes(clientIP)) {
        await logAuthFailure(req, 'IP not allowed');
        res.status(403).json({
          success: false,
          error: 'IP address not allowed for this API key'
        });
        return;
      }
    }

    // Attach info to request
    req.tenantId = tenantId;
    req.apiKeyId = verifiedKey.id;
    req.permissions = verifiedKey.permissions as Permission[];
    req.requestId = req.headers['x-request-id'] as string;

    // Check if tenant is privileged
    const tenant = await TenantModel.findById(tenantId);
    req.isPrivileged = tenant?.type === TenantType.REZ_ECOSYSTEM;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Authenticate using internal service token
 */
export const authenticateInternal = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const internalToken = req.headers['x-internal-token'] as string;

    if (!internalToken) {
      res.status(401).json({
        success: false,
        error: 'Missing internal token'
      });
      return;
    }

    // Verify against environment variable
    const validToken = process.env.INTERNAL_SERVICE_TOKEN;

    if (!validToken || internalToken !== validToken) {
      res.status(401).json({
        success: false,
        error: 'Invalid internal token'
      });
      return;
    }

    // Mark as internal/privileged
    req.isPrivileged = true;
    req.requestId = req.headers['x-request-id'] as string;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Combined authentication - tries JWT, then API key, then internal
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const apiKey = req.headers['x-api-key'];
  const internalToken = req.headers['x-internal-token'];

  if (internalToken) {
    return authenticateInternal(req, res, next);
  }

  if (apiKey) {
    return authenticateApiKey(req, res, next);
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authenticateJWT(req, res, next);
  }

  res.status(401).json({
    success: false,
    error: 'Authentication required'
  });
};

// ============================================================================
// RBAC MIDDLEWARE
// ============================================================================

/**
 * Check if user has required permission(s)
 */
export const requirePermission = (...requiredPermissions: Permission[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.tenantId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required'
        });
        return;
      }

      // Internal tokens have all permissions
      if (req.isPrivileged && !req.userId) {
        next();
        return;
      }

      // API keys have explicit permissions
      if (req.apiKeyId && req.permissions) {
        const hasPermission = requiredPermissions.some(p => req.permissions!.includes(p));
        if (!hasPermission) {
          res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          });
          return;
        }
        next();
        return;
      }

      // User authentication - check role-based permissions
      if (req.userId && req.userRole) {
        const hasPermission = await rbacService.hasAnyPermission(
          req.tenantId,
          req.userRole,
          requiredPermissions
        );

        if (!hasPermission) {
          // Log policy violation
          await auditLogger.log({
            tenantId: req.tenantId,
            userId: req.userId,
            action: AuditAction.POLICY_VIOLATED,
            resource: 'permission',
            details: {
              required: requiredPermissions,
              userRole: req.userRole
            },
            requestId: req.requestId,
            ip: getClientIP(req),
            userAgent: req.headers['user-agent'],
            success: false,
            error: 'Insufficient permissions'
          });

          res.status(403).json({
            success: false,
            error: 'Insufficient permissions'
          });
          return;
        }

        // Check time restrictions
        const withinAllowedTime = await rbacService.checkTimeRestriction(
          req.tenantId,
          req.userRole
        );

        if (!withinAllowedTime) {
          res.status(403).json({
            success: false,
            error: 'Access not allowed at this time'
          });
          return;
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Require specific role(s)
 */
export const requireRole = (...allowedRoles: OrgRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.userRole) {
      res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
      return;
    }

    // Owner has access to everything
    if (req.userRole === OrgRole.OWNER || allowedRoles.includes(req.userRole)) {
      next();
      return;
    }

    res.status(403).json({
      success: false,
      error: 'Insufficient role privileges'
    });
  };
};

// ============================================================================
// TENANT MIDDLEWARE
// ============================================================================

/**
 * Verify tenant is active
 */
export const requireActiveTenant = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.tenantId) {
      res.status(401).json({
        success: false,
        error: 'Tenant ID required'
      });
      return;
    }

    const tenant = await TenantModel.findById(req.tenantId);

    if (!tenant) {
      res.status(404).json({
        success: false,
        error: 'Tenant not found'
      });
      return;
    }

    if (tenant.status !== 'active') {
      res.status(403).json({
        success: false,
        error: `Tenant is ${tenant.status}`
      });
      return;
    }

    req.tenantType = tenant.type as TenantType;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require specific tenant type
 */
export const requireTenantType = (...allowedTypes: TenantType[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.tenantType) {
      res.status(401).json({
        success: false,
        error: 'Tenant type not determined'
      });
      return;
    }

    if (!allowedTypes.includes(req.tenantType)) {
      res.status(403).json({
        success: false,
        error: 'Tenant type not allowed for this operation'
      });
      return;
    }

    next();
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getClientIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    'unknown'
  );
}

async function logAuthFailure(req: Request, reason: string): Promise<void> {
  await auditLogger.log({
    tenantId: req.tenantId || 'unknown',
    action: AuditAction.AUTH_LOGIN_FAILED,
    resource: 'api_key',
    details: { reason },
    requestId: req.requestId,
    ip: getClientIP(req),
    userAgent: req.headers['user-agent'],
    success: false,
    error: reason
  });
}
