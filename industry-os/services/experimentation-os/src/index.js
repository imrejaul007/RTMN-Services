/**
 * Experimentation OS - Feature Flags & A/B Testing
 * Port: 5277
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5277;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json());

// Shared auth middleware
const { authMiddleware } = require('./shared/auth-middleware');
app.use('/api', authMiddleware);

// In-memory stores
const featureFlags = new Map();
const experiments = new Map();
const allocations = new Map();

// Seed some flags
featureFlags.set('dark-mode', {
  id: 'dark-mode',
  name: 'Dark Mode',
  description: 'Enable dark mode theme',
  enabled: true,
  rollout: 100,
  rules: [],
  createdAt: new Date().toISOString()
});

featureFlags.set('new-checkout', {
  id: 'new-checkout',
  name: 'New Checkout Flow',
  description: 'Enable redesigned checkout',
  enabled: true,
  rollout: 50,
  rules: [{ type: 'user_segment', value: 'premium' }],
  createdAt: new Date().toISOString()
});

// Health
app.get('/health', (_, res) => res.json({
  status: 'healthy',
  service: 'experimentation-os',
  version: '1.0.0',
  port: PORT,
  capabilities: ['feature_flags', 'ab_testing', 'canary_deployments', 'rollback_engine', 'shadow_mode']
}));

// Feature Flags Routes
app.post('/api/flags', (req, res) => {
  const { id, name, description, enabled, rollout, rules } = req.body;
  if (!id || !name) return res.status(400).json({ error: 'id and name required' });

  const flag = {
    id,
    name,
    description: description || '',
    enabled: enabled !== false,
    rollout: rollout || 100,
    rules: rules || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  featureFlags.set(id, flag);
  res.status(201).json(flag);
});

app.get('/api/flags', (req, res) => {
  const list = Array.from(featureFlags.values());
  res.json({ count: list.length, flags: list });
});

app.get('/api/flags/:id', (req, res) => {
  const flag = featureFlags.get(req.params.id);
  if (!flag) return res.status(404).json({ error: 'Not found' });
  res.json(flag);
});

app.put('/api/flags/:id', (req, res) => {
  const flag = featureFlags.get(req.params.id);
  if (!flag) return res.status(404).json({ error: 'Not found' });

  Object.assign(flag, req.body);
  flag.updatedAt = new Date().toISOString();
  featureFlags.set(req.params.id, flag);
  res.json(flag);
});

app.patch('/api/flags/:id', (req, res) => {
  const flag = featureFlags.get(req.params.id);
  if (!flag) return res.status(404).json({ error: 'Not found' });

  const { enabled, rollout } = req.body;
  if (enabled !== undefined) flag.enabled = enabled;
  if (rollout !== undefined) flag.rollout = rollout;
  flag.updatedAt = new Date().toISOString();

  featureFlags.set(req.params.id, flag);
  res.json(flag);
});

// Evaluate flag for user
app.get('/api/flags/:id/evaluate', (req, res) => {
  const flag = featureFlags.get(req.params.id);
  if (!flag) return res.status(404).json({ error: 'Not found' });

  const { userId, attributes } = req.query;

  // Check if flag is enabled
  if (!flag.enabled) {
    return res.json({ enabled: false, reason: 'flag_disabled' });
  }

  // Check rollout percentage
  if (userId) {
    const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0) % 100;
    if (hash >= flag.rollout) {
      return res.json({ enabled: false, reason: 'rollout_threshold' });
    }
  }

  // Check rules
  if (flag.rules && flag.rules.length > 0) {
    for (const rule of flag.rules) {
      if (rule.type === 'user_segment' && attributes) {
        // Simplified rule check
        if (!attributes.includes(rule.value)) {
          return res.json({ enabled: false, reason: 'rule_not_matched' });
        }
      }
    }
  }

  res.json({ enabled: true, reason: 'all_checks_passed' });
});

// Experiments Routes
app.post('/api/experiments', (req, res) => {
  const { name, flagId, variants, hypothesis } = req.body;
  if (!name || !flagId || !variants || variants.length < 2) {
    return res.status(400).json({ error: 'name, flagId, and at least 2 variants required' });
  }

  const experiment = {
    id: `exp-${uuidv4().slice(0, 8)}`,
    name,
    flagId,
    hypothesis: hypothesis || '',
    variants: variants.map((v, i) => ({
      id: `var-${uuidv4().slice(0, 8)}`,
      name: v.name || `Variant ${i + 1}`,
      weight: v.weight || Math.floor(100 / variants.length),
      metrics: { conversions: 0, views: 0 }
    })),
    status: 'draft',
    startedAt: null,
    endedAt: null,
    createdAt: new Date().toISOString()
  };

  experiments.set(experiment.id, experiment);
  res.status(201).json(experiment);
});

app.get('/api/experiments', (req, res) => {
  let list = Array.from(experiments.values());
  if (req.query.status) list = list.filter(e => e.status === req.query.status);
  res.json({ count: list.length, experiments: list });
});

app.get('/api/experiments/:id', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Not found' });
  res.json(experiment);
});

app.post('/api/experiments/:id/start', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Not found' });
  if (experiment.status !== 'draft' && experiment.status !== 'paused') {
    return res.status(400).json({ error: 'Cannot start experiment in current state' });
  }

  experiment.status = 'running';
  experiment.startedAt = new Date().toISOString();
  experiments.set(experiment.id, experiment);
  res.json(experiment);
});

app.post('/api/experiments/:id/pause', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Not found' });

  experiment.status = 'paused';
  experiments.set(experiment.id, experiment);
  res.json(experiment);
});

app.post('/api/experiments/:id/complete', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Not found' });

  experiment.status = 'completed';
  experiment.endedAt = new Date().toISOString();

  // Calculate winner
  const sorted = [...experiment.variants].sort((a, b) => {
    const aRate = a.metrics.conversions / Math.max(a.metrics.views, 1);
    const bRate = b.metrics.conversions / Math.max(b.metrics.views, 1);
    return bRate - aRate;
  });

  experiment.winner = sorted[0];
  experiment.stats = {
    totalViews: experiment.variants.reduce((sum, v) => sum + v.metrics.views, 0),
    totalConversions: experiment.variants.reduce((sum, v) => sum + v.metrics.conversions, 0)
  };

  experiments.set(experiment.id, experiment);
  res.json(experiment);
});

// Record experiment data
app.post('/api/experiments/:id/track', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Not found' });

  const { variantId, type } = req.body; // type: 'view' or 'conversion'

  const variant = experiment.variants.find(v => v.id === variantId);
  if (!variant) return res.status(400).json({ error: 'Invalid variant' });

  if (type === 'view') {
    variant.metrics.views++;
  } else if (type === 'conversion') {
    variant.metrics.conversions++;
  }

  experiments.set(experiment.id, experiment);
  res.json({ success: true });
});

// Get variant for user
app.get('/api/experiments/:id/variant', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Not found' });
  if (experiment.status !== 'running') {
    return res.json({ variantId: null, message: 'Experiment not running' });
  }

  const { userId } = req.query;
  if (!userId) return res.status(400).json({ error: 'userId required' });

  // Hash-based allocation
  const hash = userId.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
  const variantIndex = hash % experiment.variants.length;
  const variant = experiment.variants[variantIndex];

  res.json({
    variantId: variant.id,
    variantName: variant.name
  });
});

// Canary Deployment Routes
app.post('/api/canary', (req, res) => {
  const { service, version, canaryPercentage } = req.body;
  if (!service || !version) {
    return res.status(400).json({ error: 'service and version required' });
  }

  const canary = {
    id: `canary-${uuidv4().slice(0, 8)}`,
    service,
    version,
    canaryPercentage: canaryPercentage || 10,
    status: 'deploying',
    metrics: { errorRate: 0, latency: 0, traffic: 0 },
    createdAt: new Date().toISOString()
  };

  // Simulate deployment
  setTimeout(() => {
    canary.status = 'running';
    canary.metrics = {
      errorRate: Math.random() * 2,
      latency: Math.floor(Math.random() * 100),
      traffic: canary.canaryPercentage
    };
  }, 2000);

  res.status(201).json(canary);
});

// Rollback Routes
app.post('/api/rollback/:service', (req, res) => {
  const { version } = req.body;
  const service = req.params.service;

  const rollback = {
    id: `rollback-${uuidv4().slice(0, 8)}`,
    service,
    targetVersion: version || 'previous',
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    completedAt: null
  };

  // Simulate rollback
  setTimeout(() => {
    rollback.status = 'completed';
    rollback.completedAt = new Date().toISOString();
  }, 3000);

  res.status(201).json(rollback);
});

// Statistics
app.get('/api/stats', (_, res) => {
  res.json({
    flags: featureFlags.size,
    enabledFlags: Array.from(featureFlags.values()).filter(f => f.enabled).length,
    experiments: experiments.size,
    runningExperiments: Array.from(experiments.values()).filter(e => e.status === 'running').length
  });
});

app.listen(PORT, () => {
  console.log(`[ExperimentationOS] Experimentation OS running on port ${PORT}`);
  console.log('Capabilities: Feature Flags, A/B Testing, Canary Deployments, Rollback');
});
