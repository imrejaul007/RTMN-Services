/**
 * ExperimentationOS - SalesOS
 *
 * A/B testing and multivariate experiments:
 * - Experiment creation
 * - Variant allocation
 * - Statistical analysis
 * - Results tracking
 *
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

// ============================================================
// STORAGE
// ============================================================

const experiments = new Map();
const assignments = new Map();

// Sample experiments
const sampleExperiment = {
  id: uuidv4(),
  name: 'Email Subject Line Test',
  type: 'ab_test',
  hypothesis: 'Personalized subject lines will increase open rates',
  description: 'Testing personalized vs generic subject lines for outreach emails',
  variants: [
    { id: 'control', name: 'Control', traffic: 50, impressions: 245, conversions: 24 },
    { id: 'treatment', name: 'Personalized', traffic: 50, impressions: 238, conversions: 38 },
  ],
  metrics: [
    { name: 'open_rate', type: 'rate', control: 9.8, treatment: 16.0, lift: 63.3, pValue: 0.023, significant: true },
  ],
  status: 'running',
  startDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
  endDate: null,
  results: {
    winner: 'treatment',
    confidence: 97.7,
    lift: 63.3,
    revenueImpact: 12500,
  },
  createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
};

experiments.set(sampleExperiment.id, sampleExperiment);

const sampleExperiment2 = {
  id: uuidv4(),
  name: 'CTA Button Color',
  type: 'ab_test',
  hypothesis: 'Green CTA will outperform blue',
  variants: [
    { id: 'control', name: 'Blue Button', traffic: 50, impressions: 500, conversions: 35 },
    { id: 'treatment', name: 'Green Button', traffic: 50, impressions: 500, conversions: 42 },
  ],
  metrics: [
    { name: 'click_rate', type: 'rate', control: 7.0, treatment: 8.4, lift: 20.0, pValue: 0.145, significant: false },
  ],
  status: 'completed',
  startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  endDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
  results: { winner: 'treatment', confidence: 85.5, lift: 20.0 },
  createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
};

experiments.set(sampleExperiment2.id, sampleExperiment2);

// ============================================================
// HEALTH
// ============================================================

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'ExperimentationOS',
    version: '1.0.0',
    port: PORT,
    experimentsCount: experiments.size,
    assignmentsCount: assignments.size,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// EXPERIMENTS CRUD
// ============================================================

app.get('/', (req, res) => {
  const { status, type } = req.query;
  let all = Array.from(experiments.values());

  if (status) all = all.filter(e => e.status === status);
  if (type) all = all.filter(e => e.type === type);

  res.json({ success: true, count: all.length, experiments: all });
});

app.get('/:id', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Experiment not found' });
  res.json({ success: true, experiment });
});

app.post('/', (req, res) => {
  const experiment = {
    id: uuidv4(),
    name: req.body.name,
    type: req.body.type || 'ab_test',
    hypothesis: req.body.hypothesis,
    description: req.body.description,
    variants: (req.body.variants || []).map(v => ({
      id: v.id || uuidv4(),
      name: v.name,
      traffic: v.traffic || 50,
      impressions: 0,
      conversions: 0,
    })),
    metrics: req.body.metrics || [],
    status: 'draft',
    startDate: null,
    endDate: null,
    results: null,
    createdAt: new Date(),
  };

  // Normalize traffic to 100%
  const totalTraffic = experiment.variants.reduce((sum, v) => sum + v.traffic, 0);
  if (totalTraffic > 0) {
    experiment.variants.forEach(v => {
      v.traffic = Math.round((v.traffic / totalTraffic) * 100);
    });
  }

  experiments.set(experiment.id, experiment);
  res.status(201).json({ success: true, experiment });
});

app.put('/:id', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

  const updated = { ...experiment, ...req.body, id: experiment.id };
  experiments.set(experiment.id, updated);
  res.json({ success: true, experiment: updated });
});

app.delete('/:id', (req, res) => {
  if (!experiments.has(req.params.id)) {
    return res.status(404).json({ error: 'Experiment not found' });
  }
  experiments.delete(req.params.id);
  res.json({ success: true, message: 'Experiment deleted' });
});

// ============================================================
// EXPERIMENT LIFECYCLE
// ============================================================

app.post('/:id/start', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

  experiment.status = 'running';
  experiment.startDate = new Date();
  experiments.set(experiment.id, experiment);
  res.json({ success: true, experiment });
});

app.post('/:id/pause', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

  experiment.status = 'paused';
  experiments.set(experiment.id, experiment);
  res.json({ success: true, experiment });
});

app.post('/:id/resume', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

  experiment.status = 'running';
  experiments.set(experiment.id, experiment);
  res.json({ success: true, experiment });
});

app.post('/:id/stop', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

  experiment.status = 'completed';
  experiment.endDate = new Date();

  // Calculate results
  const results = calculateResults(experiment);
  experiment.results = results;

  experiments.set(experiment.id, experiment);
  res.json({ success: true, experiment });
});

// ============================================================
// CONVERSION TRACKING
// ============================================================

app.post('/:id/conversion', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

  const { variantId, userId, value } = req.body;
  const variant = experiment.variants.find(v => v.id === variantId);

  if (!variant) return res.status(400).json({ error: 'Invalid variant' });

  variant.conversions++;
  if (value) {
    variant.value = (variant.value || 0) + value;
  }

  // Track assignment
  assignments.set(`${experiment.id}:${userId}`, {
    experimentId: experiment.id,
    variantId,
    userId,
    converted: true,
    value,
    timestamp: new Date(),
  });

  // Recalculate metrics
  experiment.metrics = experiment.metrics.map(metric => {
    const control = experiment.variants[0];
    const treatment = experiment.variants[1] || control;

    if (metric.type === 'rate') {
      const controlRate = control.impressions > 0 ? control.conversions / control.impressions : 0;
      const treatmentRate = treatment.impressions > 0 ? treatment.conversions / treatment.impressions : 0;
      const lift = controlRate > 0 ? ((treatmentRate - controlRate) / controlRate) * 100 : 0;
      const pValue = calculatePValue(control, treatment);

      return {
        ...metric,
        control: (controlRate * 100).toFixed(2),
        treatment: (treatmentRate * 100).toFixed(2),
        lift: lift.toFixed(2),
        pValue: pValue.toFixed(3),
        significant: pValue < 0.05,
      };
    }
    return metric;
  });

  experiments.set(experiment.id, experiment);
  res.json({ success: true, experiment });
});

app.post('/:id/impression', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

  const { variantId } = req.body;
  const variant = experiment.variants.find(v => v.id === variantId);

  if (variant) {
    variant.impressions++;
    experiments.set(experiment.id, experiment);
  }

  res.json({ success: true });
});

// ============================================================
// VARIANT ASSIGNMENT
// ============================================================

app.get('/:id/assign/:userId', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

  // Check if already assigned
  const assignmentKey = `${experiment.id}:${req.params.userId}`;
  const existing = assignments.get(assignmentKey);
  if (existing) {
    return res.json({ success: true, assignment: existing, variant: experiment.variants.find(v => v.id === existing.variantId) });
  }

  // Random assignment based on traffic
  const random = Math.random() * 100;
  let cumulative = 0;
  let selectedVariant = experiment.variants[0];

  for (const variant of experiment.variants) {
    cumulative += variant.traffic;
    if (random < cumulative) {
      selectedVariant = variant;
      break;
    }
  }

  const assignment = {
    experimentId: experiment.id,
    variantId: selectedVariant.id,
    userId: req.params.userId,
    timestamp: new Date(),
  };

  assignments.set(assignmentKey, assignment);
  res.json({ success: true, assignment, variant: selectedVariant });
});

// ============================================================
// RESULTS & ANALYSIS
// ============================================================

app.get('/:id/results', (req, res) => {
  const experiment = experiments.get(req.params.id);
  if (!experiment) return res.status(404).json({ error: 'Experiment not found' });

  const results = calculateResults(experiment);
  res.json({ success: true, results, experiment });
});

function calculateResults(experiment) {
  if (experiment.variants.length < 2) return null;

  const control = experiment.variants[0];
  const treatment = experiment.variants[1];

  const controlRate = control.impressions > 0 ? control.conversions / control.impressions : 0;
  const treatmentRate = treatment.impressions > 0 ? treatment.conversions / treatment.impressions : 0;

  const lift = controlRate > 0 ? ((treatmentRate - controlRate) / controlRate) * 100 : 0;
  const pValue = calculatePValue(control, treatment);
  const confidence = (1 - pValue) * 100;

  // Determine winner
  let winner = null;
  if (confidence >= 95) {
    winner = lift > 0 ? 'treatment' : 'control';
  }

  return {
    winner,
    confidence: confidence.toFixed(1),
    lift: lift.toFixed(2),
    controlRate: (controlRate * 100).toFixed(2),
    treatmentRate: (treatmentRate * 100).toFixed(2),
    controlConversions: control.conversions,
    treatmentConversions: treatment.conversions,
    controlImpressions: control.impressions,
    treatmentImpressions: treatment.impressions,
    statisticalSignificance: pValue < 0.05,
    pValue: pValue.toFixed(3),
  };
}

function calculatePValue(control, treatment) {
  // Simplified z-test for proportions
  const n1 = control.impressions || 1;
  const n2 = treatment.impressions || 1;
  const p1 = control.conversions / n1;
  const p2 = treatment.conversions / n2;

  const p = (control.conversions + treatment.conversions) / (n1 + n2);
  const se = Math.sqrt(p * (1 - p) * (1 / n1 + 1 / n2));

  if (se === 0) return 1;

  const z = Math.abs(p1 - p2) / se;

  // Convert z to p-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(z));
  return Math.min(1, Math.max(0, pValue));
}

function normalCDF(x) {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);

  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

  return 0.5 * (1.0 + sign * y);
}

// ============================================================
// ANALYTICS
// ============================================================

app.get('/analytics/overview', (req, res) => {
  const all = Array.from(experiments.values());

  const running = all.filter(e => e.status === 'running').length;
  const completed = all.filter(e => e.status === 'completed').length;
  const winners = all.filter(e => e.results?.winner).length;
  const significant = all.filter(e => e.results?.statisticalSignificance).length;

  res.json({
    success: true,
    overview: {
      total: all.length,
      running,
      completed,
      winners,
      significant,
      winRate: completed > 0 ? ((winners / completed) * 100).toFixed(0) + '%' : 'N/A',
    },
  });
});

app.get('/analytics/winning-experiments', (req, res) => {
  const winners = Array.from(experiments.values())
    .filter(e => e.results?.winner)
    .map(e => ({
      id: e.id,
      name: e.name,
      winner: e.results.winner,
      lift: e.results.lift,
      confidence: e.results.confidence,
    }))
    .sort((a, b) => parseFloat(b.lift) - parseFloat(a.lift));

  res.json({ success: true, count: winners.length, experiments: winners });
});

// ============================================================
// START
// ============================================================

app.listen(PORT, () => {
  console.log(`╔═══════════════════════════════════════════════════╗`);
  console.log(`║      ExperimentationOS - SalesOS v1.0         ║`);
  console.log(`╠═══════════════════════════════════════════════════╣`);
  console.log(`║  Port: ${PORT}                                      ║`);
  console.log(`║  Experiments: ${experiments.size}                                  ║`);
  console.log(`╚═══════════════════════════════════════════════════╝`);
});

module.exports = app;
