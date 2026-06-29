/**
 * LoopOS Loop Scheduler
 * Persistent autonomous execution engine
 * Port: 4721
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cron from 'node-cron';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4721;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// In-memory stores
const loops = new Map();
const executions = new Map();
const schedules = new Map();

// Active cron jobs
const activeJobs = new Map();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Auth
function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loop-scheduler',
  version: '1.0.0',
  port: PORT,
  loops: loops.size,
  executions: executions.size,
  activeJobs: activeJobs.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Loop CRUD ───────────────────────────────────────────

/**
 * Create a new loop
 * POST /api/loops
 */
app.post('/api/loops', requireAuth, (req, res) => {
  const {
    name,
    goalId,
    frequency,        // cron expression: "*/5 * * * *"
    targetTwinId,
    actions = [],
    budgetId,
    verificationPolicy = 'none',
    humanApprovalThreshold = 'never',
    maxRetries = 3,
    maxDuration = 300000,  // 5 min default
    enabled = true
  } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });
  if (!frequency) return res.status(400).json({ error: 'frequency (cron) is required' });
  if (!cron.validate(frequency)) return res.status(400).json({ error: 'invalid cron expression' });

  const id = `loop-${randomUUID().slice(0, 8)}`;
  const loop = {
    id,
    name,
    goalId: goalId || null,
    frequency,
    targetTwinId: targetTwinId || null,
    actions,
    budgetId: budgetId || null,
    verificationPolicy,
    humanApprovalThreshold,
    maxRetries,
    maxDuration,
    enabled,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastRun: null,
    nextRun: calculateNextRun(frequency),
    runCount: 0,
    failureCount: 0
  };

  loops.set(id, loop);
  logger.info(`Loop created: ${id} (${name})`);

  // Start scheduler if enabled
  if (enabled) {
    startLoop(loop);
  }

  res.status(201).json(loop);
});

/**
 * List all loops
 * GET /api/loops
 */
app.get('/api/loops', (req, res) => {
  let items = [...loops.values()];
  const { enabled, owner } = req.query;
  if (enabled !== undefined) items = items.filter(l => l.enabled === (enabled === 'true'));
  if (owner) items = items.filter(l => l.targetTwinId === owner);

  res.json({
    count: items.length,
    loops: items.map(l => ({ ...l, nextRun: calculateNextRun(l.frequency) }))
  });
});

/**
 * Get loop by ID
 * GET /api/loops/:id
 */
app.get('/api/loops/:id', (req, res) => {
  const loop = loops.get(req.params.id);
  if (!loop) return res.status(404).json({ error: 'loop not found' });
  res.json({ ...loop, nextRun: calculateNextRun(loop.frequency) });
});

/**
 * Update loop
 * PUT /api/loops/:id
 */
app.put('/api/loops/:id', requireAuth, (req, res) => {
  const loop = loops.get(req.params.id);
  if (!loop) return res.status(404).json({ error: 'loop not found' });

  const updates = req.body || {};
  const allowed = ['name', 'frequency', 'targetTwinId', 'actions', 'budgetId',
                   'verificationPolicy', 'humanApprovalThreshold', 'maxRetries', 'maxDuration', 'enabled'];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      loop[key] = updates[key];
    }
  }
  loop.updatedAt = new Date().toISOString();

  // Restart if frequency or enabled changed
  stopLoop(loop.id);
  if (loop.enabled) {
    startLoop(loop);
  }

  logger.info(`Loop updated: ${loop.id}`);
  res.json(loop);
});

/**
 * Delete loop
 * DELETE /api/loops/:id
 */
app.delete('/api/loops/:id', requireAuth, (req, res) => {
  if (!loops.has(req.params.id)) return res.status(404).json({ error: 'loop not found' });
  stopLoop(req.params.id);
  loops.delete(req.params.id);
  logger.info(`Loop deleted: ${req.params.id}`);
  res.json({ deleted: true, id: req.params.id });
});

// ── Loop Execution ───────────────────────────────────────

/**
 * Trigger loop manually
 * POST /api/loops/:id/trigger
 */
app.post('/api/loops/:id/trigger', requireAuth, async (req, res) => {
  const loop = loops.get(req.params.id);
  if (!loop) return res.status(404).json({ error: 'loop not found' });

  const execution = await runLoop(loop);
  res.status(201).json(execution);
});

/**
 * Get execution history
 * GET /api/loops/:id/executions
 */
app.get('/api/loops/:id/executions', (req, res) => {
  const { limit = 50 } = req.query;
  const loopExecutions = [...executions.values()]
    .filter(e => e.loopId === req.params.id)
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt))
    .slice(0, Number(limit));

  res.json({ count: loopExecutions.length, executions: loopExecutions });
});

/**
 * Get execution by ID
 * GET /api/executions/:id
 */
app.get('/api/executions/:id', (req, res) => {
  const execution = executions.get(req.params.id);
  if (!execution) return res.status(404).json({ error: 'execution not found' });
  res.json(execution);
});

/**
 * Stop running loop
 * POST /api/loops/:id/stop
 */
app.post('/api/loops/:id/stop', requireAuth, (req, res) => {
  const loop = loops.get(req.params.id);
  if (!loop) return res.status(404).json({ error: 'loop not found' });

  stopLoop(loop.id);
  loop.enabled = false;
  loops.set(loop.id, loop);

  res.json({ stopped: true, id: loop.id });
});

/**
 * Pause loop (keeps state but stops execution)
 * POST /api/loops/:id/pause
 */
app.post('/api/loops/:id/pause', requireAuth, (req, res) => {
  const loop = loops.get(req.params.id);
  if (!loop) return res.status(404).json({ error: 'loop not found' });

  stopLoop(loop.id);
  loop.enabled = false;
  loops.set(loop.id, loop);

  res.json({ paused: true, id: loop.id });
});

/**
 * Resume paused loop
 * POST /api/loops/:id/resume
 */
app.post('/api/loops/:id/resume', requireAuth, (req, res) => {
  const loop = loops.get(req.params.id);
  if (!loop) return res.status(404).json({ error: 'loop not found' });

  loop.enabled = true;
  loops.set(loop.id, loop);
  startLoop(loop);

  res.json({ resumed: true, id: loop.id });
});

// ── Scheduler Logic ──────────────────────────────────────

function calculateNextRun(cronExpression) {
  // Simple next run calculation
  const parts = cronExpression.split(' ');
  if (parts.length !== 5) return null;

  const [min, hour, day, month, dow] = parts;
  const now = new Date();
  const next = new Date(now);

  // Handle */n patterns
  const handleStar = (val, max, current) => {
    if (val === '*') return current;
    if (val.startsWith('*/')) {
      const step = parseInt(val.slice(2));
      return Math.ceil(current / step) * step;
    }
    return parseInt(val);
  };

  // Simplified: just return approximate next
  next.setMinutes(next.getMinutes() + 5);
  return next.toISOString();
}

function startLoop(loop) {
  if (activeJobs.has(loop.id)) return;

  try {
    const job = cron.schedule(loop.frequency, async () => {
      await runLoop(loop);
    }, {
      scheduled: true,
      timezone: 'Asia/Kolkata'
    });

    activeJobs.set(loop.id, job);
    logger.info(`Loop scheduler started: ${loop.id} (${loop.name})`);
  } catch (err) {
    logger.error(`Failed to start loop ${loop.id}:`, err);
  }
}

function stopLoop(loopId) {
  const job = activeJobs.get(loopId);
  if (job) {
    job.stop();
    activeJobs.delete(loopId);
    logger.info(`Loop scheduler stopped: ${loopId}`);
  }
}

async function runLoop(loop) {
  const executionId = `exec-${randomUUID().slice(0, 8)}`;
  const startTime = Date.now();

  const execution = {
    id: executionId,
    loopId: loop.id,
    loopName: loop.name,
    status: 'running',
    startedAt: new Date().toISOString(),
    completedAt: null,
    actions: [],
    results: null,
    cost: 0,
    tokensUsed: 0,
    errors: [],
    retryCount: 0
  };

  executions.set(executionId, execution);

  try {
    logger.info(`Loop execution started: ${executionId} (${loop.name})`);

    // Run actions sequentially
    for (const action of loop.actions) {
      const actionStart = Date.now();

      try {
        // Execute action (placeholder - connect to real agents/workflows)
        const result = await executeAction(action, loop, execution);

        execution.actions.push({
          actionId: action.id || action.name,
          status: 'success',
          duration: Date.now() - actionStart,
          result
        });
      } catch (err) {
        execution.actions.push({
          actionId: action.id || action.name,
          status: 'failed',
          duration: Date.now() - actionStart,
          error: err.message
        });
        execution.errors.push(err.message);

        // Retry logic
        if (execution.retryCount < loop.maxRetries) {
          execution.retryCount++;
          const backoff = Math.pow(2, execution.retryCount) * 1000;
          await sleep(backoff);
          logger.info(`Retrying action ${action.name}, attempt ${execution.retryCount}`);
        }
      }
    }

    execution.status = 'completed';
    execution.completedAt = new Date().toISOString();
    execution.duration = Date.now() - startTime;

    // Update loop stats
    loop.lastRun = execution.completedAt;
    loop.nextRun = calculateNextRun(loop.frequency);
    loop.runCount++;

    logger.info(`Loop execution completed: ${executionId} (${execution.duration}ms)`);

  } catch (err) {
    execution.status = 'failed';
    execution.completedAt = new Date().toISOString();
    execution.duration = Date.now() - startTime;
    execution.errors.push(err.message);
    loop.failureCount++;

    logger.error(`Loop execution failed: ${executionId}`, err);
  }

  executions.set(executionId, execution);
  return execution;
}

async function executeAction(action, loop, execution) {
  // Placeholder: Connect to actual agent/workflow execution
  // In production, this would call:
  // - TwinOS for agent state
  // - FlowOS for workflow execution
  // - Budget Engine for cost tracking
  // - Verification Engine for validation

  return {
    executed: true,
    action: action.name || action.id,
    twinId: loop.targetTwinId,
    timestamp: new Date().toISOString()
  };
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Loop Scheduler listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  for (const [id] of activeJobs) stopLoop(id);
  server.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('Shutting down...');
  for (const [id] of activeJobs) stopLoop(id);
  server.close(() => process.exit(0));
});

export default app;
