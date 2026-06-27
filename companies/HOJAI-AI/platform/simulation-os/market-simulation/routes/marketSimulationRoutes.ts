import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { MarketSimulationEngine } from '../engine/marketSimulationEngine.js';
import {
  MarketSimulationRequest,
  MarketSimulationResult,
  MarketTrendSchema
} from '../models/marketSimulation.js';

// ============================================================================
// Market Simulation Routes
// ============================================================================

const router = Router();
const engine = new MarketSimulationEngine();

// Validation schema
const MarketSimulationRequestSchema = z.object({
  marketId: z.string().min(1),
  marketType: z.enum(['b2b', 'b2c', 'c2c', 'b2g', 'marketplace']),
  productCategory: z.object({
    id: z.string(),
    name: z.string(),
    parentId: z.string().optional(),
    growthRate: z.number().min(-50).max(100),
    marketSize: z.number().positive(),
    seasonality: z.object({
      peakMonths: z.array(z.number().int().min(1).max(12)),
      troughMonths: z.array(z.number().int().min(1).max(12))
    })
  }),
  yourCompany: z.object({
    currentMarketShare: z.number().min(0).max(100),
    currentPricing: z.number().positive(),
    brandStrength: z.number().min(0).max(100),
    customerSatisfaction: z.number().min(0).max(100)
  }),
  competitors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    marketShare: z.number().min(0).max(100),
    pricingStrategy: z.enum(['premium', 'mid-market', 'budget', 'dynamic']),
    strengths: z.array(z.string()),
    weaknesses: z.array(z.string()),
    recentStrategies: z.array(z.object({
      strategy: z.string(),
      impact: z.number().min(-1).max(1),
      timeframe: z.string()
    })),
    financialHealth: z.object({
      revenue: z.number().nonnegative(),
      growth: z.number(),
      profitability: z.number()
    })
  })),
  customerSegments: z.array(z.object({
    id: z.string(),
    name: z.string(),
    size: z.number().int().positive(),
    demographics: z.object({
      ageRange: z.tuple([z.number(), z.number()]),
      incomeLevel: z.enum(['low', 'middle', 'high']),
      location: z.array(z.string())
    }),
    behavior: z.object({
      avgPurchaseFrequency: z.number().positive(),
      avgOrderValue: z.number().positive(),
      priceSensitivity: z.number().min(0).max(100),
      brandLoyalty: z.number().min(0).max(100),
      digitalAdoption: z.number().min(0).max(100)
    }),
    needs: z.array(z.string()),
    painPoints: z.array(z.string())
  })),
  parameters: z.object({
    iterations: z.number().int().min(100).max(10000).optional().default(1000),
    timeHorizon: z.number().int().min(1).max(60).optional().default(12),
    confidenceLevel: z.number().min(0).max(1).optional().default(0.95)
  }).optional()
});

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * @route POST /api/simulate/market
 * @desc Run market simulation
 * @access Public
 */
router.post(
  '/market',
  asyncHandler(async (req: Request, res: Response) => {
    const validation = MarketSimulationRequestSchema.safeParse(req.body);

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

    const request = validation.data as MarketSimulationRequest;
    const result = await engine.run(request);

    res.status(202).json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
        summary: {
          marketForecast: {
            currentSize: result.demandForecast[0]?.baseline || 0,
            projectedSize: result.demandForecast[result.demandForecast.length - 1]?.projected || 0,
            growthRate: result.scenarios.find(s => s.scenarioName === 'Base Case')?.metrics.marketGrowth || 0
          },
          marketShare: {
            current: result.marketShareProjection[0]?.yourCompany.current || 0,
            projected: result.marketShareProjection[result.marketShareProjection.length - 1]?.yourCompany.projected || 0,
            change: (result.marketShareProjection[result.marketShareProjection.length - 1]?.yourCompany.projected || 0) -
              (result.marketShareProjection[0]?.yourCompany.current || 0)
          },
          pricing: {
            categoryElasticity: result.priceElasticity.categoryElasticity,
            optimalPrice: result.priceElasticity.optimalPriceRange.recommended,
            priceRange: {
              min: result.priceElasticity.optimalPriceRange.min,
              max: result.priceElasticity.optimalPriceRange.max
            }
          },
          threats: {
            newEntrants: result.threatAssessment.newEntrants,
            competitiveRivalry: result.threatAssessment.competitiveRivalry,
            overallRisk: (result.threatAssessment.newEntrants + result.threatAssessment.competitiveRivalry) / 2
          }
        },
        topRecommendations: result.recommendations
          .filter(r => r.priority === 'high' || r.priority === 'critical')
          .slice(0, 3)
          .map(r => ({
            action: r.action,
            priority: r.priority,
            rationale: r.rationale
          })),
        metadata: {
          createdAt: result.metadata.createdAt,
          executionTimeMs: result.metadata.executionTimeMs,
          iterations: result.metadata.iterations
        }
      },
      message: 'Market simulation completed. Use GET /api/simulate/market/:id for full results.'
    });
  })
);

/**
 * @route GET /api/simulate/market/:id
 * @desc Get market simulation results by ID
 * @access Public
 */
router.get(
  '/market/:id',
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
 * @route GET /api/simulate/market/trends
 * @desc Get market trends
 * @access Public
 */
router.get(
  '/market/trends',
  asyncHandler(async (req: Request, res: Response) => {
    const trends = engine.getTrends();

    // Add some default trends if none exist
    if (trends.length === 0) {
      const defaultTrends = [
        {
          id: 'trend-1',
          name: 'AI Integration',
          category: 'technology' as const,
          impact: 0.3,
          probability: 0.8,
          timeframe: 'medium' as const,
          description: 'Increasing integration of AI across all business functions',
          businessImplications: [
            'Automation of routine tasks',
            'Enhanced customer experiences',
            'New competitive advantages for AI adopters'
          ]
        },
        {
          id: 'trend-2',
          name: 'Remote Work Normalization',
          category: 'social' as const,
          impact: 0.2,
          probability: 0.9,
          timeframe: 'long' as const,
          description: 'Hybrid and remote work becoming permanent fixtures',
          businessImplications: [
            'Reduced real estate costs',
            'Access to global talent',
            'Changes in office space requirements'
          ]
        },
        {
          id: 'trend-3',
          name: 'Sustainability Focus',
          category: 'environmental' as const,
          impact: 0.15,
          probability: 0.7,
          timeframe: 'medium' as const,
          description: 'Growing consumer and investor focus on sustainability',
          businessImplications: [
            'Need for ESG compliance',
            'Green product development',
            'Supply chain transparency'
          ]
        },
        {
          id: 'trend-4',
          name: 'Data Privacy Regulations',
          category: 'regulatory' as const,
          impact: -0.2,
          probability: 0.85,
          timeframe: 'short' as const,
          description: 'Stricter data privacy regulations globally',
          businessImplications: [
            'Compliance costs increasing',
            'Data collection practices must change',
            'Customer trust implications'
          ]
        },
        {
          id: 'trend-5',
          name: 'Economic Uncertainty',
          category: 'economic' as const,
          impact: -0.15,
          probability: 0.6,
          timeframe: 'medium' as const,
          description: 'Ongoing economic volatility and inflation concerns',
          businessImplications: [
            'Consumer spending caution',
            'Cost optimization focus',
            'Value-oriented offerings gaining share'
          ]
        }
      ];

      // Add default trends to engine
      defaultTrends.forEach(t => engine.addTrend(t as any));

      res.status(200).json({
        success: true,
        data: {
          trends: defaultTrends,
          summary: {
            total: defaultTrends.length,
            positive: defaultTrends.filter(t => t.impact > 0).length,
            negative: defaultTrends.filter(t => t.impact < 0).length,
            byCategory: {
              technology: defaultTrends.filter(t => t.category === 'technology').length,
              social: defaultTrends.filter(t => t.category === 'social').length,
              environmental: defaultTrends.filter(t => t.category === 'environmental').length,
              regulatory: defaultTrends.filter(t => t.category === 'regulatory').length,
              economic: defaultTrends.filter(t => t.category === 'economic').length,
              demographic: defaultTrends.filter(t => t.category === 'demographic').length
            }
          }
        }
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        trends,
        summary: {
          total: trends.length,
          positive: trends.filter(t => t.impact > 0).length,
          negative: trends.filter(t => t.impact < 0).length
        }
      }
    });
  })
);

/**
 * @route POST /api/simulate/market/trends
 * @desc Add a market trend
 * @access Public
 */
router.post(
  '/market/trends',
  asyncHandler(async (req: Request, res: Response) => {
    const validation = MarketTrendSchema.safeParse(req.body);

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

    engine.addTrend(validation.data);

    res.status(201).json({
      success: true,
      data: validation.data,
      message: 'Trend added successfully'
    });
  })
);

/**
 * @route GET /api/simulate/market/:id/analysis
 * @desc Get detailed analysis of a market simulation
 * @access Public
 */
router.get(
  '/market/:id/analysis',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { type } = req.query;

    const result = engine.get(id);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
      return;
    }

    let analysis: any;

    switch (type) {
      case 'demand':
        analysis = {
          type: 'demand',
          summary: {
            peakMonth: result.peakDemand.month,
            peakVolume: result.peakDemand.volume,
            peakIntensity: result.peakDemand.intensity
          },
          forecasts: result.demandForecast,
          drivers: result.demandForecast[0]?.drivers || []
        };
        break;

      case 'pricing':
        analysis = {
          type: 'pricing',
          elasticity: {
            category: result.priceElasticity.categoryElasticity,
            interpretation: result.priceElasticity.categoryElasticity > -1
              ? 'Inelastic - price increases may increase revenue'
              : 'Elastic - price increases will reduce revenue'
          },
          optimalPricing: result.priceElasticity.optimalPriceRange,
          segmentAnalysis: Object.fromEntries(result.priceElasticity.segmentElasticities)
        };
        break;

      case 'competitive':
        analysis = {
          type: 'competitive',
          threats: result.threatAssessment,
          responses: result.competitiveResponses.map(r => ({
            competitorId: r.competitorId,
            responseProbability: r.responseProbability,
            responseType: r.responseType,
            expectedTimeline: r.expectedTimeline,
            counterStrategies: r.yourCounterStrategies
          }))
        };
        break;

      case 'scenarios':
        analysis = {
          type: 'scenarios',
          scenarios: result.scenarios.map(s => ({
            name: s.scenarioName,
            probability: s.probability,
            metrics: s.metrics,
            keyEvents: s.keyEvents
          })),
          weightedOutcome: this.calculateWeightedOutcome(result.scenarios)
        };
        break;

      default:
        analysis = {
          type: 'full',
          demand: result.demandForecast.slice(-3),
          pricing: result.priceElasticity,
          marketShare: result.marketShareProjection.slice(-3),
          competitive: result.competitiveResponses.slice(0, 3),
          threats: result.threatAssessment,
          scenarios: result.scenarios.map(s => ({
            name: s.scenarioName,
            probability: s.probability,
            yourRevenue: s.metrics.yourRevenue,
            yourMarketShare: s.metrics.yourMarketShare
          }))
        };
    }

    res.status(200).json({
      success: true,
      data: {
        simulationId: id,
        analysis
      }
    });
  })
);

/**
 * Calculate weighted outcome across scenarios
 */
private calculateWeightedOutcome(scenarios: MarketSimulationResult['scenarios']): {
  expectedRevenue: number;
  expectedMarketShare: number;
  expectedProfitability: number;
  riskScore: number;
} {
  let expectedRevenue = 0;
  let expectedMarketShare = 0;
  let expectedProfitability = 0;

  for (const scenario of scenarios) {
    expectedRevenue += scenario.metrics.yourRevenue * scenario.probability;
    expectedMarketShare += scenario.metrics.yourMarketShare * scenario.probability;
    expectedProfitability += scenario.metrics.yourProfitability * scenario.probability;
  }

  // Calculate risk score based on scenario variance
  const revenues = scenarios.map(s => s.metrics.yourRevenue);
  const variance = revenues.reduce((sum, r) => sum + Math.pow(r - expectedRevenue, 2), 0) / revenues.length;
  const riskScore = Math.sqrt(variance) / expectedRevenue * 100;

  return {
    expectedRevenue,
    expectedMarketShare,
    expectedProfitability,
    riskScore
  };
}

/**
 * @route GET /api/simulate/market/:id/compare
 * @desc Compare multiple market simulations
 * @access Public
 */
router.get(
  '/market/:id/compare',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { compareIds } = req.query;

    const primary = engine.get(id);

    if (!primary) {
      res.status(404).json({
        success: false,
        error: 'Primary simulation not found'
      });
      return;
    }

    const comparisonIds = compareIds
      ? (compareIds as string).split(',')
      : [];

    const comparisons = comparisonIds
      .map(cid => engine.get(cid))
      .filter((s): s is MarketSimulationResult => s !== undefined);

    const allSimulations = [primary, ...comparisons];

    // Build comparison
    const comparison = {
      simulations: allSimulations.map(s => ({
        id: s.id,
        marketId: s.marketId,
        status: s.status,
        summary: {
          finalMarketShare: s.marketShareProjection[s.marketShareProjection.length - 1]?.yourCompany.projected || 0,
          expectedRevenue: s.scenarios.find(sc => sc.scenarioName === 'Base Case')?.metrics.yourRevenue || 0,
          optimalPrice: s.priceElasticity.optimalPriceRange.recommended,
          threatLevel: (s.threatAssessment.newEntrants + s.threatAssessment.competitiveRivalry) / 2,
          topRisk: s.competitiveResponses[0]?.competitorId || 'none'
        }
      })),
      metrics: {
        marketShare: {
          values: allSimulations.map(s => s.marketShareProjection[s.marketShareProjection.length - 1]?.yourCompany.projected || 0),
          higherIsBetter: true
        },
        revenue: {
          values: allSimulations.map(s => s.scenarios.find(sc => sc.scenarioName === 'Base Case')?.metrics.yourRevenue || 0),
          higherIsBetter: true
        },
        threatLevel: {
          values: allSimulations.map(s => (s.threatAssessment.newEntrants + s.threatAssessment.competitiveRivalry) / 2),
          higherIsBetter: false
        }
      }
    };

    res.status(200).json({
      success: true,
      data: comparison
    });
  })
);

/**
 * @route GET /api/simulate/market/marketId/:marketId
 * @desc Get all simulations for a market
 * @access Public
 */
router.get(
  '/market/marketId/:marketId',
  asyncHandler(async (req: Request, res: Response) => {
    const { marketId } = req.params;

    const simulations = engine.list().filter(s => s.marketId === marketId);

    res.status(200).json({
      success: true,
      data: {
        count: simulations.length,
        simulations: simulations.map(s => ({
          id: s.id,
          status: s.status,
          createdAt: s.metadata.createdAt,
          summary: {
            finalMarketShare: s.marketShareProjection[s.marketShareProjection.length - 1]?.yourCompany.projected || 0,
            recommendationCount: s.recommendations.length
          }
        }))
      }
    });
  })
);

export default router;
