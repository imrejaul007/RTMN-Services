import { Router, Request, Response } from 'express';
import { RecommendationModel, Factor } from '../models';
import { FactorAnalyzer } from '../services/factorAnalyzer';
import { RecommendationGenerator } from '../services/recommendationGenerator';
import { ApiResponse, Recommendation, ContributingFactor } from '../types';

const router = Router();
const factorAnalyzer = new FactorAnalyzer();
const recommendationGenerator = new RecommendationGenerator();

/**
 * GET /api/recommendations
 * Get all recommendations for a tenant
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const status = req.query.status as Recommendation['status'];
    const limit = parseInt(req.query.limit as string) || 50;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId query parameter is required'
      } as ApiResponse<null>);
    }

    const query: Record<string, unknown> = { tenantId };
    if (status) {
      query.status = status;
    }

    const recommendations = await RecommendationModel.find(query)
      .sort({ priority: 1, createdAt: -1 })
      .limit(limit);

    const data = recommendations.map(r => ({
      id: r.recommendationId,
      analysisId: r.analysisId,
      tenantId: r.tenantId,
      title: r.title,
      description: r.description,
      priority: r.priority,
      expectedImpact: r.expectedImpact,
      estimatedCost: r.estimatedCost,
      estimatedSavings: r.estimatedSavings,
      roi: r.roi,
      implementationEffort: r.implementationEffort,
      timeframe: r.timeframe,
      relatedFactors: r.relatedFactors,
      linkedHistoricalCases: r.linkedHistoricalCases,
      status: r.status,
      createdAt: r.createdAt
    }));

    const response: ApiResponse<typeof data> = {
      success: true,
      data
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get recommendations error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to retrieve recommendations',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/recommendations/summary
 * Get recommendation summary and statistics
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId query parameter is required'
      } as ApiResponse<null>);
    }

    const summary = await recommendationGenerator.getRecommendationSummary(tenantId);

    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Summary error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to retrieve summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/recommendations/by-status/:status
 * Get recommendations by status
 */
router.get('/by-status/:status', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const { status } = req.params;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId query parameter is required'
      } as ApiResponse<null>);
    }

    const validStatuses: Recommendation['status'][] = ['proposed', 'approved', 'implemented', 'rejected'];
    if (!validStatuses.includes(status as Recommendation['status'])) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      } as ApiResponse<null>);
    }

    const recommendations = await recommendationGenerator.getRecommendationsByStatus(
      tenantId,
      status as Recommendation['status']
    );

    const response: ApiResponse<typeof recommendations> = {
      success: true,
      data: recommendations
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Get by status error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to retrieve recommendations',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/recommendations/:id/status
 * Update recommendation status
 */
router.patch('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses: Recommendation['status'][] = ['proposed', 'approved', 'implemented', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
      } as ApiResponse<null>);
    }

    const recommendation = await recommendationGenerator.updateRecommendationStatus(
      id,
      status
    );

    if (!recommendation) {
      return res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      } as ApiResponse<null>);
    }

    const response: ApiResponse<Recommendation> = {
      success: true,
      data: recommendation,
      message: `Recommendation status updated to ${status}`
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Update status error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to update status',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/recommendations/factors
 * Get contributing factors summary
 */
router.get('/factors', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId query parameter is required'
      } as ApiResponse<null>);
    }

    const summary = await factorAnalyzer.getFactorSummary(tenantId);

    const response: ApiResponse<typeof summary> = {
      success: true,
      data: summary
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Factors summary error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to retrieve factors summary',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/recommendations/factors/controllable
 * Get only controllable factors
 */
router.get('/factors/controllable', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;

    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: 'tenantId query parameter is required'
      } as ApiResponse<null>);
    }

    const factors = await factorAnalyzer.getControllableFactors(tenantId);

    const response: ApiResponse<typeof factors> = {
      success: true,
      data: factors
    };

    res.status(200).json(response);
  } catch (error) {
    console.error('Controllable factors error:', error);
    const response: ApiResponse<null> = {
      success: false,
      error: 'Failed to retrieve controllable factors',
      message: error instanceof Error ? error.message : 'Unknown error'
    };
    res.status(500).json(response);
  }
});

export default router;
