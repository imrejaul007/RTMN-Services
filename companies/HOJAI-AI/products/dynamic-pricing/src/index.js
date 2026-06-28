/**
 * Dynamic Pricing
 * Port: 5474
 * Demand-based + competitor-aware pricing
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const axios = require('axios');
const app = express();
const PORT = process.env.DYNAMIC_PRICING_PORT || 5474;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'dynamic-pricing', port: PORT });
});

// POST /api/pricing/recommend - Get price recommendation
app.post('/api/pricing/recommend',requireAuth,  (req, res) => {
  try {
    const { productId, demand, competitorPrice, inventory } = req.body;
    const basePrice = req.body.price || 1000;

    // Simple demand-based pricing
    let multiplier = 1.0;
    if (demand === 'high') multiplier = 1.15;
    else if (demand === 'low') multiplier = 0.85;

    // Competitor adjustment
    if (competitorPrice) {
      const comp = parseFloat(competitorPrice);
      if (comp < basePrice * 0.9) multiplier *= 0.95;
      else if (comp > basePrice * 1.1) multiplier *= 1.05;
    }

    const recommended = Math.round(basePrice * multiplier);
    const savings = basePrice - recommended;

    res.json({
      success: true, data: {
        productId,
        basePrice,
        recommendedPrice: recommended,
        discount: Math.round((1 - multiplier) * 100),
        savings: savings > 0 ? savings : 0,
        demand,
        competitorPrice
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/pricing/optimize/:productId - Optimize all prices
app.get('/api/pricing/optimize/:productId', (req, res) => {
  res.json({
    success: true, data: {
      productId: req.params.productId,
      currentPrice: 999,
      optimalPrice: 1099,
      demand: 'medium',
      competitorPrices: { amazon: 1199, flipkart: 1099 }
    }
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => console.log(`Dynamic Pricing running on port ${PORT}`));
module.exports = app;
