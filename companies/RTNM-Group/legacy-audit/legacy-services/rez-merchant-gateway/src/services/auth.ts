/**
 * Gateway Authentication Middleware
 *
 * Validates merchant JWT tokens and attaches merchant context to requests.
 * Supports:
 * - JWT verification via RABTUL Auth
 * - Merchant-specific tokens
 * - Service-to-service authentication
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { MerchantGateway } from './gateway.js';
import { logger } from './logger.js';

interface MerchantPayload {
  merchantId: string;
  merchantUserId: string;
  role: string;
  permissions?: string[];
}

interface AuthenticatedRequest extends Request {
  merchant?: MerchantPayload;
  internalService?: string;
}

export class GatewayAuthMiddleware {
  private gateway: MerchantGateway;
  private jwtSecret: string;
  private merchantSecret: string;

  constructor(gateway: MerchantGateway) {
    this.gateway = gateway;
    this.jwtSecret = process.env.JWT_SECRET || '';
    this.merchantSecret = process.env.JWT_MERCHANT_SECRET || '';
  }

  /**
   * Create auth middleware
   */
  authenticate() {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      try {
        // Check for internal service token first
        const internalToken = req.headers['x-internal-token'] as string;
        if (internalToken && internalToken === process.env.INTERNAL_SERVICE_TOKEN) {
          req.internalService = 'internal';
          return next();
        }

        // Check for service-specific token
        const serviceToken = req.headers['x-service-token'] as string;
        if (serviceToken) {
          const valid = await this.validateServiceToken(serviceToken);
          if (valid) {
            req.internalService = valid;
            return next();
          }
        }

        // Check for merchant JWT
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
          return res.status(401).json({
            success: false,
            error: 'Missing authorization token',
            code: 'AUTH_REQUIRED'
          });
        }

        const token = authHeader.substring(7);

        // Verify token
        const payload = await this.verifyToken(token);
        if (!payload) {
          return res.status(401).json({
            success: false,
            error: 'Invalid or expired token',
            code: 'INVALID_TOKEN'
          });
        }

        req.merchant = payload;
        next();
      } catch (error: any) {
        logger.error('Auth error', { error: error.message });
        return res.status(401).json({
          success: false,
          error: 'Authentication failed',
          code: 'AUTH_FAILED'
        });
      }
    };
  }

  /**
   * Verify JWT token
   */
  private async verifyToken(token: string): Promise<MerchantPayload | null> {
    try {
      // Try merchant secret first
      let payload = jwt.verify(token, this.merchantSecret) as any;

      if (payload?.merchantId) {
        return {
          merchantId: payload.merchantId,
          merchantUserId: payload.userId || payload.merchantUserId || '',
          role: payload.role || 'merchant',
          permissions: payload.permissions || []
        };
      }

      // Try main JWT secret
      payload = jwt.verify(token, this.jwtSecret) as any;

      if (payload?.merchantId || payload?.merchant) {
        return {
          merchantId: payload.merchantId || payload.merchant,
          merchantUserId: payload.userId || '',
          role: payload.role || 'merchant',
          permissions: payload.permissions || []
        };
      }

      return null;
    } catch (error) {
      logger.warn('Token verification failed', { error });
      return null;
    }
  }

  /**
   * Validate service-to-service token
   */
  private async validateServiceToken(token: string): Promise<string | null> {
    const serviceTokens = JSON.parse(process.env.INTERNAL_SERVICE_TOKENS_JSON || '{}');

    for (const [service, serviceToken] of Object.entries(serviceTokens)) {
      if (token === serviceToken) {
        return service;
      }
    }

    return null;
  }

  /**
   * Require specific permission
   */
  requirePermission(permission: string) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.merchant) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (req.merchant.role === 'admin' || req.merchant.role === 'super_admin') {
        return next();
      }

      if (!req.merchant.permissions?.includes(permission)) {
        return res.status(403).json({
          success: false,
          error: 'Permission denied',
          code: 'PERMISSION_DENIED',
          required: permission
        });
      }

      next();
    };
  }

  /**
   * Require specific role
   */
  requireRole(...roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.merchant) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (req.merchant.role === 'super_admin') {
        return next();
      }

      if (!roles.includes(req.merchant.role)) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient role',
          code: 'ROLE_REQUIRED',
          required: roles
        });
      }

      next();
    };
  }
}
