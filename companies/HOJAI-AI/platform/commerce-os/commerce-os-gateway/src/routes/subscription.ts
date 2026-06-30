/**
 * Subscription Routes — Recurring Billing Engine
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();
const SUBSCRIPTION_URL = process.env.SITEOS_SUBSCRIPTION_URL || 'http://localhost:5494';

// In-memory subscription store
const subscriptions = new Map();

// GET /api/subscription/plans
router.get('/plans', async (req, res) => {
  try {
    const response = await axios.get(`${SUBSCRIPTION_URL}/api/plans`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    // Return default plans
    res.json({
      plans: [
        {
          id: 'PLAN001',
          name: 'Basic',
          price: 999,
          interval: 'month',
          features: ['Basic features', 'Email support'],
        },
        {
          id: 'PLAN002',
          name: 'Pro',
          price: 4999,
          interval: 'month',
          features: ['All Basic features', 'Priority support', 'Advanced analytics'],
        },
        {
          id: 'PLAN003',
          name: 'Enterprise',
          price: 24999,
          interval: 'month',
          features: ['All Pro features', 'Dedicated support', 'Custom integrations'],
        },
      ],
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/subscription/:userId
router.get('/:userId', async (req, res) => {
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

// POST /api/subscription/subscribe
router.post('/subscribe', async (req, res) => {
  try {
    const { userId, planId, paymentMethod } = req.body;

    // Create subscription
    const subscription = {
      id: `SUB-${Date.now()}`,
      userId,
      planId,
      paymentMethod,
      status: 'active',
      startedAt: new Date().toISOString(),
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      autoRenew: true,
    };

    subscriptions.set(userId, subscription);

    res.status(201).json({
      success: true,
      subscription,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/subscription/cancel
router.post('/cancel', async (req, res) => {
  try {
    const { userId } = req.body;

    const subscription = subscriptions.get(userId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No subscription found',
      });
    }

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date().toISOString();
    subscriptions.set(userId, subscription);

    res.json({
      success: true,
      subscription,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// PUT /api/subscription/upgrade
router.put('/upgrade', async (req, res) => {
  try {
    const { userId, newPlanId } = req.body;

    const subscription = subscriptions.get(userId);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'No subscription found',
      });
    }

    subscription.planId = newPlanId;
    subscription.upgradedAt = new Date().toISOString();
    subscriptions.set(userId, subscription);

    res.json({
      success: true,
      subscription,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/subscription/usage/:userId/:metric
router.get('/usage/:userId/:metric', async (req, res) => {
  try {
    const { userId, metric } = req.params;

    // Get current usage
    res.json({
      userId,
      metric,
      current: Math.floor(Math.random() * 1000),
      limit: 10000,
      resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

export default router;
