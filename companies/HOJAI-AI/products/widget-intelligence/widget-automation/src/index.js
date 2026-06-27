/**
 * HOJAI SiteOS - Widget Automation Service
 * Marketing Automation Rules Engine (Port 5411)
 *
 * Provides automated marketing workflows based on visitor behavior.
 * Supports 5 core automation rules:
 * - abandoned_cart: Recovery sequence for abandoned carts
 * - welcome_series: Onboarding email sequence
 * - win_back: Re-engagement for inactive customers
 * - post_purchase: Follow-up and review requests
 * - birthday_campaign: Celebratory outreach
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { logger } from './logger.js';
import automationRoutes from './routes/automationRoutes.js';

// In-memory stores
const rulesStore = new Map();
const executionsStore = new Map();
const scheduledJobsStore = new Map();

/**
 * Default automation rules
 */
export const DEFAULT_RULES = [
  {
    id: 'abandoned-cart',
    name: 'Abandoned Cart Recovery',
    description: 'Send recovery messages for abandoned carts',
    enabled: true,
    trigger: 'cart_abandoned',
    conditions: [],
    actions: [
      { type: 'whatsapp', delay: 15, template: 'cart_recovery_15min' },
      { type: 'email', delay: 360, template: 'cart_recovery_email' }, // 6 hours
      { type: 'email', delay: 1440, template: 'cart_recovery_coupon' }, // 24 hours
      { type: 'whatsapp', delay: 1440, template: 'cart_recovery_last' },
    ],
  },
  {
    id: 'welcome-series',
    name: 'Welcome Email Series',
    description: 'Onboarding sequence for new subscribers',
    enabled: true,
    trigger: 'email_subscribed',
    conditions: [],
    actions: [
      { type: 'email', delay: 0, template: 'welcome_email_1' },
      { type: 'email', delay: 1440, template: 'welcome_email_2' }, // 1 day
      { type: 'email', delay: 10080, template: 'welcome_email_3' }, // 7 days
    ],
  },
  {
    id: 'win-back',
    name: 'Win Back Campaign',
    description: 'Re-engage inactive customers',
    enabled: true,
    trigger: 'inactivity',
    conditions: [
      { field: 'days_inactive', operator: 'gte', value: 60 },
    ],
    actions: [
      { type: 'email', delay: 0, template: 'win_back_email_1' },
      { type: 'email', delay: 2880, template: 'win_back_email_2' }, // 2 days
      { type: 'whatsapp', delay: 4320, template: 'win_back_whatsapp' }, // 3 days
    ],
  },
  {
    id: 'post-purchase',
    name: 'Post-Purchase Follow-up',
    description: 'Order confirmation and review request',
    enabled: true,
    trigger: 'purchase_completed',
    conditions: [],
    actions: [
      { type: 'email', delay: 0, template: 'order_confirmation' },
      { type: 'email', delay: 4320, template: 'post_purchase_followup' }, // 3 days
      { type: 'email', delay: 86400, template: 'review_request' }, // 7 days
    ],
  },
  {
    id: 'birthday-campaign',
    name: 'Birthday Campaign',
    description: 'Celebrate customer birthdays',
    enabled: true,
    trigger: 'birthday',
    conditions: [],
    actions: [
      { type: 'email', delay: 0, template: 'birthday_email' },
      { type: 'whatsapp', delay: 60, template: 'birthday_whatsapp' },
      { type: 'email', delay: 1440, template: 'birthday_reminder' }, // Next day
    ],
  },
];

/**
 * Action queue (simulated external integrations)
 */
const actionQueue = [];

/**
 * Check if conditions are met
 */
export function evaluateConditions(conditions, context) {
  if (!conditions || conditions.length === 0) return true;

  return conditions.every(condition => {
    const value = context[condition.field];

    switch (condition.operator) {
      case 'eq':
        return value === condition.value;
      case 'neq':
        return value !== condition.value;
      case 'gt':
        return value > condition.value;
      case 'gte':
        return value >= condition.value;
      case 'lt':
        return value < condition.value;
      case 'lte':
        return value <= condition.value;
      case 'contains':
        return String(value).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      default:
        return false;
    }
  });
}

/**
 * Trigger an automation rule
 */
export function triggerRule(ruleId, visitorId, context = {}) {
  const rule = rulesStore.get(ruleId);

  if (!rule) {
    logger.warn({ event: 'rule_not_found', ruleId, visitorId });
    return null;
  }

  if (!rule.enabled) {
    logger.info({ event: 'rule_disabled', ruleId, visitorId });
    return null;
  }

  // Check conditions
  if (!evaluateConditions(rule.conditions, context)) {
    logger.info({ event: 'conditions_not_met', ruleId, visitorId });
    return null;
  }

  // Create execution record
  const execution = {
    id: uuidv4(),
    ruleId,
    visitorId,
    triggeredAt: Date.now(),
    actions: [],
    status: 'pending',
  };

  // Schedule actions
  const scheduledActions = rule.actions.map((action, index) => {
    const scheduledAction = {
      id: uuidv4(),
      executionId: execution.id,
      actionIndex: index,
      type: action.type,
      template: action.template,
      scheduledFor: Date.now() + (action.delay * 60 * 1000), // delay in minutes
      status: 'scheduled',
    };

    // Add to scheduled jobs
    if (!scheduledJobsStore.has(scheduledAction.scheduledFor)) {
      scheduledJobsStore.set(scheduledAction.scheduledFor, []);
    }
    scheduledJobsStore.get(scheduledAction.scheduledFor).push(scheduledAction);

    return scheduledAction;
  });

  execution.actions = scheduledActions;
  executionsStore.set(execution.id, execution);

  logger.info({
    event: 'rule_triggered',
    ruleId,
    visitorId,
    executionId: execution.id,
    actionsCount: scheduledActions.length,
  });

  return execution;
}

/**
 * Execute a scheduled action
 */
export async function executeAction(scheduledAction) {
  const { type, template, visitorId } = scheduledAction;

  try {
    // Simulate sending message
    const message = {
      id: uuidv4(),
      type,
      template,
      visitorId,
      sentAt: Date.now(),
      status: 'sent',
    };

    // Add to action queue (in production, this would call external APIs)
    actionQueue.push(message);

    logger.info({
      event: 'action_executed',
      actionId: scheduledAction.id,
      type,
      template,
      visitorId,
    });

    return message;
  } catch (error) {
    logger.error({
      event: 'action_failed',
      actionId: scheduledAction.id,
      error: error.message,
    });
    throw error;
  }
}

/**
 * Get rule by ID
 */
export function getRule(ruleId) {
  return rulesStore.get(ruleId);
}

/**
 * Get all rules
 */
export function getAllRules() {
  return Array.from(rulesStore.values());
}

/**
 * Update a rule
 */
export function updateRule(ruleId, updates) {
  const rule = rulesStore.get(ruleId);
  if (!rule) return null;

  const updatedRule = { ...rule, ...updates, id: ruleId };
  rulesStore.set(ruleId, updatedRule);

  logger.info({
    event: 'rule_updated',
    ruleId,
    updates: Object.keys(updates),
  });

  return updatedRule;
}

/**
 * Create a custom rule
 */
export function createRule(ruleData) {
  const rule = {
    id: ruleData.id || uuidv4(),
    name: ruleData.name,
    description: ruleData.description || '',
    enabled: ruleData.enabled ?? true,
    trigger: ruleData.trigger,
    conditions: ruleData.conditions || [],
    actions: ruleData.actions || [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  rulesStore.set(rule.id, rule);

  logger.info({
    event: 'rule_created',
    ruleId: rule.id,
    name: rule.name,
  });

  return rule;
}

/**
 * Delete a rule
 */
export function deleteRule(ruleId) {
  const deleted = rulesStore.delete(ruleId);
  if (deleted) {
    logger.info({ event: 'rule_deleted', ruleId });
  }
  return deleted;
}

/**
 * Get execution history
 */
export function getExecutionHistory(visitorId, options = {}) {
  const { limit = 20, offset = 0 } = options;

  const executions = Array.from(executionsStore.values())
    .filter(e => !visitorId || e.visitorId === visitorId)
    .sort((a, b) => b.triggeredAt - a.triggeredAt)
    .slice(offset, offset + limit);

  return {
    total: executionsStore.size,
    executions,
  };
}

/**
 * Get pending scheduled actions (for worker)
 */
export function getPendingActions() {
  const now = Date.now();
  const pending = [];

  for (const [scheduledFor, actions] of scheduledJobsStore.entries()) {
    if (scheduledFor <= now) {
      pending.push(...actions.filter(a => a.status === 'scheduled'));
    }
  }

  return pending;
}

/**
 * Initialize default rules
 */
export function initializeDefaultRules() {
  for (const rule of DEFAULT_RULES) {
    if (!rulesStore.has(rule.id)) {
      rulesStore.set(rule.id, { ...rule, createdAt: Date.now(), updatedAt: Date.now() });
    }
  }
  logger.info({ event: 'default_rules_initialized', count: DEFAULT_RULES.length });
}

// Express app setup
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: { error: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '1mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'widget-automation',
    version: '1.0.0',
    port: 5411,
    timestamp: new Date().toISOString(),
    stats: {
      activeRules: rulesStore.size,
      totalExecutions: executionsStore.size,
      pendingActions: getPendingActions().length,
      actionQueue: actionQueue.length,
    },
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/automation', automationRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error({ err, path: req.path, method: req.method });

  if (err instanceof z.ZodError) {
    return res.status(400).json({
      error: 'Validation error',
      details: err.errors,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize on startup
initializeDefaultRules();

// Start server
const PORT = process.env.PORT || 5411;

export function startServer(port = PORT) {
  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      logger.info(`Widget Automation Service running on port ${port}`);
      resolve(server);
    });
  });
}

// Start if run directly
const isMainModule = process.argv[1]?.includes('index.js');
if (isMainModule) {
  startServer();
}

export { app };