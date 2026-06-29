/**
 * LoopOS Worktrees (Parallel Execution)
 * Fan-out/fan-in task patterns for parallel agent execution
 * Port: 4744
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4744;
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

// Execution patterns
const PATTERNS = {
  PARALLEL: 'parallel',       // All tasks at once
  SEQUENTIAL: 'sequential',   // One by one
  PIPELINE: 'pipeline',       // Output of one feeds next
  FAN_OUT: 'fan_out',        // One spawns many
  FAN_IN: 'fan_in',           // Many merge to one
  MAP_REDUCE: 'map_reduce'   // Map then reduce
};

// Worktree states
const STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// In-memory stores
const worktrees = new Map();
const executions = new Map();

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-worktrees',
  version: '1.0.0',
  port: PORT,
  worktrees: worktrees.size,
  runningExecutions: [...worktrees.values()].filter(w => w.state === STATES.RUNNING).length
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Worktree Definition ─────────────────────────────────

/**
 * Create worktree (define parallel task structure)
 * POST /api/worktrees
 */
app.post('/api/worktrees', requireAuth, (req, res) => {
  const { name, pattern, tasks = [], maxConcurrency = 10, sharedContext = {} } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!tasks.length) return res.status(400).json({ error: 'tasks are required' });

  const id = `wt-${randomUUID().slice(0, 8)}`;

  const worktree = {
    id,
    name,
    pattern: pattern || PATTERNS.PARALLEL,
    tasks: tasks.map((t, i) => ({
      id: `task-${i}`,
      name: t.name || `Task ${i}`,
      action: t.action,
      dependsOn: t.dependsOn || [],
      retry: t.retry || { maxAttempts: 1 },
      timeout: t.timeout || 30000,
      priority: t.priority || 0
    })),
    maxConcurrency,
    sharedContext,
    createdAt: new Date().toISOString(),
    executions: []
  };

  worktrees.set(id, worktree);
  logger.info(`Worktree created: ${id} (${name})`);
  res.status(201).json(worktree);
});

/**
 * Get worktree
 * GET /api/worktrees/:id
 */
app.get('/api/worktrees/:id', (req, res) => {
  const worktree = worktrees.get(req.params.id);
  if (!worktree) return res.status(404).json({ error: 'worktree not found' });
  res.json(worktree);
});

/**
 * List worktrees
 * GET /api/worktrees
 */
app.get('/api/worktrees', (req, res) => {
  const items = [...worktrees.values()].map(w => ({
    id: w.id,
    name: w.name,
    pattern: w.pattern,
    taskCount: w.tasks.length,
    createdAt: w.createdAt
  }));
  res.json({ count: items.length, worktrees: items });
});

/**
 * Delete worktree
 * DELETE /api/worktrees/:id
 */
app.delete('/api/worktrees/:id', requireAuth, (req, res) => {
  if (!worktrees.has(req.params.id)) return res.status(404).json({ error: 'worktree not found' });
  worktrees.delete(req.params.id);
  res.json({ deleted: true });
});

// ── Execute Worktree ────────────────────────────────────

/**
 * Execute worktree
 * POST /api/worktrees/:id/execute
 */
app.post('/api/worktrees/:id/execute', requireAuth, async (req, res) => {
  const worktree = worktrees.get(req.params.id);
  if (!worktree) return res.status(404).json({ error: 'worktree not found' });

  const { context = {}, maxConcurrency } = req.body || {};
  const execId = `exec-${randomUUID().slice(0, 8)}`;

  const execution = {
    id: execId,
    worktreeId: worktree.id,
    worktreeName: worktree.name,
    pattern: worktree.pattern,
    state: STATES.RUNNING,
    context: { ...worktree.sharedContext, ...context },
    maxConcurrency: maxConcurrency || worktree.maxConcurrency,
    taskResults: new Map(),
    taskStates: new Map(),
    startTime: new Date().toISOString(),
    endTime: null,
    error: null
  };

  worktree.executions.push(execId);
  executions.set(execId, execution);

  // Start execution asynchronously
  executeWorktree(execution, worktree);

  res.status(201).json({
    executionId: execId,
    state: STATES.RUNNING,
    message: 'Execution started'
  });
});

/**
 * Get execution status
 * GET /api/executions/:id
 */
app.get('/api/executions/:id', (req, res) => {
  const execution = executions.get(req.params.id);
  if (!execution) return res.status(404).json({ error: 'execution not found' });

  res.json(getExecutionStatus(execution));
});

/**
 * List executions
 * GET /api/executions
 */
app.get('/api/executions', (req, res) => {
  const { state, worktreeId } = req.query;
  let items = [...executions.values()].map(getExecutionStatus);

  if (state) items = items.filter(e => e.state === state);
  if (worktreeId) items = items.filter(e => e.worktreeId === worktreeId);

  items.sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  items = items.slice(0, 100);

  res.json({ count: items.length, executions: items });
});

/**
 * Cancel execution
 * POST /api/executions/:id/cancel
 */
app.post('/api/executions/:id/cancel', requireAuth, (req, res) => {
  const execution = executions.get(req.params.id);
  if (!execution) return res.status(404).json({ error: 'execution not found' });

  execution.state = STATES.CANCELLED;
  execution.endTime = new Date().toISOString();

  res.json(getExecutionStatus(execution));
});

/**
 * Get task results for execution
 * GET /api/executions/:id/tasks
 */
app.get('/api/executions/:id/tasks', (req, res) => {
  const execution = executions.get(req.params.id);
  if (!execution) return res.status(404).json({ error: 'execution not found' });

  const tasks = worktrees.get(execution.worktreeId)?.tasks || [];
  const results = [];

  for (const task of tasks) {
    const state = execution.taskStates.get(task.id);
    const result = execution.taskResults.get(task.id);
    results.push({
      id: task.id,
      name: task.name,
      state: state || STATES.PENDING,
      result,
      dependsOn: task.dependsOn
    });
  }

  res.json({ count: results.length, tasks: results });
});

// ── Fan-out/Fan-in ────────────────────────────────────

/**
 * Simple fan-out (one input, many workers)
 * POST /api/fan-out
 */
app.post('/api/fan-out', requireAuth, async (req, res) => {
  const { items, worker, maxConcurrency = 10 } = req.body || {};

  if (!items || !worker) {
    return res.status(400).json({ error: 'items and worker are required' });
  }

  const execId = `fo-${randomUUID().slice(0, 8)}`;
  const execution = {
    id: execId,
    type: 'fan_out',
    state: STATES.RUNNING,
    totalItems: items.length,
    completedItems: 0,
    failedItems: 0,
    results: [],
    errors: [],
    startTime: new Date().toISOString()
  };

  executions.set(execId, execution);

  // Execute fan-out
  executeFanOut(execution, items, worker, maxConcurrency);

  res.status(201).json({
    executionId: execId,
    totalItems: items.length
  });
});

/**
 * Fan-in (many inputs, aggregate results)
 * POST /api/fan-in
 */
app.post('/api/fan-in', requireAuth, async (req, res) => {
  const { sources, reducer } = req.body || {};

  if (!sources || !reducer) {
    return res.status(400).json({ error: 'sources and reducer are required' });
  }

  const execId = `fi-${randomUUID().slice(0, 8)}`;

  try {
    // Execute all sources in parallel
    const results = await Promise.allSettled(
      sources.map(async (source, i) => {
        const result = await executeSource(source, i);
        return result;
      })
    );

    // Aggregate results
    const aggregated = results
      .filter(r => r.status === 'fulfilled')
      .map(r => r.value);

    const errors = results
      .filter(r => r.status === 'rejected')
      .map(r => r.reason?.message);

    // Apply reducer
    const finalResult = reducer(aggregated);

    res.json({
      executionId: execId,
      state: STATES.COMPLETED,
      aggregatedCount: aggregated.length,
      errorCount: errors.length,
      result: finalResult
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * Map-reduce
 * POST /api/map-reduce
 */
app.post('/api/map-reduce', requireAuth, async (req, res) => {
  const { data, mapper, reducer, maxConcurrency = 10 } = req.body || {};

  if (!data || !mapper || !reducer) {
    return res.status(400).json({ error: 'data, mapper, and reducer are required' });
  }

  const execId = `mr-${randomUUID().slice(0, 8)}`;

  try {
    // Map phase - parallel processing
    const chunks = chunkArray(data, maxConcurrency);
    const mapResults = [];

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(item => executeMapper(mapper, item))
      );
      mapResults.push(...chunkResults.filter(r => r.status === 'fulfilled').map(r => r.value));
    }

    // Reduce phase
    const result = reducer(mapResults);

    res.json({
      executionId: execId,
      state: STATES.COMPLETED,
      itemsProcessed: data.length,
      mappedCount: mapResults.length,
      result
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Pipeline ────────────────────────────────────────────

/**
 * Execute pipeline (sequential with data flow)
 * POST /api/pipeline
 */
app.post('/api/pipeline', requireAuth, async (req, res) => {
  const { stages, initialData } = req.body || {};

  if (!stages || !stages.length) {
    return res.status(400).json({ error: 'stages are required' });
  }

  const execId = `pipe-${randomUUID().slice(0, 8)}`;
  let data = initialData;
  const stageResults = [];

  try {
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const start = Date.now();

      const result = await executeStage(stage, data);

      stageResults.push({
        stage: i,
        name: stage.name || `Stage ${i}`,
        duration: Date.now() - start,
        result
      });

      // Next stage gets this stage's output
      data = result;
    }

    res.json({
      executionId: execId,
      state: STATES.COMPLETED,
      stages: stageResults,
      finalResult: data
    });

  } catch (err) {
    res.status(500).json({
      executionId: execId,
      state: STATES.FAILED,
      stages: stageResults,
      error: err.message
    });
  }
});

// ── Helper Functions ────────────────────────────────────

async function executeWorktree(execution, worktree) {
  const { pattern } = execution;

  try {
    switch (pattern) {
      case PATTERNS.PARALLEL:
        await executeParallel(execution, worktree);
        break;
      case PATTERNS.SEQUENTIAL:
        await executeSequential(execution, worktree);
        break;
      case PATTERNS.PIPELINE:
        await executePipeline(execution, worktree);
        break;
      case PATTERNS.MAP_REDUCE:
        await executeMapReduce(execution, worktree);
        break;
      default:
        await executeParallel(execution, worktree);
    }

    execution.state = STATES.COMPLETED;
  } catch (err) {
    execution.state = STATES.FAILED;
    execution.error = err.message;
  }

  execution.endTime = new Date().toISOString();
  logger.info(`Worktree execution ${execution.id} ${execution.state}`);
}

async function executeParallel(execution, worktree) {
  const pendingTasks = worktree.tasks.filter(t => t.dependsOn.length === 0);
  const runningTasks = [];

  while (pendingTasks.length > 0 || runningTasks.length > 0) {
    // Start new tasks up to maxConcurrency
    while (pendingTasks.length > 0 && runningTasks.length < execution.maxConcurrency) {
      const task = pendingTasks.shift();
      runningTasks.push(task);
      execution.taskStates.set(task.id, STATES.RUNNING);

      executeTask(task, execution, worktree).then(result => {
        execution.taskResults.set(task.id, result);
        execution.taskStates.set(task.id, STATES.COMPLETED);

        // Start tasks that depended on this one
        const ready = worktree.tasks.filter(t =>
          t.dependsOn.includes(task.id) &&
          t.dependsOn.every(dep => execution.taskStates.get(dep) === STATES.COMPLETED)
        );
        pendingTasks.push(...ready);
      }).catch(err => {
        execution.taskResults.set(task.id, { error: err.message });
        execution.taskStates.set(task.id, STATES.FAILED);
      });
    }

    // Wait a bit before checking again
    await sleep(100);
  }
}

async function executeSequential(execution, worktree) {
  for (const task of worktree.tasks) {
    execution.taskStates.set(task.id, STATES.RUNNING);

    // Wait for dependencies
    await waitForDependencies(task, execution);

    const result = await executeTask(task, execution, worktree);
    execution.taskResults.set(task.id, result);
    execution.taskStates.set(task.id, STATES.COMPLETED);
  }
}

async function executePipeline(execution, worktree) {
  let pipelineData = execution.context;

  for (const task of worktree.tasks) {
    execution.taskStates.set(task.id, STATES.RUNNING);

    const result = await executeTask(task, execution, worktree, pipelineData);
    execution.taskResults.set(task.id, result);
    execution.taskStates.set(task.id, STATES.COMPLETED);

    // Output becomes next task's input
    pipelineData = result;
  }
}

async function executeMapReduce(execution, worktree) {
  const mapTask = worktree.tasks.find(t => t.name === 'map');
  const reduceTask = worktree.tasks.find(t => t.name === 'reduce');

  if (!mapTask || !reduceTask) {
    throw new Error('Map-reduce requires "map" and "reduce" tasks');
  }

  // Map phase
  execution.taskStates.set(mapTask.id, STATES.RUNNING);
  const mapResults = await executeTask(mapTask, execution, worktree);
  execution.taskResults.set(mapTask.id, mapResults);
  execution.taskStates.set(mapTask.id, STATES.COMPLETED);

  // Reduce phase
  execution.taskStates.set(reduceTask.id, STATES.RUNNING);
  const reduceResult = await executeTask(reduceTask, execution, worktree, mapResults);
  execution.taskResults.set(reduceTask.id, reduceResult);
  execution.taskStates.set(reduceTask.id, STATES.COMPLETED);
}

async function executeTask(task, execution, worktree, inputData) {
  // Simulate task execution
  // In real implementation, this would call the actual function

  await sleep(Math.random() * 500 + 100);

  if (task.action?.execute) {
    return await task.action.execute(execution.context, inputData);
  }

  return { success: true, taskId: task.id, output: `Result of ${task.name}` };
}

async function executeFanOut(execution, items, worker, maxConcurrency) {
  const chunks = chunkArray(items, maxConcurrency);

  for (const chunk of chunks) {
    if (execution.state === STATES.CANCELLED) break;

    const results = await Promise.allSettled(
      chunk.map(item => worker(item))
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        execution.completedItems++;
        execution.results.push(result.value);
      } else {
        execution.failedItems++;
        execution.errors.push(result.reason?.message);
      }
    }
  }

  execution.state = execution.failedItems > 0 ? STATES.FAILED : STATES.COMPLETED;
  execution.endTime = new Date().toISOString();
}

async function executeSource(source, index) {
  await sleep(Math.random() * 200);
  return { source, data: `Data from source ${index}` };
}

async function executeMapper(mapper, item) {
  if (mapper.execute) return await mapper.execute(item);
  return { key: item.id || item, value: item };
}

async function executeStage(stage, data) {
  if (stage.execute) return await stage.execute(data);
  return { stage: stage.name, output: 'Stage completed' };
}

async function waitForDependencies(task, execution) {
  for (const depId of task.dependsOn) {
    while (execution.taskStates.get(depId) !== STATES.COMPLETED &&
           execution.taskStates.get(depId) !== STATES.FAILED) {
      await sleep(100);
    }
  }
}

function getExecutionStatus(execution) {
  const duration = execution.endTime
    ? new Date(execution.endTime) - new Date(execution.startTime)
    : Date.now() - new Date(execution.startTime);

  return {
    id: execution.id,
    worktreeId: execution.worktreeId,
    worktreeName: execution.worktreeName,
    pattern: execution.pattern,
    state: execution.state,
    completedTasks: [...execution.taskStates.values()].filter(s => s === STATES.COMPLETED).length,
    failedTasks: [...execution.taskStates.values()].filter(s => s === STATES.FAILED).length,
    duration,
    error: execution.error,
    startTime: execution.startTime,
    endTime: execution.endTime
  };
}

function chunkArray(arr, size) {
  const chunks = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS Worktrees listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;