/**
 * LoopOS TwinOS Integration
 * Ties loops to Employee Twins for identity, state, and learning
 * Port: 4740
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import axios from 'axios';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4740;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';
const TWIN_OS_URL = process.env.TWIN_OS_URL || 'http://localhost:4705';

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

// In-memory store for loop-twin bindings
const loopTwinBindings = new Map();
const twinLoopRegistry = new Map();

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-twinos-integration',
  version: '1.0.0',
  port: PORT,
  twinOsUrl: TWIN_OS_URL,
  bindings: loopTwinBindings.size
}));

app.get('/ready', async (_req, res) => {
  try {
    await axios.get(`${TWIN_OS_URL}/health`, { timeout: 2000 });
    res.json({ ready: true, twinOsConnected: true });
  } catch {
    res.json({ ready: true, twinOsConnected: false });
  }
});

// ── Loop-Twin Bindings ─────────────────────────────────

/**
 * Bind a loop to an employee twin
 * POST /api/bindings
 */
app.post('/api/bindings', requireAuth, async (req, res) => {
  const { loopId, twinId, twinType = 'employee', permissions = [] } = req.body || {};

  if (!loopId) return res.status(400).json({ error: 'loopId is required' });
  if (!twinId) return res.status(400).json({ error: 'twinId is required' });

  try {
    // Verify twin exists in TwinOS
    const twinResponse = await axios.get(`${TWIN_OS_URL}/api/twins/${twinId}`).catch(() => null);

    if (!twinResponse) {
      // Twin doesn't exist - create a basic loop twin
      await axios.post(`${TWIN_OS_URL}/api/twins`, {
        id: twinId,
        type: twinType,
        subtype: 'loop-agent',
        metadata: { source: 'loopos', loopId }
      });
    }

    const binding = {
      id: `binding-${randomUUID().slice(0, 8)}`,
      loopId,
      twinId,
      twinType,
      twinSubtype: 'loop-agent',
      permissions,
      status: 'active',
      createdAt: new Date().toISOString(),
      stats: {
        loopsExecuted: 0,
        tasksCompleted: 0,
        tasksFailed: 0,
        totalCost: 0,
        totalTokens: 0
      }
    };

    loopTwinBindings.set(binding.id, binding);

    // Register in twin's loop list
    if (!twinLoopRegistry.has(twinId)) {
      twinLoopRegistry.set(twinId, []);
    }
    twinLoopRegistry.get(twinId).push(binding.id);

    logger.info(`Loop ${loopId} bound to twin ${twinId}`);
    res.status(201).json(binding);

  } catch (err) {
    logger.error('Failed to bind loop to twin:', err.message);
    res.status(500).json({ error: 'Failed to bind loop to twin', message: err.message });
  }
});

/**
 * Get binding for a loop
 * GET /api/bindings/loop/:loopId
 */
app.get('/api/bindings/loop/:loopId', (req, res) => {
  const binding = [...loopTwinBindings.values()].find(b => b.loopId === req.params.loopId);
  if (!binding) return res.status(404).json({ error: 'binding not found' });
  res.json(binding);
});

/**
 * Get all loops for a twin
 * GET /api/bindings/twin/:twinId
 */
app.get('/api/bindings/twin/:twinId', (req, res) => {
  const bindingIds = twinLoopRegistry.get(req.params.twinId) || [];
  const bindings = bindingIds.map(id => loopTwinBindings.get(id)).filter(Boolean);
  res.json({ twinId: req.params.twinId, bindings });
});

/**
 * Update binding permissions
 * PUT /api/bindings/:id
 */
app.put('/api/bindings/:id', requireAuth, (req, res) => {
  const binding = loopTwinBindings.get(req.params.id);
  if (!binding) return res.status(404).json({ error: 'binding not found' });

  const { permissions, status } = req.body || {};
  if (permissions) binding.permissions = permissions;
  if (status) binding.status = status;

  res.json(binding);
});

/**
 * Update twin with loop execution stats
 * POST /api/bindings/:id/stats
 */
app.post('/api/bindings/:id/stats', requireAuth, async (req, res) => {
  const binding = loopTwinBindings.get(req.params.id);
  if (!binding) return res.status(404).json({ error: 'binding not found' });

  const { executed, completed, failed, cost, tokens } = req.body || {};

  if (executed) binding.stats.loopsExecuted++;
  if (completed) binding.stats.tasksCompleted++;
  if (failed) binding.stats.tasksFailed++;
  if (cost) binding.stats.totalCost += cost;
  if (tokens) binding.stats.totalTokens += tokens;

  // Update twin in TwinOS
  try {
    await axios.patch(`${TWIN_OS_URL}/api/twins/${binding.twinId}`, {
      metadata: {
        loopStats: binding.stats,
        lastLoopActivity: new Date().toISOString()
      }
    });
  } catch (err) {
    logger.warn('Failed to update twin stats:', err.message);
  }

  res.json(binding);
});

// ── Twin State Sync ─────────────────────────────────────

/**
 * Sync loop state to twin
 * POST /api/sync/:twinId
 */
app.post('/api/sync/:twinId', requireAuth, async (req, res) => {
  const { loopId, state, actions, checkpoints, approvals } = req.body || {};

  try {
    // Get or create loop twin
    const loopTwinId = `loop-${req.params.twinId}`;

    await axios.patch(`${TWIN_OS_URL}/api/twins/${loopTwinId}`, {
      metadata: {
        loopId,
        state,
        currentStep: state?.currentStep,
        status: state?.status,
        completedActions: actions?.length || 0,
        checkpoints: checkpoints?.length || 0,
        pendingApprovals: approvals?.length || 0,
        lastUpdated: new Date().toISOString()
      }
    });

    res.json({ synced: true, twinId: loopTwinId });
  } catch (err) {
    logger.error('Failed to sync state to twin:', err.message);
    res.status(500).json({ error: 'Sync failed', message: err.message });
  }
});

/**
 * Get twin's loop context (goals, state, history)
 * GET /api/twin-context/:twinId
 */
app.get('/api/twin-context/:twinId', async (req, res) => {
  try {
    const twinResponse = await axios.get(`${TWIN_OS_URL}/api/twins/${req.params.twinId}`);
    const twin = twinResponse.data;

    // Get associated loops
    const bindingIds = twinLoopRegistry.get(req.params.twinId) || [];
    const bindings = bindingIds.map(id => loopTwinBindings.get(id)).filter(Boolean);

    // Get twin's goals
    const goalsResponse = await axios.get(`${TWIN_OS_URL}/api/goals?twinId=${req.params.twinId}`).catch(() => ({ data: { goals: [] } }));
    const goals = goalsResponse.data.goals || [];

    res.json({
      twin,
      loops: bindings,
      goals,
      context: {
        identity: twin.name || twin.id,
        goals: goals.map(g => g.objective),
        activeLoops: bindings.filter(b => b.status === 'active').length,
        stats: bindings.reduce((acc, b) => ({
          totalLoops: acc.totalLoops + 1,
          totalCost: acc.totalCost + b.stats.totalCost,
          totalTokens: acc.totalTokens + b.stats.totalTokens
        }), { totalLoops: 0, totalCost: 0, totalTokens: 0 })
      }
    });
  } catch (err) {
    logger.error('Failed to get twin context:', err.message);
    res.status(500).json({ error: 'Failed to get twin context', message: err.message });
  }
});

// ── Twin Permissions ────────────────────────────────────

/**
 * Check if twin can execute action
 * POST /api/permissions/check
 */
app.post('/api/permissions/check', (req, res) => {
  const { twinId, action, resource, value } = req.body || {};

  const binding = [...loopTwinBindings.values()].find(b => b.twinId === twinId && b.status === 'active');
  if (!binding) return res.status(404).json({ allowed: false, reason: 'No active binding' });

  // Check permissions
  const hasPermission = binding.permissions.includes('*') ||
                       binding.permissions.includes(action) ||
                       binding.permissions.includes(`${action}:${resource}`);

  // Check value thresholds
  let withinThreshold = true;
  if (value) {
    const valuePermission = binding.permissions.find(p => p.startsWith(`approve:`));
    if (valuePermission) {
      const threshold = parseInt(valuePermission.split(':')[1]);
      withinThreshold = value <= threshold;
    }
  }

  const allowed = hasPermission && withinThreshold;

  res.json({
    allowed,
    twinId,
    action,
    reason: allowed ? 'permitted' : 'denied',
    requiresApproval: !withinThreshold
  });
});

/**
 * Get all bindings
 * GET /api/bindings
 */
app.get('/api/bindings', (req, res) => {
  const { twinId, status } = req.query;
  let items = [...loopTwinBindings.values()];

  if (twinId) items = items.filter(b => b.twinId === twinId);
  if (status) items = items.filter(b => b.status === status);

  res.json({ count: items.length, bindings: items });
});

/**
 * Delete binding
 * DELETE /api/bindings/:id
 */
app.delete('/api/bindings/:id', requireAuth, (req, res) => {
  const binding = loopTwinBindings.get(req.params.id);
  if (!binding) return res.status(404).json({ error: 'binding not found' });

  loopTwinBindings.delete(req.params.id);
  const twinList = twinLoopRegistry.get(binding.twinId);
  if (twinList) {
    const idx = twinList.indexOf(req.params.id);
    if (idx > -1) twinList.splice(idx, 1);
  }

  res.json({ deleted: true });
});

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS TwinOS Integration listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
