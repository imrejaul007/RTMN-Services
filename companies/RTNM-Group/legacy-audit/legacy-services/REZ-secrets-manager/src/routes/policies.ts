import { Router, Response } from 'express';
import { accessControlService } from '../services';
import { authenticate, requireAdmin, asyncHandler, AuthenticatedRequest } from '../middleware';
import { CreatePolicySchema } from '../types';

const router = Router();

/**
 * POST /api/v1/policies
 * Create a new policy
 */
router.post(
  '/',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const parsed = CreatePolicySchema.safeParse(req.body);

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

    const result = await accessControlService.createPolicy(parsed.data, req.serviceId!);

    if (!result.success) {
      const statusCode = result.error?.includes('already exists') ? 409 : 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: 'POLICY_EXISTS',
          message: result.error
        },
        timestamp: new Date().toISOString()
      });
    }

    res.status(201).json({
      success: true,
      data: result.policy,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * GET /api/v1/policies
 * List all policies
 */
router.get(
  '/',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const serviceId = req.query.serviceId as string | undefined;
    const active = req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

    const { policies, total } = await accessControlService.listPolicies({
      serviceId,
      active,
      page,
      limit
    });

    res.json({
      success: true,
      data: policies,
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
 * GET /api/v1/policies/:id
 * Get a policy by ID
 */
router.get(
  '/:id',
  authenticate,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const policy = await accessControlService.getPolicy(id);

    if (!policy) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Policy not found'
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      data: policy,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * PUT /api/v1/policies/:id
 * Update a policy
 */
router.put(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const parsed = CreatePolicySchema.partial().safeParse(req.body);

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

    const result = await accessControlService.updatePolicy(
      id,
      parsed.data,
      req.serviceId!
    );

    if (!result.success) {
      const statusCode = result.error === 'Policy not found' ? 404 : 500;
      return res.status(statusCode).json({
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
      data: result.policy,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * DELETE /api/v1/policies/:id
 * Delete a policy
 */
router.delete(
  '/:id',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const result = await accessControlService.deletePolicy(id, req.serviceId!);

    if (!result.success) {
      const statusCode = result.error === 'Policy not found' ? 404 : 500;
      return res.status(statusCode).json({
        success: false,
        error: {
          code: 'DELETE_FAILED',
          message: result.error
        },
        timestamp: new Date().toISOString()
      });
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * POST /api/v1/policies/:id/activate
 * Activate a policy
 */
router.post(
  '/:id/activate',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const result = await accessControlService.updatePolicy(
      id,
      { rules: [] } as any,
      req.serviceId!
    );

    // We need to directly update isActive
    const policy = await accessControlService.getPolicy(id);
    if (policy) {
      (policy as any).isActive = true;
      await policy.save();
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString()
    });
  })
);

/**
 * POST /api/v1/policies/:id/deactivate
 * Deactivate a policy
 */
router.post(
  '/:id/deactivate',
  authenticate,
  requireAdmin,
  asyncHandler(async (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;

    const policy = await accessControlService.getPolicy(id);
    if (policy) {
      (policy as any).isActive = false;
      await policy.save();
    }

    res.json({
      success: true,
      timestamp: new Date().toISOString()
    });
  })
);

export default router;
