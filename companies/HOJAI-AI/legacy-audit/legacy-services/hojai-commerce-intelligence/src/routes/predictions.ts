/**
 * HOJAI Commerce Intelligence - Prediction Routes
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { predictionService } from '../services/predictionService.js';
import { tenantMiddleware } from '../middleware/tenant.js';
import { createResponse, createErrorResponse } from '../types/index.js';

const router = Router();

// Apply tenant middleware to all routes
router.use(tenantMiddleware());

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const PredictionRequestSchema = z.object({
  type: z.enum(['churn', 'ltv', 'next_purchase', 'cart_recovery', 'product_demand', 'inventory_demand']),
  features: z.record(z.number()).optional()
});

const BatchPredictionSchema = z.object({
  userIds: z.array(z.string()).min(1).max(100),
  types: z.array(z.enum(['churn', 'ltv', 'next_purchase', 'cart_recovery'])).min(1)
});

// ============================================================================
// ROUTES
// ============================================================================

/**
 * GET /api/predictions/:userId
 * Get all predictions for a user
 */
router.get('/:userId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId } = req.params;

    const predictions = await predictionService.getAllPredictions(tenantId, userId);

    res.json(createResponse({
      userId,
      predictions: predictions.map(p => ({
        type: p.type,
        value: p.value,
        confidence: p.confidence,
        risk: p.risk,
        recommendations: p.recommendations
      }))
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/predictions/:userId/:type
 * Get specific prediction for a user
 */
router.get('/:userId/:type', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const { userId, type } = req.params;

    // Parse features from query string
    let features: Record<string, number> | undefined;
    if (req.query.features) {
      try {
        features = JSON.parse(req.query.features as string);
      } catch {
        return res.status(400).json(createErrorResponse(
          'INVALID_FEATURES',
          'Features must be valid JSON object'
        ));
      }
    }

    const validTypes = ['churn', 'ltv', 'next_purchase', 'cart_recovery', 'product_demand', 'inventory_demand'];
    if (!validTypes.includes(type)) {
      return res.status(400).json(createErrorResponse(
        'INVALID_TYPE',
        `Prediction type must be one of: ${validTypes.join(', ')}`
      ));
    }

    const prediction = await predictionService.predict({
      tenantId,
      userId,
      type: type as any,
      features
    });

    res.json(createResponse({
      userId,
      prediction: {
        id: prediction.id,
        type: prediction.type,
        value: prediction.value,
        confidence: prediction.confidence,
        risk: prediction.risk,
        factors: prediction.factors,
        recommendations: prediction.recommendations,
        validUntil: prediction.validUntil
      }
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/predictions/batch
 * Get batch predictions for multiple users
 */
router.post('/batch', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;

    // Validate input
    const validationResult = BatchPredictionSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json(createErrorResponse(
        'VALIDATION_ERROR',
        'Invalid request body',
        { errors: validationResult.error.issues }
      ));
    }

    const { userIds, types } = validationResult.data;
    const results = [];

    for (const userId of userIds) {
      for (const type of types) {
        try {
          const prediction = await predictionService.predict({
            tenantId,
            userId,
            type,
            features: undefined
          });
          results.push({
            userId,
            type,
            success: true,
            prediction
          });
        } catch (error) {
          results.push({
            userId,
            type,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    res.json(createResponse({
      total: results.length,
      successful: successCount,
      failed: failureCount,
      results
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/predictions/churn/high-risk
 * Get high-risk churn users
 */
router.get('/segments/churn-high-risk', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const limit = parseInt(req.query.limit as string) || 100;
    const minRisk = parseFloat(req.query.minRisk as string) || 0.7;

    // Get predictions of type churn with high risk
    const { behaviorService } = await import('../services/behaviorService.js');
    const atRiskUsers = await behaviorService.getAtRiskUsers(tenantId, limit);

    const highRiskUsers = atRiskUsers
      .filter(u => u.predictedChurnRisk >= minRisk)
      .map(u => ({
        userId: u.userId,
        churnRisk: u.predictedChurnRisk,
        ltv: u.predictedLTV,
        segment: u.segment,
        lastActiveAt: u.lastActiveAt
      }));

    res.json(createResponse({
      count: highRiskUsers.length,
      users: highRiskUsers
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/predictions/ltv/top
 * Get top LTV users
 */
router.get('/segments/ltv-top', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.tenantContext!;
    const limit = parseInt(req.query.limit as string) || 100;
    const minLTV = parseFloat(req.query.minLTV as string) || 0;

    // Get high-value users
    const { behaviorService } = await import('../services/behaviorService.js');
    const highValueUsers = await behaviorService.getHighValueUsers(tenantId, limit * 2);

    const topUsers = highValueUsers
      .filter(u => u.predictedLTV >= minLTV)
      .slice(0, limit)
      .map(u => ({
        userId: u.userId,
        ltv: u.predictedLTV,
        churnRisk: u.predictedChurnRisk,
        segment: u.segment,
        totalSpent: u.totalSpent
      }));

    res.json(createResponse({
      count: topUsers.length,
      users: topUsers
    }, { tenantId }));
  } catch (error) {
    next(error);
  }
});

export default router;
