/**
 * AdBazaar DSP Service
 *
 * Demand-Side Platform - connects advertisers to the AdBazaar exchange.
 *
 * Features:
 * - Campaign management
 * - Audience targeting
 * - Budget optimization
 * - Performance analytics
 *
 * Port: 4990
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import promClient from 'prom-client';

promClient.collectDefaultMetrics();
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '4990', 10);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'adbazaar-dsp',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (_req, res) => {
  res.json({ status: 'alive' });
});

app.get('/metrics', async (_req, res) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// API Info
app.get('/api', (_req, res) => {
  res.json({
    name: 'AdBazaar DSP',
    version: '1.0.0',
    description: 'Demand-Side Platform for DOOH',
    endpoints: {
      campaigns: '/api/campaigns',
      audiences: '/api/audiences',
      targeting: '/api/targeting',
      reports: '/api/reports',
      budget: '/api/budget'
    }
  });
});

// ============================================================================
// CAMPAIGNS ENDPOINTS
// ============================================================================

/**
 * GET /api/campaigns
 * List all campaigns
 */
app.get('/api/campaigns', (req, res) => {
  const { status, advertiserId } = req.query;

  const campaigns = [
    {
      campaignId: 'camp_001',
      name: 'Pizza Hut Summer Promo',
      advertiserId,
      status: status || 'active',
      budget: { total: 50000, spent: 12500, remaining: 37500 },
      targeting: {
        cities: ['Mumbai', 'Delhi', 'Bangalore'],
        screenTypes: ['bus_shelter', 'mall_kiosk'],
        ageGroups: ['25-34', '35-44']
      },
      stats: {
        impressions: 250000,
        reach: 85000,
        avgFrequency: 2.9,
        scans: 5750,
        ctr: 2.3,
        cpm: 50,
        cpc: 2.17,
        roas: 3.2
      },
      createdAt: '2026-06-01T00:00:00Z'
    }
  ];

  res.json({ success: true, data: campaigns });
});

/**
 * POST /api/campaigns
 * Create a new campaign
 */
app.post('/api/campaigns', (req, res) => {
  const { name, advertiserId, budget, targeting, schedule } = req.body;

  if (!name || !budget) {
    res.status(400).json({ success: false, error: 'name and budget required' });
    return;
  }

  const campaign = {
    campaignId: `camp_${Date.now()}`,
    name,
    advertiserId,
    status: 'draft',
    budget: {
      total: budget.total || budget,
      spent: 0,
      remaining: budget.total || budget
    },
    targeting: targeting || {
      cities: [],
      screenTypes: [],
      ageGroups: []
    },
    schedule: schedule || {
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    },
    createdAt: new Date().toISOString()
  };

  res.status(201).json({ success: true, data: campaign });
});

/**
 * PUT /api/campaigns/:campaignId
 * Update campaign
 */
app.put('/api/campaigns/:campaignId', (req, res) => {
  const { campaignId } = req.params;
  const updates = req.body;

  res.json({
    success: true,
    data: { campaignId, ...updates, updatedAt: new Date().toISOString() }
  });
});

/**
 * POST /api/campaigns/:campaignId/launch
 * Launch campaign
 */
app.post('/api/campaigns/:campaignId/launch', (req, res) => {
  const { campaignId } = req.params;

  res.json({
    success: true,
    data: {
      campaignId,
      status: 'active',
      launchedAt: new Date().toISOString()
    }
  });
});

/**
 * POST /api/campaigns/:campaignId/pause
 * Pause campaign
 */
app.post('/api/campaigns/:campaignId/pause', (req, res) => {
  const { campaignId } = req.params;

  res.json({
    success: true,
    data: { campaignId, status: 'paused', pausedAt: new Date().toISOString() }
  });
});

// ============================================================================
// AUDIENCES ENDPOINTS
// ============================================================================

/**
 * GET /api/audiences
 * Get available audience segments
 */
app.get('/api/audiences', (req, res) => {
  const audiences = [
    {
      id: 'seg_001',
      name: 'Active Buyers',
      category: 'Shopping',
      size: 2500000,
      quality: 95,
      cpm: 2.50,
      description: 'Users actively searching and comparing products'
    },
    {
      id: 'seg_002',
      name: 'Dormant Interest',
      category: 'Re-engagement',
      size: 5000000,
      quality: 72,
      cpm: 0.75,
      description: 'Users who showed past interest'
    },
    {
      id: 'seg_003',
      name: 'Near Purchase',
      category: 'Conversion',
      size: 850000,
      quality: 98,
      cpm: 4.00,
      description: 'High-intent users who started checkout'
    }
  ];

  res.json({ success: true, data: audiences });
});

// ============================================================================
// TARGETING ENDPOINTS
// ============================================================================

/**
 * POST /api/targeting/suggest
 * Get AI-powered targeting suggestions
 */
app.post('/api/targeting/suggest', (req, res) => {
  const { campaignObjective, budget } = req.body;

  const suggestions = {
    targeting: {
      cities: [
        { name: 'Mumbai', priority: 'high', reach: 150000 },
        { name: 'Delhi', priority: 'high', reach: 140000 },
        { name: 'Bangalore', priority: 'medium', reach: 100000 }
      ],
      screenTypes: [
        { type: 'bus_shelter', weight: 0.4 },
        { type: 'mall_kiosk', weight: 0.3 },
        { type: 'metro_screen', weight: 0.3 }
      ],
      ageGroups: ['25-34', '35-44'],
      bestTime: { dayPart: 'evening', hours: ['18:00-21:00'] }
    },
    budget: {
      recommended: budget * 0.8 || 40000,
      daily: (budget || 50000) / 30,
      bidStrategy: 'cpm'
    },
    expected: {
      impressions: 1000000,
      reach: 350000,
      cpm: 50,
      roas: 2.8
    }
  };

  res.json({ success: true, data: suggestions });
});

// ============================================================================
// REPORTS ENDPOINTS
// ============================================================================

/**
 * GET /api/reports/:campaignId
 * Get campaign performance report
 */
app.get('/api/reports/:campaignId', (req, res) => {
  const { campaignId } = req.params;
  const { startDate, endDate, granularity } = req.query;

  const report = {
    campaignId,
    period: { start: startDate, end: endDate, granularity: granularity || 'day' },
    summary: {
      impressions: 250000,
      reach: 85000,
      avgFrequency: 2.9,
      scans: 5750,
      ctr: 2.3,
      cpm: 50,
      cpc: 2.17,
      spend: 12500,
      roas: 3.2
    },
    byDay: [
      { date: '2026-06-10', impressions: 35000, scans: 800, spend: 1750 },
      { date: '2026-06-11', impressions: 38000, scans: 875, spend: 1900 },
      { date: '2026-06-12', impressions: 36000, scans: 825, spend: 1800 }
    ],
    byLocation: [
      { city: 'Mumbai', impressions: 100000, ctr: 2.5 },
      { city: 'Delhi', impressions: 85000, ctr: 2.2 },
      { city: 'Bangalore', impressions: 65000, ctr: 2.1 }
    ]
  };

  res.json({ success: true, data: report });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     AdBazaar DSP Service v1.0.0              ║
║  Port: ${PORT}                                     ║
║  For: Advertisers / Brands                     ║
╚══════════════════════════════════════════════════════╝
  `);
});

export default app;
