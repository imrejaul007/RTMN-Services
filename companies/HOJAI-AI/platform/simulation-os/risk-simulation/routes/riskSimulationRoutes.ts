import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RiskSimulationEngine } from '../engine/riskSimulationEngine.js';
import { RiskSimulationRequest } from '../models/riskSimulation.js';

// ============================================================================
// Risk Simulation Routes
// ============================================================================

const router = Router();
const engine = new RiskSimulationEngine();

// Validation schema
const RiskSimulationRequestSchema = z.object({
  simulationId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  positions: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['equity', 'bond', 'commodity', 'fx', 'crypto', 'real_estate', 'cash']),
    value: z.number().nonnegative(),
    exposure: z.number(),
    riskFactors: z.array(z.object({
      factorId: z.string(),
      sensitivity: z.number()
    }))
  })),
  riskFactors: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.enum(['market', 'credit', 'operational', 'liquidity', 'compliance', 'reputational', 'strategic', 'cybersecurity']),
    currentValue: z.number(),
    volatility: z.number().nonnegative(),
    distribution: z.enum(['normal', 'uniform', 'triangular', 'lognormal', 'poisson', 'bernoulli']),
    min: z.number().optional(),
    max: z.number().optional(),
    mode: z.number().optional()
  })),
  scenarios: z.array(z.object({
    id: z.string(),
    name: z.string(),
    probability: z.number().min(0).max(1),
    description: z.string(),
    factorChanges: z.record(z.string(), z.number()),
    duration: z.number().int().nonnegative(),
    recoveryTime: z.number().int().nonnegative().optional()
  })).optional(),
  parameters: z.object({
    iterations: z.number().int().min(100).max(100000).optional().default(10000),
    confidenceLevel: z.number().min(0.8).max(0.999).optional().default(0.95),
    timeHorizon: z.number().int().min(1).max(365).optional().default(1),
    includeVaR: z.boolean().optional().default(true),
    includeSensitivity: z.boolean().optional().default(true),
    includeStress: z.boolean().optional().default(true)
  }).optional()
});

// Async handler wrapper
const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * @route POST /api/simulate/risk
 * @desc Run risk simulation
 * @access Public
 */
router.post(
  '/risk',
  asyncHandler(async (req: Request, res: Response) => {
    const validation = RiskSimulationRequestSchema.safeParse(req.body);

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

    const request = validation.data as RiskSimulationRequest;
    const result = await engine.run(request);

    res.status(202).json({
      success: true,
      data: {
        id: result.id,
        status: result.status,
        summary: {
          portfolioMetrics: {
            expectedReturn: result.aggregateMetrics.expectedReturn,
            volatility: result.aggregateMetrics.volatility,
            sharpeRatio: result.aggregateMetrics.sharpeRatio,
            maxDrawdown: result.aggregateMetrics.maxDrawdown
          },
          varSummary: result.varResults.map(v => ({
            confidence: `${(v.confidenceLevel * 100).toFixed(1)}%`,
            var: v.var,
            cvar: v.cvar
          })),
          topRisks: result.sensitivityAnalysis.slice(0, 3).map(s => ({
            factor: s.factorName,
            contribution: `${s.contribution.toFixed(1)}%`
          })),
          stressTests: result.stressTests.map(st => ({
            scenario: st.scenarioName,
            impact: `${st.impact.percentageChange.toFixed(1)}%`,
            survivable: st.survivability.canRecover
          }))
        },
        topMitigations: result.mitigations
          .filter(m => m.priority === 'high' || m.priority === 'critical')
          .slice(0, 5)
          .map(m => ({
            category: m.category,
            severity: m.severity,
            recommendation: m.recommendation
          })),
        metadata: {
          createdAt: result.createdAt,
          executionTimeMs: result.executionTimeMs,
          iterations: result.metadata.iterations,
          positionsAnalyzed: result.metadata.positionsAnalyzed
        }
      },
      message: 'Risk simulation completed. Use GET /api/simulate/risk/:id for full results.'
    });
  })
);

/**
 * @route GET /api/simulate/risk/:id
 * @desc Get risk simulation results by ID
 * @access Public
 */
router.get(
  '/risk/:id',
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
 * @route GET /api/simulate/risk/:id/var
 * @desc Get VaR results for a simulation
 * @access Public
 */
router.get(
  '/risk/:id/var',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const varResults = engine.getVaR(id);

    if (!varResults) {
      res.status(404).json({
        success: false,
        error: 'Simulation not found or VaR not computed'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        varResults,
        summary: {
          var95: varResults.find(v => v.confidenceLevel === 0.95)?.var || 0,
          var99: varResults.find(v => v.confidenceLevel === 0.99)?.var || 0,
          var999: varResults.find(v => v.confidenceLevel === 0.999)?.var || 0
        }
      }
    });
  })
);

/**
 * @route GET /api/simulate/risk/:id/sensitivity
 * @desc Get sensitivity analysis results
 * @access Public
 */
router.get(
  '/risk/:id/sensitivity',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = engine.get(id);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        sensitivityAnalysis: result.sensitivityAnalysis,
        tornadoChart: result.sensitivityAnalysis.map(s => ({
          factor: s.factorName,
          low: s.tornado.low,
          base: s.tornado.base,
          high: s.tornado.high
        }))
      }
    });
  })
);

/**
 * @route GET /api/simulate/risk/:id/stress
 * @desc Get stress test results
 * @access Public
 */
router.get(
  '/risk/:id/stress',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const result = engine.get(id);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: {
        stressTests: result.stressTests,
        summary: {
          totalScenarios: result.stressTests.length,
          survivableScenarios: result.stressTests.filter(st => st.survivability.canRecover).length,
          worstCase: result.stressTests.reduce((worst, st) =>
            st.impact.percentageChange < worst.impact.percentageChange ? st : worst
          )
        }
      }
    });
  })
);

/**
 * @route GET /api/simulate/risk/:id/mitigations
 * @desc Get risk mitigation recommendations
 * @access Public
 */
router.get(
  '/risk/:id/mitigations',
  asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { priority, category } = req.query;

    const result = engine.get(id);

    if (!result) {
      res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
      return;
    }

    let mitigations = result.mitigations;

    if (priority) {
      mitigations = mitigations.filter(m => m.priority === priority);
    }

    if (category) {
      mitigations = mitigations.filter(m => m.category === category);
    }

    res.status(200).json({
      success: true,
      data: {
        mitigations,
        summary: {
          total: mitigations.length,
          byPriority: mitigations.reduce((acc, m) => {
            acc[m.priority] = (acc[m.priority] || 0) + 1;
            return acc;
          }, {} as Record<string, number>),
          byCategory: mitigations.reduce((acc, m) => {
            acc[m.category] = (acc[m.category] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      }
    });
  })
);

export default router;
