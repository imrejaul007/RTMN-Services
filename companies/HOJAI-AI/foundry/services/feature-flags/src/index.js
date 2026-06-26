/**
 * HOJAI Studio - Feature Flags Service
 * Toggle features live without redeploying
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 4742;
app.use(express.json());

const flags = new Map(); // flagKey -> flag data
const overrides = new Map(); // flagKey -> userId -> value
const evaluations = []; // audit log

// Default flag templates
const DEFAULT_FLAGS = {
  new_checkout: { name: 'New Checkout Flow', description: 'Redesigned checkout experience', enabled: false, rollout: 0 },
  dark_mode: { name: 'Dark Mode', description: 'Dark theme support', enabled: true, rollout: 100 },
  beta_features: { name: 'Beta Features', description: 'Access to experimental features', enabled: false, rollout: 10 },
  ai_recommendations: { name: 'AI Recommendations', description: 'ML-powered product suggestions', enabled: true, rollout: 50 }
};

Object.entries(DEFAULT_FLAGS).forEach(([key, flag]) => {
  flags.set(key, { key, ...flag, createdAt: new Date().toISOString() });
});

// REST API - Flags
app.post('/api/flags', (req, res) => {
  const { key, name, description, enabled = false, rollout = 0, metadata = {} } = req.body;
  if (flags.has(key)) return res.status(409).json({ error: 'Flag already exists' });
  const flag = { key, name, description, enabled, rollout, metadata, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  flags.set(key, flag);
  res.json(flag);
});

app.get('/api/flags', (req, res) => res.json(Array.from(flags.values())));

app.get('/api/flags/:key', (req, res) => {
  const flag = flags.get(req.params.key);
  if (!flag) return res.status(404).json({ error: 'Flag not found' });
  res.json(flag);
});

app.patch('/api/flags/:key', (req, res) => {
  const flag = flags.get(req.params.key);
  if (!flag) return res.status(404).json({ error: 'Flag not found' });
  Object.assign(flag, req.body, { updatedAt: new Date().toISOString() });
  res.json(flag);
});

app.delete('/api/flags/:key', (req, res) => {
  if (!flags.has(req.params.key)) return res.status(404).json({ error: 'Flag not found' });
  flags.delete(req.params.key);
  res.json({ deleted: true });
});

// REST API - Toggle flag
app.post('/api/flags/:key/toggle', (req, res) => {
  const flag = flags.get(req.params.key);
  if (!flag) return res.status(404).json({ error: 'Flag not found' });
  flag.enabled = !flag.enabled;
  flag.updatedAt = new Date().toISOString();
  res.json(flag);
});

// REST API - Evaluate flag
app.get('/api/evaluate/:key', (req, res) => {
  const { key } = req.params;
  const { userId, userTraits = {} } = req.query;
  const flag = flags.get(key);
  if (!flag) return res.status(404).json({ error: 'Flag not found' });

  // Check user override first
  if (userId && overrides.has(key) && overrides.get(key).has(userId)) {
    const result = { key, enabled: overrides.get(key).get(userId), source: 'override', userId };
    evaluations.push({ ...result, timestamp: new Date().toISOString() });
    return res.json(result);
  }

  // Check percentage rollout
  const userBucket = userId ? hashCode(userId) % 100 : Math.random() * 100;
  const enabled = flag.enabled && (flag.rollout === 100 || userBucket < flag.rollout);

  const result = { key, enabled, source: 'rule', rollout: flag.rollout, userId };
  evaluations.push({ ...result, timestamp: new Date().toISOString() });
  res.json(result);
});

// REST API - Batch evaluate
app.post('/api/evaluate', (req, res) => {
  const { keys, userId, userTraits = {} } = req.body;
  const results = keys.map(key => {
    const flag = flags.get(key);
    if (!flag) return { key, error: 'Not found' };

    if (userId && overrides.has(key) && overrides.get(key).has(userId)) {
      return { key, enabled: overrides.get(key).get(userId), source: 'override' };
    }

    const userBucket = userId ? hashCode(userId) % 100 : Math.random() * 100;
    return { key, enabled: flag.enabled && (flag.rollout === 100 || userBucket < flag.rollout), source: 'rule' };
  });
  res.json(results);
});

// REST API - User Overrides
app.post('/api/flags/:key/override', (req, res) => {
  const { userId, enabled } = req.body;
  if (!overrides.has(req.params.key)) overrides.set(req.params.key, new Map());
  overrides.get(req.params.key).set(userId, enabled);
  res.json({ key: req.params.key, userId, enabled });
});

app.delete('/api/flags/:key/override/:userId', (req, res) => {
  if (overrides.has(req.params.key)) {
    overrides.get(req.params.key).delete(req.params.userId);
  }
  res.json({ removed: true });
});

// REST API - Audit Log
app.get('/api/audit', (req, res) => {
  const { key, limit = 100 } = req.query;
  let logs = evaluations;
  if (key) logs = logs.filter(e => e.key === key);
  res.json(logs.slice(-parseInt(limit)));
});

// REST API - Analytics
app.get('/api/analytics/:key', (req, res) => {
  const { key } = req.params;
  const flag = flags.get(key);
  if (!flag) return res.status(404).json({ error: 'Flag not found' });

  const flagEvals = evaluations.filter(e => e.key === key);
  const total = flagEvals.length;
  const enabled = flagEvals.filter(e => e.enabled).length;

  res.json({
    key,
    totalEvaluations: total,
    enabledRate: total > 0 ? Math.round((enabled / total) * 100) : 0,
    rollout: flag.rollout,
    overrideCount: overrides.has(key) ? overrides.get(key).size : 0
  });
});

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

app.get('/health', (req, res) => res.json({ status: 'healthy', service: 'feature-flags', flags: flags.size }));
app.listen(PORT, () => console.log(`Feature Flags running on port ${PORT}`));
