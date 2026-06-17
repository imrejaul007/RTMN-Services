import { Router, Request, Response } from 'express';
import { ResultModel } from '../models/Result';
import { SimulationModel } from '../models/Simulation';
import { ScenarioModel } from '../models/Scenario';
import {
  SimulationResults,
  ScenarioCategory,
  ApiResponse,
  ScenarioComparison,
} from '../types';
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

const router = Router();

// GET /api/results - List cached results
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const category = req.query.category as ScenarioCategory;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    const [results, total] = await Promise.all([
      ResultModel.findByTenant(tenantId, { category, limit, offset }),
      ResultModel.countDocuments({ tenantId, ...(category && { category }) }),
    ]);

    res.json({
      success: true,
      data: results,
      meta: {
        total,
        page: Math.floor(offset / limit) + 1,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    logger.error('Error listing results:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to list results',
      },
    });
  }
});

// GET /api/results/:simulationId - Get results by simulation ID
router.get('/:simulationId', async (req: Request, res: Response) => {
  try {
    const { simulationId } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    const result = await ResultModel.findOne({
      simulationId,
      tenantId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Results for simulation ${simulationId} not found`,
        },
      });
    }

    const response: ApiResponse<typeof result.results> = {
      success: true,
      data: result.results,
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching results:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch results',
      },
    });
  }
});

// GET /api/results/:simulationId/summary - Get results summary only
router.get('/:simulationId/summary', async (req: Request, res: Response) => {
  try {
    const { simulationId } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    const result = await ResultModel.findOne({
      simulationId,
      tenantId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Results for simulation ${simulationId} not found`,
        },
      });
    }

    res.json({
      success: true,
      data: {
        simulationId: result.simulationId,
        scenarioId: result.scenarioId,
        category: result.category,
        summary: result.results.summary,
        impactSummary: result.results.impactSummary,
        riskAnalysis: {
          overallRiskScore: result.results.riskAnalysis.overallRiskScore,
          riskLevel: result.results.riskAnalysis.riskLevel,
          valueAtRisk: result.results.riskAnalysis.valueAtRisk,
        },
        recommendationsCount: result.results.recommendations.length,
        cachedAt: result.cachedAt,
        expiresAt: result.expiresAt,
      },
    });
  } catch (error) {
    logger.error('Error fetching results summary:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch results summary',
      },
    });
  }
});

// GET /api/results/:simulationId/metrics - Get metrics only
router.get('/:simulationId/metrics', async (req: Request, res: Response) => {
  try {
    const { simulationId } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    const result = await ResultModel.findOne({
      simulationId,
      tenantId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Results for simulation ${simulationId} not found`,
        },
      });
    }

    res.json({
      success: true,
      data: result.results.metrics,
    });
  } catch (error) {
    logger.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch metrics',
      },
    });
  }
});

// GET /api/results/:simulationId/recommendations - Get recommendations only
router.get('/:simulationId/recommendations', async (req: Request, res: Response) => {
  try {
    const { simulationId } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    const result = await ResultModel.findOne({
      simulationId,
      tenantId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Results for simulation ${simulationId} not found`,
        },
      });
    }

    res.json({
      success: true,
      data: result.results.recommendations,
    });
  } catch (error) {
    logger.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch recommendations',
      },
    });
  }
});

// GET /api/results/:simulationId/risk - Get risk analysis only
router.get('/:simulationId/risk', async (req: Request, res: Response) => {
  try {
    const { simulationId } = req.params;
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    const result = await ResultModel.findOne({
      simulationId,
      tenantId,
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: `Results for simulation ${simulationId} not found`,
        },
      });
    }

    res.json({
      success: true,
      data: result.results.riskAnalysis,
    });
  } catch (error) {
    logger.error('Error fetching risk analysis:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch risk analysis',
      },
    });
  }
});

// GET /api/results/compare - Compare results from multiple simulations
router.get('/compare', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const simulationIds = (req.query.ids as string)?.split(',') || [];

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_TENANT',
          message: 'tenantId query parameter is required',
        },
      });
    }

    if (simulationIds.length < 2) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INSUFFICIENT_DATA',
          message: 'At least 2 simulation IDs required for comparison',
        },
      });
    }

    const results = await ResultModel.find({
      simulationId: { $in: simulationIds },
      tenantId,
    });

    if (results.length < 2) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Not enough results found for comparison',
        },
      });
    }

    // Build comparison data
    const comparison = {
      scenarios: results.map(r => ({
        simulationId: r.simulationId,
        scenarioId: r.scenarioId,
        category: r.category,
        impactSummary: r.results.impactSummary,
        riskScore: r.results.riskAnalysis.overallRiskScore,
        riskLevel: r.results.riskAnalysis.riskLevel,
        recommendationsCount: r.results.recommendations.length,
      })) as ScenarioComparison[],
      bestScenario: null as string | null,
      lowestRisk: null as string | null,
      highestNetImpact: null as string | null,
    };

    // Find best scenarios
    if (comparison.scenarios.length > 0) {
      // Best by net impact
      const byNetImpact = [...comparison.scenarios].sort(
        (a, b) => b.impactSummary.netImpact.changePercent - a.impactSummary.netImpact.changePercent
      );
      comparison.highestNetImpact = byNetImpact[0].scenarioId;

      // Lowest risk
      const byRisk = [...comparison.scenarios].sort(
        (a, b) => a.riskScore - b.riskScore
      );
      comparison.lowestRisk = byRisk[0].scenarioId;
    }

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    logger.error('Error comparing results:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to compare results',
      },
    });
  }
});

// POST /api/results/cleanup - Cleanup expired results
router.post('/cleanup', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-api-key'] as string;

    // Simple API key validation
    if (process.env.CLEANUP_API_KEY && apiKey !== process.env.CLEANUP_API_KEY) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid API key',
        },
      });
    }

    const result = await ResultModel.cleanupExpired();

    logger.info(`Cleaned up ${result.deletedCount} expired results`);

    res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
      },
    });
  } catch (error) {
    logger.error('Error cleaning up results:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to cleanup results',
      },
    });
  }
});

export default router;
