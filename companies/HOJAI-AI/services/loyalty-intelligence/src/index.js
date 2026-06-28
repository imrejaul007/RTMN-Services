/**
 * HOJAI Loyalty Intelligence Service
 *
 * Calculates LTV, churn risk, and retention strategies.
 * Part of the Customer Intelligence SDK suite.
 *
 * Port: 4904
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const PORT = process.env.PORT || 4904;
const SERVICE_NAME = 'loyalty-intelligence';
const NO_LISTEN = process.env.NO_LISTEN === '1';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

function calculateLoyaltyProfile(data) {
  const { purchaseHistory, engagementHistory, subscriptionStatus } = data;

  const currentLTV = purchaseHistory?.totalSpend || 0;
  const avgOrderValue = purchaseHistory?.avgOrderValue || currentLTV / Math.max(purchaseHistory?.orderCount || 1, 1);
  const ordersPerYear = purchaseHistory?.orderCount / 2 || 0;
  const yearlySpend = ordersPerYear * avgOrderValue;

  const predicted1yr = currentLTV + yearlySpend;
  const predicted3yr = currentLTV + (yearlySpend * 3);

  let tier = 'bronze';
  if (currentLTV >= 100000) tier = 'vip';
  else if (currentLTV >= 50000) tier = 'platinum';
  else if (currentLTV >= 20000) tier = 'gold';
  else if (currentLTV >= 5000) tier = 'silver';

  const engagement = engagementHistory?.logins || 0;
  let churnProb = 0.5;
  if (engagement > 50) churnProb = 0.1;
  else if (engagement > 20) churnProb = 0.25;
  else if (engagement < 5) churnProb = 0.7;

  if (purchaseHistory?.lastOrderDate) {
    const daysSinceOrder = (Date.now() - new Date(purchaseHistory.lastOrderDate)) / (1000 * 60 * 60 * 24);
    if (daysSinceOrder > 90) churnProb += 0.2;
    else if (daysSinceOrder > 60) churnProb += 0.1;
  }

  const churnLevel = churnProb > 0.5 ? 'high' : churnProb > 0.3 ? 'medium' : 'low';

  const retentionRecs = [];
  if (churnProb > 0.3) retentionRecs.push('win-back_offer', 'personalized_reachout');
  if (tier === 'gold' || tier === 'platinum') retentionRecs.push('exclusive_previews', 'vip_support');
  retentionRecs.push('loyalty_points', 'early_access');

  const benefits = [];
  if (tier === 'vip') benefits.push('free_shipping', 'priority_support', 'exclusive_access', 'personal_shopper');
  else if (tier === 'platinum') benefits.push('free_shipping', 'priority_support', 'early_access');
  else if (tier === 'gold') benefits.push('free_shipping', 'birthday_discount');
  else benefits.push('loyalty_points');

  const upsellOpp = [];
  if (tier !== 'vip') upsellOpp.push('membership_upgrade');
  if (subscriptionStatus === 'none') upsellOpp.push('premium_subscription');
  upsellOpp.push('referral_program');

  return {
    ltv: {
      current: currentLTV,
      predicted_1yr: Math.round(predicted1yr),
      predicted_3yr: Math.round(predicted3yr)
    },
    ltv_tier: tier,
    churn_risk: {
      probability: Math.round(churnProb * 100) / 100,
      level: churnLevel,
      factors: churnProb > 0.5 ? ['low engagement', 'recent inactivity'] : ['regular activity']
    },
    retention_recommendations: retentionRecs,
    upsell_opportunities: upsellOpp,
    membership_benefits: benefits
  };
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

app.post('/api/loyalty/profile', (req, res) => {
  try {
    const result = calculateLoyaltyProfile(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/loyalty/retention/:customerId', (req, res) => {
  res.json({ customerId: req.params.customerId, recommendations: ['loyalty_points', 'early_access'] });
});

if (!NO_LISTEN) {
  app.listen(PORT, () => console.log(`Loyalty Intelligence Service listening on port ${PORT}`));
}

module.exports = app;
