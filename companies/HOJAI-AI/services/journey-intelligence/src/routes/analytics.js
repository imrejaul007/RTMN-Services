import { Router } from 'express';

const router = Router();

// Funnel data
const funnels = new Map([
  ['awareness', { count: 1000, conversionRate: 0.15 }],
  ['consideration', { count: 150, conversionRate: 0.20 }],
  ['acquisition', { count: 30, conversionRate: 0.80 }],
  ['activation', { count: 24, conversionRate: 0.90 }],
  ['retention', { count: 22, conversionRate: 0.10 }],
  ['referral', { count: 2, conversionRate: 1.0 }],
]);

// GET /analytics/overview - Overview metrics
router.get('/overview', (req, res) => {
  res.json({
    success: true,
    totalLeads: 1247,
    qualifiedLeads: 423,
    openDeals: 89,
    revenue: 2450000,
    conversionRate: 12.5,
    avgTimeToConvert: 14.5,
    activeCampaigns: 12
  });
});

// GET /analytics/funnel - Conversion funnel
router.get('/funnel', (req, res) => {
  res.json({
    success: true,
    funnel: Array.from(funnels.entries()).map(([stage, data]) => ({
      stage,
      ...data,
      dropoff: Math.round(data.count * (1 - data.conversionRate))
    }))
  });
});

// GET /analytics/pipeline - Sales pipeline
router.get('/pipeline', (req, res) => {
  res.json({
    success: true,
    stages: [
      { stage: 'New', count: 45, value: 225000, probability: 10 },
      { stage: 'Contacted', count: 30, value: 180000, probability: 25 },
      { stage: 'Qualified', count: 20, value: 150000, probability: 50 },
      { stage: 'Proposal', count: 12, value: 120000, probability: 75 },
      { stage: 'Negotiation', count: 5, value: 80000, probability: 90 },
      { stage: 'Closed Won', count: 3, value: 60000, probability: 100 },
    ]
  });
});

// GET /analytics/trends - Trend data
router.get('/trends', (req, res) => {
  res.json({
    success: true,
    trends: [
      { month: 'Jan', leads: 95, conversions: 12, revenue: 180000 },
      { month: 'Feb', leads: 110, conversions: 15, revenue: 225000 },
      { month: 'Mar', leads: 125, conversions: 18, revenue: 270000 },
      { month: 'Apr', leads: 140, conversions: 16, revenue: 240000 },
      { month: 'May', leads: 155, conversions: 22, revenue: 330000 },
      { month: 'Jun', leads: 180, conversions: 25, revenue: 375000 },
    ]
  });
});

// GET /analytics/performance - Performance metrics by source
router.get('/performance', (req, res) => {
  res.json({
    success: true,
    sources: [
      { source: 'Website', leads: 450, mqls: 120, sqls: 45, revenue: 380000 },
      { source: 'Email', leads: 280, mqls: 85, sqls: 32, revenue: 270000 },
      { source: 'Social', leads: 320, mqls: 95, sqls: 28, revenue: 240000 },
      { source: 'Referral', leads: 120, mqls: 65, sqls: 38, revenue: 420000 },
      { source: 'Events', leads: 77, mqls: 58, sqls: 25, revenue: 210000 },
    ]
  });
});

export default router;
