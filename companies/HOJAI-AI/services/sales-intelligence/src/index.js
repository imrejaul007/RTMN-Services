/**
 * HOJAI Sales Intelligence Service
 *
 * Understands customer buying preferences and recommends actions.
 * Part of the Customer Intelligence SDK suite.
 *
 * Port: 4901
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const PORT = process.env.PORT || 4901;
const SERVICE_NAME = 'sales-intelligence';
const NO_LISTEN = process.env.NO_LISTEN === '1';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());

function calculateSellingPreferences(data) {
  const { purchaseHistory, browsingHistory, responseHistory } = data;

  let segment = 'occasional';
  let segmentDesc = 'Occasional shopper';

  if (purchaseHistory) {
    const avgOrdersPerMonth = purchaseHistory.orderCount / 12;
    if (avgOrdersPerMonth >= 4) {
      segment = 'premium_explorer';
      segmentDesc = 'High-frequency premium buyer who explores new products';
    } else if (avgOrdersPerMonth >= 2) {
      segment = 'loyal_brand';
      segmentDesc = 'Regular buyer with brand loyalty';
    } else if (avgOrdersPerMonth >= 1) {
      segment = 'value_hunter';
      segmentDesc = 'Value-conscious shopper looking for deals';
    }
  }

  let priceSensitivity = 'medium';
  if (purchaseHistory?.avgOrderValue > 5000) priceSensitivity = 'low';
  else if (purchaseHistory?.avgOrderValue < 1000) priceSensitivity = 'high';

  let discountResponsiveness = 0.5;
  if (responseHistory) {
    const responseRate = responseHistory.offerAcceptances / (responseHistory.campaignClicks || 1);
    discountResponsiveness = Math.min(responseRate, 1);
  }

  const premiumBuyer = purchaseHistory && purchaseHistory.avgOrderValue > 3000;
  const categories = purchaseHistory?.categories || ['general'];

  let frequency = 'occasional';
  if (purchaseHistory) {
    const ordersPerMonth = purchaseHistory.orderCount / 12;
    if (ordersPerMonth >= 4) frequency = 'weekly';
    else if (ordersPerMonth >= 1) frequency = 'monthly';
    else if (ordersPerMonth >= 0.25) frequency = 'occasional';
  }

  let nextOffer = 'membership_upgrade';
  if (premiumBuyer) nextOffer = 'premium_subscription';
  else if (discountResponsiveness > 0.6) nextOffer = 'loyalty_discount';
  else nextOffer = 'personalized_recommendation';

  const upsells = [];
  if (premiumBuyer) upsells.push('premium_subscription', 'exclusive_access');
  if (discountResponsiveness > 0.5) upsells.push('bulk_discount', 'loyalty_points');
  if (frequency === 'frequent') upsells.push('subscription_box');

  return {
    customer_segment: segment,
    segment_description: segmentDesc,
    price_sensitivity: priceSensitivity,
    discount_responsiveness: Math.round(discountResponsiveness * 100) / 100,
    premium_buyer: premiumBuyer,
    preferred_categories: categories,
    buying_frequency: frequency,
    next_best_offer: nextOffer,
    recommended_channel: 'whatsapp',
    recommended_time: 'evening',
    upsell_opportunities: upsells
  };
}

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: SERVICE_NAME, version: '1.0.0', timestamp: new Date().toISOString() });
});

app.post('/api/sales/preferences', (req, res) => {
  try {
    const result = calculateSellingPreferences(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/sales/segment/:customerId', (req, res) => {
  res.json({ customerId: req.params.customerId, segment: 'occasional' });
});

if (!NO_LISTEN) {
  app.listen(PORT, () => console.log(`Sales Intelligence Service listening on port ${PORT}`));
}

module.exports = app;
