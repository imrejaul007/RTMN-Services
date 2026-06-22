/**
 * Industry AI Routes
 * 
 * Routes for HOJAI Industry Intelligence
 */

import { Router } from 'express';
import { createLogger } from '../utils/logger.js';
import { createErrorResponse } from '../types/index.js';

const logger = createLogger('industry-routes');
const router = Router();

// Environment configuration
const INDUSTRY_SERVICE_URL = process.env.INDUSTRY_SERVICE_URL || 'http://localhost:4700';

// ============================================
// HEALTH & INFO
// ============================================

/**
 * GET /api/industry/health
 * Health check for industry service
 */
router.get('/health', async (req, res) => {
  try {
    const response = await fetch(`${INDUSTRY_SERVICE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    res.json({
      ...data,
      service: 'industry-ai',
      integrated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Industry health check failed');
    res.status(503).json({
      status: 'unavailable',
      service: 'industry-ai',
      error: error.message,
    });
  }
});

// ============================================
// PATTERNS
// ============================================

/**
 * GET /api/industry/patterns
 * Get all patterns for an industry
 */
router.get('/patterns/:industry', async (req, res) => {
  try {
    const { industry } = req.params;
    const { patternType } = req.query;

    let url = `${INDUSTRY_SERVICE_URL}/api/industry/${industry}/patterns`;
    if (patternType) {
      url += `/${patternType}`;
    }

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string,
      },
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch patterns');
    res.status(500).json(createErrorResponse('FETCH_FAILED', error.message));
  }
});

/**
 * POST /api/industry/contribute
 * Contribute anonymous metrics
 */
router.post('/contribute', async (req, res) => {
  try {
    const { industry, patternType, values, counts } = req.body;

    const response = await fetch(`${INDUSTRY_SERVICE_URL}/api/industry/contribute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string,
      },
      body: JSON.stringify({
        industry,
        patternType,
        values,
        counts,
      }),
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to contribute metrics');
    res.status(500).json(createErrorResponse('CONTRIBUTE_FAILED', error.message));
  }
});

/**
 * POST /api/industry/compare
 * Compare with industry benchmark
 */
router.post('/compare', async (req, res) => {
  try {
    const { industry, metrics } = req.body;

    const response = await fetch(`${INDUSTRY_SERVICE_URL}/api/industry/${industry}/compare`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Tenant-Id': req.headers['x-tenant-id'] as string,
      },
      body: JSON.stringify({ metrics }),
    });

    const data = await response.json();
    res.json(data);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to compare metrics');
    res.status(500).json(createErrorResponse('COMPARE_FAILED', error.message));
  }
});

// ============================================
// INDUSTRY INSIGHTS
// ============================================

/**
 * GET /api/industry/insights/:industry
 * Get AI-powered insights for an industry
 */
router.get('/insights/:industry', async (req, res) => {
  try {
    const { industry } = req.params;
    const { segment } = req.query;

    // Fetch patterns
    const patternsResponse = await fetch(
      `${INDUSTRY_SERVICE_URL}/api/industry/${industry}/patterns`,
      {
        headers: { 'X-Tenant-Id': req.headers['x-tenant-id'] as string },
      }
    );
    const patterns = await patternsResponse.json();

    // Generate insights based on patterns
    const insights = generateInsights(industry, patterns, segment as string);

    res.json({
      industry,
      segment,
      insights,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to generate insights');
    res.status(500).json(createErrorResponse('INSIGHTS_FAILED', error.message));
  }
});

/**
 * GET /api/industry/benchmarks/:industry
 * Get industry benchmarks
 */
router.get('/benchmarks/:industry', async (req, res) => {
  try {
    const { industry } = req.params;

    const benchmarks = {
      jewellery: {
        conversionRate: { avg: 0.12, min: 0.05, max: 0.25 },
        avgOrderValue: { avg: 45000, min: 15000, max: 150000 },
        retentionRate: { avg: 0.65, min: 0.45, max: 0.85 },
        repeatPurchaseRate: { avg: 0.35, min: 0.15, max: 0.55 },
      },
      healthcare: {
        noShowRate: { avg: 0.15, min: 0.05, max: 0.30 },
        patientRetention: { avg: 0.75, min: 0.50, max: 0.95 },
        appointmentUtilization: { avg: 0.85, min: 0.65, max: 0.98 },
      },
      hospitality: {
        occupancyRate: { avg: 0.72, min: 0.45, max: 0.95 },
        revPAR: { avg: 3500, min: 1500, max: 8500 },
        guestSatisfaction: { avg: 4.2, min: 3.5, max: 4.9 },
      },
      retail: {
        conversionRate: { avg: 0.08, min: 0.02, max: 0.20 },
        avgTransactionValue: { avg: 850, min: 200, max: 2500 },
        customerRetention: { avg: 0.45, min: 0.25, max: 0.75 },
      },
    };

    res.json({
      industry,
      benchmarks: benchmarks[industry as keyof typeof benchmarks] || benchmarks.retail,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to fetch benchmarks');
    res.status(500).json(createErrorResponse('BENCHMARKS_FAILED', error.message));
  }
});

// ============================================
// VERTICAL QUICK ACCESS
// ============================================

/**
 * GET /api/industry/verticals
 * List all supported industry verticals
 */
router.get('/verticals', async (req, res) => {
  const verticals = [
    {
      id: 'jewellery',
      name: 'Jewellery & Luxury',
      icon: '💎',
      features: ['Conversion Timeline', 'Demand Spike', 'Follow-up Timing'],
    },
    {
      id: 'healthcare',
      name: 'Healthcare',
      icon: '🏥',
      features: ['No-Show Prediction', 'Patient Retention', 'Appointment Optimization'],
    },
    {
      id: 'hospitality',
      name: 'Hospitality',
      icon: '🏨',
      features: ['Seasonal Variation', 'Demand Spike', 'Guest Personalization'],
    },
    {
      id: 'retail',
      name: 'Retail',
      icon: '🛒',
      features: ['Category Affinity', 'Retention Curve', 'Customer Segmentation'],
    },
    {
      id: 'education',
      name: 'Education',
      icon: '📚',
      features: ['Student Retention', 'Course Analytics', 'Engagement Tracking'],
    },
    {
      id: 'finance',
      name: 'Finance',
      icon: '💰',
      features: ['Fraud Detection', 'Risk Assessment', 'Compliance Checking'],
    },
    {
      id: 'real_estate',
      name: 'Real Estate',
      icon: '🏠',
      features: ['Lead Conversion', 'Site Visit Prediction', 'Pricing Optimization'],
    },
    {
      id: 'restaurant',
      name: 'Restaurant',
      icon: '🍽️',
      features: ['Demand Forecasting', 'Table Optimization', 'Menu Analytics'],
    },
    {
      id: 'fitness',
      name: 'Fitness',
      icon: '💪',
      features: ['Member Retention', 'Class Scheduling', 'Progress Tracking'],
    },
    {
      id: 'salon',
      name: 'Salon & Beauty',
      icon: '💇',
      features: ['Booking Optimization', 'Product Recommendations', 'Retention'],
    },
  ];

  res.json({
    verticals,
    count: verticals.length,
  });
});

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateInsights(industry: string, patterns: any, segment?: string): any[] {
  const insights: any[] = [];

  if (patterns && patterns.length > 0) {
    insights.push({
      type: 'pattern_detected',
      message: `${patterns.length} industry patterns identified for ${industry}`,
      confidence: 0.85,
    });

    // Analyze each pattern
    for (const pattern of patterns.slice(0, 3)) {
      insights.push({
        type: 'pattern_insight',
        pattern: pattern.patternType,
        description: getPatternDescription(pattern.patternType),
        recommendation: getPatternRecommendation(pattern.patternType),
      });
    }
  }

  // Add general insights based on industry
  const industryInsights: Record<string, any[]> = {
    jewellery: [
      { type: 'tip', message: 'Follow up within 24 hours for bridal inquiries', priority: 'high' },
      { type: 'tip', message: 'Seasonal spikes occur before weddings and festivals', priority: 'medium' },
    ],
    healthcare: [
      { type: 'tip', message: 'Send reminder 24 hours before appointments', priority: 'high' },
      { type: 'tip', message: 'Offer telehealth for follow-ups', priority: 'medium' },
    ],
    hospitality: [
      { type: 'tip', message: 'Dynamic pricing during peak seasons', priority: 'high' },
      { type: 'tip', message: 'Personalize welcome amenities', priority: 'medium' },
    ],
  };

  if (industryInsights[industry]) {
    insights.push(...industryInsights[industry]);
  }

  return insights;
}

function getPatternDescription(patternType: string): string {
  const descriptions: Record<string, string> = {
    conversion_timeline: 'Time taken from first contact to purchase',
    demand_spike: 'Sudden increase in demand periods',
    retention_curve: 'Customer retention over time',
    no_show_pattern: 'Appointment no-show likelihood',
    seasonal_variation: 'Time-based demand patterns',
    category_affinity: 'Product purchasing patterns',
    follow_up_timing: 'Optimal times for customer follow-up',
  };
  return descriptions[patternType] || 'Industry-specific pattern';
}

function getPatternRecommendation(patternType: string): string {
  const recommendations: Record<string, string> = {
    conversion_timeline: 'Reduce friction in the buying process',
    demand_spike: 'Prepare inventory and staff for peak periods',
    retention_curve: 'Implement loyalty programs',
    no_show_pattern: 'Send reminders and overbooking slightly',
    seasonal_variation: 'Plan marketing campaigns around peaks',
    category_affinity: 'Create bundle offers',
    follow_up_timing: 'Automate follow-up sequences',
  };
  return recommendations[patternType] || 'Review and optimize';
}

export default router;
