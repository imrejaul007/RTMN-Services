import { Router, Request, Response } from 'express';
import { getRecommendations, createRecommendation } from '../services/recommendation';
import { ApiResponse, RecommendationType, IRecommendation } from '../types';

const router = Router();

/**
 * GET /api/sales/recommend/:leadId
 * Get AI recommendations for a specific lead
 */
router.get('/recommend/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { type, limit, status } = req.query;

    if (!leadId) {
      const response: ApiResponse = {
        success: false,
        error: 'Lead ID is required'
      };
      return res.status(400).json(response);
    }

    const recommendations = await getRecommendations({
      leadId,
      type: type as RecommendationType | undefined,
      limit: limit ? Number(limit) : undefined,
      status: status as string | undefined
    });

    const response: ApiResponse<IRecommendation[]> = {
      success: true,
      data: recommendations,
      message: `Found ${recommendations.length} recommendations for lead ${leadId}`
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get recommendations'
    };
    res.status(500).json(response);
  }
});

/**
 * POST /api/sales/recommend/:leadId
 * Create a new recommendation for a lead
 */
router.post('/recommend/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const { type, priority, title, description, action, reasoning } = req.body;

    if (!leadId || !type || !title || !description || !action) {
      const response: ApiResponse = {
        success: false,
        error: 'Missing required fields: leadId, type, title, description, action'
      };
      return res.status(400).json(response);
    }

    const recommendation = await createRecommendation({
      leadId,
      type,
      priority: priority || 5,
      title,
      description,
      action,
      reasoning
    });

    const response: ApiResponse<IRecommendation> = {
      success: true,
      data: recommendation,
      message: 'Recommendation created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create recommendation'
    };
    res.status(500).json(response);
  }
});

/**
 * PUT /api/sales/recommend/:recommendationId/status
 * Update recommendation status
 */
router.put('/recommend/:recommendationId/status', async (req: Request, res: Response) => {
  try {
    const { recommendationId } = req.params;
    const { status } = req.body;

    if (!recommendationId || !status) {
      const response: ApiResponse = {
        success: false,
        error: 'Recommendation ID and status are required'
      };
      return res.status(400).json(response);
    }

    const { Recommendation } = await import('../models/Recommendation');
    const { RecommendationStatus } = await import('../types');

    const recommendation = await Recommendation.findById(recommendationId);

    if (!recommendation) {
      const response: ApiResponse = {
        success: false,
        error: 'Recommendation not found'
      };
      return res.status(404).json(response);
    }

    switch (status) {
      case 'accepted':
        await recommendation.accept();
        break;
      case 'rejected':
        await recommendation.reject();
        break;
      case 'completed':
        await recommendation.complete();
        break;
      default:
        recommendation.status = status;
        await recommendation.save();
    }

    const response: ApiResponse = {
      success: true,
      data: recommendation,
      message: `Recommendation status updated to ${status}`
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update recommendation'
    };
    res.status(500).json(response);
  }
});

/**
 * GET /api/sales/recommend/top-actions
 * Get top recommended actions across all leads
 */
router.get('/recommend/top-actions', async (req: Request, res: Response) => {
  try {
    const { limit } = req.query;

    const { Recommendation } = await import('../models/Recommendation');
    const { RecommendationStatus } = await import('../types');

    const topActions = await Recommendation.getTopRecommendations(
      limit ? Number(limit) : 10
    );

    const response: ApiResponse = {
      success: true,
      data: topActions,
      message: `Found ${topActions.length} top actions`
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get top actions'
    };
    res.status(500).json(response);
  }
});

export default router;
