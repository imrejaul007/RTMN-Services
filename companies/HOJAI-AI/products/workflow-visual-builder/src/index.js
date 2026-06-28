/**
 * Workflow Visual Builder
 * Port: 5462
 * Pre-built templates, FlowOS integration
 */
const express = require('express');
const { requireAuth } = require('@rtmn/shared/auth');
const axios = require('axios');
const app = express();
const PORT = process.env.WORKFLOW_BUILDER_PORT || 5462;

const FLOW_OS = process.env.FLOW_OS_URL || 'http://localhost:7007';
const HOJAI_API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

app.use(express.json());

const workflows = new Map();

// 10 pre-built templates
const TEMPLATES = [
  {
    id: 'abandoned_cart_recovery',
    name: 'Abandoned Cart Recovery',
    description: 'Recover abandoned carts with 3-step WhatsApp + Email sequence',
    category: 'conversion',
    estimatedImpact: 'Rs 50,000+/month',
    steps: [
      { type: 'trigger', event: 'cart_abandon', delay: '15m', channel: 'whatsapp', template: 'cart_reminder' },
      { type: 'condition', field: 'opened', value: true },
      { type: 'action', channel: 'email', delay: '6h', template: 'cart_followup' },
      { type: 'condition', field: 'converted', value: true },
      { type: 'action', channel: 'internal', notify: 'sales', message: 'Cart recovered!' }
    ]
  },
  {
    id: 'welcome_series',
    name: 'Welcome Series',
    description: '3-email nurture sequence for new signups',
    category: 'onboarding',
    estimatedImpact: 'Rs 20,000/month',
    steps: [
      { type: 'trigger', event: 'sign_up', delay: '0h', channel: 'email', template: 'welcome' },
      { type: 'action', channel: 'email', delay: '3d', template: 'onboarding_guide' },
      { type: 'action', channel: 'email', delay: '7d', template: 'featured_product' }
    ]
  },
  {
    id: 'win_back',
    name: 'Win-Back Campaign',
    description: 'Re-engage customers inactive for 60+ days',
    category: 'retention',
    estimatedImpact: 'Rs 30,000/month',
    steps: [
      { type: 'trigger', event: 'inactive_60d' },
      { type: 'action', channel: 'email', delay: '0h', template: 'we_miss_you' },
      { type: 'action', channel: 'whatsapp', delay: '3d', template: 'special_offer' },
      { type: 'action', channel: 'sms', delay: '7d', template: 'last_chance', coupon: 'WINBACK15' }
    ]
  },
  {
    id: 'post_purchase',
    name: 'Post-Purchase Follow-Up',
    description: 'Thank you + review + loyalty invite',
    category: 'retention',
    estimatedImpact: 'Rs 15,000/month',
    steps: [
      { type: 'trigger', event: 'purchase_complete' },
      { type: 'action', channel: 'whatsapp', delay: '1h', template: 'thank_you' },
      { type: 'action', channel: 'email', delay: '7d', template: 'review_request' },
      { type: 'action', channel: 'email', delay: '14d', template: 'loyalty_invite' }
    ]
  },
  {
    id: 'birthday_campaign',
    name: 'Birthday Campaign',
    description: 'Automated birthday greetings with discount',
    category: 'retention',
    estimatedImpact: 'Rs 10,000/month',
    steps: [
      { type: 'trigger', event: 'birthday' },
      { type: 'action', channel: 'whatsapp', delay: '0h', template: 'birthday_greeting', coupon: 'BDAY20' },
      { type: 'action', channel: 'email', delay: '0h', template: 'birthday_email', coupon: 'BDAY20' }
    ]
  },
  {
    id: 'lead_nurture',
    name: 'Lead Nurture Sequence',
    description: '5-day educational sequence for new leads',
    category: 'lead',
    estimatedImpact: 'Rs 25,000/month',
    steps: [
      { type: 'trigger', event: 'form_submit' },
      { type: 'action', channel: 'email', delay: '0h', template: 'thank_you_form' },
      { type: 'action', channel: 'email', delay: '2d', template: 'educational_1' },
      { type: 'action', channel: 'email', delay: '4d', template: 'case_study' },
      { type: 'action', channel: 'email', delay: '6d', template: 'demo_offer' }
    ]
  },
  {
    id: 'low_stock_alert',
    name: 'Low Stock Alert',
    description: 'Alert sales team when inventory runs low',
    category: 'operations',
    estimatedImpact: 'Prevent lost sales',
    steps: [
      { type: 'trigger', event: 'low_stock', condition: 'stock <= 10' },
      { type: 'action', channel: 'internal', notify: 'sales', message: 'Low stock alert: {{product}}' },
      { type: 'action', channel: 'internal', notify: 'ops', message: 'Restock needed: {{product}}' }
    ]
  },
  {
    id: 'replenishment',
    name: 'Replenishment Reminder',
    description: 'Remind customers to reorder consumables',
    category: 'retention',
    estimatedImpact: 'Rs 20,000/month',
    steps: [
      { type: 'trigger', event: 'replenishment_time', condition: 'days > 30' },
      { type: 'action', channel: 'whatsapp', delay: '0h', template: 'reorder_reminder' },
      { type: 'action', channel: 'email', delay: '0h', template: 'reorder_email' }
    ]
  },
  {
    id: 'price_drop',
    name: 'Price Drop Alert',
    description: 'Notify watchers when watched items go on sale',
    category: 'marketing',
    estimatedImpact: 'Rs 15,000/month',
    steps: [
      { type: 'trigger', event: 'price_reduction' },
      { type: 'action', channel: 'whatsapp', delay: '0h', notifyWatchers: true, template: 'price_drop' }
    ]
  },
  {
    id: 'subscription_renewal',
    name: 'Subscription Renewal',
    description: 'Renewal reminders at 30, 7, 1 day before expiry',
    category: 'retention',
    estimatedImpact: 'Rs 40,000/month',
    steps: [
      { type: 'trigger', event: 'subscription_renewal', condition: 'days_before = 30' },
      { type: 'action', channel: 'email', delay: '0h', template: 'renewal_reminder_30d' },
      { type: 'trigger', event: 'subscription_renewal', condition: 'days_before = 7' },
      { type: 'action', channel: 'whatsapp', delay: '0h', template: 'renewal_reminder_7d' },
      { type: 'trigger', event: 'subscription_renewal', condition: 'days_before = 1' },
      { type: 'action', channel: 'sms', delay: '0h', template: 'renewal_reminder_1d' }
    ]
  }
];

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'workflow-visual-builder', templates: TEMPLATES.length, workflows: workflows.size, port: PORT });
});

// GET /templates
app.get('/api/templates', (req, res) => {
  const { category } = req.query;
  const filtered = category ? TEMPLATES.filter(t => t.category === category) : TEMPLATES;
  res.json({ success: true, data: filtered });
});

// GET /templates/:id
app.get('/api/templates/:id', (req, res) => {
  const template = TEMPLATES.find(t => t.id === req.params.id);
  if (!template) return res.status(404).json({ success: false, error: 'Template not found' });
  res.json({ success: true, data: template });
});

// POST /workflows (create from template)
app.post('/api/workflows',requireAuth,  (req, res) => {
  const { templateId, companyId, name, config } = req.body;
  if (!templateId) return res.status(400).json({ success: false, error: 'templateId required' });

  const template = TEMPLATES.find(t => t.id === templateId);
  if (!template) return res.status(404).json({ success: false, error: 'Template not found' });

  const workflow = {
    id: `wf_${Date.now()}`,
    companyId: companyId || 'default',
    name: name || template.name,
    templateId,
    config: config || {},
    steps: template.steps,
    status: 'draft',
    createdAt: new Date().toISOString()
  };

  workflows.set(workflow.id, workflow);
  res.json({ success: true, data: workflow });
});

// GET /workflows/:id
app.get('/api/workflows/:id', (req, res) => {
  const wf = workflows.get(req.params.id);
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  res.json({ success: true, data: wf });
});

// PUT /workflows/:id
app.put('/api/workflows/:id',requireAuth,  (req, res) => {
  const wf = workflows.get(req.params.id);
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });
  const updated = { ...wf, ...req.body, id: req.params.id, updatedAt: new Date().toISOString() };
  workflows.set(req.params.id, updated);
  res.json({ success: true, data: updated });
});

// POST /workflows/:id/activate
app.post('/api/workflows/:id/activate',requireAuth,  async (req, res) => {
  const wf = workflows.get(req.params.id);
  if (!wf) return res.status(404).json({ success: false, error: 'Workflow not found' });

  wf.status = 'active';
  wf.activatedAt = new Date().toISOString();
  workflows.set(req.params.id, wf);

  // Register with FlowOS Executor
  try {
    await axios.post(`${FLOW_OS}/api/flows`, {
      id: wf.id, name: wf.name, steps: wf.steps
    }, { timeout: 5000 });
  } catch (e) {
    console.warn('FlowOS registration failed:', e.message);
  }

  res.json({ success: true, data: wf });
});

// POST /workflows/validate
app.post('/api/workflows/validate',requireAuth,  (req, res) => {
  const { templateId, steps } = req.body;
  const template = TEMPLATES.find(t => t.id === templateId);
  const workflowSteps = steps || template?.steps || [];

  const issues = [];
  for (let i = 0; i < workflowSteps.length; i++) {
    const step = workflowSteps[i];
    if (!step.type) issues.push({ step: i, error: 'Missing step type' });
    if (step.channel && !['whatsapp', 'email', 'sms', 'internal'].includes(step.channel)) {
      issues.push({ step: i, error: `Unknown channel: ${step.channel}` });
    }
  }

  res.json({ success: true, data: { valid: issues.length === 0, issues } });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



app.listen(PORT, () => console.log(`Workflow Visual Builder running on port ${PORT}`));
module.exports = app;
