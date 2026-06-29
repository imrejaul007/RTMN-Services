/**
 * LoopOS Loop State Manager
 * Persistent state between loop executions
 * Port: 4722
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4722;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// State machine states
const STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  VERIFYING: 'verifying',
  PENDING_APPROVAL: 'pending_approval',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
};

// In-memory stores
const loopStates = new Map();      // loopId -> State
const checkpoints = new Map();     // checkpointId -> Checkpoint
const stateHistory = new Map();    // loopId -> State[]

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loop-state',
  version: '1.0.0',
  port: PORT,
  loops: loopStates.size,
  checkpoints: checkpoints.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── State Management ─────────────────────────────────────

/**
 * Initialize state for a loop
 * POST /api/states
 */
app.post('/api/states', requireAuth, (req, res) => {
  const { loopId, goal, initialContext = {} } = req.body || {};

  if (!loopId) return res.status(400).json({ error: 'loopId is required' });
  if (!goal) return res.status(400).json({ error: 'goal is required' });

  const state = {
    id: `state-${randomUUID().slice(0, 8)}`,
    loopId,
    goal,
    currentStep: 'initialized',
    context: { ...initialContext },
    status: STATES.IDLE,
    completedActions: [],
    failures: [],
    checkpoints: [],
    costSpent: 0,
    tokensUsed: 0,
    confidenceScore: 100,
    humanApprovals: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    version: 1
  };

  loopStates.set(loopId, state);
  stateHistory.set(loopId, []);

  logger.info(`State initialized for loop: ${loopId}`);
  res.status(201).json(state);
});

/**
 * Get state by loopId
 * GET /api/states/:loopId
 */
app.get('/api/states/:loopId', (req, res) => {
  const state = loopStates.get(req.params.loopId);
  if (!state) return res.status(404).json({ error: 'state not found' });
  res.json(state);
});

/**
 * Update state
 * PUT /api/states/:loopId
 */
app.put('/api/states/:loopId', requireAuth, (req, res) => {
  const state = loopStates.get(req.params.loopId);
  if (!state) return res.status(404).json({ error: 'state not found' });

  const updates = req.body || {};
  const allowed = ['currentStep', 'context', 'status', 'costSpent', 'tokensUsed', 'confidenceScore'];

  for (const key of allowed) {
    if (updates[key] !== undefined) {
      state[key] = updates[key];
    }
  }
  state.updatedAt = new Date().toISOString();
  state.version++;

  logger.info(`State updated for loop: ${req.params.loopId}, step: ${state.currentStep}`);
  res.json(state);
});

/**
 * Transition state to new status
 * POST /api/states/:loopId/transition
 */
app.post('/api/states/:loopId/transition', requireAuth, (req, res) => {
  const { newStatus, reason, metadata = {} } = req.body || {};
  const state = loopStates.get(req.params.loopId);

  if (!state) return res.status(404).json({ error: 'state not found' });
  if (!newStatus) return res.status(400).json({ error: 'newStatus is required' });

  const validTransitions = {
    [STATES.IDLE]: [STATES.RUNNING, STATES.CANCELLED],
    [STATES.RUNNING]: [STATES.VERIFYING, STATES.FAILED, STATES.CANCELLED],
    [STATES.VERIFYING]: [STATES.PENDING_APPROVAL, STATES.COMPLETED, STATES.FAILED],
    [STATES.PENDING_APPROVAL]: [STATES.RUNNING, STATES.COMPLETED, STATES.FAILED],
    [STATES.COMPLETED]: [],
    [STATES.FAILED]: [STATES.RUNNING],  // Can retry from failed
    [STATES.CANCELLED]: []
  };

  if (!validTransitions[state.status]?.includes(newStatus)) {
    return res.status(400).json({
      error: `Invalid transition: ${state.status} -> ${newStatus}`,
      allowed: validTransitions[state.status]
    });
  }

  // Save history before transition
  const history = stateHistory.get(state.id) || [];
  history.push({
    fromStatus: state.status,
    toStatus: newStatus,
    reason,
    metadata,
    timestamp: new Date().toISOString()
  });
  stateHistory.set(state.id, history);

  state.status = newStatus;
  state.updatedAt = new Date().toISOString();

  if (newStatus === STATES.COMPLETED) {
    state.completedAt = new Date().toISOString();
  }

  if (newStatus === STATES.FAILED) {
    state.failureCount = (state.failureCount || 0) + 1;
  }

  logger.info(`State transition: ${state.loopId} ${state.status} -> ${newStatus}`);
  res.json(state);
});

/**
 * Delete state
 * DELETE /api/states/:loopId
 */
app.delete('/api/states/:loopId', requireAuth, (req, res) => {
  if (!loopStates.has(req.params.loopId)) return res.status(404).json({ error: 'state not found' });

  loopStates.delete(req.params.loopId);
  stateHistory.delete(req.params.loopId);

  res.json({ deleted: true, loopId: req.params.loopId });
});

// ── Checkpoints ──────────────────────────────────────────

/**
 * Create checkpoint
 * POST /api/states/:loopId/checkpoints
 */
app.post('/api/states/:loopId/checkpoints', requireAuth, (req, res) => {
  const state = loopStates.get(req.params.loopId);
  if (!state) return res.status(404).json({ error: 'state not found' });

  const checkpoint = {
    id: `cp-${randomUUID().slice(0, 8)}`,
    loopId: req.params.loopId,
    stateSnapshot: {
      currentStep: state.currentStep,
      context: { ...state.context },
      completedActions: [...state.completedActions],
      costSpent: state.costSpent,
      tokensUsed: state.tokensUsed,
      confidenceScore: state.confidenceScore
    },
    reason: req.body?.reason || 'manual',
    createdAt: new Date().toISOString()
  };

  checkpoints.set(checkpoint.id, checkpoint);
  state.checkpoints.push(checkpoint.id);

  logger.info(`Checkpoint created: ${checkpoint.id} for loop ${req.params.loopId}`);
  res.status(201).json(checkpoint);
});

/**
 * List checkpoints for a loop
 * GET /api/states/:loopId/checkpoints
 */
app.get('/api/states/:loopId/checkpoints', (req, res) => {
  const state = loopStates.get(req.params.loopId);
  if (!state) return res.status(404).json({ error: 'state not found' });

  const loopCheckpoints = state.checkpoints
    .map(id => checkpoints.get(id))
    .filter(Boolean);

  res.json({ count: loopCheckpoints.length, checkpoints: loopCheckpoints });
});

/**
 * Restore from checkpoint
 * POST /api/checkpoints/:id/restore
 */
app.post('/api/checkpoints/:id/restore', requireAuth, (req, res) => {
  const checkpoint = checkpoints.get(req.params.id);
  if (!checkpoint) return res.status(404).json({ error: 'checkpoint not found' });

  const state = loopStates.get(checkpoint.loopId);
  if (!state) return res.status(404).json({ error: 'loop state not found' });

  // Save current state as new checkpoint before restore
  const backup = {
    id: `cp-${randomUUID().slice(0, 8)}`,
    loopId: checkpoint.loopId,
    stateSnapshot: {
      currentStep: state.currentStep,
      context: { ...state.context },
      completedActions: [...state.completedActions],
      costSpent: state.costSpent,
      tokensUsed: state.tokensUsed
    },
    reason: 'pre-restore-backup',
    createdAt: new Date().toISOString()
  };
  checkpoints.set(backup.id, backup);
  state.checkpoints.push(backup.id);

  // Restore from checkpoint
  state.currentStep = checkpoint.stateSnapshot.currentStep;
  state.context = { ...checkpoint.stateSnapshot.context };
  state.completedActions = [...checkpoint.stateSnapshot.completedActions];
  state.costSpent = checkpoint.stateSnapshot.costSpent;
  state.tokensUsed = checkpoint.stateSnapshot.tokensUsed;
  state.confidenceScore = checkpoint.stateSnapshot.confidenceScore || state.confidenceScore;
  state.status = STATES.IDLE;
  state.updatedAt = new Date().toISOString();
  state.version++;

  logger.info(`State restored from checkpoint: ${checkpoint.id}`);
  res.json({ restored: true, checkpointId: checkpoint.id, state });
});

/**
 * Get checkpoint by ID
 * GET /api/checkpoints/:id
 */
app.get('/api/checkpoints/:id', (req, res) => {
  const checkpoint = checkpoints.get(req.params.id);
  if (!checkpoint) return res.status(404).json({ error: 'checkpoint not found' });
  res.json(checkpoint);
});

// ── State History ────────────────────────────────────────

/**
 * Get state history for a loop
 * GET /api/states/:loopId/history
 */
app.get('/api/states/:loopId/history', (req, res) => {
  const state = loopStates.get(req.params.loopId);
  if (!state) return res.status(404).json({ error: 'state not found' });

  const history = stateHistory.get(state.id) || [];
  res.json({ count: history.length, history });
});

// ── Actions ──────────────────────────────────────────────

/**
 * Record action execution
 * POST /api/states/:loopId/actions
 */
app.post('/api/states/:loopId/actions', requireAuth, (req, res) => {
  const state = loopStates.get(req.params.loopId);
  if (!state) return res.status(404).json({ error: 'state not found' });

  const { actionId, actionType, input, output, success, duration, cost = 0, tokens = 0 } = req.body || {};

  if (!actionId) return res.status(400).json({ error: 'actionId is required' });

  const action = {
    id: `action-${randomUUID().slice(0, 8)}`,
    actionId,
    actionType: actionType || 'unknown',
    input,
    output,
    success: success !== false,
    duration,
    cost,
    tokens,
    executedAt: new Date().toISOString()
  };

  state.completedActions.push(action);
  state.costSpent += cost;
  state.tokensUsed += tokens;
  state.updatedAt = new Date().toISOString();

  if (!action.success) {
    state.failureCount = (state.failureCount || 0) + 1;
    state.confidenceScore = Math.max(0, state.confidenceScore - 5);
  }

  res.status(201).json(action);
});

/**
 * Get actions for a loop
 * GET /api/states/:loopId/actions
 */
app.get('/api/states/:loopId/actions', (req, res) => {
  const state = loopStates.get(req.params.loopId);
  if (!state) return res.status(404).json({ error: 'state not found' });

  const { limit = 50, failedOnly } = req.query;
  let actions = state.completedActions;

  if (failedOnly === 'true') {
    actions = actions.filter(a => !a.success);
  }

  res.json({
    count: actions.length,
    actions: actions.slice(-Number(limit))
  });
});

// ── Human Approvals ──────────────────────────────────────

/**
 * Request human approval
 * POST /api/states/:loopId/approvals
 */
app.post('/api/states/:loopId/approvals', requireAuth, (req, res) => {
  const state = loopStates.get(req.params.loopId);
  if (!state) return res.status(404).json({ error: 'state not found' });

  const { action, reason, urgency = 'normal' } = req.body || {};

  if (!action) return res.status(400).json({ error: 'action is required' });

  const approval = {
    id: `approval-${randomUUID().slice(0, 8)}`,
    action,
    reason: reason || 'Human approval required',
    urgency,
    status: 'pending',
    requestedAt: new Date().toISOString(),
    respondedAt: null,
    approver: null,
    response: null
  };

  state.humanApprovals.push(approval);
  state.status = STATES.PENDING_APPROVAL;
  state.updatedAt = new Date().toISOString();

  logger.info(`Approval requested for loop ${req.params.loopId}: ${action}`);
  res.status(201).json(approval);
});

/**
 * Respond to approval
 * POST /api/approvals/:id/respond
 */
app.post('/api/approvals/:id/respond', requireAuth, (req, res) => {
  const { approved, approver, response } = req.body || {};

  // Find approval across all states
  let foundApproval = null;
  let foundState = null;

  for (const [loopId, state] of loopStates) {
    const approval = state.humanApprovals.find(a => a.id === req.params.id);
    if (approval) {
      foundApproval = approval;
      foundState = state;
      break;
    }
  }

  if (!foundApproval) return res.status(404).json({ error: 'approval not found' });
  if (foundApproval.status !== 'pending') return res.status(400).json({ error: 'approval already responded' });

  foundApproval.status = approved ? 'approved' : 'rejected';
  foundApproval.respondedAt = new Date().toISOString();
  foundApproval.approver = approver || 'system';
  foundApproval.response = response;

  if (approved) {
    foundState.status = STATES.RUNNING;
  } else {
    foundState.status = STATES.FAILED;
  }
  foundState.updatedAt = new Date().toISOString();

  logger.info(`Approval ${foundApproval.status}: ${foundApproval.id}`);
  res.json(foundApproval);
});

/**
 * Get pending approvals
 * GET /api/approvals
 */
app.get('/api/approvals', (req, res) => {
  const pending = [];

  for (const [, state] of loopStates) {
    for (const approval of state.humanApprovals) {
      if (approval.status === 'pending') {
        pending.push({ ...approval, loopId: state.loopId });
      }
    }
  }

  res.json({ count: pending.length, approvals: pending });
});

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Loop State Manager listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
