/**
 * Workflow Twins - Digital twin platform for workflow instances
 * Provides real-time state, performance metrics, and historical tracking
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
const PORT = process.env.PORT || 5378;

app.use(cors());
app.use(express.json());

// Twin States
const TWIN_STATES = {
  INITIALIZED: 'initialized',
  RUNNING: 'running',
  WAITING: 'waiting',
  PAUSED: 'paused',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
};

// In-memory storage
const twins = new Map(); // twinId -> twin data
const history = new Map(); // twinId -> execution history
const metrics = new Map(); // twinId -> performance metrics

// Create twin
function createTwin(data) {
  const twinId = crypto.randomUUID();
  const now = Date.now();

  const twin = {
    id: twinId,
    workflowId: data.workflowId,
    instanceId: data.instanceId,
    definition: data.definition || {},
    state: TWIN_STATES.INITIALIZED,
    currentStep: data.currentStep || null,
    stepStates: data.stepStates || {},
    variables: data.variables || {},
    metadata: data.metadata || {},
    createdAt: now,
    updatedAt: now,
    startedAt: null,
    completedAt: null,
    version: 1,
  };

  twins.set(twinId, twin);

  // Initialize metrics
  metrics.set(twinId, {
    twinId,
    executionTime: 0,
    stepCount: 0,
    errorCount: 0,
    retryCount: 0,
    avgStepDuration: 0,
    lastActivity: now,
    steps: [],
  });

  return twin;
}

// Get twin
function getTwin(twinId) {
  return twins.get(twinId) || null;
}

// Update twin state
function updateTwinState(twinId, newState, stepData = {}) {
  const twin = twins.get(twinId);
  if (!twin) {
    throw new Error('Twin not found');
  }

  const now = Date.now();
  twin.state = newState;
  twin.currentStep = stepData.currentStep || twin.currentStep;
  twin.stepStates = { ...twin.stepStates, ...stepData.stepStates };
  twin.variables = { ...twin.variables, ...stepData.variables };
  twin.updatedAt = now;
  twin.version++;

  if (newState === TWIN_STATES.RUNNING && !twin.startedAt) {
    twin.startedAt = now;
  }

  if ([TWIN_STATES.COMPLETED, TWIN_STATES.FAILED, TWIN_STATES.CANCELLED].includes(newState)) {
    twin.completedAt = now;
  }

  twins.set(twinId, twin);

  // Update metrics
  const m = metrics.get(twinId);
  if (m) {
    m.lastActivity = now;
    if (twin.startedAt) {
      m.executionTime = now - twin.startedAt;
    }
  }

  // Record history
  recordHistory(twinId, 'state_change', { newState, stepData });

  return twin;
}

// Record step execution
function recordStepExecution(twinId, stepId, execution) {
  const twin = twins.get(twinId);
  if (!twin) {
    throw new Error('Twin not found');
  }

  twin.stepStates[stepId] = execution;
  twin.currentStep = stepId;
  twin.updatedAt = Date.now();
  twin.version++;

  twins.set(twinId, twin);

  // Update metrics
  const m = metrics.get(twinId);
  if (m) {
    m.stepCount++;
    m.steps.push({
      stepId,
      ...execution,
      timestamp: Date.now(),
    });

    if (execution.duration) {
      const totalDuration = m.avgStepDuration * (m.stepCount - 1);
      m.avgStepDuration = (totalDuration + execution.duration) / m.stepCount;
    }

    if (execution.error) {
      m.errorCount++;
    }

    m.lastActivity = Date.now();
  }

  recordHistory(twinId, 'step_execution', { stepId, execution });
  return twin;
}

// Record history event
function recordHistory(twinId, eventType, data) {
  if (!history.has(twinId)) {
    history.set(twinId, []);
  }

  history.get(twinId).push({
    eventType,
    data,
    timestamp: Date.now(),
  });
}

// Get twin history
function getTwinHistory(twinId, options = {}) {
  const events = history.get(twinId) || [];

  if (options.eventType) {
    return events.filter(e => e.eventType === options.eventType);
  }

  if (options.since) {
    return events.filter(e => e.timestamp >= options.since);
  }

  return events;
}

// Get twin metrics
function getTwinMetrics(twinId) {
  return metrics.get(twinId) || null;
}

// Get all twins
function getAllTwins(filters = {}) {
  let result = Array.from(twins.values());

  if (filters.workflowId) {
    result = result.filter(t => t.workflowId === filters.workflowId);
  }

  if (filters.state) {
    result = result.filter(t => t.state === filters.state);
  }

  if (filters.instanceId) {
    result = result.filter(t => t.instanceId === filters.instanceId);
  }

  return result;
}

// Delete twin
function deleteTwin(twinId) {
  twins.delete(twinId);
  history.delete(twinId);
  metrics.delete(twinId);
  return true;
}

// Get summary statistics
function getStats() {
  const allTwins = Array.from(twins.values());

  const stateCounts = {};
  for (const twin of allTwins) {
    stateCounts[twin.state] = (stateCounts[twin.state] || 0) + 1;
  }

  let totalExecutionTime = 0;
  let completedCount = 0;

  for (const twin of allTwins) {
    if (twin.completedAt && twin.startedAt) {
      totalExecutionTime += twin.completedAt - twin.startedAt;
      completedCount++;
    }
  }

  return {
    totalTwins: allTwins.length,
    byState: stateCounts,
    avgExecutionTime: completedCount > 0 ? Math.round(totalExecutionTime / completedCount) : 0,
    completedCount,
    runningCount: stateCounts[TWIN_STATES.RUNNING] || 0,
    failedCount: stateCounts[TWIN_STATES.FAILED] || 0,
  };
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'workflow-twins', port: PORT });
});

app.post('/api/twins', requireInternal, (req, res) => {
  try {
    const twin = createTwin(req.body);
    res.status(201).json(twin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/twins', (req, res) => {
  try {
    const filters = {
      workflowId: req.query.workflowId,
      state: req.query.state,
      instanceId: req.query.instanceId,
    };
    const twins = getAllTwins(filters);
    res.json(twins);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/twins/:id', (req, res) => {
  try {
    const twin = getTwin(req.params.id);
    if (!twin) {
      return res.status(404).json({ error: 'Twin not found' });
    }
    res.json(twin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.patch('/api/twins/:id/state', requireInternal, (req, res) => {
  try {
    const { newState, ...stepData } = req.body;
    const twin = updateTwinState(req.params.id, newState, stepData);
    res.json(twin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/twins/:id/steps', requireInternal, (req, res) => {
  try {
    const { stepId, ...execution } = req.body;
    const twin = recordStepExecution(req.params.id, stepId, execution);
    res.json(twin);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/twins/:id/history', (req, res) => {
  try {
    const options = {
      eventType: req.query.eventType,
      since: req.query.since ? parseInt(req.query.since) : undefined,
    };
    const events = getTwinHistory(req.params.id, options);
    res.json(events);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/twins/:id/metrics', (req, res) => {
  try {
    const metrics = getTwinMetrics(req.params.id);
    if (!metrics) {
      return res.status(404).json({ error: 'Metrics not found' });
    }
    res.json(metrics);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/twins/:id', requireInternal, (req, res) => {
  try {
    deleteTwin(req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    res.json(getStats());
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/states', (req, res) => {
  res.json(TWIN_STATES);
});

// Start server
app.listen(PORT, () => {
  console.log(`Workflow Twins service running on port ${PORT}`);
});

export { app, createTwin, getTwin, updateTwinState, recordStepExecution, getTwinHistory, getTwinMetrics, getAllTwins, deleteTwin, getStats, TWIN_STATES };