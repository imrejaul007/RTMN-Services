import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { scoreCalculator } from '../services/scoreCalculator';
import {
  EntityTypeSchema,
  CalculateScoreRequestSchema,
  UpdateScoreRequestSchema,
} from '../types';
import logger from '../utils/logger';

const router = Router();

// Validation schemas
const GetScoreSchema = z.object({
  entityId: z.string().min(1),
  entityType: EntityTypeSchema,
  tenantId: z.string().optional(),
});

const UpdateScoreSchema = z.object({
  entityId: z.string().min(1),
  entityType: EntityTypeSchema,
  changeReason: z.string().min(1),
  triggeredBy: z.string().min(1),
  factors: z.object({
    transactionReliability: z.number().optional(),
    verificationStatus: z.number().optional(),
    behavioralPattern: z.number().optional(),
    historicalBehavior: z.number().optional(),
    networkTrust: z.number().optional(),
    riskIndicators: z.number().optional(),
    complianceScore: z.number().optional(),
  }),
  penalty: z.number().optional(),
});

/**
 * GET /api/score/:entityId/:entityType
 * Get trust score for an entity
 */
router.get(
  '/:entityId/:entityType',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, entityType } = req.params;
      const tenantId = req.query.tenantId as string || 'default';

      const validated = GetScoreSchema.parse({ entityId, entityType, tenantId });
      const score = await scoreCalculator.getScore(
        validated.entityId,
        validated.entityType as any,
        validated.tenantId
      );

      if (!score) {
        // Return default score if not found
        return res.json({
          entityId,
          entityType,
          score: 50,
          level: 'medium',
          verified: false,
          verificationLevel: 'none',
          riskFlags: [],
          linkedEntities: 0,
          message: 'No trust score found - returning default',
        });
      }

      res.json(score);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/score/calculate
 * Calculate trust score for an entity
 */
router.post(
  '/calculate',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = CalculateScoreRequestSchema.parse(req.body);

      const trustScore = await scoreCalculator.calculateScore({
        entityId: validated.entityId,
        entityType: validated.entityType,
        tenantId: validated.tenantId,
        factors: validated.factors,
      });

      res.json({
        success: true,
        entityId: trustScore.entityId,
        entityType: trustScore.entityType,
        score: trustScore.score,
        level: trustScore.level,
        factors: trustScore.factors,
        breakdown: trustScore.breakdown,
        verified: trustScore.verified,
        verificationLevel: trustScore.verificationLevel,
        lastUpdated: trustScore.lastUpdated,
        nextReview: trustScore.nextReview,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }
      next(error);
    }
  }
);

/**
 * PUT /api/score
 * Update trust score with new information
 */
router.put(
  '/',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const validated = UpdateScoreSchema.parse(req.body);

      const trustScore = await scoreCalculator.updateScore({
        entityId: validated.entityId,
        entityType: validated.entityType,
        changeReason: validated.changeReason,
        triggeredBy: validated.triggeredBy,
        factors: validated.factors,
        penalty: validated.penalty,
      });

      res.json({
        success: true,
        entityId: trustScore.entityId,
        entityType: trustScore.entityType,
        previousScore: validated.factors.riskIndicators !== undefined
          ? trustScore.score + (validated.penalty || 0)
          : undefined,
        newScore: trustScore.score,
        level: trustScore.level,
        changeReason: validated.changeReason,
        triggeredBy: validated.triggeredBy,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation error',
          details: error.errors,
        });
      }
      next(error);
    }
  }
);

/**
 * GET /api/score/:entityId/:entityType/trend
 * Get trust score trend over time
 */
router.get(
  '/:entityId/:entityType/trend',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { entityId, entityType } = req.params;
      const tenantId = req.query.tenantId as string || 'default';

      const validated = GetScoreSchema.parse({ entityId, entityType, tenantId });
      const trend = await scoreCalculator.getTrend(
        validated.entityId,
        validated.entityType as any,
        validated.tenantId
      );

      if (!trend) {
        return res.status(404).json({
          error: 'No trust score history found',
          entityId,
          entityType,
        });
      }

      res.json(trend);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/score/bulk
 * Get trust scores for multiple entities
 */
router.get(
  '/bulk',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const entityIds = req.query.entityIds as string;
      const entityType = req.query.entityType as string;
      const tenantId = req.query.tenantId as string || 'default';

      if (!entityIds || !entityType) {
        return res.status(400).json({
          error: 'entityIds and entityType are required',
        });
      }

      const ids = entityIds.split(',').map((id) => id.trim());
      const results = [];

      for (const entityId of ids) {
        const score = await scoreCalculator.getScore(
          entityId,
          entityType as any,
          tenantId
        );

        results.push({
          entityId,
          entityType,
          score: score || {
            score: 50,
            level: 'medium',
            verified: false,
            verificationLevel: 'none',
            riskFlags: [],
          },
        });
      }

      res.json({
        results,
        total: results.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
