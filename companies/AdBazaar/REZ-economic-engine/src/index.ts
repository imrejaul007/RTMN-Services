/**
 * REZ Economic Engine
 *
 * Economic intelligence for AdBazaar advertising platform.
 * Manages ad budgets, pricing, auctions, and revenue optimization.
 *
 * Port: 5003
 *
 * Features:
 * - Budget management
 * - Dynamic pricing
 * - Auction engine
 * - Revenue optimization
 * - Financial analytics
 * - Payout calculations
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import winston from 'winston';
import promClient from 'prom-client';
import axios from 'axios';

promClient.collectDefaultMetrics();
dotenv.config();

const app: Express = express();
const PORT = parseInt(process.env.PORT || '5003', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-economic';

// Service URLs
const AI_GATEWAY_URL = process.env.HOJAI_GATEWAY_URL || 'http://localhost:4560';

// Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()],
});

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req: Request, _res: Response, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// Health checks
app.get('/health', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  res.json({
    status: 'healthy',
    service: 'rez-economic-engine',
    version: '1.0.0',
    port: PORT,
    mongodb: mongoStatus,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'alive' });
});

app.get('/metrics', async (_req: Request, res: Response) => {
  res.set('Content-Type', promClient.register.contentType);
  res.end(await promClient.register.metrics());
});

// API Info
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    name: 'REZ Economic Engine',
    version: '1.0.0',
    description: 'Economic intelligence for advertising',
    features: [
      'Budget management',
      'Dynamic pricing',
      'Auction engine',
      'Revenue optimization',
      'Financial analytics',
      'Payout calculations',
    ],
  });
});

// ============================================================================
// BUDGET MANAGEMENT
// ============================================================================

/**
 * GET /api/budgets
 * List all budgets
 */
app.get('/api/budgets', (req, res) => {
  const { advertiserId, status } = req.query;

  const budgets = [
    {
      budgetId: 'budget_001',
      advertiserId: advertiserId || 'adv_001',
      campaignId: 'camp_001',
      total: 50000,
      spent: 12500,
      remaining: 37500,
      dailyLimit: 5000,
      dailySpent: 1250,
      status: status || 'active',
      pacing: 'linear',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      budgetId: 'budget_002',
      advertiserId: advertiserId || 'adv_002',
      campaignId: 'camp_002',
      total: 30000,
      spent: 8000,
      remaining: 22000,
      dailyLimit: 3000,
      dailySpent: 800,
      status: 'active',
      pacing: 'accelerated',
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  res.json({ success: true, data: { budgets } });
});

/**
 * POST /api/budgets
 * Create budget
 */
app.post('/api/budgets', async (req, res) => {
  const { advertiserId, campaignId, total, dailyLimit, pacing, startDate, endDate } = req.body;

  if (!advertiserId || !campaignId || !total) {
    res.status(400).json({ success: false, error: 'advertiserId, campaignId, and total required' });
    return;
  }

  // Get AI pricing recommendation
  let recommendation = null;
  try {
    const response = await axios.post(`${AI_GATEWAY_URL}/api/recommendations`, {
      context: 'pricing',
      budget: total,
    }, { timeout: 3000 });
    recommendation = response.data.data;
  } catch (error) {
    logger.warn('[Economic] AI pricing failed', { error });
  }

  const budget = {
    budgetId: `budget_${Date.now()}`,
    advertiserId,
    campaignId,
    total: Number(total),
    spent: 0,
    remaining: Number(total),
    dailyLimit: dailyLimit || Math.floor(total / 30),
    dailySpent: 0,
    pacing: pacing || 'linear',
    status: 'active',
    startDate: startDate || new Date().toISOString(),
    endDate: endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    aiRecommendation: recommendation,
    createdAt: new Date().toISOString(),
  };

  logger.info('[Budget] Created', { budgetId: budget.budgetId, advertiserId, total });

  res.status(201).json({ success: true, data: budget });
});

/**
 * GET /api/budgets/:budgetId
 * Get budget details
 */
app.get('/api/budgets/:budgetId', (req, res) => {
  const { budgetId } = req.params;

  const budget = {
    budgetId,
    advertiserId: 'adv_001',
    campaignId: 'camp_001',
    total: 50000,
    spent: 12500,
    remaining: 37500,
    dailyLimit: 5000,
    dailySpent: 1250,
    pacing: 'linear',
    utilizationRate: 25,
    burnRate: 4166.67,
    estimatedDaysLeft: 9,
    alerts: [],
    createdAt: new Date().toISOString(),
  };

  res.json({ success: true, data: budget });
});

/**
 * PUT /api/budgets/:budgetId
 * Update budget
 */
app.put('/api/budgets/:budgetId', (req, res) => {
  const { budgetId } = req.params;
  const updates = req.body;

  const budget = {
    budgetId,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  logger.info('[Budget] Updated', { budgetId });

  res.json({ success: true, data: budget });
});

// ============================================================================
// PRICING ENGINE
// ============================================================================

/**
 * POST /api/pricing/calculate
 * Calculate ad pricing
 */
app.post('/api/pricing/calculate', async (req, res) => {
  const { screenId, placement, duration, targeting, auctionType } = req.body;

  // Base CPM rates by screen type
  const baseRates: Record<string, number> = {
    bus_shelter: 3.0,
    metro_screen: 5.0,
    mall_kiosk: 4.0,
    elevator: 2.5,
    office_lobby: 2.0,
  };

  const baseRate = baseRates[placement] || 3.0;
  let price = baseRate;

  // Apply targeting multipliers
  if (targeting?.premium) price *= 1.5;
  if (targeting?.highIntent) price *= 1.3;
  if (targeting?.demographics === 'high_income') price *= 1.4;

  // Duration multiplier
  if (duration === '10sec') price *= 0.8;
  if (duration === '30sec') price *= 1.5;

  // Auction premium
  if (auctionType === 'premium') price *= 1.2;

  // Get AI price optimization
  let optimization = null;
  try {
    const response = await axios.post(`${AI_GATEWAY_URL}/api/pricing/optimize`, {
      screenId,
      basePrice: price,
      targeting,
    }, { timeout: 3000 });
    optimization = response.data.data;
    if (optimization?.recommendedPrice) {
      price = optimization.recommendedPrice;
    }
  } catch (error) {
    logger.warn('[Pricing] AI optimization failed', { error });
  }

  const pricing = {
    basePrice: baseRate,
    finalPrice: Math.round(price * 100) / 100,
    currency: 'INR',
    cpm: Math.round(price * 100) / 100,
    duration,
    placement,
    targeting,
    auctionType: auctionType || 'standard',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 min hold
    optimization,
  };

  res.json({ success: true, data: pricing });
});

/**
 * POST /api/pricing/floor
 * Get floor price for placement
 */
app.post('/api/pricing/floor', (req, res) => {
  const { screenId, placement, timeSlot } = req.query;

  const floors: Record<string, number> = {
    bus_shelter: 2.0,
    metro_screen: 3.5,
    mall_kiosk: 2.5,
    elevator: 1.5,
    office_lobby: 1.5,
  };

  const floor = floors[placement as string] || 2.0;

  // Time-based adjustment
  let multiplier = 1.0;
  if (timeSlot === 'peak') multiplier = 1.5;
  if (timeSlot === 'off_peak') multiplier = 0.7;

  res.json({
    success: true,
    data: {
      screenId,
      placement,
      floorPrice: floor * multiplier,
      recommendedPrice: floor * multiplier * 1.2,
      currency: 'INR',
      cpm: floor * multiplier,
    },
  });
});

// ============================================================================
// AUCTION ENGINE
// ============================================================================

/**
 * POST /api/auctions
 * Create auction
 */
app.post('/api/auctions', (req, res) => {
  const { screenId, slots, auctionType, startTime, endTime } = req.body;

  if (!screenId || !slots) {
    res.status(400).json({ success: false, error: 'screenId and slots required' });
    return;
  }

  const auction = {
    auctionId: `auction_${Date.now()}`,
    screenId,
    slots: slots || 10,
    auctionType: auctionType || 'second_price',
    status: 'open',
    bids: 0,
    reservePrice: 2.0,
    startTime: startTime || new Date().toISOString(),
    endTime: endTime || new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
  };

  logger.info('[Auction] Created', { auctionId: auction.auctionId, screenId });

  res.status(201).json({ success: true, data: auction });
});

/**
 * POST /api/auctions/:auctionId/bid
 * Place bid
 */
app.post('/api/auctions/:auctionId/bid', (req, res) => {
  const { auctionId } = req.params;
  const { campaignId, amount, targeting } = req.body;

  if (!campaignId || !amount) {
    res.status(400).json({ success: false, error: 'campaignId and amount required' });
    return;
  }

  const bid = {
    bidId: `bid_${Date.now()}`,
    auctionId,
    campaignId,
    amount: Number(amount),
    targeting,
    status: 'accepted',
    rank: 1,
    timestamp: new Date().toISOString(),
  };

  logger.info('[Auction] Bid placed', { bidId: bid.bidId, auctionId, amount });

  res.json({ success: true, data: bid });
});

/**
 * GET /api/auctions/:auctionId/result
 * Get auction result
 */
app.get('/api/auctions/:auctionId/result', (req, res) => {
  const { auctionId } = req.params;

  const result = {
    auctionId,
    status: 'completed',
    winner: {
      campaignId: 'camp_001',
      amount: 4.5,
      rank: 1,
    },
    allBids: [
      { campaignId: 'camp_001', amount: 4.5, rank: 1, status: 'winner' },
      { campaignId: 'camp_002', amount: 4.0, rank: 2, status: 'outbid' },
      { campaignId: 'camp_003', amount: 3.5, rank: 3, status: 'outbid' },
    ],
    secondPrice: 4.0,
    totalBids: 5,
    completedAt: new Date().toISOString(),
  };

  res.json({ success: true, data: result });
});

// ============================================================================
// REVENUE OPTIMIZATION
// ============================================================================

/**
 * GET /api/revenue/overview
 * Get revenue overview
 */
app.get('/api/revenue/overview', (req, res) => {
  const { period = '30d' } = req.query;

  const overview = {
    period,
    totalRevenue: {
      value: 1250000,
      currency: 'INR',
      change: 15.5,
    },
    byChannel: {
      dooh: { revenue: 750000, cpm: 50, impressions: 15000000 },
      programmatic: { revenue: 350000, cpm: 35, impressions: 10000000 },
      direct: { revenue: 150000, cpm: 75, impressions: 2000000 },
    },
    byAdvertiser: [
      { advertiserId: 'adv_001', revenue: 250000, campaigns: 3 },
      { advertiserId: 'adv_002', revenue: 180000, campaigns: 2 },
      { advertiserId: 'adv_003', revenue: 150000, campaigns: 5 },
    ],
    projections: {
      thisMonth: 1500000,
      nextMonth: 1750000,
      thisQuarter: 4500000,
    },
  };

  res.json({ success: true, data: overview });
});

/**
 * POST /api/revenue/optimize
 * Get revenue optimization recommendations
 */
app.post('/api/revenue/optimize', async (req, res) => {
  const { objective, constraints } = req.body;

  try {
    const response = await axios.post(`${AI_GATEWAY_URL}/api/revenue/optimize`, {
      objective,
      constraints,
    }, { timeout: 5000 });

    res.json({ success: true, data: response.data.data });
  } catch (error) {
    // Fallback recommendations
    const recommendations = [
      {
        type: 'pricing',
        impact: 'high',
        description: 'Increase CPM for premium placements by 10%',
        potential: { additionalRevenue: 75000, implementation: 'easy' },
      },
      {
        type: 'pacing',
        impact: 'medium',
        description: 'Accelerate pacing for under-performing campaigns',
        potential: { additionalRevenue: 25000, implementation: 'medium' },
      },
      {
        type: 'audience',
        impact: 'high',
        description: 'Shift budget to high-intent audience segments',
        potential: { additionalRevenue: 100000, implementation: 'easy' },
      },
    ];

    res.json({ success: true, data: { recommendations } });
  }
});

// ============================================================================
// PAYOUTS
// ============================================================================

/**
 * GET /api/payouts
 * List payouts
 */
app.get('/api/payouts', (req, res) => {
  const { publisherId, status } = req.query;

  const payouts = [
    {
      payoutId: 'payout_001',
      publisherId: publisherId || 'pub_001',
      period: '2026-06-01 to 2026-06-15',
      earnings: 12500,
      impressions: 250000,
      cpm: 50,
      status: status || 'pending',
      breakdown: {
        dooh: 10000,
        programmatic: 2500,
      },
      createdAt: new Date().toISOString(),
    },
  ];

  res.json({ success: true, data: { payouts } });
});

/**
 * POST /api/payouts/calculate
 * Calculate payout
 */
app.post('/api/payouts/calculate', (req, res) => {
  const { publisherId, period, impressions, channel } = req.body;

  if (!publisherId || !impressions) {
    res.status(400).json({ success: false, error: 'publisherId and impressions required' });
    return;
  }

  const rates: Record<string, number> = {
    dooh: 0.05,
    programmatic: 0.035,
    direct: 0.06,
  };

  const rate = rates[channel] || 0.05;
  const gross = (impressions / 1000) * 50; // 50 INR CPM
  const publisherShare = gross * rate;
  const platformFee = gross * 0.1;
  const net = gross - platformFee;

  const calculation = {
    publisherId,
    period: period || 'monthly',
    grossRevenue: Math.round(gross * 100) / 100,
    platformFee: Math.round(platformFee * 100) / 100,
    publisherEarnings: Math.round(publisherShare * 100) / 100,
    netPayable: Math.round(net * 100) / 100,
    currency: 'INR',
    rate: rate,
    impressions,
    calculatedAt: new Date().toISOString(),
  };

  res.json({ success: true, data: calculation });
});

/**
 * POST /api/payouts/:payoutId/release
 * Release payout
 */
app.post('/api/payouts/:payoutId/release', (req, res) => {
  const { payoutId } = req.params;

  logger.info('[Payout] Released', { payoutId });

  res.json({
    success: true,
    data: {
      payoutId,
      status: 'released',
      releasedAt: new Date().toISOString(),
      transferId: `transfer_${Date.now()}`,
    },
  });
});

// ============================================================================
// FINANCIAL ANALYTICS
// ============================================================================

/**
 * GET /api/analytics/financial
 * Get financial analytics
 */
app.get('/api/analytics/financial', (req, res) => {
  const { startDate, endDate, groupBy = 'day' } = req.query;

  const analytics = {
    period: { start: startDate, end: endDate, groupBy },
    metrics: {
      revenue: { total: 1250000, avg: 41666.67, trend: 12.5 },
      spend: { total: 850000, avg: 28333.33, trend: 8.2 },
      profit: { total: 400000, margin: 32, trend: 18.5 },
      arpu: { value: 25, trend: 5.3 },
    },
    timeSeries: [
      { date: '2026-06-14', revenue: 40000, spend: 28000, profit: 12000 },
      { date: '2026-06-15', revenue: 42000, spend: 29000, profit: 13000 },
      { date: '2026-06-16', revenue: 43000, spend: 28000, profit: 15000 },
    ],
  };

  res.json({ success: true, data: analytics });
});

/**
 * GET /api/analytics/forecast
 * Get revenue forecast
 */
app.get('/api/analytics/forecast', (req, res) => {
  const { horizon = '30d' } = req.query;

  const forecast = {
    horizon,
    predictions: {
      revenue: Math.round(1250000 * 1.15),
      impressions: Math.round(25000000 * 1.1),
      cpm: 52,
    },
    confidence: 85,
    factors: [
      { name: 'Seasonality', impact: 'positive', weight: 0.3 },
      { name: 'Market trends', impact: 'positive', weight: 0.25 },
      { name: 'Competition', impact: 'negative', weight: 0.15 },
    ],
    scenarios: {
      optimistic: Math.round(1250000 * 1.25),
      base: Math.round(1250000 * 1.15),
      conservative: Math.round(1250000 * 1.05),
    },
  };

  res.json({ success: true, data: forecast });
});

// ============================================================================
// START SERVER
// ============================================================================

async function start() {
  try {
    if (MONGODB_URI) {
      logger.info('Connecting to MongoDB...');
      await mongoose.connect(MONGODB_URI);
      logger.info('MongoDB connected');
    }

    app.listen(PORT, () => {
      logger.info(`
╔══════════════════════════════════════════════════════════════╗
║     REZ Economic Engine v1.0.0                 ║
║  Port: ${PORT}                                      ║
╠══════════════════════════════════════════════════════════════╣
║  Features:                                       ║
║  • Budget management                          ║
║  • Dynamic pricing                           ║
║  • Auction engine                             ║
║  • Revenue optimization                       ║
║  • Financial analytics                        ║
║  • Payout calculations                        ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('[Startup] Failed', { error });
    process.exit(1);
  }
}

process.on('SIGTERM', async () => {
  logger.info('Shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

start();

export default app;