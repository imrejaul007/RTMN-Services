import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4765;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Alert rules and active alerts
const rules = new Map();
const alerts = [];
const subscribers = new Map();

// Create alert rule
function createRule(rule) {
  const id = `rule-${Date.now()}`;
  const newRule = {
    id,
    ...rule,
    active: true,
    createdAt: new Date().toISOString()
  };
  rules.set(id, newRule);
  return newRule;
}

// Evaluate emotion against rules
function evaluateRules(emotion) {
  const triggered = [];

  for (const [id, rule] of rules) {
    if (!rule.active) continue;

    let matches = false;

    // Emotion match
    if (rule.emotion && emotion.emotion === rule.emotion) {
      matches = true;
    }

    // Intensity threshold
    if (rule.minIntensity && (emotion.intensity || 0.5) < rule.minIntensity) {
      matches = false;
    }
    if (rule.maxIntensity && (emotion.intensity || 0.5) > rule.maxIntensity) {
      matches = false;
    }

    // Trend match
    if (rule.trend && emotion.trend === rule.trend) {
      matches = true;
    }

    if (matches) {
      triggered.push(rule);
    }
  }

  return triggered;
}

// Create alert from rule match
function createAlert(rule, emotion) {
  const alert = {
    id: `alert-${Date.now()}`,
    ruleId: rule.id,
    emotion: emotion.emotion,
    intensity: emotion.intensity,
    entityId: emotion.entityId,
    conversationId: emotion.conversationId,
    severity: rule.severity || 'medium',
    message: rule.message || `${emotion.emotion} detected`,
    triggeredAt: new Date().toISOString(),
    status: 'active'
  };

  alerts.push(alert);
  return alert;
}

// POST /rules - Create alert rule
app.post('/rules', (req, res) => {
  const { emotion, minIntensity, maxIntensity, severity, message, webhook, action } = req.body;

  if (!emotion && !message) {
    return res.status(400).json({ error: 'emotion or message required' });
  }

  const rule = createRule({ emotion, minIntensity, maxIntensity, severity, message, webhook, action });

  res.json({ success: true, rule });
});

// GET /rules - List rules
app.get('/rules', (req, res) => {
  const result = Array.from(rules.values());
  res.json({ rules: result, count: result.length });
});

// PUT /rules/:id - Update rule
app.put('/rules/:id', (req, res) => {
  const { id } = req.params;
  const rule = rules.get(id);

  if (!rule) {
    return res.status(404).json({ error: 'Rule not found' });
  }

  Object.assign(rule, req.body);
  rules.set(id, rule);

  res.json({ success: true, rule });
});

// DELETE /rules/:id - Delete rule
app.delete('/rules/:id', (req, res) => {
  const { id } = req.params;
  rules.delete(id);
  res.json({ success: true });
});

// POST /emotion/evaluate - Evaluate emotion and trigger alerts
app.post('/emotion/evaluate', (req, res) => {
  const { entityId, conversationId, emotion, intensity, trend, context } = req.body;

  if (!emotion) {
    return res.status(400).json({ error: 'Emotion is required' });
  }

  const emotionData = { entityId, conversationId, emotion, intensity, trend, context };
  const triggeredRules = evaluateRules(emotionData);
  const triggeredAlerts = triggeredRules.map(rule => createAlert(rule, emotionData));

  res.json({
    emotion: emotionData,
    rulesTriggered: triggeredRules.length,
    alerts: triggeredAlerts
  });
});

// GET /alerts - List active alerts
app.get('/alerts', (req, res) => {
  const { status, severity, entityId, limit } = req.query;

  let result = alerts.filter(a => a.status !== 'resolved');

  if (status) {
    result = result.filter(a => a.status === status);
  }
  if (severity) {
    result = result.filter(a => a.severity === severity);
  }
  if (entityId) {
    result = result.filter(a => a.entityId === entityId);
  }

  res.json({
    alerts: result.slice(0, parseInt(limit) || 50),
    count: result.length
  });
});

// PUT /alerts/:id/resolve - Resolve alert
app.put('/alerts/:id/resolve', (req, res) => {
  const { id } = req.params;
  const { resolution } = req.body;

  const alert = alerts.find(a => a.id === id);
  if (!alert) {
    return res.status(404).json({ error: 'Alert not found' });
  }

  alert.status = 'resolved';
  alert.resolvedAt = new Date().toISOString();
  alert.resolution = resolution;

  res.json({ success: true, alert });
});

// POST /subscribe - Subscribe to alerts
app.post('/subscribe', (req, res) => {
  const { callback, filters } = req.body;

  if (!callback) {
    return res.status(400).json({ error: 'callback URL required' });
  }

  const id = `sub-${Date.now()}`;
  subscribers.set(id, { callback, filters, createdAt: new Date().toISOString() });

  res.json({ success: true, subscriptionId: id });
});

// DELETE /subscribe/:id - Unsubscribe
app.delete('/subscribe/:id', (req, res) => {
  const { id } = req.params;
  subscribers.delete(id);
  res.json({ success: true });
});

// GET /health
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'emotion-alerts',
    port: PORT,
    rules: rules.size,
    activeAlerts: alerts.filter(a => a.status === 'active').length,
    subscribers: subscribers.size
  });
});

app.listen(PORT, () => {
  console.log(`Emotion Alerts running on port ${PORT}`);
});

export default app;
