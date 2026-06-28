/**
 * Campaign Auto-Creation
 * Port: 5473
 * Auto-generate campaigns from goals
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const axios = require('axios');
const app = express();
const PORT = process.env.CAMPAIGN_AUTO_PORT || 5473;

const MARKETING_OS = process.env.MARKETING_OS_URL || 'http://localhost:5500';

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'campaign-auto-creation', port: PORT });
});

// POST /api/campaigns/generate - Generate campaign from goal
app.post('/api/campaigns/generate',requireAuth,  (req, res) => {
  try {
    const { goal, audience, companyId } = req.body;
    if (!goal) return res.status(400).json({ error: 'goal required' });

    const campaign = {
      id: `campaign_${Date.now()}`,
      goal,
      audience: audience || 'all_visitors',
      companyId,
      status: 'draft',
      createdAt: new Date().toISOString(),
      channels: ['email', 'whatsapp'],
      templates: generateTemplates(goal)
    };

    res.json({ success: true, data: campaign });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/campaigns/execute - Execute campaign
app.post('/api/campaigns/execute',requireAuth,  (req, res) => {
  try {
    const { campaignId } = req.body;
    res.json({ success: true, data: { campaignId, status: 'scheduled' } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

function generateTemplates(goal) {
  const templates = [];
  if (goal.includes('recovery') || goal.includes('abandon')) {
    templates.push(
      { channel: 'whatsapp', delay: '15m', template: 'cart_reminder' },
      { channel: 'email', delay: '6h', template: 'abandoned_cart_email', coupon: 'CART10' }
    );
  }
  if (goal.includes('win') || goal.includes('retain')) {
    templates.push(
      { channel: 'email', delay: '0h', template: 'win_back_email' },
      { channel: 'whatsapp', delay: '3d', template: 'special_offer' }
    );
  }
  return templates;
}
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => console.log(`Campaign Auto-Creation running on port ${PORT}`));
module.exports = app;
