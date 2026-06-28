/**
 * FlowOS Agent Graph Engine
 *
 * Extends state machine with graph-based workflow execution:
 * - YAML-based graph definitions
 * - State machines with typed states
 * - Conditional branching
 * - Time travel (replay any execution)
 * - Checkpoint integration
 * - Visual debugging support
 *
 * Port: 5373
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 5373;

app.use(cors());
app.use(express.json());

// ── Storage ─────────────────────────────────────────────────────────
const storage = {
  graphs: new Map(),        // Graph definitions
  executions: new Map(),    // Execution instances
  checkpoints: new Map(),   // State snapshots
  history: new Map(),        // Replay history
};

// Graph state machine states (extended from agent-os)
const GRAPH_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  WAITING: 'waiting',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  PAUSED: 'paused'
};

// ── Health ──────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'agent-graph-engine',
    version: '1.0.0',
    port: PORT,
    graphs: storage.graphs.size,
    executions: storage.executions.size,
    timestamp: new Date().toISOString()
  });
});

// ── Graph Management ────────────────────────────────────────────────

/**
 * Create or update a graph
 * POST /api/graphs
 */
app.post('/api/graphs', (req, res) => {
  try {
    const { id, name, description, initial_state, states, transitions } = req.body || {};

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const graphId = id || `graph_${crypto.randomUUID()}`;

    const graph = {
      id: graphId,
      name,
      description: description || null,
      initial_state: initial_state || 'start',
      states: states || {},
      transitions: transitions || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Validate graph structure
    if (!graph.states[graph.initial_state]) {
      return res.status(400).json({
        error: `Initial state '${graph.initial_state}' not found in states`
      });
    }

    storage.graphs.set(graphId, graph);

    res.status(201).json(graph);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get graph by ID
 * GET /api/graphs/:id
 */
app.get('/api/graphs/:id', (req, res) => {
  const { id } = req.params;
  const graph = storage.graphs.get(id);

  if (!graph) {
    return res.status(404).json({ error: 'Graph not found' });
  }

  res.json(graph);
});

/**
 * List all graphs
 * GET /api/graphs
 */
app.get('/api/graphs', (req, res) => {
  const graphs = Array.from(storage.graphs.values());
  res.json({
    count: graphs.length,
    graphs
  });
});

/**
 * Delete graph
 * DELETE /api/graphs/:id
 */
app.delete('/api/graphs/:id', (req, res) => {
  const { id } = req.params;

  if (!storage.graphs.has(id)) {
    return res.status(404).json({ error: 'Graph not found' });
  }

  storage.graphs.delete(id);
  res.json({ success: true, id });
});

// ── Graph Compilation (YAML → Execution Graph) ───────────────────────

/**
 * Compile YAML-like definition to execution graph
 * POST /api/graphs/compile
 */
app.post('/api/graphs/compile', (req, res) => {
  try {
    const { definition } = req.body || {};

    if (!definition) {
      return res.status(400).json({ error: 'definition is required' });
    }

    const compiled = compileDefinition(definition);

    res.json({
      success: true,
      graph: compiled
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

function compileDefinition(definition) {
  const states = {};
  const transitions = [];

  // Process states
  for (const [name, config] of Object.entries(definition.states || {})) {
    states[name] = {
      name,
      type: config.type || 'task',
      on_enter: config.on_enter || null,
      on_exit: config.on_exit || null,
      condition: config.condition || null,
      approvers: config.approvers || null,
      branches: config.branches || null,
      next: config.next || null,
      metadata: config.metadata || {}
    };
  }

  // Process transitions from on_event and condition
  for (const [name, config] of Object.entries(definition.states || {})) {
    if (config.on_event) {
      for (const [event, target] of Object.entries(config.on_event)) {
        transitions.push({
          from: name,
          event,
          to: target
        });
      }
    }

    if (config.condition) {
      transitions.push({
        from: name,
        type: 'conditional',
        condition: config.condition,
        targets: Object.entries(config.condition).map(([key, value]) => ({
          condition: key === 'default' ? null : key,
          target: value
        }))
      });
    }
  }

  return {
    id: `compiled_${Date.now()}`,
    name: definition.graph || 'Compiled Graph',
    initial_state: definition.initial_state || 'start',
    states,
    transitions,
    compiledAt: new Date().toISOString()
  };
}

// ── Execution ──────────────────────────────────────────────────────

/**
 * Start execution of a graph
 * POST /api/executions
 */
app.post('/api/executions', (req, res) => {
  try {
    const { graphId, context = {}, startState } = req.body || {};

    if (!graphId) {
      return res.status(400).json({ error: 'graphId is required' });
    }

    const graph = storage.graphs.get(graphId);
    if (!graph) {
      return res.status(404).json({ error: 'Graph not found' });
    }

    const executionId = `exec_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const execution = {
      id: executionId,
      graphId,
      current_state: startState || graph.initial_state,
      context,
      state_data: {},
      status: GRAPH_STATES.RUNNING,
      startedAt: now,
      updatedAt: now,
      completedAt: null,
      checkpoint_id: null,
      steps: [
        {
          step: 0,
          state: startState || graph.initial_state,
          event: 'start',
          timestamp: now
        }
      ],
      history: []
    };

    storage.executions.set(executionId, execution);

    // Create initial checkpoint
    const checkpointId = createCheckpoint(executionId, execution);
    execution.checkpoint_id = checkpointId;

    res.status(201).json(execution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get execution
 * GET /api/executions/:id
 */
app.get('/api/executions/:id', (req, res) => {
  const { id } = req.params;
  const execution = storage.executions.get(id);

  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  res.json(execution);
});

/**
 * Advance execution to next state
 * POST /api/executions/:id/advance
 */
app.post('/api/executions/:id/advance', (req, res) => {
  try {
    const { id } = req.params;
    const { event, condition_result, context_updates } = req.body || {};

    const execution = storage.executions.get(id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    if (execution.status !== GRAPH_STATES.RUNNING &&
        execution.status !== GRAPH_STATES.WAITING) {
      return res.status(400).json({
        error: `Cannot advance execution in '${execution.status}' state`
      });
    }

    const graph = storage.graphs.get(execution.graphId);
    const currentStateConfig = graph.states[execution.current_state];

    // Find next state
    let nextState = null;
    let transitionType = null;

    // Check event-based transitions
    if (event && currentStateConfig.on_event && currentStateConfig.on_event[event]) {
      nextState = currentStateConfig.on_event[event];
      transitionType = 'event';
    }
    // Check condition-based transitions
    else if (condition_result !== undefined && currentStateConfig.condition) {
      const cond = currentStateConfig.condition;
      if (condition_result === true && cond.true) {
        nextState = cond.true;
        transitionType = 'condition-true';
      } else if (condition_result === false && cond.false) {
        nextState = cond.false;
        transitionType = 'condition-false';
      } else if (cond.default) {
        nextState = cond.default;
        transitionType = 'condition-default';
      }
    }
    // Check default next
    else if (currentStateConfig.next) {
      nextState = currentStateConfig.next;
      transitionType = 'default';
    }

    if (!nextState) {
      // Check if current state is terminal
      const nextStateConfig = graph.states[execution.current_state];
      if (nextStateConfig.type === 'final') {
        execution.status = GRAPH_STATES.COMPLETED;
        execution.completedAt = new Date().toISOString();
        execution.updatedAt = execution.completedAt;
        storage.executions.set(id, execution);
        return res.json(execution);
      }

      return res.status(400).json({
        error: 'No valid transition found',
        current_state: execution.current_state,
        event,
        condition_result
      });
    }

    // Execute state hooks
    const stateData = executeStateHooks(graph.states[nextState], execution.context);

    // Update execution
    execution.steps.push({
      step: execution.steps.length,
      from: execution.current_state,
      to: nextState,
      event,
      transitionType,
      timestamp: new Date().toISOString()
    });

    execution.current_state = nextState;
    execution.context = { ...execution.context, ...context_updates };
    execution.state_data = { ...execution.state_data, ...stateData };
    execution.updatedAt = new Date().toISOString();

    // Create checkpoint
    const checkpointId = createCheckpoint(id, execution);
    execution.checkpoint_id = checkpointId;

    storage.executions.set(id, execution);

    res.json(execution);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Pause execution
 * POST /api/executions/:id/pause
 */
app.post('/api/executions/:id/pause', (req, res) => {
  const { id } = req.params;
  const execution = storage.executions.get(id);

  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  execution.status = GRAPH_STATES.PAUSED;
  execution.updatedAt = new Date().toISOString();

  storage.executions.set(id, execution);
  res.json(execution);
});

/**
 * Resume execution
 * POST /api/executions/:id/resume
 */
app.post('/api/executions/:id/resume', (req, res) => {
  const { id } = req.params;
  const execution = storage.executions.get(id);

  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  if (execution.status !== GRAPH_STATES.PAUSED) {
    return res.status(400).json({ error: 'Execution is not paused' });
  }

  execution.status = GRAPH_STATES.RUNNING;
  execution.updatedAt = new Date().toISOString();

  storage.executions.set(id, execution);
  res.json(execution);
});

/**
 * Cancel execution
 * POST /api/executions/:id/cancel
 */
app.post('/api/executions/:id/cancel', (req, res) => {
  const { id } = req.params;
  const execution = storage.executions.get(id);

  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  execution.status = GRAPH_STATES.CANCELLED;
  execution.completedAt = new Date().toISOString();
  execution.updatedAt = execution.completedAt;

  storage.executions.set(id, execution);
  res.json(execution);
});

// ── Time Travel (Replay) ────────────────────────────────────────────

/**
 * Replay execution from checkpoint
 * POST /api/executions/:id/replay
 */
app.post('/api/executions/:id/replay', (req, res) => {
  try {
    const { id } = req.params;
    const { fromCheckpoint, fromStep } = req.body || {};

    const execution = storage.executions.get(id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    // Get checkpoint or step
    let replayPoint;
    if (fromCheckpoint) {
      replayPoint = storage.checkpoints.get(fromCheckpoint);
    } else if (fromStep !== undefined) {
      replayPoint = {
        execution_id: id,
        state: execution.steps[fromStep]?.state || execution.current_state,
        context: execution.context,
        state_data: execution.state_data,
        step: fromStep
      };
    } else {
      return res.status(400).json({ error: 'fromCheckpoint or fromStep is required' });
    }

    // Create new execution from replay point
    const newExecutionId = `exec_${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    const newExecution = {
      id: newExecutionId,
      graphId: execution.graphId,
      current_state: replayPoint.state,
      context: replayPoint.context,
      state_data: replayPoint.state_data || {},
      status: GRAPH_STATES.RUNNING,
      startedAt: now,
      updatedAt: now,
      completedAt: null,
      replayed_from: {
        execution_id: id,
        checkpoint_id: fromCheckpoint || null,
        step: fromStep
      },
      steps: execution.steps.slice(0, (fromStep || 0) + 1).map((s, i) => ({
        ...s,
        replayed: true,
        replay_step: i
      })),
      history: []
    };

    storage.executions.set(newExecutionId, newExecution);

    res.status(201).json({
      original_execution: id,
      new_execution: newExecution,
      replay_from: fromStep !== undefined ? `step ${fromStep}` : `checkpoint ${fromCheckpoint}`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get execution history for debugging
 * GET /api/executions/:id/history
 */
app.get('/api/executions/:id/history', (req, res) => {
  const { id } = req.params;
  const execution = storage.executions.get(id);

  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  res.json({
    execution_id: id,
    current_state: execution.current_state,
    status: execution.status,
    steps: execution.steps,
    checkpoints: Array.from(storage.checkpoints.values())
      .filter(c => c.execution_id === id)
      .map(c => ({
        id: c.id,
        step: c.step,
        state: c.state,
        createdAt: c.createdAt
      }))
  });
});

// ── Checkpoints ─────────────────────────────────────────────────────

function createCheckpoint(executionId, execution) {
  const checkpointId = `cp_${crypto.randomUUID()}`;

  const checkpoint = {
    id: checkpointId,
    execution_id: executionId,
    state: execution.current_state,
    context: { ...execution.context },
    state_data: { ...execution.state_data },
    step: execution.steps.length - 1,
    checksum: generateChecksum(execution),
    createdAt: new Date().toISOString()
  };

  storage.checkpoints.set(checkpointId, checkpoint);

  // Limit checkpoints per execution
  const execCheckpoints = Array.from(storage.checkpoints.values())
    .filter(c => c.execution_id === executionId)
    .sort((a, b) => b.step - a.step);

  if (execCheckpoints.length > 100) {
    const toDelete = execCheckpoints.slice(100);
    toDelete.forEach(c => storage.checkpoints.delete(c.id));
  }

  return checkpointId;
}

function generateChecksum(execution) {
  const data = JSON.stringify({
    state: execution.current_state,
    context: execution.context,
    state_data: execution.state_data
  });
  return crypto.createHash('sha256').update(data).digest('hex').slice(0, 16);
}

/**
 * Get checkpoint
 * GET /api/checkpoints/:id
 */
app.get('/api/checkpoints/:id', (req, res) => {
  const { id } = req.params;
  const checkpoint = storage.checkpoints.get(id);

  if (!checkpoint) {
    return res.status(404).json({ error: 'Checkpoint not found' });
  }

  res.json(checkpoint);
});

/**
 * List checkpoints for execution
 * GET /api/executions/:id/checkpoints
 */
app.get('/api/executions/:id/checkpoints', (req, res) => {
  const { id } = req.params;

  const checkpoints = Array.from(storage.checkpoints.values())
    .filter(c => c.execution_id === id)
    .sort((a, b) => b.step - a.step);

  res.json({
    execution_id: id,
    count: checkpoints.length,
    checkpoints
  });
});

// ── State Hooks ────────────────────────────────────────────────────

function executeStateHooks(stateConfig, context) {
  const result = {};

  // Execute on_enter
  if (stateConfig.on_enter) {
    result.on_enter_result = executeHook(stateConfig.on_enter, context);
  }

  return result;
}

function executeHook(hook, context) {
  // Hook can be a function reference or inline code
  if (typeof hook === 'function') {
    return hook(context);
  }

  // Simple hook execution (would use VM in production)
  return { executed: true, hook, context };
}

// ── Debug Support ───────────────────────────────────────────────────

/**
 * Get execution tree for visualization
 * GET /api/executions/:id/tree
 */
app.get('/api/executions/:id/tree', (req, res) => {
  const { id } = req.params;
  const execution = storage.executions.get(id);

  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  const graph = storage.graphs.get(execution.graphId);

  const tree = {
    id: execution.id,
    state: execution.current_state,
    status: execution.status,
    children: buildStateTree(execution.steps, graph)
  };

  res.json(tree);
});

function buildStateTree(steps, graph) {
  return steps.map((step, index) => {
    const stateConfig = graph?.states[step.state];
    return {
      id: `${step.state}_${index}`,
      state: step.state,
      type: stateConfig?.type || 'task',
      step: index,
      transition: step.transitionType || null,
      children: []
    };
  });
}

// ── Startup ────────────────────────────────────────────────────────

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`[agent-graph-engine] listening on :${PORT}`);
});

process.on('SIGTERM', () => {
  console.log('[agent-graph-engine] Shutting down...');
  server.close();
});

export { app };
