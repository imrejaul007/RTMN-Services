/**
 * AdBazaar SSP Service
 *
 * Supply-Side Platform - connects media owners to the AdBazaar exchange.
 *
 * Features:
 * - Screen inventory management
 * - Real-time bidding
 * - Floor price optimization
 * - Performance analytics
 *
 * Port: 4980
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import promClient from 'prom-client';

promClient.collectDefaultMetrics();
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '4980', 10);

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'adbazaar-ssp',
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
    name: 'AdBazaar SSP',
    version: '1.0.0',
    description: 'Supply-Side Platform for DOOH',
    endpoints: {
      inventory: '/api/inventory',
      campaigns: '/api/campaigns',
      earnings: '/api/earnings',
      reports: '/api/reports'
    }
  });
});

// ============================================================================
// INVENTORY ENDPOINTS
// ============================================================================

/**
 * GET /api/inventory
 * Get your screen inventory and performance
 */
app.get('/api/inventory', (req, res) => {
  const { ownerId } = req.headers;

  // Simulated inventory
  const inventory = {
    ownerId,
    screens: [
      {
        screenId: 'screen_001',
        name: 'Bandra Bus Shelter #1',
        type: 'bus_shelter',
        location: { city: 'Mumbai', area: 'Bandra' },
        status: 'active',
        stats: {
          impressions: 125000,
          scanRate: 2.3,
          earnings: 2500
        }
      }
    ],
    summary: {
      totalScreens: 1,
      activeScreens: 1,
      totalImpressions: 125000,
      totalEarnings: 2500
    }
  };

  res.json({ success: true, data: inventory });
});

/**
 * POST /api/inventory/screens
 * Add a new screen to your inventory
 */
app.post('/api/inventory/screens', (req, res) => {
  const { name, type, location, cpm } = req.body;

  if (!name || !type || !location) {
    res.status(400).json({ success: false, error: 'name, type, and location required' });
    return;
  }

  const screen = {
    screenId: `screen_${Date.now()}`,
    name,
    type,
    location,
    cpm: cpm || 15,
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  res.status(201).json({ success: true, data: screen });
});

/**
 * PUT /api/inventory/screens/:screenId
 * Update screen settings
 */
app.put('/api/inventory/screens/:screenId', (req, res) => {
  const { screenId } = req.params;
  const updates = req.body;

  res.json({
    success: true,
    data: { screenId, ...updates, updatedAt: new Date().toISOString() }
  });
});

// ============================================================================
// CAMPAIGNS ENDPOINTS
// ============================================================================

/**
 * GET /api/campaigns
 * Get campaigns running on your screens
 */
app.get('/api/campaigns', (req, res) => {
  const campaigns = [
    {
      campaignId: 'camp_001',
      advertiser: 'Pizza Hut',
      startDate: '2026-06-01',
      endDate: '2026-06-30',
      stats: {
        impressions: 45000,
        clicks: 180,
        spend: 900
      },
      status: 'active'
    }
  ];

  res.json({ success: true, data: campaigns });
});

// ============================================================================
// EARNINGS ENDPOINTS
// ============================================================================

/**
 * GET /api/earnings
 * Get earnings summary
 */
app.get('/api/earnings', (req, res) => {
  const earnings = {
    balance: 2500,
    pending: 450,
    paid: 12500,
    thisMonth: 1250,
    lastMonth: 3800,
    history: [
      { date: '2026-06-01', amount: 450, status: 'pending' },
      { date: '2026-05-15', amount: 1200, status: 'paid' }
    ]
  };

  res.json({ success: true, data: earnings });
});

/**
 * POST /api/earnings/withdraw
 * Request withdrawal
 */
app.post('/api/earnings/withdraw', (req, res) => {
  const { amount, method } = req.body;

  if (!amount || amount < 500) {
    res.status(400).json({ success: false, error: 'Minimum withdrawal is 500 INR' });
    return;
  }

  res.json({
    success: true,
    data: {
      withdrawalId: `wd_${Date.now()}`,
      amount,
      method: method || 'bank_transfer',
      status: 'processing',
      estimatedArrival: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
    }
  });
});

// ============================================================================
// REPORTS ENDPOINTS
// ============================================================================

/**
 * GET /api/reports
 * Get analytics reports
 */
app.get('/api/reports', (req, res) => {
  const { startDate, endDate, screenId } = req.query;

  const report = {
    period: { start: startDate, end: endDate },
    screens: screenId ? [screenId] : ['screen_001'],
    metrics: {
      impressions: 125000,
      reach: 45000,
      avgFrequency: 2.8,
      scanRate: 2.3,
      engagements: 2875,
      earnings: 2500
    },
    byDay: [
      { date: '2026-06-10', impressions: 18000, earnings: 360 },
      { date: '2026-06-11', impressions: 21000, earnings: 420 },
      { date: '2026-06-12', impressions: 19500, earnings: 390 }
    ]
  };

  res.json({ success: true, data: report });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║     AdBazaar SSP Service v1.0.0              ║
║  Port: ${PORT}                                     ║
║  For: Media Owners / Screen Operators          ║
╚══════════════════════════════════════════════════════╝
  `);
});

export default app;
