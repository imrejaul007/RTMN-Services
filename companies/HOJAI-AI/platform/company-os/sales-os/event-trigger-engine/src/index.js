/**
 * Event & Trigger Engine - SalesOS
 *
 * Real-time event processing and trigger automation:
 * - Event ingestion
 * - Condition evaluation
 * - Action execution
 * - Workflow automation
 *
 * Port: 5064
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5064;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// ============================================================
// INTERFACES
// ============================================================

/**
 * @typedef {Object} Trigger
 * @property {string} id
 * @property {string} name
 * @property {string} event - Event type to trigger on
 * @property {TriggerCondition[]} conditions
 * @property {TriggerAction[]} actions
 * @property {string} status - active, paused, disabled
 * @property {number} fireCount
 * @property {Date} lastFired
 */

/**
 * @typedef {Object} TriggerCondition
 * @property {string} field
 * @property {string} operator - eq, ne, gt, lt, gte, lte, contains, in
 * @property {any} value
 */

/**
 * @typedef {Object} TriggerAction
 * @property {string} type - email, workflow, webhook, score, twin_update
 * @property {Object} config
 */

/**
 * @typedef {Object} Event
 * @property {string} id
 * @property {string} type
 * @property {Object} payload
 * @property {Date} timestamp
 * @property {string[]} triggersFired
 */

// ============================================================
// STORAGE
// ============================================================

const triggers = new Map();
const events = [];
const executions = [];

// Default triggers
const defaultTriggers = [
  {
    id: 'churn-risk-detected',
    name: 'Churn Risk Alert',
    event: 'customer.churn_risk',
    conditions: [{ field: 'churnRisk', operator: 'gt', value: 70 }],
    actions: [
      { type: 'workflow', config: { name: 'retention_campaign' } },
      { type: 'notification', config: { channel: 'slack', priority: 'high', message: 'High churn risk detected' } },
    ],
    status: 'active',
    fireCount: 0,
    lastFired: null,
  },
  {
    id: 'expansion-opportunity',
    name: 'Expansion Opportunity',
    event: 'customer.expansion',
    conditions: [{ field: 'expansionProbability', operator: 'gt', value: 70 }],
    actions: [
      { type: 'workflow', config: { name: 'expansion_offer' } },
      { type: 'notification', config: { channel: 'slack', priority: 'medium', message: 'Expansion opportunity identified' } },
    ],
    status: 'active',
    fireCount: 0,
    lastFired: null,
  },
  {
    id: 'new-lead-created',
    name: 'New Lead Alert',
    event: 'lead.created',
    conditions: [],
    actions: [
      { type: 'workflow', config: { name: 'lead_nurture' } },
      { type: 'email', config: { template: 'welcome', delay: 0 } },
      { type: 'twin_update', config: { twinType: 'lead', field: 'status', value: 'assigned' } },
    ],
    status: 'active',
    fireCount: 0,
    lastFired: null,
  },
  {
    id: 'deal-stage-proposal',
    name: 'Deal Moved to Proposal',
    event: 'opportunity.stage_changed',
    conditions: [{ field: 'newStage', operator: 'eq', value: 'proposal' }],
    actions: [
      { type: 'workflow', config: { name: 'proposal_generation' } },
      { type: 'notification', config: { channel: 'slack', priority: 'medium', message: 'Deal moved to proposal stage' } },
    ],
    status: 'active',
    fireCount: 0,
    lastFired: null,
  },
  {
    id: 'deal-won',
    name: 'Deal Won',
    event: 'opportunity.won',
    conditions: [],
    actions: [
      { type: 'workflow', config: { name: 'onboarding_start' } },
      { type: 'notification', config: { channel: 'slack', priority: 'high', message: '🎉 Deal won!' } },
      { type: 'commission', config: { calculate: true } },
    ],
    status: 'active',
    fireCount: 0,
    lastFired: null,
  },
  {
    id: 'deal-lost',
    name: 'Deal Lost',
    event: 'opportunity.lost',
    conditions: [],
    actions: [
      { type: 'workflow', config: { name: 'loss_analysis' } },
      { type: 'notification', config: { channel: 'slack', priority: 'low', message: 'Deal lost - loss analysis triggered' } },
    ],
    status: 'active',
    fireCount: 0,
    lastFired: null,
  },
  {
    id: 'health-score-dropped',
    name: 'Health Score Alert',
    event: 'customer.health_changed',
    conditions: [{ field: 'change', operator: 'lt', value: -10 }],
    actions: [
      { type: 'workflow', config: { name: 'health_review' } },
      { type: 'notification', config: { channel: 'slack', priority: 'high', message: 'Customer health score dropped' } },
    ],
    status: 'active',
    fireCount: 0,
    lastFired: null,
  },
  {
    id: 'nps-low',
    name: 'Low NPS Alert',
    event: 'survey.nps_response',
    conditions: [{ field: 'score', operator: 'lt', value: 7 }],
    actions: [
      { type: 'workflow', config: { name: 'nps_followup' } },
      { type: 'notification', config: { channel: 'email', priority: 'high', message: 'Low NPS response received' } },
    ],
    status: 'active',
    fireCount: 0,
    lastFired: null,
  },
  {
    id: 'engagement-dip',
    name: 'Engagement Dip',
    event: 'customer.engagement_changed',
    conditions: [{ field: 'change', operator: 'lt', value: -20 }],
    actions: [
      { type: 'workflow', config: { name: 're_engagement' } },
      { type: 'email', config: { template: 're_engagement', delay: 1 } },
    ],
    status: 'active',
    fireCount: 0,
    lastFired: null,
  },
];

// Initialize default triggers
defaultTriggers.forEach(t => triggers.set(t.id, t));

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Event & Trigger Engine',
    version: '1.0.0',
    port: PORT,
    triggersCount: triggers.size,
    eventsCount: events.length,
    executionsCount: executions.length,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// EVENT INGESTION
// ============================================================

/**
 * POST /events
 * Ingest an event and evaluate all matching triggers
 */
app.post('/events', async (req, res) => {
  const event = {
    id: uuidv4(),
    type: req.body.type,
    payload: req.body.payload,
    timestamp: new Date(),
    triggersFired: [],
  };

  // Store event
  events.unshift(event);
  if (events.length > 10000) events.pop();

  // Find matching triggers
  const matchingTriggers = Array.from(triggers.values())
    .filter(t => t.event === event.type && t.status === 'active')
    .filter(t => evaluateConditions(t.conditions, event.payload));

  // Execute actions
  for (const trigger of matchingTriggers) {
    const execution = await executeTrigger(trigger, event);
    executions.unshift(execution);
    if (executions.length > 10000) executions.pop();

    trigger.fireCount++;
    trigger.lastFired = new Date();
    triggers.set(trigger.id, trigger);

    event.triggersFired.push(trigger.id);
  }

  res.json({
    success: true,
    event,
    triggersFired: matchingTriggers.length,
    triggers: matchingTriggers.map(t => ({ id: t.id, name: t.name })),
  });
});

// ============================================================
// TRIGGER CRUD
// ============================================================

app.get('/triggers', (req, res) => {
  const all = Array.from(triggers.values());
  res.json({ success: true, count: all.length, triggers: all });
});

app.get('/triggers/:id', (req, res) => {
  const trigger = triggers.get(req.params.id);
  if (!trigger) return res.status(404).json({ error: 'Trigger not found' });
  res.json({ success: true, trigger });
});

app.post('/triggers', (req, res) => {
  const trigger = {
    id: req.body.id || uuidv4(),
    name: req.body.name,
    event: req.body.event,
    conditions: req.body.conditions || [],
    actions: req.body.actions || [],
    status: req.body.status || 'active',
    fireCount: 0,
    lastFired: null,
  };

  triggers.set(trigger.id, trigger);
  res.status(201).json({ success: true, trigger });
});

app.put('/triggers/:id', (req, res) => {
  const trigger = triggers.get(req.params.id);
  if (!trigger) return res.status(404).json({ error: 'Trigger not found' });

  const updated = { ...trigger, ...req.body, id: trigger.id };
  triggers.set(trigger.id, updated);
  res.json({ success: true, trigger: updated });
});

app.delete('/triggers/:id', (req, res) => {
  if (!triggers.has(req.params.id)) {
    return res.status(404).json({ error: 'Trigger not found' });
  }
  triggers.delete(req.params.id);
  res.json({ success: true, message: 'Trigger deleted' });
});

// Trigger status
app.post('/triggers/:id/pause', (req, res) => {
  const trigger = triggers.get(req.params.id);
  if (!trigger) return res.status(404).json({ error: 'Trigger not found' });
  trigger.status = 'paused';
  triggers.set(trigger.id, trigger);
  res.json({ success: true, trigger });
});

app.post('/triggers/:id/resume', (req, res) => {
  const trigger = triggers.get(req.params.id);
  if (!trigger) return res.status(404).json({ error: 'Trigger not found' });
  trigger.status = 'active';
  triggers.set(trigger.id, trigger);
  res.json({ success: true, trigger });
});

// ============================================================
// EVENTS & EXECUTIONS
// ============================================================

app.get('/events', (req, res) => {
  const { limit = 100, type, since, triggersFired } = req.query;
  let filtered = [...events];

  if (type) filtered = filtered.filter(e => e.type === type);
  if (since) filtered = filtered.filter(e => new Date(e.timestamp) > new Date(since));
  if (triggersFired) filtered = filtered.filter(e => e.triggersFired.length > 0);

  res.json({
    success: true,
    count: filtered.length,
    events: filtered.slice(0, Number(limit)),
  });
});

app.get('/executions', (req, res) => {
  const { limit = 100, triggerId, status } = req.query;
  let filtered = [...executions];

  if (triggerId) filtered = filtered.filter(e => e.triggerId === triggerId);
  if (status) filtered = filtered.filter(e => e.status === status);

  res.json({
    success: true,
    count: filtered.length,
    executions: filtered.slice(0, Number(limit)),
  });
});

// ============================================================
// WEBHOOK REGISTRATION
// ============================================================

const webhooks = new Map();

app.post('/webhooks', (req, res) => {
  const webhook = {
    id: uuidv4(),
    event: req.body.event,
    url: req.body.url,
    secret: req.body.secret || uuidv4(),
    headers: req.body.headers || {},
    status: 'active',
    createdAt: new Date(),
  };
  webhooks.set(webhook.id, webhook);
  res.status(201).json({ success: true, webhook });
});

app.get('/webhooks', (req, res) => {
  res.json({ success: true, webhooks: Array.from(webhooks.values()) });
});

app.delete('/webhooks/:id', (req, res) => {
  if (!webhooks.has(req.params.id)) {
    return res.status(404).json({ error: 'Webhook not found' });
  }
  webhooks.delete(req.params.id);
  res.json({ success: true, message: 'Webhook deleted' });
});

// ============================================================
// WORKFLOW EXECUTION (Simulated)
// ============================================================

async function executeTrigger(trigger, event) {
  const execution = {
    id: uuidv4(),
    triggerId: trigger.id,
    triggerName: trigger.name,
    eventId: event.id,
    eventType: event.type,
    status: 'running',
    actions: [],
    startedAt: new Date(),
    completedAt: null,
  };

  for (const action of trigger.actions) {
    const result = await executeAction(action, event);
    execution.actions.push({
      type: action.type,
      config: action.config,
      result,
      executedAt: new Date(),
    });
  }

  execution.status = 'completed';
  execution.completedAt = new Date();
  return execution;
}

async function executeAction(action, event) {
  switch (action.type) {
    case 'email':
      console.log(`[Trigger] Sending email: ${action.config?.template || 'default'}`);
      // Simulate email send
      return { sent: true, template: action.config?.template };

    case 'workflow':
      console.log(`[Trigger] Starting workflow: ${action.config?.name}`);
      // Simulate workflow start
      return { workflowStarted: true, name: action.config?.name };

    case 'notification':
      console.log(`[Trigger] Sending notification: ${action.config?.message}`);
      return { notified: true, channel: action.config?.channel };

    case 'webhook':
      console.log(`[Trigger] Calling webhook`);
      return { webhookCalled: true };

    case 'score':
      console.log(`[Trigger] Updating score`);
      return { scoreUpdated: true };

    case 'twin_update':
      console.log(`[Trigger] Updating twin: ${action.config?.twinType}`);
      return { twinUpdated: true, type: action.config?.twinType };

    case 'commission':
      console.log(`[Trigger] Calculating commission`);
      return { commissionCalculated: true };

    default:
      console.log(`[Trigger] Unknown action type: ${action.type}`);
      return { unknown: true, type: action.type };
  }
}

// ============================================================
// CONDITION EVALUATION
// ============================================================

function evaluateConditions(conditions, payload) {
  if (!conditions || conditions.length === 0) return true;
  return conditions.every(condition => {
    const value = getNestedValue(payload, condition.field);
    return evaluateOperator(value, condition.operator, condition.value);
  });
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

function evaluateOperator(value, operator, target) {
  switch (operator) {
    case 'eq': return value === target;
    case 'ne': return value !== target;
    case 'gt': return value > target;
    case 'lt': return value < target;
    case 'gte': return value >= target;
    case 'lte': return value <= target;
    case 'contains': return String(value).toLowerCase().includes(String(target).toLowerCase());
    case 'in': return Array.isArray(target) && target.includes(value);
    case 'not_in': return Array.isArray(target) && !target.includes(value);
    case 'exists': return value !== undefined && value !== null;
    case 'not_exists': return value === undefined || value === null;
    default: return false;
  }
}

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════╗`);
  console.log(`║    Event & Trigger Engine - SalesOS v1.0       ║`);
  console.log(`╠═══════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                      ║`);
  console.log(`║  Triggers: ${triggers.size}                                    ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
});

module.exports = app;
