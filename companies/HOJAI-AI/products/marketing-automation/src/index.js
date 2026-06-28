/**
 * Marketing Automation
 * Port: 5459
 * 8 automation rules: abandoned_cart, welcome_series, win_back, post_purchase, birthday, low_stock, price_drop, replenishment
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const axios = require('axios');
const app = express();
const PORT = process.env.MARKETING_AUTOMATION_PORT || 5459;

app.use(express.json());

const rules = new Map();
const executions = new Map();

// 8 automation rules
const DEFAULT_RULES = [
  {
    id: 'abandoned_cart',
    name: 'Abandoned Cart Recovery',
    trigger: 'cart_abandon',
    conditions: [],
    actions: [
      { channel: 'whatsapp', delay: '15m', template: 'abandoned_cart_1' },
      { channel: 'email', delay: '6h', template: 'abandoned_cart_2' },
      { channel: 'sms', delay: '24h', template: 'abandoned_cart_3', coupon: 'CART10' }
    ],
    enabled: true
  },
  {
    id: 'welcome_series',
    name: 'Welcome Series',
    trigger: 'sign_up',
    conditions: [],
    actions: [
      { channel: 'email', delay: '0h', template: 'welcome_1' },
      { channel: 'email', delay: '3d', template: 'welcome_2' },
      { channel: 'email', delay: '7d', template: 'welcome_3' }
    ],
    enabled: true
  },
  {
    id: 'win_back',
    name: 'Win-Back Campaign',
    trigger: 'inactive_60d',
    conditions: [{ field: 'days_since_purchase', operator: '>=', value: 60 }],
    actions: [
      { channel: 'email', delay: '0h', template: 'winback_1' },
      { channel: 'whatsapp', delay: '3d', template: 'winback_2' },
      { channel: 'sms', delay: '7d', template: 'winback_3', discount: 15 }
    ],
    enabled: true
  },
  {
    id: 'post_purchase',
    name: 'Post-Purchase Follow-Up',
    trigger: 'purchase_complete',
    conditions: [],
    actions: [
      { channel: 'email', delay: '1h', template: 'thank_you' },
      { channel: 'email', delay: '7d', template: 'review_request' },
      { channel: 'email', delay: '30d', template: 'loyalty_invite' }
    ],
    enabled: true
  },
  {
    id: 'birthday',
    name: 'Birthday Campaign',
    trigger: 'birthday',
    conditions: [],
    actions: [
      { channel: 'whatsapp', delay: '0h', template: 'birthday_greeting', coupon: 'BDAY20' },
      { channel: 'email', delay: '0h', template: 'birthday_email', coupon: 'BDAY20' }
    ],
    enabled: true
  },
  {
    id: 'low_stock_alert',
    name: 'Low Stock Alert',
    trigger: 'low_stock',
    conditions: [{ field: 'stock', operator: '<=', value: 10 }],
    actions: [
      { channel: 'internal', delay: '0h', template: 'low_stock_notification', notify: 'sales' }
    ],
    enabled: true
  },
  {
    id: 'price_drop',
    name: 'Price Drop Alert',
    trigger: 'price_reduction',
    conditions: [],
    actions: [
      { channel: 'whatsapp', delay: '0h', template: 'price_drop', notifyWatchers: true }
    ],
    enabled: true
  },
  {
    id: 'replenishment',
    name: 'Replenishment Reminder',
    trigger: 'replenishment_time',
    conditions: [{ field: 'days_since_purchase', operator: '>=', value: 30 }],
    actions: [
      { channel: 'whatsapp', delay: '0h', template: 'reorder_reminder' },
      { channel: 'email', delay: '0h', template: 'reorder_email' }
    ],
    enabled: true
  }
];

// Initialize default rules
for (const rule of DEFAULT_RULES) rules.set(rule.id, rule);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'marketing-automation', rules: rules.size, port: PORT });
});

// GET /api/rules
app.get('/api/rules', (req, res) => {
  const { companyId, enabled } = req.query;
  let list = [...rules.values()];
  if (enabled !== undefined) list = list.filter(r => r.enabled === (enabled === 'true'));
  res.json({ success: true, data: list });
});

// GET /api/rules/:id
app.get('/api/rules/:id', (req, res) => {
  const rule = rules.get(req.params.id);
  if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
  res.json({ success: true, data: rule });
});

// PUT /api/rules/:id
app.put('/api/rules/:id',requireAuth,  (req, res) => {
  const rule = rules.get(req.params.id);
  if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
  const updated = { ...rule, ...req.body, id: req.params.id };
  rules.set(req.params.id, updated);
  res.json({ success: true, data: updated });
});

// POST /api/rules/:id/test
app.post('/api/rules/:id/test',requireAuth,  (req, res) => {
  const rule = rules.get(req.params.id);
  if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });
  const { customerId, data } = req.body;

  const execution = {
    id: `exec_${Date.now()}`,
    ruleId: rule.id,
    customerId,
    triggeredAt: new Date().toISOString(),
    status: 'simulated',
    actions: rule.actions.map(a => ({ ...a, status: 'pending' }))
  };

  res.json({ success: true, data: execution });
});

// POST /api/rules/:id/execute
app.post('/api/rules/:id/execute',requireAuth,  async (req, res) => {
  const rule = rules.get(req.params.id);
  if (!rule) return res.status(404).json({ success: false, error: 'Rule not found' });

  const { customerId, context } = req.body;

  const execution = {
    id: `exec_${Date.now()}`,
    ruleId: rule.id,
    customerId,
    triggeredAt: new Date().toISOString(),
    status: 'running',
    actions: []
  };

  for (const action of rule.actions) {
    // Simulate sending (in production, call notification service)
    execution.actions.push({
      channel: action.channel,
      template: action.template,
      delay: action.delay,
      status: 'queued',
      scheduledAt: new Date(Date.now() + parseDelay(action.delay)).toISOString()
    });
  }

  if (!executions.has(customerId)) executions.set(customerId, []);
  executions.get(customerId).push(execution);

  res.json({ success: true, data: execution });
});

// GET /api/executions/:companyId
app.get('/api/executions/:companyId', (req, res) => {
  const { status } = req.query;
  let all = [];
  for (const exs of executions.values()) all.push(...exs);
  if (status) all = all.filter(e => e.status === status);
  res.json({ success: true, data: all.slice(-100) });
});

function parseDelay(delay) {
  const match = delay.match(/(\d+)(h|d|m)/);
  if (!match) return 0;
  const num = parseInt(match[1]);
  if (match[2] === 'm') return num * 60000;
  if (match[2] === 'h') return num * 3600000;
  return num * 86400000;
}
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => console.log(`Marketing Automation running on port ${PORT}`));
module.exports = app;
