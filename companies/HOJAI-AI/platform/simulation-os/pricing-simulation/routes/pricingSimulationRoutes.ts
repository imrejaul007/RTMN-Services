import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { PricingSimulationEngine } from '../engine/pricingSimulationEngine.js';
import {
  PricingSimulationRequest,
  PricingSimulationResult
} from '../models/pricingSimulation.js';

// ============================================================================
// Pricing Simulation Routes
// ============================================================================

const router = Router();
const engine = new PricingSimulationEngine();

// Validation schema
const PricingSimulationRequestSchema = z.object({
  simulationId: z.string().min(1),
  product: z.object({
    id: z.string(),
    name: z.string(),
    sku: z.string(),
    category: z.string(),
    currentPrice: z.number().positive(),
    cost: z.number().nonnegative(),
    margin: z.number(),
    volume: z.number().int().nonnegative(),
    elasticity: z.number()
  }),
  competitors: z.array(z.object({
    competitorId: z.string(),
    competitorName: z.string(),
    price: z.number().positive(),
    lastUpdated: z.string(),
    reliability: z.number().min(0).max(1)
  })),
  segments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().int().positive(),
    willingnessToPay: z.number().positive(),
    priceSensitivity: z.number().min(0).max(100),
    acquisitionCost: z.number().nonnegative(),
    lifetimeValue: z.number().nonnegative()
  })),
  valueDrivers: z.array(z.object({
    id: z.string(),
    name: z.string(),
    impact: z.number().min(0).max(1),
    yourPerformance: z.number().min(0).max(100),
    competitorPerformance: z.number().min(0).max(100)
  })).optional(),
  parameters: z.object({
    iterations: z.number().int().min(100).max(10000).optional().default(1000),
    confidenceLevel: z.number().min(0).max(1).optional().default(0.95),
    priceRange: z.object({
      min: z.number().positive(),
      max: z.number().positive()
    }).optional(),
    step: z.number().positive().optional().default(5)
  }).optional()
});

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * @route POST /api/simulate/pricing
 * @desc Run pricing simulation
 * @access Public
 */
router.post(
  '/pricing',
  asyncHandler(async (req: Request, res: Response) => {
    const validation = PricingSimulationRequestSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: validation.error.errors.map(e => ({
          field: e.path.join('.'),
          message: e.message
        }))
      });
      return;
    }

    const request = validation.data as PricingSimulationRequest;
    const result = await engine.run(request);

    res.status(202).json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
        summary: {
          currentPricing: {
            price: result.competitiveAnalysis.yourPrice,
            position: result.competitiveAnalysis.pricePosition,
            vsAverage: `${result.competitiveAnalysis.priceDifference.vsAverage.toFixed(1)}%`
          },
          valueBased: {
            estimatedWTP: result.valueBasedAnalysis.willingnessToPay.estimated,
            confidence: result.valueBasedAnalysis.willingnessToPay.confidence,
            range: result.valueBasedAnalysis.willingnessToPay.range
          },
          elasticity: {
            baseElasticity: result.elasticityAnalysis.baseElasticity,
            optimalPrice: result.elasticityAnalysis.optimalPricePoint.price
          },
          optimalPricing: {
            recommended: result.recommendations[0]?.recommendedPrice || result.elasticityAnalysis.optimalPricePoint.price,
            strategy: result.recommendations[0]?.strategy || 'dynamic'
          }
        },
        topRecommendations: result.recommendations
          .filter(r => r.confidence > 0.6)
          .slice(0, 3)
          .map(r => ({
            strategy: r.strategy,
            price: r.recommendedPrice,
            confidence: r.confidence,
            reasoning: r.reasoning.slice(0, 2)
          })),
        metadata: {
          createdAt: result.metadata.createdAt,
          executionTimeMs: result.metadata.executionTimeMs,
          iterations: result.metadata.iterations
        }
      },
      message: 'Pricing simulation completed. Use GET /api/simulate/pricing/:id for full results.'
    });
  })
);

/**
 * @route GET /api/simulate/pricing/:id
 * @desc Get pricing simulation results by ID
 * @access Public
 */
router.get(
  '/pricing/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = engine.get(id);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Simulation not found',
        message: `No simulation found with ID: ${id}`
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: result
    });
  })
);

/**
 * @route GET /api/simulate/pricing/:id/recommendations
 * @desc Get pricing recommendations
 * @access Public
 */
router.get(
  '/pricing/:id/recommendations',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { strategy, minConfidence } = req.query;

    const result = engine.get(id);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
      return;
    }

    let recommendations = result.recommendations;

    if (strategy) {
      recommendations = recommendations.filter(r => r.strategy === strategy);
    }

    if (minConfidence) {
      recommendations = recommendations.filter(r => r.confidence >= Number(minConfidence));
    }

    res.status(200).json({
      success: true,
      data: {
        recommendations,
        summary: {
          total: recommendations.length,
          byStrategy: recommendations.reduce((acc, r) => {
            acc[r.strategy] = (acc[r.strategy] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          averageConfidence: recommendations.reduce((sum, r) => sum + r.confidence, 0) / recommendations.length
        }
      }
    });
  })
);

/**
 * @route GET /api/simulate/pricing/:id/compare
 * @desc Compare pricing simulations
 * @access Public
 */
router.get(
  '/pricing/:id/compare',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { compareIds } = req.query;

    const primary = engine.get(id);

    if (!primary) {
      res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
      return;
    }

    const comparisonIds = compareIds
      ? (compareIds as string).split(',')
      : [];

    const comparisons = comparisonIds
      .map(cid => engine.get(cid))
      .filter((s): s is PricingSimulationResult => s !== undefined);

    const allSimulations = [primary, ...comparisons];

    // Build comparison
    const comparison = {
      simulations: allSimulations.map(s => ({
        id: s.id,
        productId: s.productId,
        status: s.status,
        summary: {
          currentPrice: s.competitiveAnalysis.yourPrice,
          optimalPrice: s.recommendations[0]?.recommendedPrice || s.elasticityAnalysis.optimalPricePoint.price,
          strategy: s.recommendations[0]?.strategy || 'dynamic',
          confidence: s.recommendations[0]?.confidence || 0
        }
      })),
      priceAnalysis: {
        currentPrices: allSimulations.map(s => s.competitiveAnalysis.yourPrice),
        optimalPrices: allSimulations.map(s =>
          s.recommendations[0]?.recommendedPrice || s.elasticityAnalysis.optimalPricePoint.price
        ),
        elasticityBasedPrices: allSimulations.map(s => s.elasticityAnalysis.optimalPricePoint.price)
      },
      valueAnalysis: {
        estimatedWTP: allSimulations.map(s => s.valueBasedAnalysis.willingnessToPay.estimated),
        confidence: allSimulations.map(s => s.valueBasedAnalysis.willingnessToPay.confidence)
      }
    };

    res.status(200).json({
      success: true,
      data: comparison
    });
  })
);

/**
 * @route GET /api/simulate/pricing/ladder/:productId
 * @desc Get price ladder for a product
 * @access Public
 */
router.get(
  '/pricing/ladder/:productId',
  asyncHandler(async (req: Request, res: Response) => {
    const { productId } = req.params;

    const simulations = engine.list().filter(s => s.productId === productId);

    if (simulations.length === 0) {
      res.status(404).json({
        success: false,
        error: 'No simulations found for this product'
      });
      return;
    }

    const latestSimulation = simulations[simulations.length - 1];

    res.status(200).json({
      success: true,
      data: {
        productId,
        ladder: latestSimulation.priceLadder,
        summary: {
          lowestPrice: Math.min(...latestSimulation.priceLadder.map(l => l.price)),
          highestPrice: Math.max(...latestSimulation.priceLadder.map(l => l.price)),
          optimalRevenuePrice: latestSimulation.priceLadder.reduce((best, current) =>
            current.expectedRevenue > best.expectedRevenue ? current : best
          ).price,
          optimalMarginPrice: latestSimulation.priceLadder.reduce((best, current) =>
            current.expectedMargin > best.expectedMargin ? current : best
          ).price
        }
      }
    });
  })
);

export default router;
