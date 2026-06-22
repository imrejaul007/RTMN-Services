/**
 * HOJAI Commerce Intelligence - Behavior Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { behaviorService } from '../services/behaviorService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();

// Apply tenant middleware to all routes
router.use(tenantMiddleware());

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const UpdateBehaviorSchema = z.object({
  sessionDuration: z.number().optional(),
  pagesViewed: z.number().optional(),
  productViewed: z.string().optional(),
  productPurchased: z.string().optional(),
  orderValue: z.number().optional(),
  cartAbandoned: z.boolean().optional(),
  wishlistAdded: z.string().optional()
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/behavior/:userId
 * Get user behavior profile
 */
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId } = req.params;

    const behavior = await behaviorService.getOrCreateBehavior(tenantId, userId);

    res.json(createResponse({
      userId: behavior.userId,
      segment: behavior.segment,
      rfmTier: behavior.rfmTier,
      totalOrders: behavior.totalOrders,
      totalSpent: behavior.totalSpent,
      avgOrderValue: behavior.avgOrderValue,
      churnRisk: behavior.predictedChurnRisk,
      predictedLTV: behavior.predictedLTV,
      lastActiveAt: behavior.lastActiveAt,
      lastOrderDate: behavior.lastOrderDate,
      productsViewed: behavior.productsViewed.length,
      productsPurchased: behavior.productsPurchased.length,
      cartAbandons: behavior.cartAbandons,
      recencyScore: behavior.recencyScore,
      frequencyScore: behavior.frequencyScore,
      monetaryScore: behavior.monetaryScore
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/behavior/:userId/segment
 * Get user segment with recommendations
 */
router.get('/:userId/segment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId } = req.params;

    const segment = await behaviorService.getUserSegment(tenantId, userId);

    if (!segment) {
      return res.status(404).json(createErrorResponse('USER_NOT_FOUND', 'User not found'));
    }

    res.json(createResponse(segment, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/behavior/:userId
 * Update user behavior from event
 */
router.post('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId } = req.params;

    // Validate input
    const validationResult = UpdateBehaviorSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        { errors: validationResult.error.issues }
      ));
    }

    const behavior = await behaviorService.updateBehavior({
      tenantId,
      userId,
      ...validationResult.data
    });

    res.json(createResponse({
      userId: behavior.userId,
      segment: behavior.segment,
      rfmTier: behavior.rfmTier,
      updated: true
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/behavior/segments/:segment
 * Get users by segment
 */
router.get('/segments/:segment', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { segment } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;

    const validSegments = ['new', 'active', 'inactive', 'at_risk', 'churned', 'vip', 'whale', 'dormant'];
    if (!validSegments.includes(segment)) {
      return res.status(400).json(createErrorResponse(
        'INVALID_SEGMENT',
        `Invalid segment. Must be one of: ${validSegments.join(', ')}`
      ));
    }

    const users = await behaviorService.getUsersBySegment(tenantId, segment as any, limit);

    res.json(createResponse({
      segment,
      count: users.length,
      users: users.map(u => ({
        userId: u.userId,
        churnRisk: u.predictedChurnRisk,
        ltv: u.predictedLTV,
        totalSpent: u.totalSpent,
        totalOrders: u.totalOrders
      }))
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/behavior/at-risk
 * Get at-risk users
 */
router.get('/alerts/at-risk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const limit = parseInt(req.query.limit as string) || 100;

    const users = await behaviorService.getAtRiskUsers(tenantId, limit);

    res.json(createResponse({
      count: users.length,
      users: users.map(u => ({
        userId: u.userId,
        segment: u.segment,
        churnRisk: u.predictedChurnRisk,
        ltv: u.predictedLTV,
        lastActiveAt: u.lastActiveAt,
        cartAbandons: u.cartAbandons
      }))
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/behavior/high-value
 * Get high-value users
 */
router.get('/segments/high-value', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const limit = parseInt(req.query.limit as string) || 100;

    const users = await behaviorService.getHighValueUsers(tenantId, limit);

    res.json(createResponse({
      count: users.length,
      users: users.map(u => ({
        userId: u.userId,
        segment: u.segment,
        churnRisk: u.predictedChurnRisk,
        ltv: u.predictedLTV,
        totalSpent: u.totalSpent,
        totalOrders: u.totalOrders
      }))
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;
