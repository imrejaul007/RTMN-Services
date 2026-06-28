/**
 * Lead Scoring Engine
 * Port: 5458
 * Weighted signals, velocity, recency, intent detection
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const axios = require('axios');
const app = express();
const PORT = process.env.LEAD_SCORING_PORT || 5458;

const CUSTOMER_TWIN = process.env.CUSTOMER_TWIN_URL || 'http://localhost:4895';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

app.use(express.json());

// Signal weights
const W = {
  pricing_visit: 15, product_view: 5, search: 8, compare_products: 20,
  add_to_cart: 20, checkout_start: 30, checkout_fail: -10, payment_complete: 50,
  email_subscribe: 25, whatsapp_click: 15, cta_click: 10, exit_intent: 5,
  return_visit: 10, multiple_pages: 15, time_on_site_5min: 20, time_on_site_10min: 30,
  has_email: 10, has_phone: 15, is_logged_in: 20,
  bounce: -20, single_page: -10, unsubscribe: -30
};

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'lead-scoring', port: PORT });
});

// POST /api/lead/score
app.post('/api/lead/score',requireAuth,  async (req, res) => {
  try {
    const { visitorId, companyId, signals } = req.body;
    if (!signals || !Array.isArray(signals)) {
      return res.status(400).json({ success: false, error: 'signals array required' });
    }

    let score = 0;
    const matched = [];

    for (const s of signals) {
      const w = W[s.type] || 0;
      if (w !== 0) {
        score += w;
        matched.push({ type: s.type, weight: w, value: s.value });
      }
    }

    // Velocity multiplier
    const now = Date.now();
    const recent = signals.filter(s => now - new Date(s.timestamp).getTime() < 3600000).length;
    const daySignals = signals.filter(s => now - new Date(s.timestamp).getTime() < 86400000).length;
    let velMult = 1;
    if (recent >= 3) velMult = 1.5;
    else if (daySignals >= 10) velMult = 1.5;
    else if (daySignals >= 5) velMult = 1.3;

    score *= velMult;

    // Recency decay
    const latest = Math.max(...signals.map(s => new Date(s.timestamp).getTime()));
    const ageH = (now - latest) / 3600000;
    if (ageH < 1) score *= 1.2;
    else if (ageH < 24) { /* no change */ }
    else if (ageH < 168) score *= 0.8;
    else if (ageH < 720) score *= 0.5;
    else score *= 0.2;

    score = Math.min(100, Math.max(0, Math.round(score)));

    const intentLevel = score >= 91 ? 'Closing' : score >= 76 ? 'Purchase Ready' : score >= 51 ? 'Hot' : score >= 26 ? 'Warm' : 'Cold';

    const intent = signals.some(s => ['add_to_cart', 'checkout_start'].includes(s.type)) ? 'Purchase Intent'
      : signals.some(s => s.type === 'pricing_visit') ? 'Price Research'
      : signals.some(s => s.type === 'search') ? 'Product Search'
      : 'General Browsing';

    const recommendations = score >= 76
      ? [{ action: 'Send discount code', priority: 1 }, { action: 'Call immediately', priority: 1 }]
      : score >= 51
      ? [{ action: 'Send comparison guide', priority: 1 }, { action: 'Offer live chat', priority: 2 }]
      : [{ action: 'Send case study', priority: 1 }, { action: 'Add to nurture sequence', priority: 2 }];

    res.json({
      success: true, data: { visitorId, companyId, score, intentLevel, intent, velocityMultiplier: velMult, signals: matched, recommendations }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/lead/intent-levels
app.get('/api/lead/intent-levels', (req, res) => {
  res.json({
    success: true,
    data: {
      levels: [
        { level: 'Cold', score: '0-25', color: '#94a3b8', description: 'Browsing, no strong intent' },
        { level: 'Warm', score: '26-50', color: '#f59e0b', description: 'Engaged, researching' },
        { level: 'Hot', score: '51-75', color: '#f97316', description: 'Ready to buy, comparing options' },
        { level: 'Purchase Ready', score: '76-90', color: '#22c55e', description: 'High intent, should convert soon' },
        { level: 'Closing', score: '91-100', color: '#10b981', description: 'Ready to close, prioritize immediately' }
      ]
    }
  });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => console.log(`Lead Scoring running on port ${PORT}`));
module.exports = app;
