/**
 * Customer Twin Full
 * Port: 5460
 * Full profile: identity, behavior, signals, predictive, consent
 */
const express = require('express');
const axios = require('axios');
const app = express();
const PORT = process.env.CUSTOMER_TWIN_FULL_PORT || 5460;

const CUSTOMER_TWIN = process.env.CUSTOMER_TWIN_URL || 'http://localhost:4895';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

app.use(express.json());

const profiles = new Map(); // visitorId -> profile

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'customer-twin-full', profiles: profiles.size, port: PORT });
});

// GET /:id
app.get('/api/twin/:id', async (req, res) => {
  try {
    const { id } = req.params;
    let profile = profiles.get(id);

    if (!profile) {
      // Try upstream Twin
      try {
        const twinRes = await axios.get(`${CUSTOMER_TWIN}/api/twin/${id}`, {
          headers: { Authorization: `Bearer ${HOJAI_API_KEY}` },
          timeout: 3000
        });
        profile = twinRes.data?.data || twinRes.data;
      } catch (e) {
        profile = null;
      }
    }

    if (!profile) {
      return res.status(404).json({ success: false, error: 'Profile not found' });
    }

    res.json({ success: true, data: profile });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /:id
app.put('/api/twin/:id', (req, res) => {
  const { id } = req.params;
  const existing = profiles.get(id) || {};
  const updated = { ...existing, ...req.body, updatedAt: new Date().toISOString() };
  profiles.set(id, updated);
  res.json({ success: true, data: updated });
});

// POST /:id/events
app.post('/api/twin/:id/events', (req, res) => {
  const { id } = req.params;
  const { event, properties } = req.body;
  if (!event) return res.status(400).json({ success: false, error: 'event required' });

  let profile = profiles.get(id) || {
    id, identity: {}, behavior: {}, signals: {}, predictive: {}, consent: {},
    createdAt: new Date().toISOString()
  };

  // Update signals
  if (!profile.signals.events) profile.signals.events = [];
  profile.signals.events.push({ event, properties, timestamp: new Date().toISOString() });

  // Update behavioral stats
  profile.behavior = updateBehavior(profile.behavior, event, properties);

  // Update signals summary
  profile.signals = updateSignalsSummary(profile.signals, event);

  // Calculate predictive fields
  profile.predictive = calculatePredictive(profile);

  profile.updatedAt = new Date().toISOString();
  profiles.set(id, profile);

  res.json({ success: true, data: profile });
});

// GET /:id/history
app.get('/api/twin/:id/history', (req, res) => {
  const profile = profiles.get(req.params.id);
  if (!profile) return res.status(404).json({ success: false, error: 'Profile not found' });

  const events = profile.signals?.events || [];
  res.json({ success: true, data: { events: events.slice(-100), total: events.length } });
});

// POST /:id/consent
app.post('/api/twin/:id/consent', (req, res) => {
  const { id } = req.params;
  const { email, sms, whatsapp, tracking } = req.body;

  let profile = profiles.get(id) || { id, consent: {} };
  profile.consent = {
    email: email ?? profile.consent?.email ?? false,
    sms: sms ?? profile.consent?.sms ?? false,
    whatsapp: whatsapp ?? profile.consent?.whatsapp ?? false,
    tracking: tracking ?? profile.consent?.tracking ?? false,
    updatedAt: new Date().toISOString()
  };
  profiles.set(id, profile);

  res.json({ success: true, data: profile.consent });
});

// GET /search
app.get('/api/twin/search', (req, res) => {
  const { segment, limit } = req.query;
  const results = [];

  for (const [id, profile] of profiles) {
    if (segment) {
      if (segment === 'vip' && profile.predictive?.ltv >= 10000) results.push(profile);
      else if (segment === 'at_risk' && profile.predictive?.churnRisk >= 70) results.push(profile);
      else if (segment === 'new' && profile.behavior?.purchaseCount <= 1) results.push(profile);
    } else {
      results.push(profile);
    }
    if (results.length >= (parseInt(limit) || 50)) break;
  }

  res.json({ success: true, data: results });
});

function updateBehavior(behavior, event, properties) {
  behavior = behavior || { pageViews: 0, purchases: 0, cartAdds: 0, searches: 0 };

  if (event === 'page_view') behavior.pageViews++;
  else if (['purchase_complete', 'payment_complete'].includes(event)) behavior.purchases++;
  else if (event === 'add_to_cart') behavior.cartAdds++;
  else if (event === 'search') behavior.searches++;

  behavior.lastEvent = event;
  behavior.lastEventAt = new Date().toISOString();

  return behavior;
}

function updateSignalsSummary(signals, event) {
  signals = signals || { eventCounts: {} };
  signals.eventCounts[event] = (signals.eventCounts[event] || 0) + 1;
  return signals;
}

function calculatePredictive(profile) {
  const events = profile.signals?.events || [];
  const behavior = profile.behavior || {};

  // LTV estimation
  const ltv = (behavior.purchases || 0) * (behavior.avgOrderValue || 500);

  // Churn risk
  const lastPurchase = events.filter(e => ['purchase_complete', 'payment_complete'].includes(e.event)).pop();
  const daysSince = lastPurchase
    ? Math.floor((Date.now() - new Date(lastPurchase.timestamp).getTime()) / 86400000)
    : 999;
  const churnRisk = daysSince > 90 ? 90 : daysSince > 60 ? 70 : daysSince > 30 ? 40 : 10;

  // Purchase probability
  const purchaseProb = events.length > 10 ? Math.min(95, 50 + events.length) : Math.max(5, events.length * 5);

  return {
    ltv: Math.round(ltv),
    churnRisk: Math.round(churnRisk),
    purchaseProbability: Math.round(purchaseProb),
    avgOrderValue: behavior.avgOrderValue || 500,
    predictedNextPurchase: daysSince > 30 ? 'soon' : 'imminent'
  };
}

app.listen(PORT, () => console.log(`Customer Twin Full running on port ${PORT}`));
module.exports = app;
