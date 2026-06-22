import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  MenuEngineSchema,
  TurnoverSchema,
  FoodCostSchema,
  LoyaltySchema,
  ReviewSchema,
  PlatformOptimizationSchema,
  GrowthSchema,
} from '../types';
import { menuEngineerService } from '../services/menuEngineer';
import { turnoverOptimizerService } from '../services/turnoverOptimizer';
import { costAnalyzerService } from '../services/costAnalyzer';
import { loyaltyManagerService } from '../services/loyaltyManager';
import { reviewManagerService } from '../services/reviewManager';
import { platformOptimizerService } from '../services/platformOptimizer';
import { salesAgent } from '../composers/salesAgent';
import { marketingAgent } from '../composers/marketingAgent';
import { loyaltyAgent } from '../composers/loyaltyAgent';

const router = Router();

// ============================================
// Health Check
// ============================================

router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: 'Restaurant Growth Consultant',
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================
// Menu Engineering
// ============================================

/**
 * POST /api/consult/menu
 * Analyze menu and provide engineering recommendations
 */
router.post('/menu', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validatedData = MenuEngineSchema.parse(req.body);

    // Analyze menu
    const result = await menuEngineerService.analyzeMenu(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'menu-engineer-v1',
        confidence: 0.92,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Menu analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to analyze menu',
      },
    });
  }
});

// ============================================
// Table Turnover
// ============================================

/**
 * POST /api/consult/turnover
 * Analyze table turnover and provide optimization recommendations
 */
router.post('/turnover', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validatedData = TurnoverSchema.parse(req.body);

    // Analyze turnover
    const result = await turnoverOptimizerService.analyze(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'turnover-optimizer-v1',
        confidence: 0.89,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Turnover analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to analyze table turnover',
      },
    });
  }
});

// ============================================
// Food Cost
// ============================================

/**
 * POST /api/consult/food-cost
 * Analyze food costs and provide optimization recommendations
 */
router.post('/food-cost', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validatedData = FoodCostSchema.parse(req.body);

    // Analyze food cost
    const result = await costAnalyzerService.analyze(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'cost-analyzer-v1',
        confidence: 0.91,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Food cost analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to analyze food costs',
      },
    });
  }
});

// ============================================
// Loyalty Program
// ============================================

/**
 * POST /api/consult/loyalty
 * Design or optimize loyalty program
 */
router.post('/loyalty', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validatedData = LoyaltySchema.parse(req.body);

    // Design loyalty program
    const result = await loyaltyManagerService.designProgram(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'loyalty-manager-v1',
        confidence: 0.88,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Loyalty design error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to design loyalty program',
      },
    });
  }
});

// ============================================
// Review Management
// ============================================

/**
 * POST /api/consult/reviews
 * Analyze reviews and provide management strategy
 */
router.post('/reviews', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validatedData = ReviewSchema.parse(req.body);

    // Analyze reviews
    const result = await reviewManagerService.analyze(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'review-manager-v1',
        confidence: 0.85,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Review analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to analyze reviews',
      },
    });
  }
});

// ============================================
// Platform Optimization (Zomato/Swiggy)
// ============================================

/**
 * POST /api/consult/zomato
 * Optimize restaurant presence on Zomato/Swiggy
 */
router.post('/zomato', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    // Validate request body
    const validatedData = PlatformOptimizationSchema.parse(req.body);

    // Optimize platform presence
    const result = await platformOptimizerService.optimize(validatedData);

    res.json({
      success: true,
      data: result,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'platform-optimizer-v1',
        confidence: 0.87,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: error.errors,
        },
      });
      return;
    }

    console.error('Platform optimization error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to optimize platform presence',
      },
    });
  }
});

// ============================================
// Growth Recommendations
// ============================================

/**
 * GET /api/consult/growth
 * Get comprehensive growth recommendations
 */
router.get('/growth', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { restaurantId, restaurantProfile, financialMetrics, customerMetrics, platformMetrics } = req.body;

    // Validate required fields
    if (!restaurantId || !restaurantProfile || !financialMetrics || !customerMetrics) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: restaurantId, restaurantProfile, financialMetrics, customerMetrics',
        },
      });
      return;
    }

    // Generate growth recommendations (simplified version)
    const growthResponse = {
      currentState: {
        revenue: financialMetrics.monthlyRevenue,
        customers: customerMetrics.totalCustomers,
        avgOrderValue: financialMetrics.avgOrderValue,
        growthRate: ((financialMetrics.monthlyOrders - 1) / financialMetrics.monthlyOrders) * 100 || 0,
      },
      targetState: {
        revenue: financialMetrics.monthlyRevenue * 1.25,
        customers: Math.round(customerMetrics.totalCustomers * 1.15),
        avgOrderValue: financialMetrics.avgOrderValue * 1.1,
        growthRate: 25,
      },
      growthPillars: [
        {
          pillar: 'Menu Engineering',
          weight: 0.3,
          currentScore: 65,
          targetScore: 85,
          initiatives: [
            { initiative: 'Analyze and optimize star items', impact: 15, timeline: '2 weeks', effort: 'low' },
            { initiative: 'Reprice plowhorse items', impact: 10, timeline: '1 week', effort: 'low' },
          ],
        },
        {
          pillar: 'Table Turnover',
          weight: 0.2,
          currentScore: 55,
          targetScore: 80,
          initiatives: [
            { initiative: 'Implement QR ordering', impact: 12, timeline: '4 weeks', effort: 'medium' },
            { initiative: 'Optimize table layout', impact: 8, timeline: '2 weeks', effort: 'medium' },
          ],
        },
        {
          pillar: 'Food Cost Control',
          weight: 0.2,
          currentScore: 60,
          targetScore: 75,
          initiatives: [
            { initiative: 'Vendor renegotiation', impact: 10, timeline: '4 weeks', effort: 'high' },
            { initiative: 'Recipe optimization', impact: 8, timeline: '3 weeks', effort: 'medium' },
          ],
        },
        {
          pillar: 'Loyalty Program',
          weight: 0.15,
          currentScore: 40,
          targetScore: 75,
          initiatives: [
            { initiative: 'Launch loyalty program', impact: 12, timeline: '4 weeks', effort: 'medium' },
            { initiative: 'Tier upgrade campaigns', impact: 8, timeline: '2 weeks', effort: 'low' },
          ],
        },
        {
          pillar: 'Platform Optimization',
          weight: 0.15,
          currentScore: 50,
          targetScore: 80,
          initiatives: [
            { initiative: 'Review generation', impact: 10, timeline: '4 weeks', effort: 'medium' },
            { initiative: 'Menu optimization', impact: 8, timeline: '2 weeks', effort: 'low' },
          ],
        },
      ],
      quickWins: [
        { action: 'Add combo meals', impact: 8, effort: 'low', timeline: '1 week' },
        { action: 'Implement dynamic pricing', impact: 6, effort: 'medium', timeline: '2 weeks' },
        { action: 'Launch referral program', impact: 10, effort: 'low', timeline: '2 weeks' },
      ],
      investments: [
        { category: 'POS System Upgrade', amount: 50000, roi: 3.5, paybackMonths: 6 },
        { category: 'QR Ordering System', amount: 30000, roi: 4.2, paybackMonths: 4 },
        { category: 'Loyalty Platform', amount: 25000, roi: 3.8, paybackMonths: 5 },
      ],
      timeline: [
        {
          month: 'Month 1',
          focus: 'Foundation',
          keyActions: ['Menu analysis', 'Vendor review', 'Loyalty program design'],
          expectedOutcome: 'Clear roadmap with prioritized actions',
        },
        {
          month: 'Month 2-3',
          focus: 'Implementation',
          keyActions: ['Launch loyalty program', 'Implement QR ordering', 'Reprice menu items'],
          expectedOutcome: '15% increase in repeat customers',
        },
        {
          month: 'Month 4-6',
          focus: 'Optimization',
          keyActions: ['Platform optimization', 'Campaign execution', 'Performance monitoring'],
          expectedOutcome: '25% revenue growth',
        },
      ],
    };

    res.json({
      success: true,
      data: growthResponse,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'growth-consultant-v1',
        confidence: 0.90,
      },
    });
  } catch (error) {
    console.error('Growth recommendations error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate growth recommendations',
      },
    });
  }
});

// ============================================
// Sales Agent Endpoints
// ============================================

/**
 * POST /api/consult/sales/upsell
 * Generate upselling suggestions
 */
router.post('/sales/upsell', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { currentOrder, menuItems } = req.body;

    if (!currentOrder || !menuItems) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: currentOrder, menuItems',
        },
      });
      return;
    }

    const suggestions = await salesAgent.generateUpsellSuggestions(currentOrder, menuItems);

    res.json({
      success: true,
      data: { suggestions },
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'sales-agent-v1',
      },
    });
  } catch (error) {
    console.error('Upsell generation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate upsell suggestions',
      },
    });
  }
});

/**
 * POST /api/consult/sales/bundles
 * Generate bundle opportunities
 */
router.post('/sales/bundles', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { menuItems, targetMargin } = req.body;

    if (!menuItems) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required field: menuItems',
        },
      });
      return;
    }

    const bundles = await salesAgent.generateBundleOpportunities(menuItems, targetMargin);

    res.json({
      success: true,
      data: { bundles },
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'sales-agent-v1',
      },
    });
  } catch (error) {
    console.error('Bundle generation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate bundle opportunities',
      },
    });
  }
});

// ============================================
// Marketing Agent Endpoints
// ============================================

/**
 * POST /api/consult/marketing/channels
 * Analyze marketing channels
 */
router.post('/marketing/channels', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { currentSpend, performance } = req.body;

    if (!currentSpend) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required field: currentSpend',
        },
      });
      return;
    }

    const spendMap = new Map<string, number>(Object.entries(currentSpend));
    const perfMap = new Map<string, { impressions: number; conversions: number; revenue: number }>(
      Object.entries(performance || {})
    );

    const channels = await marketingAgent.analyzeChannels(spendMap, perfMap);

    res.json({
      success: true,
      data: { channels },
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'marketing-agent-v1',
      },
    });
  } catch (error) {
    console.error('Channel analysis error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to analyze marketing channels',
      },
    });
  }
});

/**
 * POST /api/consult/marketing/campaigns
 * Create marketing campaigns
 */
router.post('/marketing/campaigns', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { restaurantProfile, objectives } = req.body;

    if (!restaurantProfile || !objectives) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields: restaurantProfile, objectives',
        },
      });
      return;
    }

    const campaigns = await marketingAgent.createCampaigns(restaurantProfile, objectives);

    res.json({
      success: true,
      data: { campaigns },
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'marketing-agent-v1',
      },
    });
  } catch (error) {
    console.error('Campaign creation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create marketing campaigns',
      },
    });
  }
});

// ============================================
// Loyalty Agent Endpoints
// ============================================

/**
 * POST /api/consult/loyalty/health
 * Calculate member health scores
 */
router.post('/loyalty/health', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { member } = req.body;

    if (!member) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required field: member',
        },
      });
      return;
    }

    const health = loyaltyAgent.calculateMemberHealth(member);

    res.json({
      success: true,
      data: health,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'loyalty-agent-v1',
      },
    });
  } catch (error) {
    console.error('Health calculation error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to calculate member health',
      },
    });
  }
});

/**
 * POST /api/consult/loyalty/at-risk
 * Identify at-risk loyalty members
 */
router.post('/loyalty/at-risk', async (req: Request, res: Response) => {
  const startTime = Date.now();

  try {
    const { members } = req.body;

    if (!members || !Array.isArray(members)) {
      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required field: members (array)',
        },
      });
      return;
    }

    const atRisk = await loyaltyAgent.identifyAtRiskMembers(members);

    res.json({
      success: true,
      data: atRisk,
      metadata: {
        processingTime: Date.now() - startTime,
        model: 'loyalty-agent-v1',
      },
    });
  } catch (error) {
    console.error('At-risk identification error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to identify at-risk members',
      },
    });
  }
});

export default router;
