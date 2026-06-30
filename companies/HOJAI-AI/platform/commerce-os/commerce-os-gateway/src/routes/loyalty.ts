/**
 * Loyalty Routes — Loyalty & Rewards Engine
 */

import { Router } from 'express';
import axios from 'axios';

const router = Router();
const LOYALTY_URL = process.env.SITEOS_LOYALTY_URL || 'http://localhost:5481';

// GET /api/loyalty/points/:userId
router.get('/points/:userId', async (req, res) => {
  try {
    const response = await axios.get(`${LOYALTY_URL}/api/loyalty/${req.params.userId}`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    // Return mock loyalty data
    res.json({
      userId: req.params.userId,
      points: Math.floor(Math.random() * 5000),
      tier: 'gold',
      tierBenefits: {
        discount: 10,
        freeShipping: true,
        earlyAccess: true,
      },
      nextTier: 'platinum',
      nextTierThreshold: 10000,
      progressToNextTier: 65,
      timestamp: new Date().toISOString(),
    });
  }
});

// GET /api/loyalty/tier/:userId
router.get('/tier/:userId', async (req, res) => {
  try {
    const response = await axios.get(`${LOYALTY_URL}/api/loyalty/${req.params.userId}/tier`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    const tiers = ['bronze', 'silver', 'gold', 'platinum'];
    const tierIndex = Math.floor(Math.random() * 4);
    res.json({
      userId: req.params.userId,
      tier: tiers[tierIndex],
      tierSince: '2026-01-01',
      lifetimeSpending: tierIndex * 25000,
      timestamp: new Date().toISOString(),
    });
  }
});

// POST /api/loyalty/earn
router.post('/earn', async (req, res) => {
  try {
    const { userId, orderId, orderValue } = req.body;

    // Calculate points (1 point per ₹10)
    const pointsEarned = Math.floor(orderValue / 10);

    res.json({
      success: true,
      userId,
      orderId,
      pointsEarned,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/loyalty/redeem
router.post('/redeem', async (req, res) => {
  try {
    const { userId, points, orderId } = req.body;

    // Check minimum redemption (100 points)
    if (points < 100) {
      return res.status(400).json({
        success: false,
        error: 'Minimum 100 points required for redemption',
      });
    }

    // Calculate discount (1 point = ₹0.5)
    const discount = points * 0.5;

    res.json({
      success: true,
      userId,
      orderId,
      pointsRedeemed: points,
      discount,
      remainingPoints: 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// GET /api/loyalty/rewards/:userId
router.get('/rewards/:userId', async (req, res) => {
  try {
    const response = await axios.get(`${LOYALTY_URL}/api/loyalty/${req.params.userId}/rewards`, {
      timeout: 5000,
    });
    res.json(response.data);
  } catch (error: any) {
    res.json({
      userId: req.params.userId,
      rewards: [
        {
          id: 'REWARD001',
          name: 'Free Shipping',
          cost: 100,
          available: true,
        },
        {
          id: 'REWARD002',
          name: '10% Off',
          cost: 200,
          available: true,
        },
        {
          id: 'REWARD003',
          name: 'Free Product',
          cost: 1000,
          available: true,
        },
      ],
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;
