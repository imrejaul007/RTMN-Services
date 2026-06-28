/**
 * Vertical Templates
 * Port: 5455
 * 5 Vertical Templates - Retail, Restaurant, Hotel, Healthcare, Real Estate
 * Reuses: All 26 Industry OS services
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const app = express();
const PORT = process.env.VERTICAL_TEMPLATES_PORT || 5455;

const retail = require('./verticals/retail');
const restaurant = require('./verticals/restaurant');
const hotel = require('./verticals/hotel');
const healthcare = require('./verticals/healthcare');
const realestate = require('./verticals/realestate');

const verticals = { retail, restaurant, hotel, healthcare, realestate };
const activatedVerticals = new Map(); // companyId -> { vertical, activatedAt }

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vertical-templates', verticals: Object.keys(verticals), activated: activatedVerticals.size, port: PORT });
});

// GET /api/verticals - List all verticals
app.get('/api/verticals', (_req, res) => {
  const list = Object.entries(verticals).map(([name, v]) => ({
    name, displayName: v.displayName, icon: v.icon, description: v.description,
    intents: v.intents.map(i => ({ id: i.id, patterns: i.patterns.slice(0, 3) })),
    richContentTypes: v.richContentTypes
  }));
  res.json({ success: true, data: list });
});

// GET /api/verticals/:name - Get specific vertical
app.get('/api/verticals/:name', (req, res) => {
  const v = verticals[req.params.name];
  if (!v) return res.status(404).json({ success: false, error: 'Vertical not found' });
  res.json({ success: true, data: v });
});

// POST /api/verticals/activate - Activate vertical for company
app.post('/api/verticals/activate',requireAuth,  (req, res) => {
  const { companyId, verticalName, websiteUrl, websiteContent } = req.body;
  if (!companyId) return res.status(400).json({ success: false, error: 'companyId is required' });

  let name = verticalName;
  if (!name) {
    // Auto-detect
    name = detectVertical(websiteUrl, websiteContent);
  }

  const v = verticals[name];
  if (!v) return res.status(400).json({ success: false, error: `Vertical '${name}' not found` });

  activatedVerticals.set(companyId, {
    vertical: name, activatedAt: new Date().toISOString(), websiteUrl,
    config: { ...v }
  });

  res.json({ success: true, data: { companyId, vertical: name, activatedAt: new Date().toISOString() } });
});

// GET /api/verticals/:name/intents - Get intents for a vertical
app.get('/api/verticals/:name/intents', (req, res) => {
  const v = verticals[req.params.name];
  if (!v) return res.status(404).json({ success: false, error: 'Vertical not found' });
  res.json({ success: true, data: v.intents });
});

// POST /api/verticals/:name/intent-match - Match user message to intent
app.post('/api/verticals/:name/intent-match',requireAuth,  (req, res) => {
  const v = verticals[req.params.name];
  if (!v) return res.status(404).json({ success: false, error: 'Vertical not found' });

  const { message } = req.body;
  if (!message) return res.status(400).json({ success: false, error: 'message is required' });

  const msg = message.toLowerCase();
  let bestMatch = null, bestScore = 0;

  for (const intent of v.intents) {
    for (const pattern of intent.patterns) {
      if (msg.includes(pattern.toLowerCase())) {
        const score = pattern.length; // longer match = better
        if (score > bestScore) {
          bestScore = score;
          bestMatch = { id: intent.id, action: intent.action, confidence: score / msg.length };
        }
      }
    }
  }

  res.json({
    success: true,
    data: {
      matched: !!bestMatch,
      intent: bestMatch,
      vertical: v.displayName,
      agentPrompt: v.agentPrompt
    }
  });
});

// GET /api/verticals/:name/rich-content - Get rich content types
app.get('/api/verticals/:name/rich-content', (req, res) => {
  const v = verticals[req.params.name];
  if (!v) return res.status(404).json({ success: false, error: 'Vertical not found' });
  res.json({ success: true, data: v.richContentTypes });
});

// GET /api/verticals/company/:companyId - Get activated vertical for company
app.get('/api/verticals/company/:companyId', (req, res) => {
  const activated = activatedVerticals.get(req.params.companyId);
  if (!activated) return res.status(404).json({ success: false, error: 'No vertical activated for this company' });
  res.json({ success: true, data: activated });
});

// POST /api/verticals/detect - Auto-detect vertical from URL/content
app.post('/api/verticals/detect',requireAuth,  (req, res) => {
  const { url, content } = req.body;
  const detected = detectVertical(url, content);
  res.json({ success: true, data: { detected, vertical: verticals[detected] } });
});

// ─── Auto-Detection ────────────────────────────────────────────────────────────

function detectVertical(url, pageContent) {
  const u = (url || '').toLowerCase();
  const p = (pageContent || '').toLowerCase();

  // Healthcare detection (highest priority)
  if (u.includes('doctor') || u.includes('clinic') || u.includes('health') || u.includes('medical') ||
      u.includes('pharmacy') || u.includes('hospital') || u.includes('dental') || u.includes('telemed') ||
      p.includes('appointment') || p.includes('prescription') || p.includes('symptoms')) {
    return 'healthcare';
  }

  // Real Estate detection
  if (u.includes('property') || u.includes('real estate') || u.includes('home') || u.includes('apartment') ||
      u.includes('builder') || u.includes('plots') || u.includes('flats') ||
      p.includes('sq ft') || p.includes('bedroom') || p.includes('sqft')) {
    return 'realestate';
  }

  // Hotel detection
  if (u.includes('hotel') || u.includes('resort') || u.includes('homestay') || u.includes('vacation') ||
      u.includes('booking') || u.includes('stay') || u.includes('guest house') ||
      p.includes('check-in') || p.includes('check-out') || p.includes('nights')) {
    return 'hotel';
  }

  // Restaurant detection
  if (u.includes('restaurant') || u.includes('food') || u.includes('menu') || u.includes('cafe') ||
      u.includes('pizza') || u.includes('burger') || u.includes('delivery') || u.includes('cloud kitchen') ||
      p.includes('order food') || p.includes('dishes') || p.includes('cuisine') || p.includes('reserve table')) {
    return 'restaurant';
  }

  // Retail is the default
  return 'retail';
}
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => {
  console.log(`Vertical Templates running on port ${PORT}`);
  console.log('Verticals:', Object.keys(verticals).join(', '));
});

module.exports = app;
