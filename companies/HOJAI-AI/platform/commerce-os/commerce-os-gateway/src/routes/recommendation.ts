/**
 * Recommendation Routes — Personalized Product Recommendations
 */

import { Router } from 'express';

const router = Router();

// In-memory recommendation engine
const userProfiles = new Map();

// GET /api/recommendation/for-user/:userId
router.get('/for-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { context, limit = 20 } = req.query;

    // Generate recommendations
    const recommendations = await generateRecommendations(userId, context as string, Number(limit));

    res.json({
      userId,
      context,
      recommendations,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// POST /api/recommendation/track
router.post('/track', async (req, res) => {
  const { userId, productId, action, context } = req.body;

  // Track user behavior
  const profile = userProfiles.get(userId) || { views: [], purchases: [] };
  if (action === 'view') profile.views.push(productId);
  if (action === 'purchase') profile.purchases.push(productId);
  userProfiles.set(userId, profile);

  res.json({
    success: true,
    tracked: true,
    timestamp: new Date().toISOString(),
  });
});

// GET /api/recommendation/similar/:productId
router.get('/similar/:productId', async (req, res) => {
  const { productId } = req.params;
  const { limit = 10 } = req.query;

  const similar = Array.from({ length: Number(limit) }, (_, i) => ({
    productId: `PROD${String(i + 100).padStart(3, '0')}`,
    name: `Similar Product ${i + 1}`,
    score: Math.random() * 0.5 + 0.5,
    reason: 'Frequently bought together',
  })).sort((a, b) => b.score - a.score);

  res.json({
    productId,
    similar,
    timestamp: new Date().toISOString(),
  });
});

// POST /api/recommendation/bundle
router.post('/bundle', async (req, res) => {
  const { userId, cartItems, limit = 5 } = req.body;

  // Generate bundle recommendations
  res.json({
    userId,
    bundleRecommendations: [
      {
        products: ['PROD101', 'PROD102', 'PROD103'],
        comboPrice: 999,
        discount: 200,
        score: 0.92,
      },
    ],
    timestamp: new Date().toISOString(),
  });
});

// Helper function for recommendations
async function generateRecommendations(userId: string, context: string, limit: number) {
  const profile = userProfiles.get(userId);

  const recommendations = [];
  for (let i = 0; i < limit; i++) {
    recommendations.push({
      productId: `PROD${String(i + 1).padStart(3, '0')}`,
      name: `Recommended Product ${i + 1}`,
      score: Math.random() * 0.6 + 0.4,
      reason: getReason(context, profile),
    });
  }

  return recommendations.sort((a, b) => b.score - a.score);
}

function getReason(context: string, profile: any) {
  if (!profile) return 'Popular in your area';

  const reasons = [
    'Based on your browsing history',
    'Frequently bought together',
    'Trending in your area',
    'Similar to your past purchases',
    'Recommended for you',
  ];

  return reasons[Math.floor(Math.random() * reasons.length)];
}

export default router;
