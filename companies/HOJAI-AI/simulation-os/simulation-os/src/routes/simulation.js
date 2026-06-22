import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { simulationSessions, SIMULATION_TYPES, SIMULATION_STATUS, TIME_SCALES, logger } from '../index.js';

const router = express.Router();

// Simulation Engine (simplified)
class SimulationEngine {
  constructor(config) {
    this.id = config.id || uuidv4();
    this.type = config.type || SIMULATION_TYPES.WHAT_IF;
    this.status = SIMULATION_STATUS.PENDING;
    this.config = config;
    this.results = null;
    this.startTime = null;
    this.endTime = null;
    this.iterations = config.iterations || 1000;
    this.timeScale = config.timeScale || TIME_SCALES.FAST;
  }

  async run() {
    this.status = SIMULATION_STATUS.RUNNING;
    this.startTime = Date.now();

    try {
      switch (this.type) {
        case SIMULATION_TYPES.MONTE_CARLO:
          this.results = await this.monteCarloSimulation();
          break;
        case SIMULATION_TYPES.AGENT_BASED:
          this.results = await this.agentBasedSimulation();
          break;
        case SIMULATION_TYPES.SYSTEM_DYNAMICS:
          this.results = await this.systemDynamicsSimulation();
          break;
        case SIMULATION_TYPES.DISCRETE_EVENT:
          this.results = await this.discreteEventSimulation();
          break;
        default:
          this.results = await this.whatIfSimulation();
      }

      this.status = SIMULATION_STATUS.COMPLETED;
      this.endTime = Date.now();
      return this.results;
    } catch (error) {
      this.status = SIMULATION_STATUS.FAILED;
      this.endTime = Date.now();
      throw error;
    }
  }

  async monteCarloSimulation() {
    const { outcomes = [], probabilities = [] } = this.config;
    const samples = [];

    for (let i = 0; i < this.iterations; i++) {
      const outcome = this.selectOutcome(outcomes, probabilities);
      samples.push(outcome);
    }

    return this.calculateStatistics(samples);
  }

  selectOutcome(outcomes, probabilities) {
    if (!probabilities.length) {
      return outcomes[Math.floor(Math.random() * outcomes.length)];
    }

    const rand = Math.random();
    let cumulative = 0;

    for (let i = 0; i < probabilities.length; i++) {
      cumulative += probabilities[i];
      if (rand <= cumulative) {
        return outcomes[i];
      }
    }

    return outcomes[outcomes.length - 1];
  }

  calculateStatistics(samples) {
    const sorted = [...samples].sort((a, b) => a - b);
    const sum = samples.reduce((a, b) => a + b, 0);
    const mean = sum / samples.length;

    const squaredDiffs = samples.map(x => Math.pow(x - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / samples.length;
    const stdDev = Math.sqrt(variance);

    return {
      iterations: this.iterations,
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      percentile5: sorted[Math.floor(sorted.length * 0.05)],
      percentile95: sorted[Math.floor(sorted.length * 0.95)],
      distribution: this.getDistribution(samples)
    };
  }

  getDistribution(samples) {
    const buckets = 10;
    const min = Math.min(...samples);
    const max = Math.max(...samples);
    const step = (max - min) / buckets;

    const distribution = [];
    for (let i = 0; i < buckets; i++) {
      const bucketStart = min + i * step;
      const bucketEnd = bucketStart + step;
      const count = samples.filter(x => x >= bucketStart && x < bucketEnd).length;
      distribution.push({
        range: `${bucketStart.toFixed(0)}-${bucketEnd.toFixed(0)}`,
        count
      });
    }

    return distribution;
  }

  async agentBasedSimulation() {
    const { agents = [], environment = {}, steps = 100 } = this.config;
    const history = [];

    let state = { agents: [...agents], environment: { ...environment } };

    for (let step = 0; step < steps; step++) {
      // Update each agent
      state.agents = state.agents.map(agent => {
        const decisions = this.agentDecision(agent, state);
        return { ...agent, ...decisions, step };
      });

      // Update environment
      state.environment = this.updateEnvironment(state);

      history.push({
        step,
        agents: state.agents.map(a => ({ id: a.id, state: a.state || 'active' })),
        environment: { ...state.environment }
      });
    }

    return {
      steps,
      agentCount: agents.length,
      history,
      finalState: state
    };
  }

  agentDecision(agent, state) {
    // Simplified agent decision logic
    const actions = ['move', 'interact', 'adapt', 'rest'];
    return {
      action: actions[Math.floor(Math.random() * actions.length)],
      state: Math.random() > 0.1 ? 'active' : 'inactive'
    };
  }

  updateEnvironment(state) {
    // Simplified environment update
    return {
      ...state.environment,
      time: (state.environment.time || 0) + 1
    };
  }

  async systemDynamicsSimulation() {
    const { variables = {}, timeHorizon = 12, dt = 1 } = this.config;
    const timeline = [];

    let current = { ...variables };

    for (let t = 0; t <= timeHorizon; t += dt) {
      timeline.push({ time: t, ...current });

      // Update variables based on rates
      const rates = this.calculateRates(current);
      current = this.updateVariables(current, rates, dt);
    }

    return {
      timeHorizon,
      variables: Object.keys(variables),
      timeline,
      equilibrium: this.findEquilibrium(timeline)
    };
  }

  calculateRates(state) {
    // Simplified rate calculation
    return {
      growth: (state.growthRate || 0.05) * (state.value || 100),
      decay: (state.decayRate || 0.01) * (state.value || 100)
    };
  }

  updateVariables(state, rates, dt) {
    return {
      ...state,
      value: Math.max(0, (state.value || 100) + (rates.growth - rates.decay) * dt)
    };
  }

  findEquilibrium(timeline) {
    if (timeline.length < 2) return null;
    const last = timeline[timeline.length - 1];
    const prev = timeline[timeline.length - 2];
    return Math.abs(last.value - prev.value) < 0.01 ? last.value : null;
  }

  async discreteEventSimulation() {
    const { events = [], duration = 1000 } = this.config;
    const eventLog = [];
    let currentTime = 0;
    let queue = [...events].sort((a, b) => a.time - b.time);

    while (queue.length > 0 && currentTime < duration) {
      const event = queue.shift();
      currentTime = event.time;

      eventLog.push({
        time: currentTime,
        event: event.type,
        data: event.data
      });

      // Generate next events
      const nextEvents = this.generateNextEvents(event, currentTime);
      queue.push(...nextEvents);
      queue.sort((a, b) => a.time - b.time);
    }

    return {
      duration,
      eventCount: eventLog.length,
      eventLog,
      statistics: this.analyzeEventLog(eventLog)
    };
  }

  generateNextEvents(event, currentTime) {
    // Simplified event generation
    return [];
  }

  analyzeEventLog(eventLog) {
    const eventTypes = {};
    for (const e of eventLog) {
      eventTypes[e.event] = (eventTypes[e.event] || 0) + 1;
    }
    return { eventTypes, totalEvents: eventLog.length };
  }

  async whatIfSimulation() {
    const { scenarios = [] } = this.config;
    const results = [];

    for (const scenario of scenarios) {
      const outcome = await this.runScenario(scenario);
      results.push({ scenario: scenario.name, ...outcome });
    }

    return {
      scenarioCount: scenarios.length,
      results,
      comparison: this.compareScenarios(results)
    };
  }

  async runScenario(scenario) {
    // Simplified scenario execution
    return {
      success: true,
      metrics: {
        revenue: Math.random() * 1000000,
        cost: Math.random() * 500000,
        profit: Math.random() * 500000
      }
    };
  }

  compareScenarios(results) {
    const metrics = ['revenue', 'cost', 'profit'];
    const comparison = {};

    for (const metric of metrics) {
      const values = results.map(r => r.metrics?.[metric] || 0);
      comparison[metric] = {
        best: Math.max(...values),
        worst: Math.min(...values),
        average: values.reduce((a, b) => a + b, 0) / values.length
      };
    }

    return comparison;
  }
}

/**
 * GET /api/simulation
 * List all simulation sessions
 */
router.get('/', async (req, res) => {
  try {
    const sessions = Array.from(simulationSessions.values()).map(s => ({
      id: s.id,
      type: s.type,
      status: s.status,
      createdAt: s.startTime,
      completedAt: s.endTime,
      iterations: s.iterations
    }));

    res.json({
      success: true,
      count: sessions.length,
      sessions
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/simulation/run
 * Run a new simulation
 */
router.post('/run', async (req, res) => {
  try {
    const { type, config = {}, iterations = 1000 } = req.body;

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Simulation type is required'
      });
    }

    const simulationId = uuidv4();
    const engine = new SimulationEngine({
      id: simulationId,
      type,
      config,
      iterations
    });

    simulationSessions.set(simulationId, engine);

    // Run simulation asynchronously
    engine.run().catch(err => {
      logger.error(`Simulation ${simulationId} failed:`, err);
    });

    res.status(202).json({
      success: true,
      simulationId,
      status: engine.status,
      message: 'Simulation started'
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/simulation/:id
 * Get simulation results
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const simulation = simulationSessions.get(id);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }

    res.json({
      success: true,
      simulation: {
        id: simulation.id,
        type: simulation.type,
        status: simulation.status,
        config: simulation.config,
        results: simulation.results,
        startTime: simulation.startTime,
        endTime: simulation.endTime,
        duration: simulation.endTime
          ? simulation.endTime - simulation.startTime
          : null,
        iterations: simulation.iterations
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/simulation/:id/pause
 * Pause a running simulation
 */
router.post('/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;

    const simulation = simulationSessions.get(id);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }

    if (simulation.status !== SIMULATION_STATUS.RUNNING) {
      return res.status(400).json({
        success: false,
        error: 'Simulation is not running'
      });
    }

    simulation.status = SIMULATION_STATUS.PAUSED;

    res.json({
      success: true,
      message: 'Simulation paused',
      simulationId: id
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/simulation/:id/resume
 * Resume a paused simulation
 */
router.post('/:id/resume', async (req, res) => {
  try {
    const { id } = req.params;

    const simulation = simulationSessions.get(id);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }

    if (simulation.status !== SIMULATION_STATUS.PAUSED) {
      return res.status(400).json({
        success: false,
        error: 'Simulation is not paused'
      });
    }

    simulation.status = SIMULATION_STATUS.RUNNING;

    res.json({
      success: true,
      message: 'Simulation resumed',
      simulationId: id
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/simulation/:id
 * Cancel/delete a simulation
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const simulation = simulationSessions.get(id);

    if (!simulation) {
      return res.status(404).json({
        success: false,
        error: 'Simulation not found'
      });
    }

    simulationSessions.delete(id);

    res.json({
      success: true,
      message: 'Simulation deleted',
      simulationId: id
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/simulation/types
 * List available simulation types
 */
router.get('/types', async (req, res) => {
  res.json({
    success: true,
    types: Object.entries(SIMULATION_TYPES).map(([key, value]) => ({
      id: value,
      name: key.replace(/_/g, ' ').toLowerCase(),
      description: getSimulationDescription(value)
    }))
  });
});

function getSimulationDescription(type) {
  const descriptions = {
    [SIMULATION_TYPES.MONTE_CARLO]: 'Random sampling to model uncertainty and risk',
    [SIMULATION_TYPES.AGENT_BASED]: 'Simulate individual agent behaviors and interactions',
    [SIMULATION_TYPES.SYSTEM_DYNAMICS]: 'Model feedback loops and continuous change',
    [SIMULATION_TYPES.DISCRETE_EVENT]: 'Model event-driven processes over time',
    [SIMULATION_TYPES.WHAT_IF]: 'Compare multiple scenarios and outcomes'
  };
  return descriptions[type] || 'Unknown simulation type';
}

export default router;
