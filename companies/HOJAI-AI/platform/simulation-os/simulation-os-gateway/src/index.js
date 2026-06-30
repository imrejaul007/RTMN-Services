/**
 * SimulationOS Gateway - v1.0.0
 * =================================
 * What-if scenarios, market simulation, company simulation.
 *
 * Port: 4874
 *
 * Provides:
 * - Monte Carlo simulations
 * - Market what-if analysis
 * - Company decision modeling
 * - Scenario comparison
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = process.env.PORT || 4874;

app.use(helmet());
app.use(cors());
app.use(express.json());

// Data stores
const scenarios = new Map();      // scenarioId -> Scenario
const simulations = new Map();     // simulationId -> Simulation
const results = new Map();         // scenarioId -> Results

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function randomNormal(mean, stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

function runMonteCarlo(model, iterations = 1000) {
  const outcomes = [];

  for (let i = 0; i < iterations; i++) {
    const outcome = {};
    for (const [key, param] of Object.entries(model)) {
      if (typeof param.mean === 'number') {
        outcome[key] = randomNormal(param.mean, param.stdDev || param.mean * 0.1);
      } else {
        outcome[key] = param;
      }
    }
    outcomes.push(outcome);
  }

  return outcomes;
}

function calculateStatistics(outcomes, key) {
  const values = outcomes.map(o => o[key]).filter(v => typeof v === 'number');
  if (values.length === 0) return null;

  values.sort((a, b) => a - b);
  const sum = values.reduce((s, v) => s + v, 0);
  const mean = sum / values.length;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    mean: Math.round(mean * 100) / 100,
    stdDev: Math.round(stdDev * 100) / 100,
    min: Math.round(values[0] * 100) / 100,
    max: Math.round(values[values.length - 1] * 100) / 100,
    p5: Math.round(values[Math.floor(values.length * 0.05)] * 100) / 100,
    p25: Math.round(values[Math.floor(values.length * 0.25)] * 100) / 100,
    p50: Math.round(values[Math.floor(values.length * 0.5)] * 100) / 100,
    p75: Math.round(values[Math.floor(values.length * 0.75)] * 100) / 100,
    p95: Math.round(values[Math.floor(values.length * 0.95)] * 100) / 100
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// SCENARIOS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /scenario - Create a new scenario
 */
app.post('/scenario', (req, res) => {
  const { name, type, description, model, assumptions } = req.body;

  if (!name || !type || !model) {
    return res.status(400).json({ error: 'name, type, and model required' });
  }

  const scenarioId = uuidv4();
  const scenario = {
    id: scenarioId,
    name,
    type,  // 'pricing', 'market', 'company', 'custom'
    description: description || '',
    model,
    assumptions: assumptions || {},
    createdAt: new Date().toISOString(),
    status: 'created'
  };

  scenarios.set(scenarioId, scenario);

  res.json({
    success: true,
    scenario
  });
});

/**
 * GET /scenario/:scenarioId - Get scenario
 */
app.get('/scenario/:scenarioId', (req, res) => {
  const { scenarioId } = req.params;
  const scenario = scenarios.get(scenarioId);

  if (!scenario) {
    return res.status(404).json({ error: 'Scenario not found' });
  }

  res.json({ scenario });
});

/**
 * GET /scenarios - List all scenarios
 */
app.get('/scenarios', (req, res) => {
  const { type, limit } = req.query;

  let list = Array.from(scenarios.values());

  if (type) {
    list = list.filter(s => s.type === type);
  }

  list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (limit) {
    list = list.slice(0, parseInt(limit));
  }

  res.json({
    scenarios: list,
    count: list.length
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SIMULATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /simulate/:scenarioId - Run simulation
 */
app.post('/simulate/:scenarioId', (req, res) => {
  const { scenarioId } = req.params;
  const { iterations = 1000, parameters } = req.body;

  const scenario = scenarios.get(scenarioId);
  if (!scenario) {
    return res.status(404).json({ error: 'Scenario not found' });
  }

  const simulationId = uuidv4();

  // Merge model with custom parameters
  const model = { ...scenario.model, ...parameters };

  // Run Monte Carlo simulation
  const outcomes = runMonteCarlo(model, iterations);

  // Calculate statistics for each variable
  const statistics = {};
  const keys = new Set();
  outcomes.forEach(o => Object.keys(o).forEach(k => keys.add(k)));

  keys.forEach(key => {
    statistics[key] = calculateStatistics(outcomes, key);
  });

  // Store simulation
  const simulation = {
    id: simulationId,
    scenarioId,
    scenarioName: scenario.name,
    iterations,
    model,
    outcomes: outcomes.slice(0, 100), // Store sample
    statistics,
    createdAt: new Date().toISOString(),
    status: 'completed'
  };

  simulations.set(simulationId, simulation);
  results.set(scenarioId, { simulationId, ...simulation });

  res.json({
    success: true,
    simulation: {
      id: simulationId,
      iterations,
      statistics
    }
  });
});

/**
 * GET /simulation/:simulationId - Get simulation results
 */
app.get('/simulation/:simulationId', (req, res) => {
  const { simulationId } = req.params;
  const simulation = simulations.get(simulationId);

  if (!simulation) {
    return res.status(404).json({ error: 'Simulation not found' });
  }

  res.json({ simulation });
});

// ─────────────────────────────────────────────────────────────────────────────
// PRICING SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /pricing - Simulate pricing changes
 */
app.post('/pricing', (req, res) => {
  const {
    currentPrice,
    currentDemand,
    elasticity = -1.5,
    discount,
    markup,
    iterations = 1000
  } = req.body;

  if (!currentPrice || !currentDemand) {
    return res.status(400).json({ error: 'currentPrice and currentDemand required' });
  }

  const newPrice = discount
    ? currentPrice * (1 - discount)
    : markup
      ? currentPrice * (1 + markup)
      : currentPrice;

  // Price elasticity model: demand_change = elasticity * price_change
  const priceChange = (newPrice - currentPrice) / currentPrice;
  const demandChange = elasticity * priceChange;
  const newDemand = currentDemand * (1 + demandChange);

  // Run Monte Carlo for uncertainty
  const demandVariation = currentDemand * 0.2; // 20% uncertainty
  const elasticityVariation = 0.3;

  const model = {
    newDemand: { mean: newDemand, stdDev: demandVariation },
    revenueChange: {
      mean: (newPrice * newDemand) - (currentPrice * currentDemand),
      stdDev: currentPrice * demandVariation
    },
    marginChange: { mean: (newPrice - currentPrice) / currentPrice * 100, stdDev: 5 }
  };

  const outcomes = runMonteCarlo(model, iterations);
  const statistics = {};
  Object.keys(model).forEach(key => {
    statistics[key] = calculateStatistics(outcomes, key);
  });

  const simulationId = uuidv4();
  const simulation = {
    id: simulationId,
    type: 'pricing',
    input: { currentPrice, currentDemand, newPrice, elasticity },
    statistics,
    createdAt: new Date().toISOString()
  };

  simulations.set(simulationId, simulation);

  res.json({
    simulation,
    recommendation: statistics.revenueChange?.mean > 0
      ? 'Recommended'
      : 'Not recommended'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// MARKET SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /market - Simulate market scenarios
 */
app.post('/market', (req, res) => {
  const {
    marketSize,
    growthRate = 0.05,
    competitors = 5,
    yourMarketShare = 0.1,
    scenarios = ['base', 'bullish', 'bearish']
  } = req.body;

  if (!marketSize) {
    return res.status(400).json({ error: 'marketSize required' });
  }

  const results = {};

  for (const scenarioType of scenarios) {
    let modifier = 1;
    let volatility = 0.1;

    switch (scenarioType) {
      case 'bullish':
        modifier = 1.3;
        volatility = 0.15;
        break;
      case 'bearish':
        modifier = 0.7;
        volatility = 0.2;
        break;
      default:
        modifier = 1;
        volatility = 0.1;
    }

    const model = {
      marketSize: { mean: marketSize * modifier, stdDev: marketSize * volatility },
      yourRevenue: { mean: marketSize * modifier * yourMarketShare, stdDev: marketSize * volatility * yourMarketShare },
      growthRate: { mean: growthRate * modifier, stdDev: 0.02 }
    };

    const outcomes = runMonteCarlo(model, 1000);
    const statistics = {};
    Object.keys(model).forEach(key => {
      statistics[key] = calculateStatistics(outcomes, key);
    });

    results[scenarioType] = {
      statistics,
      probability: scenarioType === 'base' ? 0.5 : 0.25
    };
  }

  // Calculate expected value
  const expectedRevenue = Object.values(results).reduce((sum, r) =>
    sum + (r.statistics.yourRevenue?.mean || 0) * r.probability, 0
  );

  res.json({
    marketSize,
    yourMarketShare,
    scenarios: results,
    expectedRevenue: Math.round(expectedRevenue * 100) / 100,
    recommendation: expectedRevenue > marketSize * yourMarketShare
      ? 'Expand market share'
      : 'Defend current position'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPANY SIMULATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /company - Simulate company decisions
 */
app.post('/company', (req, res) => {
  const {
    companyId,
    currentRevenue,
    currentCosts,
    decisions = []
  } = req.body;

  if (!currentRevenue || !currentCosts) {
    return res.status(400).json({ error: 'currentRevenue and currentCosts required' });
  }

  const currentProfit = currentRevenue - currentCosts;
  const currentMargin = (currentProfit / currentRevenue) * 100;

  // Model decisions
  const decisionImpacts = decisions.map(d => {
    let revenueImpact = 0;
    let costImpact = 0;

    switch (d.type) {
      case 'pricing':
        revenueImpact = currentRevenue * (d.value || 0);
        break;
      case 'marketing':
        // Marketing spend typically has 2-3x return
        revenueImpact = (d.value || 0) * 2.5;
        break;
      case 'hiring':
        // Hiring increases costs but may boost revenue
        costImpact = d.value || 0;
        break;
      case 'automation':
        // Reduces costs over time
        costImpact = -(d.value || 0) * 0.5;
        break;
      default:
        revenueImpact = d.revenueImpact || 0;
        costImpact = d.costImpact || 0;
    }

    return { type: d.type, revenueImpact, costImpact };
  });

  const totalRevenueImpact = decisionImpacts.reduce((sum, d) => sum + d.revenueImpact, 0);
  const totalCostImpact = decisionImpacts.reduce((sum, d) => sum + d.costImpact, 0);

  // Run simulation
  const model = {
    newRevenue: { mean: currentRevenue + totalRevenueImpact, stdDev: currentRevenue * 0.1 },
    newCosts: { mean: currentCosts + totalCostImpact, stdDev: currentCosts * 0.05 },
    profitChange: {
      mean: totalRevenueImpact - totalCostImpact,
      stdDev: currentRevenue * 0.08
    }
  };

  const outcomes = runMonteCarlo(model, 1000);
  const statistics = {};
  Object.keys(model).forEach(key => {
    statistics[key] = calculateStatistics(outcomes, key);
  });

  const newProfit = statistics.profitChange?.mean + currentProfit;
  const newMargin = (newProfit / (currentRevenue + totalRevenueImpact)) * 100;

  res.json({
    companyId,
    currentState: { revenue: currentRevenue, costs: currentCosts, profit: currentProfit, margin: currentMargin },
    decisions: decisionImpacts,
    projectedState: {
      revenue: Math.round((currentRevenue + totalRevenueImpact) * 100) / 100,
      costs: Math.round((currentCosts + totalCostImpact) * 100) / 100,
      profit: Math.round(newProfit * 100) / 100,
      margin: Math.round(newMargin * 100) / 100
    },
    statistics,
    recommendation: newMargin > currentMargin ? 'Positive ROI' : 'Review decisions'
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// COMPARISON
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /compare - Compare multiple scenarios
 */
app.post('/compare', (req, res) => {
  const { scenarioIds } = req.body;

  if (!scenarioIds || !Array.isArray(scenarioIds) || scenarioIds.length < 2) {
    return res.status(400).json({ error: 'At least 2 scenarioIds required' });
  }

  const comparisons = [];

  for (const scenarioId of scenarioIds) {
    const scenario = scenarios.get(scenarioId);
    const result = results.get(scenarioId);

    if (scenario) {
      comparisons.push({
        id: scenarioId,
        name: scenario.name,
        type: scenario.type,
        result: result ? {
          iterations: result.iterations,
          statistics: result.statistics
        } : null
      });
    }
  }

  // Find best scenario
  let best = null;
  let bestScore = -Infinity;

  comparisons.forEach(c => {
    if (c.result?.statistics?.revenueChange?.mean !== undefined) {
      const score = c.result.statistics.revenueChange.mean;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
  });

  res.json({
    comparisons,
    bestScenario: best,
    summary: {
      totalScenarios: comparisons.length,
      evaluatedScenarios: comparisons.filter(c => c.result).length
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// WHAT-IF QUERIES
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /whatif - Quick what-if analysis
 */
app.post('/whatif', (req, res) => {
  const { question, context } = req.body;

  if (!question) {
    return res.status(400).json({ error: 'question required' });
  }

  // Parse simple what-if questions
  const lower = question.toLowerCase();
  let response = { question, analysis: {}, recommendation: '' };

  if (lower.includes('discount') || lower.includes('price')) {
    response.analysis.type = 'pricing';
    response.analysis.message = 'Use POST /pricing to simulate pricing changes';
  } else if (lower.includes('market') || lower.includes('competitor')) {
    response.analysis.type = 'market';
    response.analysis.message = 'Use POST /market to simulate market scenarios';
  } else if (lower.includes('hire') || lower.includes('cost') || lower.includes('revenue')) {
    response.analysis.type = 'company';
    response.analysis.message = 'Use POST /company to simulate company decisions';
  } else {
    response.analysis.type = 'general';
    response.analysis.message = 'Consider creating a custom scenario with POST /scenario';
  }

  res.json(response);
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * DELETE /scenario/:scenarioId - Delete scenario
 */
app.delete('/scenario/:scenarioId', (req, res) => {
  const { scenarioId } = req.params;

  scenarios.delete(scenarioId);
  results.delete(scenarioId);

  res.json({ success: true, deleted: scenarioId });
});

/**
 * DELETE /all - Clear all data
 */
app.delete('/all', (req, res) => {
  scenarios.clear();
  simulations.clear();
  results.clear();

  res.json({ success: true, message: 'All simulation data cleared' });
});

// ─────────────────────────────────────────────────────────────────────────────
// HEALTH
// ─────────────────────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'simulation-os-gateway',
    port: PORT,
    scenarios: scenarios.size,
    simulations: simulations.size
  });
});

app.listen(PORT, () => {
  console.log(`SimulationOS Gateway running on port ${PORT}`);
});

export default app;
