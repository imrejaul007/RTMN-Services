/**
 * ExperimentationOS - SalesOS
 * A/B testing and multivariate experiments
 * Port: 5069
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 5069;

app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

const experiments = new Map();
const assignments = new Map();

// Sample experiment
const sampleExp = {
  id: uuidv4(),
  name: 'Email Subject Line Test',
  type: 'ab_test',
  hypothesis: 'Personalized subject lines will increase open rates',
  variants: [
    { id: 'control', name: 'Control', traffic: 50, impressions: 245, conversions: 24 },
    { id: 'treatment', name: 'Personalized', traffic: 50, impressions: 238, conversions: 38 },
  ],
  status: 'running',
  startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  results: { winner: 'treatment', confidence: 97.7, lift: 63.3 },
  createdAt: new Date(),
};

experiments.set(sampleExp.id, sampleExp);

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ExperimentationOS',
    version: '1.0.0',
    port: PORT,
    experimentsCount: experiments.size,
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (req, res) => {
  res.json({ success: true, experiments: Array.from(experiments.values()) });
});

app.get('/:id', (req, res) => {
  const exp = experiments.get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experiment not found' });
  res.json({ success: true, experiment: exp });
});

app.post('/', (req, res) => {
  const exp = {
    id: uuidv4(),
    name: req.body.name,
    type: req.body.type || 'ab_test',
    hypothesis: req.body.hypothesis,
    variants: (req.body.variants || []).map(v => ({
      id: v.id || uuidv4(),
      name: v.name,
      traffic: v.traffic || 50,
      impressions: 0,
      conversions: 0,
    })),
    status: 'draft',
    startDate: null,
    endDate: null,
    results: null,
    createdAt: new Date(),
  };
  experiments.set(exp.id, exp);
  res.status(201).json({ success: true, experiment: exp });
});

app.post('/:id/start', (req, res) => {
  const exp = experiments.get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experiment not found' });
  exp.status = 'running';
  exp.startDate = new Date();
  experiments.set(exp.id, exp);
  res.json({ success: true, experiment: exp });
});

app.post('/:id/stop', (req, res) => {
  const exp = experiments.get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experiment not found' });
  exp.status = 'completed';
  exp.endDate = new Date();
  exp.results = calculateResults(exp);
  experiments.set(exp.id, exp);
  res.json({ success: true, experiment: exp });
});

app.post('/:id/conversion', (req, res) => {
  const exp = experiments.get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experiment not found' });

  const { variantId, userId, value } = req.body;
  const variant = exp.variants.find(v => v.id === variantId);
  if (!variant) return res.status(400).json({ error: 'Invalid variant' });

  variant.conversions++;
  if (value) variant.value = (variant.value || 0) + value;

  assignments.set(exp.id + ':' + userId, {
    experimentId: exp.id,
    variantId,
    userId,
    converted: true,
    value,
    timestamp: new Date(),
  });

  experiments.set(exp.id, exp);
  res.json({ success: true, experiment: exp });
});

app.get('/:id/assign/:userId', (req, res) => {
  const exp = experiments.get(req.params.id);
  if (!exp) return res.status(404).json({ error: 'Experiment not found' });

  const key = exp.id + ':' + req.params.userId;
  const existing = assignments.get(key);
  if (existing) {
    return res.json({ success: true, assignment: existing });
  }

  const random = Math.random() * 100;
  let cumulative = 0;
  let selected = exp.variants[0];

  for (const variant of exp.variants) {
    cumulative += variant.traffic;
    if (random < cumulative) {
      selected = variant;
      break;
    }
  }

  const assignment = {
    experimentId: exp.id,
    variantId: selected.id,
    userId: req.params.userId,
    timestamp: new Date(),
  };

  assignments.set(key, assignment);
  res.json({ success: true, assignment, variant: selected });
});

function calculateResults(exp) {
  if (exp.variants.length < 2) return null;

  const control = exp.variants[0];
  const treatment = exp.variants[1];

  const n1 = control.impressions || 1;
  const n2 = treatment.impressions || 1;
  const p1 = control.conversions / n1;
  const p2 = treatment.conversions / n2;

  const controlRate = p1 * 100;
  const treatmentRate = p2 * 100;
  const lift = p1 > 0 ? ((p2 - p1) / p1) * 100 : 0;

  // Simplified significance calculation
  const p = (control.conversions + treatment.conversions) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));
  const z = se > 0 ? Math.abs(p1 - p2) / se : 0;

  // Approximate p-value from z-score
  const pValue = z > 0 ? Math.exp(-0.5 * z * z) * (1 / Math.sqrt(2 * Math.PI)) : 1;
  const confidence = (1 - pValue) * 100;

  let winner = null;
  if (confidence >= 95) {
    winner = lift > 0 ? 'treatment' : 'control';
  }

  return {
    winner,
    confidence: confidence.toFixed(1),
    lift: lift.toFixed(2),
    controlRate: controlRate.toFixed(2),
    treatmentRate: treatmentRate.toFixed(2),
    statisticalSignificance: pValue < 0.05,
    pValue: pValue.toFixed(3),
  };
}

app.get('/analytics/overview', (req, res) => {
  const all = Array.from(experiments.values());
  const running = all.filter(e => e.status === 'running').length;
  const completed = all.filter(e => e.status === 'completed').length;
  const winners = all.filter(e => e.results && e.results.winner).length;

  res.json({
    success: true,
    overview: {
      total: all.length,
      running,
      completed,
      winners,
    },
  });
});

app.listen(PORT, () => {
  console.log('ExperimentationOS - SalesOS v1.0 - Port: ' + PORT);
});

module.exports = app;
