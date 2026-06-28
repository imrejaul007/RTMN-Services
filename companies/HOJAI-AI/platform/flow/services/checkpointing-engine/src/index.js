/**
 * Checkpointing Engine (Port 5376)
 * Phase 1.2 - Checkpointing System for FlowOS
 *
 * Enables workflow resumability without replaying completed steps.
 * Key features:
 * - Periodic state snapshots
 * - Incremental checkpointing
 * - Dependency-aware checkpoints
 * - Parallel checkpoint tracking
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT, 10) || 5376;
const SERVICE_NAME = 'checkpointing-engine';
const DATA_DIR = process.env.CHECKPOINT_DATA_DIR || path.join(__dirname, '../data');
const DEFAULT_INTERVAL = parseInt(process.env.CHECKPOINT_INTERVAL, 10) || 60; // seconds
const MAX_CHECKPOINTS = parseInt(process.env.MAX_CHECKPOINTS, 10) || 10;

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_) { /* ignore */ }
}

function getCheckpointsPath() {
  return path.join(DATA_DIR, 'checkpoints.json');
}

function loadCheckpoints() {
  try {
    if (!fs.existsSync(getCheckpointsPath())) return {};
    return JSON.parse(fs.readFileSync(getCheckpointsPath(), 'utf8'));
  } catch (_) {
    return {};
  }
}

function saveCheckpoints(checkpoints) {
  ensureDir();
  fs.writeFileSync(getCheckpointsPath(), JSON.stringify(checkpoints, null, 2));
}

// In-memory store
let checkpoints = loadCheckpoints();

// ============================================================================
// CHECKPOINT TYPES
// ============================================================================

const CHECKPOINT_TYPES = {
  FULL: 'full',           // Complete workflow state
  INCREMENTAL: 'incremental', // Only changed state
  BEFORE_STEP: 'before_step', // Before executing a step
  AFTER_STEP: 'after_step',   // After completing a step
  PERIODIC: 'periodic',     // Time-based checkpoint
  MANUAL: 'manual'         // User-triggered
};

const CHECKPOINT_STATUS = {
  ACTIVE: 'active',
  STALE: 'stale',         // Older checkpoint superseded
  APPLIED: 'applied',     // Restored from this checkpoint
  DISCARDED: 'discarded'   // No longer needed
};

// ============================================================================
// CHECKPOINT FUNCTIONS
// ============================================================================

/**
 * Create a new checkpoint
 */
function createCheckpoint(workflowId, options = {}) {
  const {
    stepIndex,
    stepId,
    state,
    type = CHECKPOINT_TYPES.INCREMENTAL,
    metadata = {}
  } = options;

  const checkpointId = `cp_${uuidv4()}`;
  const checksum = calculateChecksum(state);

  const checkpoint = {
    id: checkpointId,
    workflowId,
    stepIndex,
    stepId,
    type,
    status: CHECKPOINT_STATUS.ACTIVE,
    state,
    stateChecksum: checksum,
    previousCheckpointId: getLatestCheckpointId(workflowId),
    dependencies: metadata.dependencies || [],
    variables: metadata.variables || {},
    createdAt: Date.now(),
    size: JSON.stringify(state).length,
    metadata
  };

  // Mark previous checkpoints as stale
  Object.values(checkpoints)
    .filter(cp => cp.workflowId === workflowId && cp.status === CHECKPOINT_STATUS.ACTIVE)
    .forEach(cp => {
      cp.status = CHECKPOINT_STATUS.STALE;
      cp.supersededBy = checkpointId;
    });

  checkpoints[checkpointId] = checkpoint;
  pruneOldCheckpoints(workflowId);
  saveCheckpoints(checkpoints);

  return checkpoint;
}

/**
 * Get latest checkpoint for a workflow
 */
function getLatestCheckpoint(workflowId) {
  const workflowCheckpoints = Object.values(checkpoints)
    .filter(cp => cp.workflowId === workflowId && cp.status === CHECKPOINT_STATUS.ACTIVE)
    .sort((a, b) => b.createdAt - a.createdAt);

  return workflowCheckpoints[0] || null;
}

/**
 * Get checkpoint by ID
 */
function getCheckpoint(checkpointId) {
  return checkpoints[checkpointId] || null;
}

/**
 * Get all checkpoints for a workflow
 */
function getWorkflowCheckpoints(workflowId) {
  return Object.values(checkpoints)
    .filter(cp => cp.workflowId === workflowId)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Restore from checkpoint
 */
function restoreFromCheckpoint(checkpointId) {
  const checkpoint = checkpoints[checkpointId];
  if (!checkpoint) {
    throw new Error('Checkpoint not found');
  }

  // Verify checksum
  const currentChecksum = calculateChecksum(checkpoint.state);
  if (currentChecksum !== checkpoint.stateChecksum) {
    throw new Error('Checkpoint integrity check failed - state may be corrupted');
  }

  // Mark as applied
  checkpoint.status = CHECKPOINT_STATUS.APPLIED;
  checkpoint.appliedAt = Date.now();
  saveCheckpoints(checkpoints);

  return {
    state: checkpoint.state,
    stepIndex: checkpoint.stepIndex,
    stepId: checkpoint.stepId,
    checkpointId: checkpoint.id
  };
}

/**
 * Delete checkpoint
 */
function deleteCheckpoint(checkpointId) {
  if (checkpoints[checkpointId]) {
    checkpoints[checkpointId].status = CHECKPOINT_STATUS.DISCARDED;
    delete checkpoints[checkpointId];
    saveCheckpoints(checkpoints);
    return true;
  }
  return false;
}

/**
 * Calculate state checksum
 */
function calculateChecksum(state) {
  const serialized = JSON.stringify(state, Object.keys(state).sort());
  return crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 16);
}

/**
 * Get latest checkpoint ID
 */
function getLatestCheckpointId(workflowId) {
  const latest = getLatestCheckpoint(workflowId);
  return latest ? latest.id : null;
}

/**
 * Prune old checkpoints
 */
function pruneOldCheckpoints(workflowId) {
  const workflowCheckpoints = Object.values(checkpoints)
    .filter(cp => cp.workflowId === workflowId)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (workflowCheckpoints.length > MAX_CHECKPOINTS) {
    const toRemove = workflowCheckpoints.slice(MAX_CHECKPOINTS);
    toRemove.forEach(cp => {
      cp.status = CHECKPOINT_STATUS.DISCARDED;
      delete checkpoints[cp.id];
    });
  }
}

/**
 * Verify checkpoint integrity
 */
function verifyCheckpoint(checkpointId) {
  const checkpoint = checkpoints[checkpointId];
  if (!checkpoint) {
    return { valid: false, error: 'Checkpoint not found' };
  }

  const currentChecksum = calculateChecksum(checkpoint.state);
  const valid = currentChecksum === checkpoint.stateChecksum;

  return {
    valid,
    checkpointId,
    expectedChecksum: checkpoint.stateChecksum,
    actualChecksum: currentChecksum,
    verifiedAt: Date.now()
  };
}

/**
 * Create incremental checkpoint (only changed fields)
 */
function createIncrementalCheckpoint(workflowId, previousState, currentState, options = {}) {
  const changedFields = {};
  const unchangedFields = {};

  const allKeys = new Set([...Object.keys(previousState), ...Object.keys(currentState)]);

  allKeys.forEach(key => {
    const prevVal = JSON.stringify(previousState[key]);
    const currVal = JSON.stringify(currentState[key]);

    if (prevVal !== currVal) {
      changedFields[key] = currentState[key];
    } else {
      unchangedFields[key] = previousState[key];
    }
  });

  return createCheckpoint(workflowId, {
    ...options,
    type: CHECKPOINT_TYPES.INCREMENTAL,
    state: {
      changed: changedFields,
      unchanged: unchangedFields,
      fullState: currentState
    },
    metadata: {
      ...options.metadata,
      changedFieldCount: Object.keys(changedFields).length,
      unchangedFieldCount: Object.keys(unchangedFields).length,
      changePercentage: Math.round((Object.keys(changedFields).length / allKeys.size) * 100)
    }
  });
}

/**
 * Get checkpoint statistics
 */
function getCheckpointStats(workflowId) {
  const workflowCheckpoints = Object.values(checkpoints)
    .filter(cp => cp.workflowId === workflowId);

  const stats = {
    total: workflowCheckpoints.length,
    byType: {},
    byStatus: {},
    totalSize: 0,
    oldestCheckpoint: null,
    newestCheckpoint: null
  };

  workflowCheckpoints.forEach(cp => {
    stats.byType[cp.type] = (stats.byType[cp.type] || 0) + 1;
    stats.byStatus[cp.status] = (stats.byStatus[cp.status] || 0) + 1;
    stats.totalSize += cp.size;

    if (!stats.oldestCheckpoint || cp.createdAt < stats.oldestCheckpoint.createdAt) {
      stats.oldestCheckpoint = { id: cp.id, createdAt: cp.createdAt };
    }
    if (!stats.newestCheckpoint || cp.createdAt > stats.newestCheckpoint.createdAt) {
      stats.newestCheckpoint = { id: cp.id, createdAt: cp.createdAt };
    }
  });

  return stats;
}

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan(`[${SERVICE_NAME}] :method :url :status :response-time ms`));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: '1.0.0',
    checkpoints: Object.keys(checkpoints).length,
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// ============================================================================
// CHECKPOINT ENDPOINTS
// ============================================================================

// Create checkpoint
app.post('/api/checkpoints', (req, res) => {
  try {
    const { workflowId, stepIndex, stepId, state, type, metadata } = req.body;

    if (!workflowId || !state) {
      return res.status(400).json({ error: 'workflowId and state are required' });
    }

    const checkpoint = createCheckpoint(workflowId, {
      stepIndex,
      stepId,
      state,
      type: type || CHECKPOINT_TYPES.INCREMENTAL,
      metadata
    });

    res.status(201).json({
      success: true,
      checkpoint
    });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error creating checkpoint:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Create incremental checkpoint
app.post('/api/checkpoints/incremental', (req, res) => {
  try {
    const { workflowId, previousState, currentState, stepIndex, stepId, metadata } = req.body;

    if (!workflowId || !previousState || !currentState) {
      return res.status(400).json({
        error: 'workflowId, previousState, and currentState are required'
      });
    }

    const checkpoint = createIncrementalCheckpoint(workflowId, previousState, currentState, {
      stepIndex,
      stepId,
      metadata
    });

    res.status(201).json({
      success: true,
      checkpoint
    });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error creating incremental checkpoint:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get all checkpoints for workflow
app.get('/api/checkpoints/workflow/:workflowId', (req, res) => {
  try {
    const { workflowId } = req.params;
    const checkpoints = getWorkflowCheckpoints(workflowId);
    const stats = getCheckpointStats(workflowId);

    res.json({
      count: checkpoints.length,
      stats,
      checkpoints
    });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error listing checkpoints:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get latest checkpoint
app.get('/api/checkpoints/workflow/:workflowId/latest', (req, res) => {
  try {
    const { workflowId } = req.params;
    const checkpoint = getLatestCheckpoint(workflowId);

    if (!checkpoint) {
      return res.status(404).json({ error: 'No checkpoints found' });
    }

    res.json({ checkpoint });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error getting latest checkpoint:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get checkpoint by ID
app.get('/api/checkpoints/:checkpointId', (req, res) => {
  try {
    const checkpoint = getCheckpoint(req.params.checkpointId);

    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    res.json({ checkpoint });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error getting checkpoint:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Restore from checkpoint
app.post('/api/checkpoints/:checkpointId/restore', (req, res) => {
  try {
    const result = restoreFromCheckpoint(req.params.checkpointId);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error restoring checkpoint:`, error);
    res.status(400).json({ error: error.message });
  }
});

// Verify checkpoint
app.get('/api/checkpoints/:checkpointId/verify', (req, res) => {
  try {
    const result = verifyCheckpoint(req.params.checkpointId);

    res.json(result);

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error verifying checkpoint:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Delete checkpoint
app.delete('/api/checkpoints/:checkpointId', (req, res) => {
  try {
    const deleted = deleteCheckpoint(req.params.checkpointId);

    if (!deleted) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }

    res.json({ success: true });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error deleting checkpoint:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get checkpoint statistics
app.get('/api/checkpoints/workflow/:workflowId/stats', (req, res) => {
  try {
    const stats = getCheckpointStats(req.params.workflowId);

    res.json({ stats });

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error getting stats:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Compare two checkpoints
app.post('/api/checkpoints/compare', (req, res) => {
  try {
    const { checkpointId1, checkpointId2 } = req.body;

    const cp1 = getCheckpoint(checkpointId1);
    const cp2 = getCheckpoint(checkpointId2);

    if (!cp1 || !cp2) {
      return res.status(404).json({ error: 'One or both checkpoints not found' });
    }

    const comparison = {
      checkpoint1: { id: cp1.id, createdAt: cp1.createdAt, type: cp1.type },
      checkpoint2: { id: cp2.id, createdAt: cp2.createdAt, type: cp2.type },
      timeDiff: cp2.createdAt - cp1.createdAt,
      stepDiff: (cp2.stepIndex || 0) - (cp1.stepIndex || 0),
      stateDiff: compareStates(cp1.state, cp2.state)
    };

    res.json(comparison);

  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error comparing checkpoints:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// HELPERS
// ============================================================================

function compareStates(state1, state2) {
  const diff = {
    added: [],
    removed: [],
    modified: []
  };

  const allKeys = new Set([...Object.keys(state1 || {}), ...Object.keys(state2 || {})]);

  allKeys.forEach(key => {
    if (!(key in (state1 || {}))) {
      diff.added.push(key);
    } else if (!(key in (state2 || {}))) {
      diff.removed.push(key);
    } else if (JSON.stringify(state1[key]) !== JSON.stringify(state2[key])) {
      diff.modified.push(key);
    }
  });

  return diff;
}

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  ensureDir();
  console.log(`[${SERVICE_NAME}] Checkpointing Engine started on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] Data directory: ${DATA_DIR}`);
  console.log(`[${SERVICE_NAME}] Max checkpoints per workflow: ${MAX_CHECKPOINTS}`);
  console.log(`[${SERVICE_NAME}] Default interval: ${DEFAULT_INTERVAL}s`);
});

module.exports = {
  CHECKPOINT_TYPES,
  CHECKPOINT_STATUS,
  createCheckpoint,
  createIncrementalCheckpoint,
  getLatestCheckpoint,
  getCheckpoint,
  getWorkflowCheckpoints,
  restoreFromCheckpoint,
  deleteCheckpoint,
  verifyCheckpoint,
  getCheckpointStats,
  compareStates
};
