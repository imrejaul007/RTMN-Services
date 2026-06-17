import { Router, Request, Response } from 'express';
import { optimizationService } from '../services/optimization';

const router = Router();

// GET /api/marketing/optimize/:campaignId - Get optimization recommendations for a campaign
router.get('/:campaignId', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const optimization = await optimizationService.optimizeCampaign(campaignId);

    if (!optimization) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    res.json({
      success: true,
      data: optimization
    });
  } catch (error) {
    console.error('Error optimizing campaign:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to optimize campaign'
    });
  }
});

// GET /api/marketing/optimize/:campaignId/predictions - Get ROI predictions
router.get('/:campaignId/predictions', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const optimization = await optimizationService.optimizeCampaign(campaignId);

    if (!optimization) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        campaignId,
        predictions: optimization.predictions,
        confidenceInterval: optimization.predictions.confidenceInterval,
        assumptions: optimization.predictions.assumptions
      }
    });
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch predictions'
    });
  }
});

// GET /api/marketing/optimize/:campaignId/ab-tests - Get A/B test recommendations
router.get('/:campaignId/ab-tests', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const optimization = await optimizationService.optimizeCampaign(campaignId);

    if (!optimization) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        campaignId,
        abTests: optimization.abTests,
        recommendedPriority: optimization.abTests
          .sort((a, b) => b.expectedLift - a.expectedLift)[0]
      }
    });
  } catch (error) {
    console.error('Error fetching A/B tests:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch A/B test recommendations'
    });
  }
});

// GET /api/marketing/optimize/:campaignId/budget - Get budget reallocation recommendations
router.get('/:campaignId/budget', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const optimization = await optimizationService.optimizeCampaign(campaignId);

    if (!optimization) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        campaignId,
        budgetReallocation: optimization.budgetReallocation || [],
        estimatedImpact: optimization.budgetReallocation?.reduce(
          (sum, r) => sum + r.amount, 0
        ) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching budget recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch budget recommendations'
    });
  }
});

// GET /api/marketing/optimize/:campaignId/score - Get campaign success score
router.get('/:campaignId/score', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const score = await optimizationService.predictCampaignSuccess(campaignId);

    if (score.score === 0 && score.recommendation === 'Campaign not found') {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        campaignId,
        score: score.score,
        factors: score.factors,
        recommendation: score.recommendation,
        status: score.score >= 80 ? 'excellent' :
                score.score >= 60 ? 'good' :
                score.score >= 40 ? 'needs_improvement' : 'poor'
      }
    });
  } catch (error) {
    console.error('Error calculating score:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to calculate campaign score'
    });
  }
});

// GET /api/marketing/optimize/:campaignId/recommendations - Get optimization recommendations
router.get('/:campaignId/recommendations', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const recommendations = await optimizationService.getCampaignRecommendations(campaignId);

    if (recommendations.length === 0) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found or no recommendations available'
      });
      return;
    }

    res.json({
      success: true,
      data: {
        campaignId,
        recommendations: recommendations.map((action, index) => ({
          priority: index < 2 ? 'high' : index < 4 ? 'medium' : 'low',
          action
        }))
      }
    });
  } catch (error) {
    console.error('Error fetching recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendations'
    });
  }
});

// POST /api/marketing/optimize/:campaignId/apply - Apply optimization recommendations
router.post('/:campaignId/apply', async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;
    const { recommendations } = req.body;

    const optimization = await optimizationService.optimizeCampaign(campaignId);

    if (!optimization) {
      res.status(404).json({
        success: false,
        error: 'Campaign not found'
      });
      return;
    }

    // Simulate applying recommendations
    const applied = recommendations?.map((rec: string) => ({
      recommendation: rec,
      status: 'applied',
      appliedAt: new Date(),
      expectedImpact: optimization.recommendations.find(r => r.action === rec)?.expectedImpact || 0
    })) || [];

    res.json({
      success: true,
      data: {
        campaignId,
        appliedRecommendations: applied,
        message: 'Recommendations marked as applied'
      }
    });
  } catch (error) {
    console.error('Error applying recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to apply recommendations'
    });
  }
});

export default router;
