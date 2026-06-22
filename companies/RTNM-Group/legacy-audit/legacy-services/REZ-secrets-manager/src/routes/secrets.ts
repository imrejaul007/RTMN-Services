import { Router, Response } from 'express';
import { vaultService, secretRotationService, accessControlService } from '../services';
import { authenticate, asyncHandler, AuthenticatedRequest, requirePermission } from '../middleware';
import { CreateSecretSchema, UpdateSecretSchema, SecretType, SecretStatus } from '../types';

const router = Router();

/**
 * POST /api/v1/secrets
 * Create a new secret
 */
router.post(
  '/',
  authenticate,
  requirePermission('secrets:create'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = CreateSecretSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.errors
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await vaultService.createSecret(parsed.data, req.serviceId!);

    if (!result.success) {
      const statusCode = result.error?.code === 'SECRET_EXISTS' ? 409 : 500;
      return res.status(statusCode).json(result);
    }

    res.status(201).json(result);
  })
);

/**
 * GET /api/v1/secrets
 * List all secrets (metadata only)
 */
router.get(
  '/',
  authenticate,
  requirePermission('secrets:list'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const type = req.query.type as SecretType | undefined;
    const tag = req.query.tag as string | undefined;
    const status = req.query.status as SecretStatus | undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const { secrets, total } = await vaultService.listSecrets({
      type,
      tag,
      status,
      page,
      limit
    });

    res.json({
      success: true,
      data: secrets,
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
 * GET /api/v1/secrets/:name
 * Get a secret by name
 */
router.get(
  '/:name',
  authenticate,
  requirePermission('secrets:read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name } = req.params;
    const includeValue = req.query.value !== 'false';

    // Check access
    const canAccess = await accessControlService.canAccessSecret(
      req.serviceId!,
      name,
      'read' as any
    );

    if (!canAccess) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCESS_DENIED',
          message: 'You do not have access to this secret'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await vaultService.getSecret(name, req.serviceId!, includeValue);

    if (!result.success) {
      const statusCode = result.error?.code === 'SECRET_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  })
);

/**
 * PUT /api/v1/secrets/:name
 * Update a secret
 */
router.put(
  '/:name',
  authenticate,
  requirePermission('secrets:update'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name } = req.params;

    const parsed = UpdateSecretSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.errors
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await vaultService.updateSecret(name, parsed.data, req.serviceId!);

    if (!result.success) {
      const statusCode = result.error?.code === 'SECRET_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  })
);

/**
 * DELETE /api/v1/secrets/:name
 * Delete a secret
 */
router.delete(
  '/:name',
  authenticate,
  requirePermission('secrets:delete'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name } = req.params;
    const permanent = req.query.permanent === 'true';

    const result = await vaultService.deleteSecret(name, req.serviceId!, permanent);

    if (!result.success) {
      const statusCode = result.error?.code === 'SECRET_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  })
);

/**
 * POST /api/v1/secrets/:name/rotate
 * Rotate a secret
 */
router.post(
  '/:name/rotate',
  authenticate,
  requirePermission('secrets:rotate'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name } = req.params;
    const { reason } = req.body || {};

    const result = await secretRotationService.rotateSecret(name, req.serviceId!, reason);

    if (!result.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ROTATION_FAILED',
          message: result.error
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: result.result,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/v1/secrets/:name/history
 * Get secret version history
 */
router.get(
  '/:name/history',
  authenticate,
  requirePermission('secrets:read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 100);

    const result = await vaultService.getSecretHistory(name, limit);

    if (!result.success) {
      const statusCode = result.error?.code === 'SECRET_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.json(result);
  })
);

/**
 * GET /api/v1/secrets/:name/rotation-status
 * Get rotation status for a secret
 */
router.get(
  '/:name/rotation-status',
  authenticate,
  requirePermission('secrets:read'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name } = req.params;

    const status = await secretRotationService.getRotationStatus(name);

    if (!status) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Secret not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: status,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * POST /api/v1/secrets/:name/dynamic
 * Create a dynamic (temporary) secret
 */
router.post(
  '/:name/dynamic',
  authenticate,
  requirePermission('secrets:create'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { name } = req.params;
    const { ttl } = req.body || {};

    const result = await vaultService.createDynamicSecret(name, ttl);

    if (!result.success) {
      const statusCode = result.error?.code === 'SECRET_NOT_FOUND' ? 404 : 500;
      return res.status(statusCode).json(result);
    }

    res.status(201).json(result);
  })
);

/**
 * DELETE /api/v1/secrets/:name/dynamic/:leaseId
 * Revoke a dynamic secret
 */
router.delete(
  '/:name/dynamic/:leaseId',
  authenticate,
  requirePermission('secrets:delete'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { leaseId } = req.params;

    const result = await vaultService.revokeDynamicSecret(leaseId, req.serviceId!);

    if (!result.success) {
      return res.status(500).json(result);
    }

    res.json(result);
  })
);

/**
 * POST /api/v1/secrets/batch-rotate
 * Batch rotate multiple secrets
 */
router.post(
  '/batch-rotate',
  authenticate,
  requirePermission('secrets:rotate'),
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { names } = req.body || {};

    if (!Array.isArray(names) || names.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'names array is required'
        },
        timestamp: new Date().toISOString()
      });
    }

    const result = await secretRotationService.rotateBatch(names, req.serviceId!);

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });
  })
);

export default router;
