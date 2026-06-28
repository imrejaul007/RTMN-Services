/**
 * Simulation Engine - Workflow simulation for what-if analysis and execution planning
 * Enables dry-run testing, path exploration, and risk assessment before live execution
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

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
const PORT = process.env.PORT || 5380;

app.use(cors());
app.use(express.json());

// Simulation states
const SIMULATION_STATES = {
  CREATED: 'created',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// In-memory storage
const simulations = new Map(); // simId -> simulation
const simulationResults = new Map(); // simId -> results

// Create simulation
function createSimulation(workflowDefinition, options = {}) {
  const simId = crypto.randomUUID();
  const now = Date.now();

  const simulation = {
    id: simId,
    name: options.name || `Simulation ${simId.slice(0, 8)}`,
    workflowDefinition,
    state: SIMULATION_STATES.CREATED,
    initialContext: options.initialContext || {},
    simulationConfig: {
      maxSteps: options.maxSteps || 1000,
      maxDuration: options.maxDuration || 60000, // 1 minute max
      enableBacktracking: options.enableBacktracking !== false,
      exploreAllPaths: options.exploreAllPaths || false,
      failureInjection: options.failureInjection || false,
      variableOverrides: options.variableOverrides || {},
      ...options.config,
    },
    currentStep: null,
    stepHistory: [],
    pathTree: {
      id: 'root',
      children: [],
      decisions: [],
    },
    metrics: {
      stepsExecuted: 0,
      pathsExplored: 0,
      decisionsMade: 0,
      backtracks: 0,
      failuresInjected: 0,
      estimatedCost: 0,
      estimatedDuration: 0,
    },
    createdAt: now,
    startedAt: null,
    completedAt: null,
  };

  simulations.set(simId, simulation);
  return simulation;
}

// Simulate step execution
function simulateStep(simId, step, context) {
  const sim = simulations.get(simId);
  if (!sim) {
    throw new Error('Simulation not found');
  }

  const config = sim.simulationConfig;

  // Check step limit
  if (sim.metrics.stepsExecuted >= config.maxSteps) {
    throw new Error('Max steps exceeded');
  }

  const stepStart = Date.now();
  sim.state = SIMULATION_STATES.RUNNING;

  // Apply variable overrides
  const effectiveContext = { ...context };
  for (const [key, value] of Object.entries(config.variableOverrides)) {
    if (effectiveContext[key] !== undefined) {
      effectiveContext[key] = value;
    }
  }

  // Execute step simulation
  const result = {
    stepId: step.id,
    stepType: step.type,
    inputs: step.inputs || {},
    outputs: {},
    duration: 0,
    status: 'success',
    error: null,
    branches: [],
  };

  // Simulate step behavior based on type
  switch (step.type) {
    case 'task':
      result.outputs = simulateTaskStep(step, effectiveContext);
      break;
    case 'condition':
      const conditionResult = evaluateCondition(step.condition, effectiveContext);
      result.outputs = { conditionResult };
      result.branches = conditionResult ? ['true'] : ['false'];
      sim.metrics.decisionsMade++;
      break;
    case 'parallel':
      result.branches = step.branches || ['branch-1', 'branch-2'];
      sim.metrics.pathsExplored += result.branches.length;
      break;
    case 'loop':
      result.outputs = simulateLoopStep(step, effectiveContext);
      break;
    case 'http':
      result.outputs = simulateHttpStep(step, effectiveContext);
      break;
    case 'transform':
      result.outputs = applyTransform(step.transform, effectiveContext);
      break;
    default:
      result.outputs = { result: 'simulated' };
  }

  // Simulate failure injection
  if (config.failureInjection && Math.random() < 0.1) {
    result.status = 'failed';
    result.error = 'Injected failure for testing';
    sim.metrics.failuresInjected++;
  }

  result.duration = Date.now() - stepStart;
  sim.metrics.stepsExecuted++;
  sim.metrics.estimatedCost += result.duration * 0.0000001;
  sim.metrics.estimatedDuration += result.duration;

  // Record step in history
  sim.stepHistory.push({
    stepId: step.id,
    type: step.type,
    timestamp: Date.now(),
    ...result,
  });

  sim.currentStep = step.id;
  simulations.set(simId, sim);

  return result;
}

function simulateTaskStep(step, context) {
  // Simulate task execution
  return {
    result: `Task ${step.id} executed`,
    contextSnapshot: { ...context },
    outputData: step.outputData || { success: true },
  };
}

function evaluateCondition(condition, context) {
  if (!condition) return true;

  // Simple condition evaluation
  if (typeof condition === 'string') {
    // Check if it's a variable reference
    if (condition.startsWith('${') && condition.endsWith('}')) {
      const varName = condition.slice(2, -1);
      return context[varName] === true || context[varName] !== undefined;
    }
    // Evaluate as expression
    try {
      // Safety: only allow simple expressions
      const safeContext = { ...context };
      const expr = condition.replace(/\${([^}]+)}/g, (_, varName) =>
        JSON.stringify(safeContext[varName])
      );
      return eval(expr) === true;
    } catch {
      return false;
    }
  }

  if (typeof condition === 'function') {
    return condition(context);
  }

  return Boolean(condition);
}

function simulateLoopStep(step, context) {
  const iterations = step.iterations || 3;
  const results = [];

  for (let i = 0; i < iterations; i++) {
    results.push({
      iteration: i + 1,
      output: step.body ? simulateStep('temp', step.body, context) : { done: true },
    });
  }

  return {
    iterations: results.length,
    results,
  };
}

function simulateHttpStep(step, context) {
  return {
    statusCode: step.mockStatusCode || 200,
    response: step.mockResponse || { success: true },
    headers: { 'content-type': 'application/json' },
    latency: step.mockLatency || 50,
  };
}

function applyTransform(transform, context) {
  if (!transform) return context;

  const result = { ...context };

  for (const [key, value] of Object.entries(transform)) {
    if (typeof value === 'string' && value.includes('${')) {
      // Replace variables
      result[key] = value.replace(/\${([^}]+)}/g, (_, varName) =>
        context[varName] !== undefined ? context[varName] : ''
      );
    } else {
      result[key] = value;
    }
  }

  return result;
}

// Run full simulation
function runSimulation(simId) {
  const sim = simulations.get(simId);
  if (!sim) {
    throw new Error('Simulation not found');
  }

  sim.startedAt = Date.now();
  sim.state = SIMULATION_STATES.RUNNING;

  const definition = sim.workflowDefinition;
  let context = { ...sim.initialContext };

  // Process workflow steps
  const processStep = async (step) => {
    if (sim.metrics.stepsExecuted >= sim.simulationConfig.maxSteps) {
      return { status: 'max_steps_exceeded' };
    }

    const result = simulateStep(simId, step, context);

    if (result.status === 'failed') {
      return result;
    }

    // Update context with outputs
    context = { ...context, ...result.outputs };

    return result;
  };

  // Simulate execution (simplified - real implementation would walk the DAG)
  const results = {
    steps: [],
    finalContext: context,
    metrics: { ...sim.metrics },
    status: SIMULATION_STATES.COMPLETED,
  };

  // Simulate each node in the workflow
  if (definition.nodes) {
    for (const node of definition.nodes) {
      const stepResult = simulateStep(simId, node, context);
      results.steps.push(stepResult);
      context = { ...context, ...stepResult.outputs };

      if (stepResult.status === 'failed') {
        results.status = SIMULATION_STATES.FAILED;
        break;
      }
    }
  }

  sim.completedAt = Date.now();
  sim.state = results.status;
  simulations.set(simId, sim);
  simulationResults.set(simId, results);

  return results;
}

// Get simulation
function getSimulation(simId) {
  return simulations.get(simId) || null;
}

// Get simulation results
function getSimulationResults(simId) {
  return simulationResults.get(simId) || null;
}

// Compare scenarios
function compareScenarios(scenarioIds) {
  const scenarios = scenarioIds.map(id => ({
    id,
    simulation: simulations.get(id),
    results: simulationResults.get(id),
  }));

  const comparison = {
    scenarios: [],
    metrics: {
      totalSteps: {},
      totalDuration: {},
      totalCost: {},
      successRate: {},
    },
    recommendations: [],
  };

  for (const scenario of scenarios) {
    if (!scenario.simulation) continue;

    comparison.scenarios.push({
      id: scenario.id,
      name: scenario.simulation.name,
      state: scenario.simulation.state,
    });

    comparison.metrics.totalSteps[scenario.id] = scenario.simulation.metrics.stepsExecuted;
    comparison.metrics.totalDuration[scenario.id] = scenario.simulation.metrics.estimatedDuration;
    comparison.metrics.totalCost[scenario.id] = scenario.simulation.metrics.estimatedCost;
    comparison.metrics.successRate[scenario.id] =
      scenario.simulation.state === SIMULATION_STATES.COMPLETED ? 100 : 0;
  }

  // Generate recommendations
  const costs = Object.entries(comparison.metrics.totalCost);
  if (costs.length > 1) {
    const [minId, minCost] = costs.reduce((a, b) => a[1] < b[1] ? a : b);
    const [maxId, maxCost] = costs.reduce((a, b) => a[1] > b[1] ? a : b);

    if (maxCost > minCost * 1.5) {
      comparison.recommendations.push({
        type: 'cost_optimization',
        suggestion: `Scenario ${maxId} costs ${((maxCost / minCost - 1) * 100).toFixed(0)}% more than ${minId}`,
        lowerCostId: minId,
      });
    }
  }

  return comparison;
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'simulation-engine', port: PORT });
});

app.post('/api/simulations', requireInternal, (req, res) => {
  try {
    const simulation = createSimulation(req.body.workflowDefinition, req.body.options);
    res.status(201).json(simulation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/simulations', (req, res) => {
  try {
    const all = Array.from(simulations.values());
    res.json(all);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/simulations/:id', (req, res) => {
  try {
    const sim = getSimulation(req.params.id);
    if (!sim) {
      return res.status(404).json({ error: 'Simulation not found' });
    }
    res.json(sim);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/simulations/:id/run', requireInternal, (req, res) => {
  try {
    const results = runSimulation(req.params.id);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/simulations/:id/results', (req, res) => {
  try {
    const results = getSimulationResults(req.params.id);
    if (!results) {
      return res.status(404).json({ error: 'Simulation results not found' });
    }
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/simulations/:id/steps', requireInternal, (req, res) => {
  try {
    const result = simulateStep(req.params.id, req.body.step, req.body.context);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/simulations/compare', requireInternal, (req, res) => {
  try {
    const comparison = compareScenarios(req.body.scenarioIds);
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/simulations/:id', requireInternal, (req, res) => {
  try {
    simulations.delete(req.params.id);
    simulationResults.delete(req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/states', (req, res) => {
  res.json(SIMULATION_STATES);
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
  console.log(`Simulation Engine service running on port ${PORT}`);
});

export { app, createSimulation, simulateStep, runSimulation, getSimulation, getSimulationResults, compareScenarios, SIMULATION_STATES };