import { Router, Request, Response } from 'express';
import { Briefing } from '../models/Briefing';
import { Metric } from '../models/Metric';
import { v4 as uuidv4 } from 'uuid';
import { ApiResponse, Recommendation } from '../types';

const router = Router();

// In-memory recommendations store (in production, use a database)
const recommendations: Recommendation[] = [];

/**
 * GET /api/executive/recommendations
 * Get AI-powered executive recommendations
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { category, status, priority, limit = '20' } = req.query;
    const limitNum = parseInt(limit as string, 10);

    let filtered = [...recommendations];

    if (category) {
      filtered = filtered.filter(r => r.category === category);
    }
    if (status) {
      filtered = filtered.filter(r => r.status === status);
    }
    if (priority) {
      filtered = filtered.filter(r => r.priority <= parseInt(priority as string, 10));
    }

    // Sort by priority
    filtered.sort((a, b) => a.priority - b.priority);

    const response: ApiResponse<Recommendation[]> = {
      success: true,
      data: filtered.slice(0, limitNum)
    };

    res.json(response);
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recommendations',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/recommendations/strategic
 * Get strategic recommendations
 */
router.get('/strategic', async (req: Request, res: Response) => {
  try {
    // Get recent briefings and metrics to generate strategic recommendations
    const briefings = await Briefing.find()
      .sort({ date: -1 })
      .limit(7)
      .exec();

    const metrics = await Metric.find().exec();

    // Generate strategic recommendations based on data
    const strategicRecs = generateStrategicRecommendations(briefings, metrics);

    res.json({
      success: true,
      data: strategicRecs
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to generate strategic recommendations',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/recommendations/operational
 * Get operational recommendations
 */
router.get('/operational', async (_req: Request, res: Response) => {
  try {
    const opsRecs = recommendations.filter(r => r.category === 'operations');
    opsRecs.sort((a, b) => a.priority - b.priority);

    res.json({
      success: true,
      data: opsRecs.slice(0, 10)
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch operational recommendations',
      message: err.message
    });
  }
});

/**
 * GET /api/executive/recommendations/by-category
 * Get recommendations grouped by category
 */
router.get('/by-category', async (_req: Request, res: Response) => {
  try {
    const categories = ['strategy', 'operations', 'finance', 'marketing', 'hr', 'technology'];
    const grouped: Record<string, Recommendation[]> = {};

    for (const cat of categories) {
      grouped[cat] = recommendations
        .filter(r => r.category === cat)
        .sort((a, b) => a.priority - b.priority);
    }

    res.json({
      success: true,
      data: grouped
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to fetch grouped recommendations',
      message: err.message
    });
  }
});

/**
 * POST /api/executive/recommendations
 * Add a new recommendation
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { category, title, description, rationale, impact, effort, dataPoints } = req.body;

    const recommendation: Recommendation = {
      id: uuidv4(),
      category: category || 'strategy',
      title,
      description,
      rationale: rationale || '',
      impact: impact || 'medium',
      effort: effort || 'medium',
      priority: recommendations.length + 1,
      dataPoints: dataPoints || [],
      status: 'suggested',
      createdAt: new Date()
    };

    recommendations.push(recommendation);

    res.status(201).json({
      success: true,
      data: recommendation,
      message: 'Recommendation added'
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to add recommendation',
      message: err.message
    });
  }
});

/**
 * PATCH /api/executive/recommendations/:id
 * Update recommendation status
 */
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, priority } = req.body;

    const index = recommendations.findIndex(r => r.id === id);

    if (index === -1) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
      return;
    }

    if (status) recommendations[index].status = status;
    if (priority) recommendations[index].priority = priority;

    res.json({
      success: true,
      data: recommendations[index],
      message: 'Recommendation updated'
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to update recommendation',
      message: err.message
    });
  }
});

/**
 * DELETE /api/executive/recommendations/:id
 * Delete a recommendation
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const index = recommendations.findIndex(r => r.id === id);

    if (index === -1) {
      res.status(404).json({
        success: false,
        error: 'Recommendation not found'
      });
      return;
    }

    recommendations.splice(index, 1);

    res.json({
      success: true,
      message: 'Recommendation deleted'
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({
      success: false,
      error: 'Failed to delete recommendation',
      message: err.message
    });
  }
});

// Helper function to generate strategic recommendations
function generateStrategicRecommendations(briefings: any[], metrics: any[]): Recommendation[] {
  const recs: Recommendation[] = [];

  // Analyze metrics for recommendations
  const atRiskMetrics = metrics.filter(m =>
    m.status === 'at-risk' || m.status === 'off-track'
  );

  if (atRiskMetrics.length > 0) {
    recs.push({
      id: uuidv4(),
      category: 'operations',
      title: 'Address At-Risk Metrics',
      description: `${atRiskMetrics.length} metrics are currently at-risk or off-track and require attention.`,
      rationale: `Performance variance exceeds acceptable thresholds for: ${atRiskMetrics.map(m => m.name).join(', ')}`,
      impact: 'high',
      effort: 'medium',
      priority: 1,
      dataPoints: atRiskMetrics.map(m => `${m.name}: ${m.changePercent}%`),
      status: 'suggested',
      createdAt: new Date()
    });
  }

  // Analyze briefing trends
  if (briefings.length >= 3) {
    const recentOpportunities = briefings[0].opportunities.filter((o: any) => o.potential === 'high');
    if (recentOpportunities.length > 0) {
      recs.push({
        id: uuidv4(),
        category: 'strategy',
        title: 'Capitalize on High-Potential Opportunities',
        description: `${recentOpportunities.length} high-potential opportunities identified in recent briefings.`,
        rationale: recentOpportunities.map((o: any) => o.title).join('; '),
        impact: 'high',
        effort: 'high',
        priority: 2,
        dataPoints: recentOpportunities.map((o: any) => `${o.title} (${o.category})`),
        estimatedOutcome: 'Revenue growth and market expansion',
        status: 'suggested',
        createdAt: new Date()
      });
    }

    // Check for recurring risks
    const recurringRisks = briefings.flatMap((b: any) =>
      b.risks.filter((r: any) => r.status === 'active').map((r: any) => r.title)
    );
    const riskCounts: Record<string, number> = {};
    recurringRisks.forEach((r: string) => {
      riskCounts[r] = (riskCounts[r] || 0) + 1;
    });

    const persistentRisks = Object.entries(riskCounts)
      .filter(([_, count]) => count >= 2)
      .map(([risk]) => risk);

    if (persistentRisks.length > 0) {
      recs.push({
        id: uuidv4(),
        category: 'strategy',
        title: 'Address Persistent Risks',
        description: `Several risks have appeared in multiple briefings and need strategic resolution.`,
        rationale: persistentRisks.join('; '),
        impact: 'medium',
        effort: 'medium',
        priority: 3,
        dataPoints: persistentRisks,
        status: 'suggested',
        createdAt: new Date()
      });
    }
  }

  // Revenue growth recommendation
  const revenueMetric = metrics.find(m => m.name.toLowerCase().includes('revenue'));
  if (revenueMetric && revenueMetric.changePercent < 5) {
    recs.push({
      id: uuidv4(),
      category: 'finance',
      title: 'Accelerate Revenue Growth',
      description: 'Revenue growth is below target. Consider reviewing pricing strategy or expanding market reach.',
      rationale: `Current growth: ${revenueMetric.changePercent}%`,
      impact: 'high',
      effort: 'high',
      priority: 4,
      dataPoints: [`Current: ${revenueMetric.value}`, `Change: ${revenueMetric.changePercent}%`],
      alternatives: ['Price optimization', 'New market entry', 'Partnership expansion'],
      status: 'suggested',
      createdAt: new Date()
    });
  }

  return recs;
}

export default router;
