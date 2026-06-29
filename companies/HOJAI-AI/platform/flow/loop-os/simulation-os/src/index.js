/**
 * LoopOS SimulationOS
 * Test agents in sandbox before production
 * Port: 4747
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4747;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Simulation states
const STATES = {
  PENDING: 'pending',
  INITIALIZING: 'initializing',
  RUNNING: 'running',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// Simulation types
const TYPES = {
  SINGLE_AGENT: 'single_agent',
  MULTI_AGENT: 'multi_agent',
  SCENARIO: 'scenario',
  SANDBOX: 'sandbox',
  STRESS_TEST: 'stress_test'
};

// In-memory stores
const scenarios = new Map();     // scenarioId -> Scenario
const simulations = new Map();   // simId -> Simulation
const worlds = new Map();        // worldId -> SandboxWorld
const syntheticEntities = new Map(); // entityId -> SyntheticEntity

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-simulation-os',
  version: '1.0.0',
  port: PORT,
  scenarios: scenarios.size,
  simulations: simulations.size,
  worlds: worlds.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Scenario Management ──────────────────────────────────

/**
 * Create scenario
 * POST /api/scenarios
 */
app.post('/api/scenarios', requireAuth, (req, res) => {
  const {
    name,
    type = TYPES.SINGLE_AGENT,
    description,
    agent,
    environment,
    objectives = [],
    constraints = [],
    metrics = [],
    successCriteria = [],
    difficulty = 'medium'
  } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = `scenario-${randomUUID().slice(0, 8)}`;

  const scenario = {
    id,
    name,
    type,
    description: description || '',
    agent,
    environment,
    objectives,
    constraints,
    metrics,
    successCriteria,
    difficulty,
    versions: [{ version: 1, createdAt: new Date().toISOString() }],
    stats: { runs: 0, successes: 0, avgScore: 0 },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  scenarios.set(id, scenario);
  logger.info(`Scenario created: ${id} (${name})`);
  res.status(201).json(scenario);
});

/**
 * Get scenario
 * GET /api/scenarios/:id
 */
app.get('/api/scenarios/:id', (req, res) => {
  const scenario = scenarios.get(req.params.id);
  if (!scenario) return res.status(404).json({ error: 'scenario not found' });
  res.json(scenario);
});

/**
 * List scenarios
 * GET /api/scenarios
 */
app.get('/api/scenarios', (req, res) => {
  const { type, difficulty, q } = req.query;
  let items = [...scenarios.values()];

  if (type) items = items.filter(s => s.type === type);
  if (difficulty) items = items.filter(s => s.difficulty === difficulty);
  if (q) {
    const term = q.toLowerCase();
    items = items.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.description?.toLowerCase().includes(term)
    );
  }

  res.json({ count: items.length, scenarios: items });
});

/**
 * Update scenario
 * PUT /api/scenarios/:id
 */
app.put('/api/scenarios/:id', requireAuth, (req, res) => {
  const scenario = scenarios.get(req.params.id);
  if (!scenario) return res.status(404).json({ error: 'scenario not found' });

  const updates = req.body || {};
  Object.assign(scenario, updates);
  scenario.updatedAt = new Date().toISOString();

  res.json(scenario);
});

/**
 * Delete scenario
 * DELETE /api/scenarios/:id
 */
app.delete('/api/scenarios/:id', requireAuth, (req, res) => {
  if (!scenarios.has(req.params.id)) return res.status(404).json({ error: 'scenario not found' });
  scenarios.delete(req.params.id);
  res.json({ deleted: true });
});

// ── Sandbox Worlds ─────────────────────────────────────────

/**
 * Create sandbox world
 * POST /api/worlds
 */
app.post('/api/worlds', requireAuth, (req, res) => {
  const { name, type, entities = [], config = {} } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = `world-${randomUUID().slice(0, 8)}`;

  const world = {
    id,
    name,
    type,
    entities,
    config: {
      timeScale: config.timeScale || 1,
      randomness: config.randomness || 0.5,
      rules: config.rules || [],
      ...config
    },
    state: {},
    createdAt: new Date().toISOString()
  };

  worlds.set(id, world);
  logger.info(`Sandbox world created: ${id} (${name})`);
  res.status(201).json(world);
});

/**
 * Get world
 * GET /api/worlds/:id
 */
app.get('/api/worlds/:id', (req, res) => {
  const world = worlds.get(req.params.id);
  if (!world) return res.status(404).json({ error: 'world not found' });
  res.json(world);
});

/**
 * List worlds
 * GET /api/worlds
 */
app.get('/api/worlds', (req, res) => {
  const { type } = req.query;
  let items = [...worlds.values()];

  if (type) items = items.filter(w => w.type === type);

  res.json({ count: items.length, worlds: items });
});

/**
 * Add entity to world
 * POST /api/worlds/:id/entities
 */
app.post('/api/worlds/:id/entities', requireAuth, (req, res) => {
  const world = worlds.get(req.params.id);
  if (!world) return res.status(404).json({ error: 'world not found' });

  const { type, name, properties = {} } = req.body || {};

  const entity = {
    id: `entity-${randomUUID().slice(0, 8)}`,
    type,
    name: name || type,
    properties,
    state: {},
    createdAt: new Date().toISOString()
  };

  world.entities.push(entity);
  syntheticEntities.set(entity.id, entity);

  res.status(201).json(entity);
});

// ── Synthetic Entities ─────────────────────────────────────

/**
 * Create synthetic entity
 * POST /api/synthetic
 */
app.post('/api/synthetic', requireAuth, (req, res) => {
  const {
    type,
    name,
    personality = {},
    behavior = {},
    goals = [],
    preferences = {}
  } = req.body || {};

  if (!type) return res.status(400).json({ error: 'type is required' });

  const id = `synthetic-${randomUUID().slice(0, 8)}`;

  const entity = {
    id,
    type,
    name: name || `${type}_${id.slice(-4)}`,
    personality,
    behavior,
    goals,
    preferences,
    memory: [],
    relationships: [],
    state: 'active',
    createdAt: new Date().toISOString()
  };

  syntheticEntities.set(id, entity);
  logger.info(`Synthetic entity created: ${id} (${type})`);
  res.status(201).json(entity);
});

/**
 * List synthetic entities
 * GET /api/synthetic
 */
app.get('/api/synthetic', (req, res) => {
  const { type } = req.query;
  let items = [...syntheticEntities.values()];

  if (type) items = items.filter(e => e.type === type);

  res.json({ count: items.length, entities: items });
});

/**
 * Interact with synthetic entity
 * POST /api/synthetic/:id/interact
 */
app.post('/api/synthetic/:id/interact', requireAuth, (req, res) => {
  const entity = syntheticEntities.get(req.params.id);
  if (!entity) return res.status(404).json({ error: 'entity not found' });

  const { action, message, context = {} } = req.body || {};

  // Simulate entity response based on personality and behavior
  const response = simulateEntityResponse(entity, action, message, context);

  // Update entity memory
  entity.memory.push({
    type: action,
    content: message,
    response,
    timestamp: new Date().toISOString()
  });

  res.json({ entity: entity.id, action, response });
});

// ── Simulation Execution ────────────────────────────────────

/**
 * Run simulation
 * POST /api/simulations
 */
app.post('/api/simulations', requireAuth, async (req, res) => {
  const {
    scenarioId,
    agentId,
    worldId,
    mode = 'sandbox',
    maxDuration = 300000, // 5 min default
    config = {}
  } = req.body || {};

  if (!scenarioId && !agentId) {
    return res.status(400).json({ error: 'scenarioId or agentId is required' });
  }

  const id = `sim-${randomUUID().slice(0, 8)}`;
  const scenario = scenarioId ? scenarios.get(scenarioId) : null;
  const world = worldId ? worlds.get(worldId) : null;

  const simulation = {
    id,
    scenarioId,
    scenarioName: scenario?.name,
    agentId,
    worldId,
    worldName: world?.name,
    mode,
    state: STATES.INITIALIZING,
    config: {
      maxDuration,
      timeScale: config.timeScale || 1,
      checkpointInterval: config.checkpointInterval || 60000,
      ...config
    },
    progress: 0,
    events: [],
    metrics: {},
    results: null,
    startTime: null,
    endTime: null,
    createdAt: new Date().toISOString()
  };

  simulations.set(id, simulation);

  // Start simulation asynchronously
  runSimulation(simulation, scenario, world);

  logger.info(`Simulation started: ${id}`);
  res.status(201).json({ simulationId: id, state: STATES.INITIALIZING });
});

/**
 * Get simulation
 * GET /api/simulations/:id
 */
app.get('/api/simulations/:id', (req, res) => {
  const simulation = simulations.get(req.params.id);
  if (!simulation) return res.status(404).json({ error: 'simulation not found' });
  res.json(simulation);
});

/**
 * List simulations
 * GET /api/simulations
 */
app.get('/api/simulations', (req, res) => {
  const { state, agentId, limit = 50 } = req.query;
  let items = [...simulations.values()];

  if (state) items = items.filter(s => s.state === state);
  if (agentId) items = items.filter(s => s.agentId === agentId);

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  items = items.slice(0, Number(limit));

  res.json({ count: items.length, simulations: items });
});

/**
 * Pause simulation
 * POST /api/simulations/:id/pause
 */
app.post('/api/simulations/:id/pause', requireAuth, (req, res) => {
  const simulation = simulations.get(req.params.id);
  if (!simulation) return res.status(404).json({ error: 'simulation not found' });

  if (simulation.state !== STATES.RUNNING) {
    return res.status(400).json({ error: 'Can only pause running simulations' });
  }

  simulation.state = STATES.PAUSED;
  res.json(simulation);
});

/**
 * Resume simulation
 * POST /api/simulations/:id/resume
 */
app.post('/api/simulations/:id/resume', requireAuth, (req, res) => {
  const simulation = simulations.get(req.params.id);
  if (!simulation) return res.status(404).json({ error: 'simulation not found' });

  if (simulation.state !== STATES.PAUSED) {
    return res.status(400).json({ error: 'Can only resume paused simulations' });
  }

  simulation.state = STATES.RUNNING;
  res.json(simulation);
});

/**
 * Cancel simulation
 * POST /api/simulations/:id/cancel
 */
app.post('/api/simulations/:id/cancel', requireAuth, (req, res) => {
  const simulation = simulations.get(req.params.id);
  if (!simulation) return res.status(404).json({ error: 'simulation not found' });

  simulation.state = STATES.CANCELLED;
  simulation.endTime = new Date().toISOString();

  res.json(simulation);
});

/**
 * Get simulation results
 * GET /api/simulations/:id/results
 */
app.get('/api/simulations/:id/results', (req, res) => {
  const simulation = simulations.get(req.params.id);
  if (!simulation) return res.status(404).json({ error: 'simulation not found' });

  if (!simulation.results) {
    return res.status(404).json({ error: 'Simulation not completed yet' });
  }

  res.json({
    simulationId: id,
    state: simulation.state,
    duration: simulation.endTime
      ? new Date(simulation.endTime) - new Date(simulation.startTime)
      : null,
    results: simulation.results
  });
});

// ── Simulation Engine ──────────────────────────────────────

async function runSimulation(simulation, scenario, world) {
  simulation.state = STATES.RUNNING;
  simulation.startTime = new Date().toISOString();
  simulation.events.push({
    type: 'started',
    timestamp: simulation.startTime
  });

  const startTime = Date.now();
  const { maxDuration, timeScale } = simulation.config;

  try {
    // Simulate steps
    const steps = Math.floor((maxDuration / 1000) * timeScale);
    const stepDuration = maxDuration / steps;

    for (let i = 0; i < steps; i++) {
      // Check if cancelled
      if (simulation.state === STATES.CANCELLED) {
        return;
      }

      // Wait between steps
      await sleep(Math.min(stepDuration, 5000));

      // Check if paused
      while (simulation.state === STATES.PAUSED) {
        await sleep(1000);
      }

      // Execute simulation step
      const stepResult = await executeStep(simulation, scenario, world, i, steps);

      // Record metrics
      simulation.metrics[`step_${i}`] = stepResult;

      // Update progress
      simulation.progress = Math.round(((i + 1) / steps) * 100);

      // Check objectives
      if (scenario?.objectives) {
        for (const objective of scenario.objectives) {
          if (evaluateObjective(objective, simulation)) {
            simulation.events.push({
              type: 'objective_completed',
              objective: objective.name,
              timestamp: new Date().toISOString()
            });
          }
        }
      }

      // Check time limit
      if (Date.now() - startTime >= maxDuration) {
        break;
      }
    }

    // Evaluate results
    const results = evaluateSimulation(simulation, scenario, world);

    simulation.results = results;
    simulation.state = results.passed ? STATES.COMPLETED : STATES.FAILED;
    simulation.progress = 100;

    // Update scenario stats
    if (scenario) {
      scenario.stats.runs++;
      if (results.passed) scenario.stats.successes++;
      scenario.stats.avgScore = calculateRunningAverage(
        scenario.stats.avgScore,
        scenario.stats.runs,
        results.score
      );
    }

    simulation.events.push({
      type: simulation.state,
      timestamp: new Date().toISOString()
    });

    logger.info(`Simulation ${simulation.id} ${simulation.state} with score ${results.score}`);

  } catch (err) {
    simulation.state = STATES.FAILED;
    simulation.error = err.message;
    logger.error(`Simulation ${simulation.id} failed:`, err);
  }

  simulation.endTime = new Date().toISOString();
}

async function executeStep(simulation, scenario, world, stepIndex, totalSteps) {
  // Simulate step execution
  // In production, this would call the actual agent with simulated inputs

  const step = {
    index: stepIndex,
    timestamp: new Date().toISOString(),
    worldState: world?.state || {},
    actions: [],
    decisions: [],
    outcomes: []
  };

  // Simulate agent actions based on scenario
  if (scenario?.objectives) {
    for (const objective of scenario.objectives) {
      if (Math.random() < 0.3) { // Simulate occasional action
        step.actions.push({
          objective: objective.name,
          action: `Simulated action for ${objective.name}`,
          success: Math.random() > 0.2
        });
      }
    }
  }

  // Add some randomness
  if (Math.random() < 0.1) {
    step.events = ['Random event triggered'];
  }

  return step;
}

function evaluateObjective(objective, simulation) {
  // Simple evaluation based on objective type
  const threshold = objective.threshold || 0.8;
  return Math.random() > (1 - threshold);
}

function evaluateSimulation(simulation, scenario, world) {
  let score = 0;
  let passedObjectives = 0;
  let totalObjectives = scenario?.objectives?.length || 0;

  // Calculate score based on metrics
  const metrics = Object.values(simulation.metrics);
  if (metrics.length > 0) {
    const avgActions = metrics.reduce((sum, m) => sum + (m.actions?.length || 0), 0) / metrics.length;
    score += Math.min(40, avgActions * 5); // Up to 40 points for actions
  }

  // Score based on objectives met
  if (totalObjectives > 0) {
    const objectivesMet = simulation.events.filter(e => e.type === 'objective_completed').length;
    passedObjectives = objectivesMet;
    score += (objectivesMet / totalObjectives) * 40; // Up to 40 points
  }

  // Bonus for staying within constraints
  const constraintViolations = simulation.events.filter(e => e.type === 'constraint_violation').length;
  if (constraintViolations === 0) {
    score += 20; // 20 bonus points
  }

  score = Math.min(100, Math.round(score));

  const passed = score >= 70;

  return {
    score,
    passed,
    passedObjectives,
    totalObjectives,
    constraintViolations,
    totalSteps: Object.keys(simulation.metrics).length,
    duration: simulation.endTime
      ? new Date(simulation.endTime) - new Date(simulation.startTime)
      : Date.now() - new Date(simulation.startTime).getTime(),
    summary: passed
      ? 'Simulation passed successfully'
      : 'Simulation did not meet passing criteria'
  };
}

function simulateEntityResponse(entity, action, message, context) {
  // Simulate realistic responses based on entity personality
  const { personality = {}, behavior = {} } = entity;

  const responses = [
    'Understood. Let me process this request.',
    'I acknowledge your message.',
    'Based on my analysis, here is my response.',
    'Interesting perspective. Let me consider this further.',
    'I appreciate the information. How should we proceed?'
  ];

  return {
    text: responses[Math.floor(Math.random() * responses.length)],
    sentiment: personality.sentiment || 'neutral',
    confidence: 0.7 + Math.random() * 0.3,
    action: behavior.defaultAction || 'acknowledge'
  };
}

function calculateRunningAverage(currentAvg, currentCount, newValue) {
  return ((currentAvg * currentCount) + newValue) / (currentCount + 1);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Pre-built Scenarios ──────────────────────────────────

/**
 * Create pre-built scenario
 * POST /api/scenarios/templates
 */
app.post('/api/scenarios/templates', requireAuth, (req, res) => {
  const { template } = req.body || {};

  const templates = {
    sales_cold_call: {
      name: 'Sales Cold Call',
      type: TYPES.SINGLE_AGENT,
      description: 'Practice handling objections in a cold call',
      objectives: [
        { name: 'Handle objection', threshold: 0.8 },
        { name: 'Close sale', threshold: 0.5 }
      ],
      metrics: ['Objection handling rate', 'Conversation length'],
      successCriteria: [{ metric: 'Objection handling rate', operator: '>=', value: 80 }]
    },
    customer_complaint: {
      name: 'Customer Complaint Resolution',
      type: TYPES.SINGLE_AGENT,
      description: 'Handle angry customer scenario',
      objectives: [
        { name: 'De-escalate', threshold: 0.9 },
        { name: 'Resolve issue', threshold: 0.7 }
      ],
      metrics: ['CSAT score', 'Resolution time'],
      successCriteria: [{ metric: 'CSAT score', operator: '>=', value: 4.5 }]
    },
    negotiation: {
      name: 'Contract Negotiation',
      type: TYPES.MULTI_AGENT,
      description: 'Negotiate contract terms with counterparty',
      objectives: [
        { name: 'Reach agreement', threshold: 0.8 },
        { name: 'Maintain margin', threshold: 0.6 }
      ],
      metrics: ['Final price', 'Terms favorability'],
      successCriteria: [{ metric: 'Final price', operator: '>=', value: 90 }]
    }
  };

  if (!templates[template]) {
    return res.status(404).json({ error: 'Template not found' });
  }

  const templateData = templates[template];
  const id = `scenario-${randomUUID().slice(0, 8)}`;

  const scenario = {
    id,
    ...templateData,
    fromTemplate: template,
    createdAt: new Date().toISOString()
  };

  scenarios.set(id, scenario);
  res.status(201).json(scenario);
});

/**
 * List scenario templates
 * GET /api/scenarios/templates
 */
app.get('/api/scenarios/templates', (_req, res) => {
  res.json({
    templates: [
      { id: 'sales_cold_call', name: 'Sales Cold Call', type: TYPES.SINGLE_AGENT },
      { id: 'customer_complaint', name: 'Customer Complaint Resolution', type: TYPES.SINGLE_AGENT },
      { id: 'negotiation', name: 'Contract Negotiation', type: TYPES.MULTI_AGENT }
    ]
  });
});

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS SimulationOS listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
