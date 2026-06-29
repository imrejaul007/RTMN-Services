/**
 * LoopOS Budget Alerts & Webhooks
 * Real-time budget notifications
 * Port: 4750
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4750;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';
const BUDGET_ENGINE_URL = process.env.BUDGET_ENGINE_URL || 'http://localhost:4734';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Alert types
const ALERT_TYPES = {
  THRESHOLD_WARNING: 'threshold_warning',
  THRESHOLD_EXCEEDED: 'threshold_exceeded',
  BUDGET_EXCEEDED: 'budget_exceeded',
  TOOL_LIMIT_REACHED: 'tool_limit_reached',
  TOKEN_LIMIT_REACHED: 'token_limit_reached',
  SPEND_LIMIT_REACHED: 'spend_limit_reached',
  NEW_AGENT_REGISTERED: 'new_agent_registered',
  BUDGET_RESET: 'budget_reset'
};

// Channels
const CHANNELS = {
  WEBHOOK: 'webhook',
  EMAIL: 'email',
  SMS: 'sms',
  SLACK: 'slack',
  PAGERDUTY: 'pagerduty',
  DISCORD: 'discord',
  IN_APP: 'in_app'
};

// In-memory stores
const subscriptions = new Map();   // twinId -> Subscription
const webhooks = new Map();      // webhookId -> Webhook
const alerts = new Map();         // alertId -> Alert
const alertHistory = [];          // Recent alerts
const MAX_HISTORY = 1000;

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-budget-alerts',
  version: '1.0.0',
  port: PORT,
  subscriptions: subscriptions.size,
  webhooks: webhooks.size,
  recentAlerts: alertHistory.length
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Subscriptions ─────────────────────────────────────

/**
 * Create alert subscription
 * POST /api/subscriptions
 */
app.post('/api/subscriptions', requireAuth, (req, res) => {
  const {
    twinId,
    agentId,
    channels = [CHANNELS.IN_APP],
    thresholds = {},
    webhookUrl,
    email,
    slackChannel,
    smsNumber
  } = req.body || {};

  if (!twinId && !agentId) {
    return res.status(400).json({ error: 'twinId or agentId is required' });
  }

  const id = `sub-${randomUUID().slice(0, 8)}`;

  const subscription = {
    id,
    twinId: twinId || agentId,
    channels,
    thresholds: {
      warningPercent: thresholds.warningPercent || 80,
      criticalPercent: thresholds.criticalPercent || 90,
      exceededPercent: thresholds.exceededPercent || 100,
      ...thresholds
    },
    webhookUrl,
    email,
    slackChannel,
    smsNumber,
    alertTypes: Object.values(ALERT_TYPES),
    status: 'active',
    stats: { alerts: 0, notifications: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  subscriptions.set(id, subscription);

  logger.info(`Subscription created: ${id} for ${subscription.twinId}`);
  res.status(201).json(subscription);
});

/**
 * Get subscription
 * GET /api/subscriptions/:id
 */
app.get('/api/subscriptions/:id', (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'subscription not found' });
  res.json(sub);
});

/**
 * List subscriptions
 * GET /api/subscriptions
 */
app.get('/api/subscriptions', (req, res) => {
  const { twinId, status } = req.query;
  let items = [...subscriptions.values()];

  if (twinId) items = items.filter(s => s.twinId === twinId);
  if (status) items = items.filter(s => s.status === status);

  res.json({ count: items.length, subscriptions: items });
});

/**
 * Update subscription
 * PUT /api/subscriptions/:id
 */
app.put('/api/subscriptions/:id', requireAuth, (req, res) => {
  const sub = subscriptions.get(req.params.id);
  if (!sub) return res.status(404).json({ error: 'subscription not found' });

  const { channels, thresholds, status, alertTypes } = req.body || {};

  if (channels) sub.channels = channels;
  if (thresholds) sub.thresholds = { ...sub.thresholds, ...thresholds };
  if (status) sub.status = status;
  if (alertTypes) sub.alertTypes = alertTypes;
  sub.updatedAt = new Date().toISOString();

  res.json(sub);
});

/**
 * Delete subscription
 * DELETE /api/subscriptions/:id
 */
app.delete('/api/subscriptions/:id', requireAuth, (req, res) => {
  if (!subscriptions.has(req.params.id)) {
    return res.status(404).json({ error: 'subscription not found' });
  }
  subscriptions.delete(req.params.id);
  res.json({ deleted: true });
});

// ── Webhooks ─────────────────────────────────────────────

/**
 * Register webhook
 * POST /api/webhooks
 */
app.post('/api/webhooks', requireAuth, (req, res) => {
  const {
    name,
    url,
    events = [ALERT_TYPES.THRESHOLD_WARNING, ALERT_TYPES.BUDGET_EXCEEDED],
    secret,
    headers = {}
  } = req.body || {};

  if (!name || !url) {
    return res.status(400).json({ error: 'name and url are required' });
  }

  const id = `wh-${randomUUID().slice(0, 8)}`;

  const webhook = {
    id,
    name,
    url,
    events,
    secret: secret || randomUUID().slice(0, 16),
    headers,
    status: 'active',
    stats: { deliveries: 0, failures: 0, lastDelivery: null },
    createdAt: new Date().toISOString()
  };

  webhooks.set(id, webhook);

  logger.info(`Webhook registered: ${id} (${name})`);
  res.status(201).json(webhook);
});

/**
 * Get webhook
 * GET /api/webhooks/:id
 */
app.get('/api/webhooks/:id', (req, res) => {
  const webhook = webhooks.get(req.params.id);
  if (!webhook) return res.status(404).json({ error: 'webhook not found' });
  res.json(webhook);
});

/**
 * List webhooks
 * GET /api/webhooks
 */
app.get('/api/webhooks', (req, res) => {
  const items = [...webhooks.values()];
  res.json({ count: items.length, webhooks: items });
});

/**
 * Delete webhook
 * DELETE /api/webhooks/:id
 */
app.delete('/api/webhooks/:id', requireAuth, (req, res) => {
  if (!webhooks.has(req.params.id)) {
    return res.status(404).json({ error: 'webhook not found' });
  }
  webhooks.delete(req.params.id);
  res.json({ deleted: true });
});

/**
 * Test webhook
 * POST /api/webhooks/:id/test
 */
app.post('/api/webhooks/:id/test', requireAuth, async (req, res) => {
  const webhook = webhooks.get(req.params.id);
  if (!webhook) return res.status(404).json({ error: 'webhook not found' });

  const testPayload = {
    type: 'test',
    timestamp: new Date().toISOString(),
    data: { message: 'This is a test alert' }
  };

  try {
    await deliverWebhook(webhook, testPayload);
    res.json({ delivered: true, test: true });
  } catch (err) {
    res.status(500).json({ delivered: false, error: err.message });
  }
});

// ── Manual Alert Creation ─────────────────────────────────

/**
 * Create alert manually
 * POST /api/alerts
 */
app.post('/api/alerts', requireAuth, async (req, res) => {
  const {
    twinId,
    type = ALERT_TYPES.THRESHOLD_WARNING,
    title,
    message,
    data = {},
    severity = 'medium'
  } = req.body || {};

  if (!twinId || !title) {
    return res.status(400).json({ error: 'twinId and title are required' });
  }

  const alert = await createAlert(twinId, type, title, message, severity, data);
  res.status(201).json(alert);
});

/**
 * Get alert
 * GET /api/alerts/:id
 */
app.get('/api/alerts/:id', (req, res) => {
  const alert = alerts.get(req.params.id);
  if (!alert) return res.status(404).json({ error: 'alert not found' });
  res.json(alert);
});

/**
 * List alerts
 * GET /api/alerts
 */
app.get('/api/alerts', (req, res) => {
  const { twinId, type, severity, status, limit = 100 } = req.query;
  let items = [...alertHistory];

  if (twinId) items = items.filter(a => a.twinId === twinId);
  if (type) items = items.filter(a => a.type === type);
  if (severity) items = items.filter(a => a.severity === severity);
  if (status) items = items.filter(a => a.status === status);

  items = items.slice(-Number(limit));

  res.json({ count: items.length, alerts: items });
});

/**
 * Acknowledge alert
 * POST /api/alerts/:id/acknowledge
 */
app.post('/api/alerts/:id/acknowledge', requireAuth, (req, res) => {
  const { acknowledgedBy } = req.body || {};

  // Find in history
  const alert = alertHistory.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'alert not found' });

  alert.status = 'acknowledged';
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = acknowledgedBy || 'system';

  // Also update in map
  alerts.set(alert.id, alert);

  res.json(alert);
});

/**
 * Snooze alert
 * POST /api/alerts/:id/snooze
 */
app.post('/api/alerts/:id/snooze', requireAuth, (req, res) => {
  const { minutes = 60, reason } = req.body || {};

  const alert = alertHistory.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'alert not found' });

  alert.status = 'snoozed';
  alert.snoozedUntil = new Date(Date.now() + minutes * 60 * 1000).toISOString();
  alert.snoozeReason = reason;

  res.json(alert);
});

// ── Alert Checking (from Budget Engine) ─────────────────

/**
 * Check budget and trigger alerts
 * POST /api/check-budget
 */
app.post('/api/check-budget', requireAuth, async (req, res) => {
  const { twinId } = req.body || {};

  if (!twinId) return res.status(400).json({ error: 'twinId is required' });

  try {
    // Get budget from budget engine
    const budgetRes = await axios.get(`${BUDGET_ENGINE_URL}/api/budgets/${twinId}`).catch(() => null);

    if (!budgetRes) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    const budget = budgetRes.data;
    const triggered = [];

    // Check subscriptions for this twin
    const subs = [...subscriptions.values()].filter(s =>
      s.twinId === twinId && s.status === 'active'
    );

    if (subs.length === 0) {
      return res.json({ checked: true, alerts: [] });
    }

    for (const sub of subs) {
      const { thresholds } = sub;
      const usage = budget.usage || {};
      const limits = budget.limits || {};

      // Check daily tokens
      if (limits.dailyTokens && usage.dailyTokens) {
        const percent = (usage.dailyTokens / limits.dailyTokens) * 100;

        if (percent >= thresholds.exceededPercent) {
          const alert = await createAlert(
            twinId,
            ALERT_TYPES.TOKEN_LIMIT_REACHED,
            `Daily token limit reached (${percent.toFixed(0)}%)`,
            `Agent ${twinId} has used ${usage.dailyTokens.toLocaleString()} tokens of ${limits.dailyTokens.toLocaleString()} daily limit`,
            'critical',
            { type: 'tokens', percent, used: usage.dailyTokens, limit: limits.dailyTokens }
          );
          triggered.push(alert);
        } else if (percent >= thresholds.criticalPercent) {
          const alert = await createAlert(
            twinId,
            ALERT_TYPES.THRESHOLD_EXCEEDED,
            `Critical token usage (${percent.toFixed(0)}%)`,
            `Agent ${twinId} is at ${percent.toFixed(0)}% of daily token limit`,
            'high',
            { type: 'tokens', percent }
          );
          triggered.push(alert);
        } else if (percent >= thresholds.warningPercent) {
          const alert = await createAlert(
            twinId,
            ALERT_TYPES.THRESHOLD_WARNING,
            `Token usage warning (${percent.toFixed(0)}%)`,
            `Agent ${twinId} has used ${percent.toFixed(0)}% of daily token limit`,
            'medium',
            { type: 'tokens', percent }
          );
          triggered.push(alert);
        }
      }

      // Check daily spend
      if (limits.dailySpend && usage.dailySpend) {
        const percent = (usage.dailySpend / limits.dailySpend) * 100;

        if (percent >= thresholds.exceededPercent) {
          const alert = await createAlert(
            twinId,
            ALERT_TYPES.SPEND_LIMIT_REACHED,
            `Daily spend limit exceeded`,
            `Agent ${twinId} has spent $${usage.dailySpend.toFixed(2)} of $${limits.dailySpend.toFixed(2)}`,
            'critical',
            { type: 'spend', percent, used: usage.dailySpend, limit: limits.dailySpend }
          );
          triggered.push(alert);
        }
      }

      // Check tool calls
      if (limits.maxToolCalls && usage.toolCalls) {
        const percent = (usage.toolCalls / limits.maxToolCalls) * 100;

        if (percent >= thresholds.exceededPercent) {
          const alert = await createAlert(
            twinId,
            ALERT_TYPES.TOOL_LIMIT_REACHED,
            `Tool call limit reached`,
            `Agent ${twinId} has made ${usage.toolCalls} tool calls`,
            'high',
            { type: 'toolCalls', percent, used: usage.toolCalls, limit: limits.maxToolCalls }
          );
          triggered.push(alert);
        }
      }
    }

    res.json({ checked: true, twinId, alerts: triggered });

  } catch (err) {
    logger.error('Budget check failed:', err.message);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Webhook endpoint for budget engine events
 * POST /api/webhook/budget-engine
 */
app.post('/api/webhook/budget-engine', async (req, res) => {
  const { event, twinId, data } = req.body || {};

  if (!event || !twinId) {
    return res.status(400).json({ error: 'event and twinId required' });
  }

  const alertType = mapBudgetEventToAlert(event);
  const alert = await createAlert(twinId, alertType, data?.title || event, data?.message || '', data?.severity || 'medium', data);

  res.json({ received: true, alertId: alert.id });
});

// ── Notification Delivery ────────────────────────────────

async function createAlert(twinId, type, title, message, severity, data) {
  const id = `alert-${randomUUID().slice(0, 8)}`;

  const alert = {
    id,
    twinId,
    type,
    title,
    message,
    severity, // low, medium, high, critical
    data,
    status: 'active',
    notified: [],
    createdAt: new Date().toISOString(),
    acknowledgedAt: null,
    acknowledgedBy: null
  };

  alerts.set(id, alert);
  alertHistory.push(alert);

  // Trim history
  while (alertHistory.length > MAX_HISTORY) {
    alertHistory.shift();
  }

  // Deliver to subscriptions
  await deliverAlertToSubscriptions(alert);

  // Deliver to webhooks
  await deliverAlertToWebhooks(alert);

  return alert;
}

async function deliverAlertToSubscriptions(alert) {
  const subs = [...subscriptions.values()].filter(s =>
    s.twinId === alert.twinId &&
    s.status === 'active' &&
    s.alertTypes.includes(alert.type)
  );

  for (const sub of subs) {
    sub.stats.alerts++;

    for (const channel of sub.channels) {
      try {
        switch (channel) {
          case CHANNELS.WEBHOOK:
            if (sub.webhookUrl) {
              await axios.post(sub.webhookUrl, alert);
            }
            break;

          case CHANNELS.EMAIL:
            if (sub.email) {
              // In production, send email
              logger.info(`Would send email to ${sub.email}: ${alert.title}`);
            }
            break;

          case CHANNELS.SLACK:
            if (sub.slackChannel) {
              await sendSlackMessage(sub.slackChannel, alert);
            }
            break;

          case CHANNELS.IN_APP:
            // Already stored in alerts
            break;
        }

        sub.stats.notifications++;
      } catch (err) {
        logger.error(`Failed to deliver alert ${alert.id} to ${channel}:`, err.message);
      }
    }
  }
}

async function deliverAlertToWebhooks(alert) {
  const matchingWebhooks = [...webhooks.values()].filter(w =>
    w.status === 'active' && w.events.includes(alert.type)
  );

  for (const webhook of matchingWebhooks) {
    try {
      await deliverWebhook(webhook, alert);
    } catch (err) {
      logger.error(`Webhook ${webhook.id} delivery failed:`, err.message);
      webhook.stats.failures++;
    }
  }
}

async function deliverWebhook(webhook, payload) {
  const headers = {
    'Content-Type': 'application/json',
    'X-Alert-ID': payload.id,
    'X-Timestamp': payload.createdAt,
    ...webhook.headers
  };

  // Add signature if secret configured
  if (webhook.secret) {
    const crypto = await import('crypto');
    const signature = crypto.createHmac('sha256', webhook.secret)
      .update(JSON.stringify(payload))
      .digest('hex');
    headers['X-Signature'] = signature;
  }

  const response = await axios.post(webhook.url, payload, { headers, timeout: 10000 });

  webhook.stats.deliveries++;
  webhook.stats.lastDelivery = new Date().toISOString();

  return response;
}

async function sendSlackMessage(channel, alert) {
  const emoji = {
    low: 'ℹ️',
    medium: '⚠️',
    high: '🔴',
    critical: '🚨'
  }[alert.severity] || '📢';

  const payload = {
    channel,
    text: `${emoji} Budget Alert: ${alert.title}`,
    attachments: [{
      color: alert.severity === 'critical' ? 'danger' : alert.severity === 'high' ? 'warning' : '#439FE0',
      fields: [
        { title: 'Agent', value: alert.twinId, short: true },
        { title: 'Type', value: alert.type, short: true },
        { title: 'Severity', value: alert.severity, short: true },
        { title: 'Time', value: alert.createdAt, short: true }
      ],
      text: alert.message
    }]
  };

  // In production, call Slack API
  logger.info(`Slack message to ${channel}:`, payload);
}

function mapBudgetEventToAlert(event) {
  const mapping = {
    'budget_warning': ALERT_TYPES.THRESHOLD_WARNING,
    'budget_exceeded': ALERT_TYPES.BUDGET_EXCEEDED,
    'tool_limit': ALERT_TYPES.TOOL_LIMIT_REACHED,
    'token_limit': ALERT_TYPES.TOKEN_LIMIT_REACHED,
    'spend_limit': ALERT_TYPES.SPEND_LIMIT_REACHED
  };
  return mapping[event] || ALERT_TYPES.THRESHOLD_WARNING;
}

// ── Analytics ────────────────────────────────────────────

/**
 * Get alert analytics
 * GET /api/analytics
 */
app.get('/api/analytics', (req, res) => {
  const { twinId, period } = req.query;

  let items = [...alertHistory];

  if (twinId) items = items.filter(a => a.twinId === twinId);

  // Filter by period
  if (period) {
    const now = new Date();
    const periodMs = {
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }[period] || 7 * 24 * 60 * 60 * 1000;

    items = items.filter(a => new Date(a.createdAt).getTime() > now.getTime() - periodMs);
  }

  const byType = {};
  const bySeverity = {};
  const byTwin = {};

  for (const alert of items) {
    byType[alert.type] = (byType[alert.type] || 0) + 1;
    bySeverity[alert.severity] = (bySeverity[alert.severity] || 0) + 1;
    byTwin[alert.twinId] = (byTwin[alert.twinId] || 0) + 1;
  }

  const topTwins = Object.entries(byTwin)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({ twinId: id, count }));

  res.json({
    period: period || 'all',
    total: items.length,
    byType,
    bySeverity,
    topTwins,
    timestamp: new Date().toISOString()
  });
});

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS Budget Alerts listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
