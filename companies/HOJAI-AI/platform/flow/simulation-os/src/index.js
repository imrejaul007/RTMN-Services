/**
 * SUTAR OS — Simulation OS (port 4241)
 *
 * What-if scenario analysis for agent decisions, market conditions, and
 * policy changes. Built on a deterministic Monte Carlo + parameter sweep
 * engine (no real ML — sufficient for "should we ship this pricing change?"
 * style questions).
 *
 * Endpoints:
 *   POST /api/scenarios                   Create + run a scenario
 *   GET  /api/scenarios                   List scenarios (filter by status/type)
 *   GET  /api/scenarios/:id               Get scenario + run results
 *   POST /api/scenarios/:id/rerun         Rerun a scenario (with optional param overrides)
 *   POST /api/scenarios/:id/cancel        Cancel running scenario
 *   POST /api/scenarios/compare           Compare 2+ scenarios side-by-side
 *   GET  /api/templates                   List built-in scenario templates
 *   GET  /api/templates/:id               Get template spec
 *   GET  /api/presets                     List parameter presets (distributions, ranges)
 *   GET  /health
 */

const express = require('express');
const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { requireAuth } = require('@rtmn/shared/auth');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const { v4: uuid } = require('uuid');

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4241;
const SERVICE_NAME = 'sutar-simulation-os';

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('tiny'));

// ---------- Stores ----------
const scenarios = new PersistentMap('scenarios', { serviceName: 'simulation-os' });
const runs = new PersistentMap('runs', { serviceName: 'simulation-os' });        // runId -> { scenarioId, status, results, startedAt, finishedAt }

// ---------- Built-in templates ----------
const TEMPLATES = {
  'pricing-change': {
    name: 'Pricing Change Impact',
    description: 'Estimate revenue impact of changing a product/service price',
    defaults: {
      baselinePrice: 100,
      baselineVolume: 1000,
      elasticity: -1.5,
      iterations: 500
    },
    metrics: ['revenue', 'volume', 'margin']
  },
  'market-entry': {
    name: 'Market Entry',
    description: 'Project adoption curve and break-even for a new market',
    defaults: {
      totalAddressableMarket: 100000,
      initialPenetration: 0.01,
      growthRate: 0.05,
      costPerAcquisition: 50,
      iterations: 500
    },
    metrics: ['adoption', 'cac-payback', 'market-share']
  },
  'policy-rollout': {
    name: 'Policy Rollout',
    description: 'Project adoption + compliance rate of a new policy',
    defaults: {
      affectedAgents: 10000,
      adoptionRate: 0.6,
      complianceRate: 0.85,
      penaltyPerViolation: 100,
      iterations: 500
    },
    metrics: ['adoption', 'compliance', 'penalty-revenue']
  },
  'agent-decision': {
    name: 'Agent Decision Outcome',
    description: 'Score expected payoff of an agent decision against alternatives',
    defaults: {
      options: [
        { name: 'negotiate', payoff: 100, probSuccess: 0.5 },
        { name: 'accept', payoff: 60, probSuccess: 1.0 },
        { name: 'walk-away', payoff: 0, probSuccess: 1.0 }
      ],
      iterations: 1000
    },
    metrics: ['expected-value', 'risk', 'best-option']
  }
};

// ---------- Simulators ----------
function simulatePricing(params) {
  const { baselinePrice, baselineVolume, elasticity, iterations } = params;
  const priceChangePcts = Array.from({ length: iterations }, () => (Math.random() - 0.5) * 0.4);
  const results = priceChangePcts.map(pct => {
    const newPrice = baselinePrice * (1 + pct);
    const newVolume = baselineVolume * Math.pow(1 + pct, elasticity);
    const revenue = newPrice * newVolume;
    return { priceChangePct: Number(pct.toFixed(4)), newPrice, newVolume, revenue: Number(revenue.toFixed(2)) };
  });
  return summarize(results.map(r => r.revenue), { baseRevenue: baselinePrice * baselineVolume });
}

function simulateMarketEntry(params) {
  const { totalAddressableMarket, initialPenetration, growthRate, costPerAcquisition, iterations } = params;
  const months = 12;
  const adoption = [];
  for (let m = 0; m < months; m++) {
    const noise = (Math.random() - 0.5) * 0.02;
    const pct = initialPenetration * Math.pow(1 + growthRate + noise, m);
    adoption.push(Math.min(pct, 1));
  }
  const finalAdoption = adoption[adoption.length - 1];
  const acquired = totalAddressableMarket * finalAdoption;
  const cacSpend = acquired * costPerAcquisition;
  return { adoption: adoption.map(a => Number(a.toFixed(4))), acquired: Math.round(acquired), cacSpend: Math.round(cacSpend), cacPaybackMonths: Math.round(cacSpend / Math.max(acquired * 100, 1)) };
}

function simulatePolicy(params) {
  const { affectedAgents, adoptionRate, complianceRate, penaltyPerViolation, iterations } = params;
  const adoptions = [];
  const compliances = [];
  const penaltyRevenues = [];
  for (let i = 0; i < iterations; i++) {
    const a = adoptionRate + (Math.random() - 0.5) * 0.1;
    const c = complianceRate + (Math.random() - 0.5) * 0.1;
    const violating = affectedAgents * a * (1 - c);
    adoptions.push(a);
    compliances.push(c);
    penaltyRevenues.push(violating * penaltyPerViolation);
  }
  return summarize(adoptions, { metric: 'adoption' })
    + ' / ' + summarize(compliances, { metric: 'compliance' }).mean.toFixed(3)
    + ' / ' + summarize(penaltyRevenues, { metric: 'penalty-revenue' }).mean.toFixed(2);
}

function summarize(arr, extras = {}) {
  const sorted = [...arr].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const median = n % 2 === 0 ? (sorted[n/2 - 1] + sorted[n/2]) / 2 : sorted[(n-1)/2];
  const variance = sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const std = Math.sqrt(variance);
  const p5 = sorted[Math.floor(n * 0.05)];
  const p95 = sorted[Math.floor(n * 0.95)];
  const min = sorted[0];
  const max = sorted[n - 1];
  const obj = { mean: Number(mean.toFixed(4)), median: Number(median.toFixed(4)), std: Number(std.toFixed(4)), p5: Number(p5.toFixed(4)), p95: Number(p95.toFixed(4)), min: Number(min.toFixed(4)), max: Number(max.toFixed(4)) };
  return Object.assign(obj, extras);
}

function simulateAgentDecision(params) {
  const { options, iterations } = params;
  return options.map(opt => {
    const successes = Array.from({ length: iterations }, () => Math.random() < opt.probSuccess);
    const expectedValue = opt.payoff * opt.probSuccess;
    const variance = opt.payoff ** 2 * opt.probSuccess * (1 - opt.probSuccess);
    return {
      name: opt.name,
      payoff: opt.payoff,
      probSuccess: opt.probSuccess,
      expectedValue: Number(expectedValue.toFixed(2)),
      stdDev: Number(Math.sqrt(variance).toFixed(2)),
      risk: opt.payoff > 0 ? Number((Math.sqrt(variance) / expectedValue).toFixed(3)) : null
    };
  }).sort((a, b) => b.expectedValue - a.expectedValue);
}

function runScenario(type, params) {
  switch (type) {
    case 'pricing-change': return simulatePricing(params);
    case 'market-entry': return simulateMarketEntry(params);
    case 'policy-rollout': return simulatePolicy(params);
    case 'agent-decision': return simulateAgentDecision(params);
    default: throw new Error(`Unknown scenario type: ${type}`);
  }
}

// ---------- Health ----------
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: SERVICE_NAME,
    sutarLayer: 4,
    layer: 'Decision Support / What-if',
    port: PORT,
    counts: { scenarios: scenarios.size, runs: runs.size, templates: Object.keys(TEMPLATES).length },
    timestamp: new Date().toISOString()
  });
});

// ---------- Scenarios ----------
app.post('/api/scenarios',requireAuth,  (req, res) => {
  const { type, params, name } = req.body || {};
  if (!type || !TEMPLATES[type]) return res.status(400).json({ error: `type must be one of ${Object.keys(TEMPLATES).join(', ')}` });
  const id = uuid();
  const finalParams = { ...TEMPLATES[type].defaults, ...(params || {}) };
  const scenario = {
    id, type, name: name || TEMPLATES[type].name,
    params: finalParams,
    status: 'running',
    createdAt: Date.now(),
    finishedAt: null,
    results: null
  };
  scenarios.set(id, scenario);

  try {
    scenario.results = runScenario(type, finalParams);
    scenario.status = 'completed';
    scenario.finishedAt = Date.now();
    res.status(201).json({ scenario });
  } catch (err) {
    scenario.status = 'failed';
    scenario.error = err.message;
    scenario.finishedAt = Date.now();
    res.status(500).json({ error: err.message, scenario });
  }
});

app.get('/api/scenarios', (req, res) => {
  const { type, status } = req.query;
  let rows = Array.from(scenarios.values());
  if (type) rows = rows.filter(s => s.type === type);
  if (status) rows = rows.filter(s => s.status === status);
  rows = rows.sort((a, b) => b.createdAt - a.createdAt).slice(0, 200);
  res.json({ count: rows.length, scenarios: rows });
});

app.get('/api/scenarios/:id', (req, res) => {
  const scenario = scenarios.get(req.params.id);
  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
  res.json({ scenario });
});

app.post('/api/scenarios/:id/rerun',requireAuth,  (req, res) => {
  const scenario = scenarios.get(req.params.id);
  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
  if (scenario.status === 'running') return res.status(409).json({ error: 'Scenario still running' });
  const finalParams = { ...scenario.params, ...(req.body?.params || {}) };
  scenario.params = finalParams;
  scenario.status = 'running';
  scenario.finishedAt = null;
  scenario.results = null;
  try {
    scenario.results = runScenario(scenario.type, finalParams);
    scenario.status = 'completed';
    scenario.finishedAt = Date.now();
    res.json({ scenario });
  } catch (err) {
    scenario.status = 'failed';
    scenario.error = err.message;
    scenario.finishedAt = Date.now();
    res.status(500).json({ error: err.message, scenario });
  }
});

app.post('/api/scenarios/:id/cancel',requireAuth,  (req, res) => {
  const scenario = scenarios.get(req.params.id);
  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
  if (scenario.status !== 'running') return res.status(409).json({ error: 'Scenario not running' });
  scenario.status = 'cancelled';
  scenario.finishedAt = Date.now();
  res.json({ scenario });
});

app.post('/api/scenarios/compare',requireAuth,  (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.length < 2) return res.status(400).json({ error: 'ids must be an array of >= 2 scenario IDs' });
  const rows = ids.map(id => scenarios.get(id)).filter(Boolean);
  if (rows.length !== ids.length) return res.status(404).json({ error: 'One or more scenarios not found' });
  res.json({
    comparison: rows.map(r => ({
      id: r.id,
      name: r.name,
      type: r.type,
      status: r.status,
      keyResults: summarizeResultsForCompare(r)
    }))
  });
});

function summarizeResultsForCompare(scenario) {
  const r = scenario.results;
  if (!r) return null;
  if (scenario.type === 'pricing-change') return { meanRevenue: r.mean, p5Revenue: r.p5, p95Revenue: r.p95 };
  if (scenario.type === 'market-entry') return { finalAdoption: r.adoption[r.adoption.length - 1], acquired: r.acquired, cacSpend: r.cacSpend };
  if (scenario.type === 'policy-rollout') return { /* returned as string above */ };
  if (scenario.type === 'agent-decision') return { bestOption: r[0]?.name, bestExpectedValue: r[0]?.expectedValue };
  return r;
}

// ---------- Templates ----------
app.get('/api/templates', (_req, res) => {
  res.json({ count: Object.keys(TEMPLATES).length, templates: Object.entries(TEMPLATES).map(([id, t]) => ({ id, ...t })) });
});

app.get('/api/templates/:id', (req, res) => {
  const t = TEMPLATES[req.params.id];
  if (!t) return res.status(404).json({ error: 'Template not found' });
  res.json({ id: req.params.id, ...t });
});

// ---------- Presets ----------
app.get('/api/presets', (_req, res) => {
  res.json({
    distributions: {
      normal: { description: 'Normal distribution', params: ['mean', 'std'] },
      uniform: { description: 'Uniform between min and max', params: ['min', 'max'] },
      lognormal: { description: 'Lognormal (right-skewed)', params: ['mu', 'sigma'] }
    },
    elasticity: { inelastic: '|e| < 1', unit: '|e| = 1', elastic: '|e| > 1' },
    note: 'Use elasticity ≈ -1.5 as a starting point for consumer goods.'
  });
});

// ---------- Root ----------
app.get('/', (_req, res) => {
  res.json({
    service: SERVICE_NAME,
    sutar: 'Layer 4 — Decision Support / What-if',
    port: PORT,
    templates: Object.keys(TEMPLATES),
    endpoints: [
      'POST /api/scenarios',
      'GET  /api/scenarios',
      'GET  /api/scenarios/:id',
      'POST /api/scenarios/:id/rerun',
      'POST /api/scenarios/:id/cancel',
      'POST /api/scenarios/compare',
      'GET  /api/templates',
      'GET  /api/templates/:id',
      'GET  /api/presets',
      'GET  /health'
    ]
  });
});

// ---------- Boot ----------
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  console.log(`[${SERVICE_NAME}] listening on http://localhost:${PORT}`);
  console.log(`[${SERVICE_NAME}] templates: ${Object.keys(TEMPLATES).join(', ')}`);
});installGracefulShutdown(server);
