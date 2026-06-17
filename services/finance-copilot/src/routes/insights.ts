/**
 * Finance Insights Routes
 */

import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { FinanceInsight } from '../types';

const router = Router();

// Simulated insights generator
function generateInsights(): FinanceInsight[] {
  const insights: FinanceInsight[] = [];
  const now = new Date();

  // Trend insights
  insights.push({
    id: uuidv4(),
    type: 'trend',
    title: 'Revenue Growth Momentum',
    description: 'Monthly revenue has increased by 15% over the past 3 months',
    metric: 115,
    previousMetric: 100,
    change: 15,
    changePercent: 15,
    category: 'revenue',
    priority: 'high',
    generatedAt: now,
    actionableSteps: [
      'Continue current marketing strategies',
      'Analyze which products are driving growth',
      'Prepare for increased operational needs',
    ],
  });

  insights.push({
    id: uuidv4(),
    type: 'trend',
    title: 'Operating Costs Stabilizing',
    description: 'Operating costs have remained flat for the past 2 months',
    metric: 100,
    previousMetric: 102,
    change: -2,
    changePercent: -2,
    category: 'costs',
    priority: 'medium',
    generatedAt: now,
  });

  // Warning insights
  insights.push({
    id: uuidv4(),
    type: 'warning',
    title: 'High Refund Rate Detected',
    description: 'Refund rate has increased to 8% in the past 30 days, exceeding the 5% threshold',
    metric: 8,
    previousMetric: 5,
    change: 3,
    changePercent: 60,
    category: 'refunds',
    priority: 'high',
    generatedAt: now,
    actionableSteps: [
      'Review recent product launches',
      'Analyze refund reasons by category',
      'Check customer feedback for quality issues',
    ],
  });

  insights.push({
    id: uuidv4(),
    type: 'warning',
    title: 'Cash Flow Dip Expected',
    description: 'Net cash flow is projected to decrease by 25% next month due to seasonal factors',
    metric: -25,
    category: 'cashflow',
    priority: 'medium',
    generatedAt: now,
    actionableSteps: [
      'Review payment terms with major clients',
      'Consider short-term financing options',
      'Delay non-essential expenditures',
    ],
  });

  // Opportunity insights
  insights.push({
    id: uuidv4(),
    type: 'opportunity',
    title: 'Cost Savings Opportunity',
    description: 'Potential 10% reduction in utility costs through energy efficiency measures',
    metric: 10,
    category: 'savings',
    priority: 'medium',
    generatedAt: now,
    actionableSteps: [
      'Conduct energy audit',
      'Replace old equipment with energy-efficient models',
      'Implement smart building controls',
    ],
  });

  insights.push({
    id: uuidv4(),
    type: 'opportunity',
    title: 'Working Capital Optimization',
    description: 'Invoice factoring could improve cash conversion cycle by 15 days',
    metric: 15,
    category: 'cashflow',
    priority: 'low',
    generatedAt: now,
  });

  // Anomaly insights
  insights.push({
    id: uuidv4(),
    type: 'anomaly',
    title: 'Unusual Transaction Pattern',
    description: 'Multiple high-value transactions detected from new vendor in past 24 hours',
    metric: 3,
    category: 'anomaly',
    priority: 'high',
    generatedAt: now,
    actionableSteps: [
      'Verify vendor credentials',
      'Review contract terms',
      'Confirm receipt of goods/services',
    ],
  });

  insights.push({
    id: uuidv4(),
    type: 'anomaly',
    title: 'Seasonal Sales Spike',
    description: 'Sales on track to exceed monthly target by 20% due to seasonal demand',
    metric: 20,
    category: 'sales',
    priority: 'low',
    generatedAt: now,
  });

  return insights;
}

/**
 * GET /api/finance/insights
 * Get finance insights
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { type, category, priority } = req.query;

    let insights = generateInsights();

    // Apply filters
    if (type) {
      insights = insights.filter((i) => i.type === type);
    }
    if (category) {
      insights = insights.filter((i) => i.category === category);
    }
    if (priority) {
      insights = insights.filter((i) => i.priority === priority);
    }

    // Sort by priority and date
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    insights.sort((a, b) => {
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime();
    });

    res.json({
      success: true,
      data: insights,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insights',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/insights/summary
 * Get insights summary
 */
router.get('/summary', async (_req: Request, res: Response) => {
  try {
    const insights = generateInsights();

    const summary = {
      total: insights.length,
      byType: {
        trend: insights.filter((i) => i.type === 'trend').length,
        warning: insights.filter((i) => i.type === 'warning').length,
        opportunity: insights.filter((i) => i.type === 'opportunity').length,
        anomaly: insights.filter((i) => i.type === 'anomaly').length,
      },
      byPriority: {
        high: insights.filter((i) => i.priority === 'high').length,
        medium: insights.filter((i) => i.priority === 'medium').length,
        low: insights.filter((i) => i.priority === 'low').length,
      },
      byCategory: {} as Record<string, number>,
      actionable: insights.filter((i) => i.actionableSteps && i.actionableSteps.length > 0).length,
    };

    // Count by category
    insights.forEach((insight) => {
      summary.byCategory[insight.category] = (summary.byCategory[insight.category] || 0) + 1;
    });

    res.json({
      success: true,
      data: summary,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching insights summary:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insights summary',
      timestamp: new Date(),
    });
  }
});

/**
 * GET /api/finance/insights/:id
 * Get specific insight
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const insights = generateInsights();
    const insight = insights.find((i) => i.id === id);

    if (!insight) {
      res.status(404).json({
        success: false,
        error: 'Insight not found',
        timestamp: new Date(),
      });
      return;
    }

    res.json({
      success: true,
      data: insight,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error fetching insight:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch insight',
      timestamp: new Date(),
    });
  }
});

export default router;
