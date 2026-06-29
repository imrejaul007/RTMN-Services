import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
const PORT = process.env.PORT || 4765;

app.use(helmet());
app.use(cors());
app.use(express.json());

const rules = new Map();
const alerts = [];
const subscribers = new Map();

function createRule(rule) {
  const id = `rule-${Date.now()}`;
  const newRule = { id, ...rule, active: true, createdAt: new Date().toISOString() };
  rules.set(id, newRule);
  return newRule;
}

function evaluateRules(emotion) {
  const triggered = [];
  for (const [id, rule] of rules) {
    if (!rule.active) continue;
    let matches = rule.emotion === emotion.emotion;
    if (rule.minIntensity && (emotion.intensity || 0.5) < rule.minIntensity) matches = false;
    if (rule.maxIntensity && (emotion.intensity || 0.5) > rule.maxIntensity) matches = false;
    if (matches) triggered.push(rule);
  }
  return triggered;
}

function createAlert(rule, emotion) {
  const alert = {
    id: `alert-${Date.now()}`,
    ruleId: rule.id,
    emotion: emotion.emotion,
    intensity: emotion.intensity,
    entityId: emotion.entityId,
    severity: rule.severity || 'medium',
    triggeredAt: new Date().toISOString(),
    status: 'active'
  };
  alerts.push(alert);
  return alert;
}

app.post('/rules', (req, res) => {
  const rule = createRule(req.body);
  res.json({ success: true, rule });
});

app.get('/rules', (req, res) => {
  res.json({ rules: Array.from(rules.values()) });
});

app.post('/emotion/evaluate', (req, res) => {
  const emotionData = req.body;
  const triggeredRules = evaluateRules(emotionData);
  const triggeredAlerts = triggeredRules.map(rule => createAlert(rule, emotionData));
  res.json({ emotion: emotionData, rulesTriggered: triggeredRules.length, alerts: triggeredAlerts });
});

app.get('/alerts', (req, res) => {
  const active = alerts.filter(a => a.status === 'active');
  res.json({ alerts: active });
});

app.put('/alerts/:id/resolve', (req, res) => {
  const alert = alerts.find(a => a.id === req.params.id);
  if (alert) { alert.status = 'resolved'; alert.resolvedAt = new Date().toISOString(); }
  res.json({ success: true, alert });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'emotion-alerts', port: PORT });
});

app.listen(PORT, () => console.log(`Emotion Alerts running on port ${PORT}`));
export default app;
