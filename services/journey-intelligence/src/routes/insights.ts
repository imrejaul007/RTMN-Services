/**
 * Insights Routes
 * API endpoints for journey insights and recommendations
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { journeyTracker } from '../services/tracker';
import { dropoutDetector } from '../services/dropoutDetector';
import { conversionPredictor } from '../services/conversionPredictor';
import {
  GetInsightsRequest,
  DropoutRiskLevel,
  ApiResponse,
  JourneyInsights,
  DropoutAlert,
  ConversionPrediction
} from '../types';

const router = Router();

// Validation schemas
const getInsightsSchema = z.object({
  customerId: z.string().min(1),
  tenantId: z.string().optional(),
  includeRecommendations: z.boolean().optional()
});

const dropoutQuerySchema = z.object({
  customerId: z.string().optional(),
  tenantId: z.string().optional(),
  minRiskLevel: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

/**
 * Get journey insights for a customer
 * GET /api/insights/:customerId
 */
router.get('/:customerId', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    // Get customer journey
    const journey = await journeyTracker.getCustomerJourney(customerId, tenantId);

    if (!journey) {
      const response: ApiResponse = {
        success: false,
        error: 'Journey not found',
        timestamp: new Date()
      };
      return res.status(404).json(response);
    }

    // Get touchpoints for analysis
    const touchpoints = await journeyTracker.getTouchpoints(customerId, tenantId);

    // Calculate insights
    const currentStageIndex = ['awareness', 'consideration', 'acquisition', 'activation', 'retention', 'referral']
      .indexOf(journey.currentStage);

    const stageProgress = Math.min(100, Math.max(0, currentStageIndex * 20 + Math.floor(Math.random() * 20)));

    const insights: JourneyInsights = {
      customerId,
      tenantId,
      journeyId: journey._id!.toString(),
      currentStage: journey.currentStage,
      stageProgress: {
        stage: journey.currentStage,
        enteredAt: journey.stages[journey.stages.length - 1]?.enteredAt || new Date(),
        duration: Math.floor((Date.now() - (journey.stages[journey.stages.length - 1]?.enteredAt?.getTime() || Date.now())) / 1000),
        progress: stageProgress,
        nextStage: currentStageIndex < 5
          ? (['awareness', 'consideration', 'acquisition', 'activation', 'retention', 'referral'] as const)[currentStageIndex + 1]
          : undefined,
        timeToNextStage: Math.floor(Math.random() * 7 * 24 * 60 * 60) // Random 0-7 days in seconds
      },
      touchpointCount: touchpoints.length,
      totalRevenue: journey.value,
      avgSessionDuration: touchpoints.length > 0
        ? touchpoints.reduce((sum, t) => sum + (t.duration || 0), 0) / touchpoints.length
        : 0,
      engagementScore: Math.min(100, touchpoints.length * 10),
      conversionProbability: await conversionPredictor.predictConversion(customerId, tenantId)
        .then(p => p?.conversionProbability || 0.5),
      predictedChurnRisk: await dropoutDetector.detectDropoutRisk(customerId, tenantId)
        .then(a => a?.dropoutProbability || 0.1),
      recommendations: generateRecommendations(journey.currentStage, touchpoints),
      insights: generateInsights(touchpoints, journey),
      generatedAt: new Date()
    };

    const response: ApiResponse<JourneyInsights> = {
      success: true,
      data: insights,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get dropout risk for a customer
 * GET /api/insights/:customerId/dropout
 */
router.get('/:customerId/dropout', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    const alert = await dropoutDetector.detectDropoutRisk(customerId, tenantId);

    if (!alert) {
      const response: ApiResponse = {
        success: true,
        data: null,
        message: 'No dropout risk detected',
        timestamp: new Date()
      };
      return res.json(response);
    }

    const response: ApiResponse<DropoutAlert> = {
      success: true,
      data: alert,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get conversion prediction
 * GET /api/insights/:customerId/conversion
 */
router.get('/:customerId/conversion', async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const tenantId = req.query.tenantId as string || 'public';

    const prediction = await conversionPredictor.predictConversion(customerId, tenantId);

    if (!prediction) {
      const response: ApiResponse = {
        success: false,
        error: 'Journey not found or already converted',
        timestamp: new Date()
      };
      return res.status(404).json(response);
    }

    const response: ApiResponse<ConversionPrediction> = {
      success: true,
      data: prediction,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get all dropout alerts for tenant
 * GET /api/insights/alerts/dropout
 */
router.get('/alerts/dropout', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'public';
    const minRiskLevel = req.query.minRiskLevel as DropoutRiskLevel || 'medium';
    const limit = parseInt(req.query.limit as string) || 100;

    const alerts = await dropoutDetector.detectAllDropoutRisks(tenantId, {
      minRiskLevel,
      limit
    });

    const response: ApiResponse<{
      alerts: DropoutAlert[];
      summary: {
        critical: number;
        high: number;
        medium: number;
        low: number;
      };
    }> = {
      success: true,
      data: {
        alerts,
        summary: {
          critical: alerts.filter(a => a.riskLevel === 'critical').length,
          high: alerts.filter(a => a.riskLevel === 'high').length,
          medium: alerts.filter(a => a.riskLevel === 'medium').length,
          low: alerts.filter(a => a.riskLevel === 'low').length
        }
      },
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get conversion probability distribution
 * GET /api/insights/distribution/conversion
 */
router.get('/distribution/conversion', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'public';
    const buckets = parseInt(req.query.buckets as string) || 5;

    const distribution = await conversionPredictor.getProbabilityDistribution(
      tenantId,
      buckets
    );

    const response: ApiResponse<typeof distribution> = {
      success: true,
      data: distribution,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Batch get conversion predictions
 * POST /api/insights/batch/conversion
 */
router.post('/batch/conversion', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'public';
    const customerIds = req.body.customerIds as string[];

    if (!Array.isArray(customerIds) || customerIds.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'customerIds array is required',
        timestamp: new Date()
      };
      return res.status(400).json(response);
    }

    const predictions = await conversionPredictor.batchPredict(customerIds, tenantId);

    const response: ApiResponse<ConversionPrediction[]> = {
      success: true,
      data: predictions,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

/**
 * Get high-value predictions
 * GET /api/insights/high-value
 */
router.get('/predictions/high-value', async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string || 'public';
    const minProbability = parseFloat(req.query.minProbability as string) || 0.5;
    const limit = parseInt(req.query.limit as string) || 20;

    // Get all active journeys and predict
    const { CustomerJourney } = await import('../models/Journey');
    const journeys = await CustomerJourney.findActiveByTenant(tenantId);

    const predictions: Array<ConversionPrediction & { journeyId: string }> = [];

    for (const journey of journeys) {
      const prediction = await conversionPredictor.predictConversion(
        journey.customerId,
        tenantId
      );

      if (prediction && prediction.conversionProbability >= minProbability) {
        predictions.push({
          ...prediction,
          journeyId: journey._id!.toString()
        });
      }
    }

    // Sort by predicted value and limit
    const topPredictions = predictions
      .sort((a, b) => b.predictedValue - a.predictedValue)
      .slice(0, limit);

    const response: ApiResponse<typeof topPredictions> = {
      success: true,
      data: topPredictions,
      timestamp: new Date()
    };

    res.json(response);
  } catch (error) {
    const response: ApiResponse = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date()
    };
    res.status(500).json(response);
  }
});

// Helper functions
function generateRecommendations(
  stage: string,
  touchpoints: Array<{ type: string }>
): Array<{ type: string; priority: string; title: string; description: string; expectedImpact: string }> {
  const recommendations: Array<{ type: string; priority: string; title: string; description: string; expectedImpact: string }> = [];

  switch (stage) {
    case 'awareness':
      recommendations.push({
        type: 'action',
        priority: 'high',
        title: 'Increase ad spend',
        description: 'Customer is in early awareness stage. Increase exposure through targeted ads.',
        expectedImpact: '+15% awareness'
      });
      break;
    case 'consideration':
      recommendations.push({
        type: 'content',
        priority: 'high',
        title: 'Send case studies',
        description: 'Customer is comparing options. Provide social proof through case studies.',
        expectedImpact: '+20% consideration'
      });
      break;
    case 'acquisition':
      recommendations.push({
        type: 'channel',
        priority: 'high',
        title: 'Simplify signup flow',
        description: 'Reduce friction in the signup process to improve conversion.',
        expectedImpact: '+10% conversion'
      });
      break;
    case 'activation':
      recommendations.push({
        type: 'content',
        priority: 'high',
        title: 'Onboarding sequence',
        description: 'Send automated onboarding emails to help customer get started.',
        expectedImpact: '+25% activation'
      });
      break;
    case 'retention':
      recommendations.push({
        type: 'action',
        priority: 'medium',
        title: 'Loyalty program',
        description: 'Customer is active. Introduce loyalty rewards to increase engagement.',
        expectedImpact: '+15% retention'
      });
      break;
    case 'referral':
      recommendations.push({
        type: 'action',
        priority: 'high',
        title: 'Referral program',
        description: 'Customer is highly engaged. Encourage referrals with incentives.',
        expectedImpact: '+30% referrals'
      });
      break;
  }

  // Add personalization recommendation if no touchpoints
  if (touchpoints.length === 0) {
    recommendations.push({
      type: 'timing',
      priority: 'high',
      title: 'Re-engage customer',
      description: 'No recent activity detected. Send re-engagement email.',
      expectedImpact: '+10% engagement'
    });
  }

  return recommendations;
}

function generateInsights(
  touchpoints: Array<{ type: string; timestamp: Date; revenue?: number }>,
  journey: InstanceType<typeof import('../models/Journey').CustomerJourney>
): Array<{ type: string; title: string; description: string; data: Record<string, unknown>; timestamp: Date }> {
  const insights: Array<{ type: string; title: string; description: string; data: Record<string, unknown>; timestamp: Date }> = [];

  // Pattern insights
  if (touchpoints.length > 5) {
    insights.push({
      type: 'pattern',
      title: 'High engagement pattern',
      description: 'Customer shows consistent engagement across multiple touchpoints.',
      data: { touchpointCount: touchpoints.length },
      timestamp: new Date()
    });
  }

  // Revenue insights
  const totalRevenue = touchpoints.reduce((sum, t) => sum + (t.revenue || 0), 0);
  if (totalRevenue > 0) {
    insights.push({
      type: 'opportunity',
      title: 'Revenue opportunity',
      description: 'Customer has made purchases. Focus on upselling.',
      data: { totalRevenue },
      timestamp: new Date()
    });
  }

  // Channel insights
  const channels = [...new Set(touchpoints.map(t => t.type))];
  if (channels.length > 3) {
    insights.push({
      type: 'pattern',
      title: 'Multi-channel engagement',
      description: 'Customer engages through multiple channels.',
      data: { channelCount: channels.length, channels },
      timestamp: new Date()
    });
  }

  // Risk insights
  const lastTouch = touchpoints[0];
  if (lastTouch) {
    const daysSinceLastTouch = Math.floor(
      (Date.now() - lastTouch.timestamp.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysSinceLastTouch > 7) {
      insights.push({
        type: 'risk',
        title: 'Inactivity detected',
        description: `No activity for ${daysSinceLastTouch} days. Consider re-engagement.`,
        data: { daysSinceLastTouch },
        timestamp: new Date()
      });
    }
  }

  return insights;
}

export default router;
