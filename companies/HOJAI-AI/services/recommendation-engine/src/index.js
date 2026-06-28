/**
 * HOJAI Recommendation Engine
 *
 * Provides next best action recommendations.
 * Part of the Customer Intelligence SDK suite.
 *
 * Port: 4902
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const PORT = process.env.PORT || 4902;
const SERVICE_NAME = 'recommendation-engine';
const NO_LISTEN = process.env.NO_LISTEN === '1';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

// Recommendations templates by context
const RECOMMENDATIONS = {
  checkout: [
    { action: 'offer_membership', type: 'offer', baseScore: 0.85, reason: 'High-value customer likely to benefit from membership' },
    { action: 'free_shipping', type: 'offer', baseScore: 0.75, reason: 'Encourage completion for high-value orders' },
    { action: 'upsell', type: 'product', baseScore: 0.7, reason: 'Related product recommendation' }
  ],
  cart: [
    { action: 'cart_reminder', type: 'action', baseScore: 0.8, reason: 'Abandoned cart recovery' },
    { action: 'discount_offer', type: 'offer', baseScore: 0.75, reason: 'Conversion optimization' },
    { action: 'complementary_product', type: 'product', baseScore: 0.7, reason: 'Increase average order value' }
  ],
  browse: [
    { action: 'personalized_recommendation', type: 'product', baseScore: 0.85, reason: 'Based on browsing history' },
    { action: 'trending_products', type: 'product', baseScore: 0.7, reason: 'Popular items' },
    { action: 'similar_to_viewed', type: 'product', baseScore: 0.75, reason: 'Similar to recently viewed' }
  ],
  support: [
    { action: 'quick_resolution', type: 'action', baseScore: 0.9, reason: 'Fast resolution preferred' },
    { action: 'refund_option', type: 'action', baseScore: 0.7, reason: 'Satisfy customer quickly' },
    { action: 'escalate_to_human', type: 'action', baseScore: 0.6, reason: 'Complex issue detected' }
  ],
  marketing: [
    { action: 'personalized_offer', type: 'offer', baseScore: 0.85, reason: 'Based on customer preferences' },
    { action: 'win_back', type: 'offer', baseScore: 0.75, reason: 'Re-engagement campaign' },
    { action: 'loyalty_points', type: 'offer', baseScore: 0.8, reason: 'Encourage repeat purchase' }
  ],
  general: [
    { action: 'subscription_upgrade', type: 'offer', baseScore: 0.75, reason: 'Premium tier upgrade' },
    { action: 'referral_program', type: 'action', baseScore: 0.7, reason: 'Word of mouth growth' },
    { action: 'product_education', type: 'content', baseScore: 0.6, reason: 'Build product awareness' }
  ]
};

function generateRecommendations(context, customerData, limit = 5) {
  const templates = RECOMMENDATIONS[context] || RECOMMENDATIONS.general;

  const recommendations = templates.slice(0, limit).map((t, i) => ({
    action: t.action,
    type: t.type,
    score: t.baseScore + (Math.random() * 0.1 - 0.05),
    reason: t.reason,
    personalization: {
      context,
      customerSegment: customerData.segment || 'general',
      tier: customerData.tier || 'standard'
    }
  }));

  recommendations.sort((a, b) => b.score - a.score);

  return recommendations;
}

function getNextBestAction(context, customerData) {
  const recommendations = generateRecommendations(context, customerData, 3);

  return {
    action: recommendations[0]?.action || 'no_action',
    confidence: recommendations[0]?.score || 0,
    alternatives: recommendations.slice(1).map(r => r.action)
  };
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

app.post('/api/recommend', (req, res) => {
  try {
    const { context, available, limit, customerData } = req.body;

    const recommendations = generateRecommendations(context, customerData || {}, limit || 5);
    const nextBest = getNextBestAction(context, customerData || {});

    res.json({
      recommendations,
      next_best_action: nextBest,
      generated_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/recommend/next-best-action', (req, res) => {
  try {
    const { customerId, context } = req.body;

    res.json(getNextBestAction(context || 'general', { customerId }));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

if (!NO_LISTEN) {
  app.listen(PORT, () => console.log(`Recommendation Engine listening on port ${PORT}`));
}

module.exports = app;
