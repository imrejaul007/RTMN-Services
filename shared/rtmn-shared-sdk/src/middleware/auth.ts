/**
 * RTMN Shared SDK - Authentication & Authorization Middleware
 *
 * This module provides centralized authentication and authorization
 * for all RTMN services.
 *
 * @company RTMN
 * @version 1.0.0
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';

// ============================================
// Types & Interfaces
// ============================================

export interface RTMNUser {
  id: string;
  tenantId: string;
  email: string;
  roles: string[];
  permissions: string[];
  businessId?: string;
  industry?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: RTMNUser;
  requestId?: string;
  tenantId?: string;
}

export interface AuthConfig {
  jwtSecret: string;
  issuer?: string;
  audience?: string;
  expiresIn?: string;
  skipPaths?: string[];
}

// ============================================
// Validation Schemas
// ============================================

export const tokenPayloadSchema = z.object({
  id: z.string(),
  tenantId: z.string(),
  email: z.string().email(),
  roles: z.array(z.string()).default([]),
  permissions: z.array(z.string()).default([]),
  businessId: z.string().optional(),
  industry: z.string().optional(),
  iat: z.number().optional(),
  exp: z.number().optional(),
});

// ============================================
// Authentication Middleware
// ============================================

export class AuthMiddleware {
  private config: AuthConfig;
  private skipPaths: RegExp[];

  constructor(config: AuthConfig) {
    this.config = config;
    this.skipPaths = (config.skipPaths || []).map(p => new RegExp(p));
  }

  /**
   * Authenticate requests using JWT tokens
   */
  authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
      // Skip authentication for certain paths
      if (this.shouldSkip(req.path)) {
        return next();
      }

      // Extract token from header
      const token = this.extractToken(req);

      if (!token) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      try {
        // Verify token
        const payload = jwt.verify(token, this.config.jwtSecret, {
          issuer: this.config.issuer,
          audience: this.config.audience,
        });

        // Validate payload structure
        const validated = tokenPayloadSchema.parse(payload);

        // Attach user to request
        req.user = {
          id: validated.id,
          tenantId: validated.tenantId,
          email: validated.email,
          roles: validated.roles,
          permissions: validated.permissions,
          businessId: validated.businessId,
          industry: validated.industry,
        };

        req.tenantId = validated.tenantId;

        next();
      } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
          res.status(401).json({
            success: false,
            error: 'Token expired',
            code: 'TOKEN_EXPIRED',
          });
          return;
        }

        if (error instanceof jwt.JsonWebTokenError) {
          res.status(401).json({
            success: false,
            error: 'Invalid token',
            code: 'INVALID_TOKEN',
          });
          return;
        }

        if (error instanceof z.ZodError) {
          res.status(401).json({
            success: false,
            error: 'Invalid token payload',
            code: 'INVALID_PAYLOAD',
          });
          return;
        }

        res.status(500).json({
          success: false,
          error: 'Authentication failed',
          code: 'AUTH_ERROR',
        });
      }
    };
  }

  /**
   * Authorize based on roles
   */
  authorize(...requiredRoles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const hasRole = requiredRoles.some(role => req.user!.roles.includes(role));

      if (!hasRole && !req.user.roles.includes('admin')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'FORBIDDEN',
          required: requiredRoles,
        });
        return;
      }

      next();
    };
  }

  /**
   * Authorize based on permissions
   */
  authorizePermissions(...requiredPermissions: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const hasPermission = requiredPermissions.some(
        perm => req.user!.permissions.includes(perm) || req.user!.permissions.includes('*')
      );

      if (!hasPermission && !req.user.roles.includes('admin')) {
        res.status(403).json({
          success: false,
          error: 'Insufficient permissions',
          code: 'PERMISSION_DENIED',
          required: requiredPermissions,
        });
        return;
      }

      next();
    };
  }

  /**
   * Verify tenant ownership of a resource
   */
  verifyTenant() {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
      if (!req.user) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
          code: 'AUTH_REQUIRED',
        });
        return;
      }

      const resourceTenantId = req.headers['x-tenant-id'] as string;

      if (resourceTenantId && resourceTenantId !== req.user.tenantId) {
        res.status(403).json({
          success: false,
          error: 'Access denied to this tenant',
          code: 'TENANT_MISMATCH',
        });
        return;
      }

      next();
    };
  }

  private extractToken(req: Request): string | null {
    // Try Authorization header first
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try X-API-Key header
    const apiKey = req.headers['x-api-key'];
    if (apiKey) {
      return apiKey as string;
    }

    // Try internal service token
    const internalToken = req.headers['x-internal-token'];
    if (internalToken && internalToken === process.env.INTERNAL_SERVICE_TOKEN) {
      return internalToken as string;
    }

    return null;
  }

  private shouldSkip(path: string): boolean {
    return this.skipPaths.some(regex => regex.test(path));
  }
}

// ============================================
// Token Generation
// ============================================

export class TokenService {
  private config: AuthConfig;

  constructor(config: AuthConfig) {
    this.config = config;
  }

  /**
   * Generate a JWT token for a user
   */
  generateToken(user: Omit<RTMNUser, 'iat' | 'exp'>): string {
    return jwt.sign(
      {
        id: user.id,
        tenantId: user.tenantId,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
        businessId: user.businessId,
        industry: user.industry,
      },
      this.config.jwtSecret,
      {
        issuer: this.config.issuer,
        audience: this.config.audience,
        expiresIn: this.config.expiresIn || '24h',
      }
    );
  }

  /**
   * Generate a refresh token
   */
  generateRefreshToken(user: Omit<RTMNUser, 'iat' | 'exp'>): string {
    return jwt.sign(
      {
        id: user.id,
        type: 'refresh',
      },
      this.config.jwtSecret,
      {
        issuer: this.config.issuer,
        expiresIn: '7d',
      }
    );
  }

  /**
   * Verify a refresh token
   */
  verifyRefreshToken(token: string): { id: string } | null {
    try {
      const payload = jwt.verify(token, this.config.jwtSecret, {
        issuer: this.config.issuer,
      }) as { id: string; type: string };

      if (payload.type !== 'refresh') {
        return null;
      }

      return { id: payload.id };
    } catch {
      return null;
    }
  }
}

// ============================================
// Default Configuration
// ============================================

export function createAuthMiddleware(options?: Partial<AuthConfig>) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return new AuthMiddleware({
    jwtSecret: jwtSecret || 'dev-secret-do-not-use-in-production',
    issuer: process.env.JWT_ISSUER || 'rtmn-services',
    audience: process.env.JWT_AUDIENCE || 'rtmn-api',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
    skipPaths: [
      '/health',
      '/health/detailed',
      '/ready',
      '/api/v1/auth/login',
      '/api/v1/auth/register',
      '/api/v1/auth/verify',
      '/api/v1/auth/forgot-password',
    ],
    ...options,
  });
}

export function createTokenService(options?: Partial<AuthConfig>) {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret && process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  return new TokenService({
    jwtSecret: jwtSecret || 'dev-secret-do-not-use-in-production',
    issuer: process.env.JWT_ISSUER || 'rtmn-services',
    audience: process.env.JWT_AUDIENCE || 'rtmn-api',
    ...options,
  });
}

// ============================================
// HIPAA Audit Logger
// ============================================

export interface AuditEvent {
  timestamp: Date;
  userId: string;
  tenantId: string;
  action: 'view' | 'create' | 'update' | 'delete' | 'access';
  resourceType: string;
  resourceId: string;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

export class HIPAAAuditLogger {
  private sensitiveFields = [
    'name', 'email', 'phone', 'ssn', 'dob', 'birthdate',
    'address', 'city', 'state', 'zip', 'pin', 'password',
    'credit_card', 'card_number', 'cvv', 'account_number',
    'medical_record', 'diagnosis', 'prescription', 'treatment',
  ];

  log(event: AuditEvent): void {
    // Sanitize metadata to remove PHI
    const safeEvent = {
      ...event,
      timestamp: event.timestamp.toISOString(),
      metadata: this.sanitizeMetadata(event.metadata),
    };

    // Log to console/file
    console.log(JSON.stringify({
      type: 'AUDIT',
      ...safeEvent,
    }));
  }

  logPHIAccess(
    userId: string,
    tenantId: string,
    resourceType: string,
    resourceId: string,
    req: Request,
    action: 'view' | 'create' | 'update' | 'delete' = 'view'
  ): void {
    this.log({
      timestamp: new Date(),
      userId,
      tenantId,
      action,
      resourceType,
      resourceId,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      success: true,
    });
  }

  private sanitizeMetadata(metadata?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!metadata) return undefined;

    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(metadata)) {
      const keyLower = key.toLowerCase();

      // Check if this is a sensitive field
      if (this.sensitiveFields.some(f => keyLower.includes(f))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeMetadata(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }
}
