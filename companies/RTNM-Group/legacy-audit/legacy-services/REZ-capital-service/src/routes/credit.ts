import { Router, Request, Response, NextFunction } from 'express';
import { creditScoringService } from '../services/creditScoringService';
import { validationResult } from 'express-validator';

const router = Router();

/**
 * Get full credit profile for a merchant
 * GET /api/credit/:merchantId
 */
router.get('/:merchantId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId } = req.params;

    const profile = await creditScoringService.getCreditProfile(merchantId);

    res.json({
      success: true,
      data: {
        merchantId,
        healthScore: profile.healthScore,
        creditScore: profile.creditScore,
        riskRating: profile.riskRating,
        creditLimit: profile.creditLimit,
        availableCredit: profile.availableCredit,
        utilizedCredit: profile.health?.utilizedAmount || 0,
        paymentHistory: {
          onTimePayments: profile.health?.onTimePayments || 0,
          latePayments: profile.health?.latePayments || 0,
          defaults: profile.health?.defaults || 0,
        },
        financialMetrics: {
          monthlyRevenue: profile.health?.monthlyRevenue || 0,
          avgOrderValue: profile.health?.avgOrderValue || 0,
          orderCount: profile.health?.orderCount || 0,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Get credit score for a merchant
 * GET /api/credit/:merchantId/score
 */
router.get('/:merchantId/score', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId } = req.params;

    const [healthScore, creditScore, riskRating] = await Promise.all([
      creditScoringService.calculateHealthScore(merchantId),
      creditScoringService.calculateCreditScore(merchantId),
      creditScoringService.determineRiskRating(merchantId),
    ]);

    res.json({
      success: true,
      data: {
        merchantId,
        healthScore,
        creditScore,
        riskRating,
        scoreRange: {
          healthScore: { min: 0, max: 100 },
          creditScore: { min: 300, max: 900 },
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Get credit limit for a merchant
 * GET /api/credit/:merchantId/limit
 */
router.get('/:merchantId/limit', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId } = req.params;

    const creditLimit = await creditScoringService.calculateCreditLimit(merchantId);
    const health = await creditScoringService.getCreditProfile(merchantId);

    res.json({
      success: true,
      data: {
        merchantId,
        creditLimit,
        utilizedAmount: health.health?.utilizedAmount || 0,
        availableCredit: creditLimit - (health.health?.utilizedAmount || 0),
        creditLimitBreakdown: {
          baseAmount: health.health?.monthlyRevenue ? health.health.monthlyRevenue * 0.3 : 0,
          scoreMultiplier: health.creditScore ? 0.5 + (health.creditScore - 300) / 1200 : 1,
          riskAdjustment: health.riskRating === 'low' ? 1.5 : health.riskRating === 'high' ? 0.5 : 1,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

/**
 * Update merchant financial metrics
 * POST /api/credit/:merchantId/metrics
 */
router.post('/:merchantId/metrics', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { merchantId } = req.params;
    const { monthlyRevenue, avgOrderValue, orderCount } = req.body;

    if (monthlyRevenue === undefined && avgOrderValue === undefined && orderCount === undefined) {
      res.status(400).json({
        success: false,
        error: 'At least one metric must be provided',
      });
      return;
    }

    const health = await creditScoringService.updateMerchantHealth(merchantId, {
      monthlyRevenue,
      avgOrderValue,
      orderCount,
    });

    res.json({
      success: true,
      data: {
        merchantId,
        updatedMetrics: {
          monthlyRevenue: health.monthlyRevenue,
          avgOrderValue: health.avgOrderValue,
          orderCount: health.orderCount,
        },
        updatedScores: {
          healthScore: health.healthScore,
          creditScore: health.creditScore,
          riskRating: health.riskRating,
        },
      },
    });
  } catch (error: any) {
    next(error);
  }
});

export default router;
