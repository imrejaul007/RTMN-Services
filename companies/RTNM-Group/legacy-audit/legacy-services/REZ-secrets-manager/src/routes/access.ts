import { Router, Response } from 'express';
import { accessControlService } from '../services';
import { authenticate, requireAdmin, asyncHandler, AuthenticatedRequest } from '../middleware';
import { AuditLog } from '../models';

const router = Router();

/**
 * GET /api/v1/access/:serviceId
 * Check access for a service
 */
router.get(
  '/:serviceId',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { serviceId } = req.params;

    const service = await accessControlService.getService(serviceId);

    if (!service) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Service not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    const effectivePermissions = await accessControlService.getEffectivePermissions(serviceId);

    res.json({
      success: true,
      data: {
        serviceId: service.serviceId,
        serviceName: service.serviceName,
        isActive: service.isActive,
        permissions: effectivePermissions,
        lastAccessedAt: service.lastAccessedAt,
        createdAt: service.createdAt
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * POST /api/v1/access/check
 * Evaluate access for a resource
 */
router.post(
  '/check',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { resource, action, serviceId } = req.body;

    if (!resource || !action) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'resource and action are required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const decision = await accessControlService.evaluateAccess({
      serviceId: serviceId || req.serviceId!,
      resource,
      action
    });

    res.json({
      success: true,
      data: decision,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * POST /api/v1/access/services
 * Register a new service
 */
router.post(
  '/services',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { serviceName, permissions, metadata } = req.body;

    if (!serviceName) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'serviceName is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await accessControlService.registerService(
      serviceName,
      permissions || [],
      metadata || {}
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: result.error
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data: {
        serviceId: result.service?.serviceId,
        serviceName: result.service?.serviceName,
        apiKey: result.apiKey, // Only returned once!
        permissions: result.service?.permissions,
        message: 'Store this API key securely. It will not be shown again.'
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/v1/access/services
 * List all registered services
 */
router.get(
  '/services/list',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { ServiceIdentity } = require('../models');

    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const skip = (page - 1) * limit;

    const [services, total] = await Promise.all([
      ServiceIdentity.find()
        .select('-apiKeyHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ServiceIdentity.countDocuments()
    ]);

    res.json({
      success: true,
      data: services,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * PUT /api/v1/access/services/:serviceId/permissions
 * Update service permissions
 */
router.put(
  '/services/:serviceId/permissions',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { serviceId } = req.params;
    const { permissions } = req.body;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'permissions must be an array'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await accessControlService.updateServicePermissions(serviceId, permissions);

    if (!result.success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'UPDATE_FAILED',
          message: result.error
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Permissions updated',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * POST /api/v1/access/services/:serviceId/deactivate
 * Deactivate a service
 */
router.post(
  '/services/:serviceId/deactivate',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { serviceId } = req.params;

    const success = await accessControlService.deactivateService(serviceId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Service not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Service deactivated',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * POST /api/v1/access/services/:serviceId/activate
 * Reactivate a service
 */
router.post(
  '/services/:serviceId/activate',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { serviceId } = req.params;

    const success = await accessControlService.activateService(serviceId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Service not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'Service activated',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * POST /api/v1/access/grant
 * Grant temporary access to a secret
 */
router.post(
  '/grant',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { serviceId, secretName, ttl, reason } = req.body;

    if (!secretName || !serviceId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'secretName and serviceId are required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await accessControlService.grantTemporaryAccess(
      serviceId,
      secretName,
      ttl || 3600,
      reason || 'Temporary access granted'
    );

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'GRANT_FAILED',
          message: result.error
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        expiresAt: result.expiresAt
      },
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * DELETE /api/v1/access/revoke
 * Revoke all access for a service
 */
router.delete(
  '/revoke/:serviceId',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { serviceId } = req.params;

    const result = await accessControlService.revokeAllAccess(serviceId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: {
          code: 'REVOKE_FAILED',
          message: result.error
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      message: 'All access revoked for service',
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/v1/access/audit
 * Get audit logs
 */
router.get(
  '/audit',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const secretName = req.query.secretName as string | undefined;
    const serviceId = req.query.serviceId as string | undefined;
    const eventType = req.query.eventType as string | undefined;
    const limit = Math.min(parseInt(req.query.limit as string) || 100, 1000);

    let logs;
    if (secretName) {
      logs = await AuditLog.findBySecret(secretName, limit);
    } else if (serviceId) {
      logs = await AuditLog.findByService(serviceId, limit);
    } else if (eventType) {
      logs = await AuditLog.findByEventType(eventType as any);
    } else {
      logs = await AuditLog.find()
        .sort({ timestamp: -1 })
        .limit(limit);
    }

    res.json({
      success: true,
      data: logs,
      timestamp: new Date().toISOString()
    });
  })
);

export default router;
