/**
 * Billing Routes — Track worker usage and costs
 */

import { Router } from 'express';

const router = Router();

// In-memory usage tracking
const usageRecords: Array<{
  id: string;
  userId: string;
  workerId: string;
  skillId?: string;
  cost: number;
  timestamp: string;
}> = [];

const subscriptions = new Map();

// POST /api/billing/track
router.post('/track', (req, res) => {
  const { userId, workerId, skillId, cost, metadata } = req.body;

  const record = {
    id: `USAGE-${Date.now()}-${Math.random().toString(36).substring(7)}`,
    userId,
    workerId,
    skillId,
    cost: cost || 0,
    timestamp: new Date().toISOString(),
    metadata,
  };

  usageRecords.push(record);

  res.json({
    success: true,
    record,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/billing/usage/:userId
router.get('/usage/:userId', (req, res) => {
  const records = usageRecords.filter(r => r.userId === req.params.userId);

  const total = records.reduce((sum, r) => sum + r.cost, 0);
  const byWorker = records.reduce((acc, r) => {
    if (!acc[r.workerId]) acc[r.workerId] = 0;
    acc[r.workerId] += r.cost;
    return acc;
  }, {} as Record<string, number>);

  res.json({
    userId: req.params.userId,
    totalUsage: records.length,
    totalCost: total,
    costByWorker: byWorker,
    records: records.slice(-50),
    timestamp: new Date().toISOString(),
  });
});

// GET /api/billing/invoice/:userId
router.get('/invoice/:userId', (req, res) => {
  const records = usageRecords.filter(r => r.userId === req.params.userId);

  const lineItems = Object.entries(
    records.reduce((acc, r) => {
      const key = r.workerId;
      if (!acc[key]) acc[key] = { worker: key, calls: 0, cost: 0 };
      acc[key].calls += 1;
      acc[key].cost += r.cost;
      return acc;
    }, {} as Record<string, any>)
  ).map(([_, v]) => v);

  const subtotal = lineItems.reduce((sum, item) => sum + item.cost, 0);
  const tax = subtotal * 0.18;
  const total = subtotal + tax;

  res.json({
    invoiceId: `INV-${Date.now()}`,
    userId: req.params.userId,
    period: {
      from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      to: new Date().toISOString(),
    },
    lineItems,
    subtotal,
    tax,
    taxRate: '18%',
    total,
    currency: 'INR',
    timestamp: new Date().toISOString(),
  });
});

// POST /api/billing/subscribe
router.post('/subscribe', (req, res) => {
  const { userId, planId, workerIds } = req.body;

  const subscription = {
    id: `SUB-${Date.now()}`,
    userId,
    planId,
    workerIds,
    startedAt: new Date().toISOString(),
    nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'active',
  };

  subscriptions.set(userId, subscription);

  res.json({
    success: true,
    subscription,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/billing/subscription/:userId
router.get('/subscription/:userId', (req, res) => {
  const subscription = subscriptions.get(req.params.userId);

  if (!subscription) {
    return res.status(404).json({
      success: false,
      error: 'No subscription found',
    });
  }

  res.json({
    success: true,
    subscription,
    timestamp: new Date().toISOString(),
  });
});

export default router;
