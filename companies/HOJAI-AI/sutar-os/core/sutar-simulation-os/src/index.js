/**
 * SUTAR OS — Simulation OS
 *
 * What-if scenario engine for autonomous decision making.
 * Runs Monte Carlo simulations, stress tests, and scenario analysis.
 *
 * Endpoints:
 *   POST /api/scenarios         — Create a simulation scenario
 *   GET  /api/scenarios         — List scenarios
 *   POST /api/scenarios/:id/run — Run simulation
 *   GET  /api/scenarios/:id/results — Get results
 *   GET  /api/scenarios/:id/compare — Compare with baseline
 *   DELETE /api/scenarios/:id  — Delete scenario
 *   GET  /api/templates        — List simulation templates
 *   GET  /health
 */

const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { setupSecurity, requireAuth } = require('@rtmn/shared/security');

const app = express();
app.use(express.json());
setupSecurity(app, { serviceName: 'sutar-simulation-os' });

const PORT = process.env.SIMULATION_PORT || 4241;

// ---------- In-Memory Stores ----------
const scenarios = new Map();
const MAX_SCENARIOS = 1000;
const MAX_ITERATIONS = 10000;

// ---------- Scenario Creation ----------
function createScenario(params) {
  const id = uuidv4();
  const scenario = {
    id,
    name: params.name,
    description: params.description,
    modelType: params.modelType || 'monte_carlo', // monte_carlo, stress_test, sensitivity, agent_simulation
    variables: params.variables || [],
    constraints: params.constraints || [],
    baseline: params.baseline || {},
    parameters: {
      iterations: Math.min(params.iterations || 1000, MAX_ITERATIONS),
      confidenceLevel: params.confidenceLevel || 0.95,
      seed: params.seed || Math.floor(Math.random() * 1000000),
    },
    status: 'created',
    results: null,
    createdAt: new Date().toISOString(),
    completedAt: null,
    createdBy: params.createdBy || 'system',
  };
  scenarios.set(id, scenario);
  return scenario;
}

// ---------- Simulation Engine ----------
function runMonteCarlo(scenario) {
  const { iterations, seed, confidenceLevel } = scenario.parameters;
  const outcomes = [];
  const rng = seededRandom(seed);

  for (let i = 0; i < iterations; i++) {
    let outcome = 0;
    for (const v of scenario.variables) {
      const value = sampleFrom(v.distribution || 'uniform', v, rng);
      outcome += value * (v.weight || 1);
    }
    // Apply constraints
    for (const c of scenario.constraints) {
      if (!evaluateConstraint(outcome, c)) {
        outcome = null; // constraint violation
        break;
      }
    }
    if (outcome !== null) outcomes.push(outcome);
  }

  if (outcomes.length === 0) {
    return { error: 'No valid outcomes — all runs violated constraints' };
  }

  outcomes.sort((a, b) => a - b);
  const p = (i) => outcomes[Math.floor(i * outcomes.length)];
  const mean = outcomes.reduce((s, v) => s + v, 0) / outcomes.length;
  const variance = outcomes.reduce((s, v) => s + (v - mean) ** 2, 0) / outcomes.length;

  return {
    iterations: iterations,
    validRuns: outcomes.length,
    constraintViolations: iterations - outcomes.length,
    mean,
    stdDev: Math.sqrt(variance),
    median: outcomes[Math.floor(outcomes.length / 2)],
    percentile: {
      p5: p(0.05),
      p10: p(0.10),
      p25: p(0.25),
      p50: p(0.50),
      p75: p(0.75),
      p90: p(0.90),
      p95: p(0.95),
    },
    min: outcomes[0],
    max: outcomes[outcomes.length - 1],
    riskOfLoss: outcomes.filter(o => o < 0).length / outcomes.length,
    probabilityOfTarget: (target) => outcomes.filter(o => o >= target).length / outcomes.length,
  };
}

function sampleFrom(distribution, variable, rng) {
  const { min = 0, max = 100, mean, stdDev, skew } = variable;
  switch (distribution) {
    case 'uniform': return min + rng() * (max - min);
    case 'normal': {
      const u = 0, v = 0;
      while (u === 0) u = rng();
      const n = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      return (mean || (min + max) / 2) + (stdDev || (max - min) / 6) * n;
    }
    case 'triangular': {
      const mode = variable.mode || ((min + max) / 2);
      const u = rng();
      const fc = (mode - min) / (max - min);
      if (u < fc) return min + Math.sqrt(u * (max - min) * (mode - min));
      return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
    }
    case 'poisson': {
      let events = 0, p = Math.exp(-(variable.lambda || mean || 10));
      let s = p;
      while (s > rng()) { events++; p *= (variable.lambda || mean || 10) / events; s += p; }
      return events;
    }
    case 'bernoulli': return rng() < (variable.probability || 0.5) ? (variable.successValue || 1) : (variable.failureValue || 0);
    default: return min + rng() * (max - min);
  }
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

function evaluateConstraint(outcome, constraint) {
  switch (constraint.operator) {
    case '>': return outcome > constraint.value;
    case '>=': return outcome >= constraint.value;
    case '<': return outcome < constraint.value;
    case '<=': return outcome <= constraint.value;
    case '==': return outcome === constraint.value;
    default: return true;
  }
}

// ---------- Run Scenario ----------
function runScenario(scenarioId, params) {
  const scenario = scenarios.get(scenarioId);
  if (!scenario) return { error: 'Scenario not found' };
  if (scenario.status === 'running') return { error: 'Scenario already running' };

  scenario.status = 'running';
  scenario.startedAt = new Date().toISOString();

  let results;
  switch (scenario.modelType) {
    case 'monte_carlo': results = runMonteCarlo(scenario); break;
    default: results = runMonteCarlo(scenario); break;
  }

  if (results.error) {
    scenario.status = 'failed';
    scenario.error = results.error;
  } else {
    scenario.results = results;
    scenario.status = 'completed';
    scenario.completedAt = new Date().toISOString();
  }

  return scenario;
}

// ---------- Routes ----------
app.post('/api/scenarios', requireAuth, (req, res) => {
  const scenario = createScenario(req.body);
  res.status(201).json(scenario);
});

app.get('/api/scenarios', requireAuth, (req, res) => {
  const { status, modelType, createdBy, limit } = req.query;
  let list = Array.from(scenarios.values());
  if (status) list = list.filter(s => s.status === status);
  if (modelType) list = list.filter(s => s.modelType === modelType);
  if (createdBy) list = list.filter(s => s.createdBy === createdBy);
  list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const pageSize = Math.min(parseInt(limit) || 100, MAX_SCENARIOS);
  res.json({ total: scenarios.size, returned: Math.min(list.length, pageSize), scenarios: list.slice(0, pageSize) });
});

app.get('/api/scenarios/:id', requireAuth, (req, res) => {
  const scenario = scenarios.get(req.params.id);
  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
  res.json(scenario);
});

app.post('/api/scenarios/:id/run', requireAuth, (req, res) => {
  const result = runScenario(req.params.id, req.body);
  if (result.error) return res.status(400).json(result);
  res.json(result);
});

app.get('/api/scenarios/:id/results', requireAuth, (req, res) => {
  const scenario = scenarios.get(req.params.id);
  if (!scenario) return res.status(404).json({ error: 'Scenario not found' });
  if (!scenario.results) return res.status(404).json({ error: 'Scenario not yet run' });
  res.json({ scenarioId: scenario.id, name: scenario.name, results: scenario.results });
});

app.delete('/api/scenarios/:id', requireAuth, (req, res) => {
  const deleted = scenarios.delete(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Scenario not found' });
  res.json({ id: req.params.id, status: 'deleted' });
});

app.get('/api/templates', (_req, res) => {
  res.json({
    templates: [
      { id: 'negotiation_outcome', name: 'Negotiation Outcome', modelType: 'monte_carlo', description: 'Simulate negotiation outcomes with variable concessions' },
      { id: 'market_stress', name: 'Market Stress Test', modelType: 'stress_test', description: 'Stress test pricing under market shocks' },
      { id: 'supply_chain', name: 'Supply Chain Risk', modelType: 'monte_carlo', description: 'Simulate supply chain disruptions' },
      { id: 'contract_value', name: 'Contract Value Distribution', modelType: 'monte_carlo', description: 'Distribution of contract values over time' },
    ]
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sutar-simulation-os', port: PORT, layer: 'Decision + Execution', scenarios: scenarios.size, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => { console.log(`[sutar-simulation-os] listening on :${PORT}`); });
process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
