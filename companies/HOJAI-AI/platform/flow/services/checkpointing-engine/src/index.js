/**
 * Checkpointing Engine - Workflow state persistence and recovery
 * Enables resumability, replay, and state comparison for workflows
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
const PORT = process.env.PORT || 5376;

app.use(cors());
app.use(express.json());

// In-memory storage (replace with persistent storage in production)
const storage = {
  checkpoints: new Map(),
  snapshots: new Map(),
};

// Configuration
const MAX_CHECKPOINTS = 100;
const CHECKPOINT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

// Utility functions
function generateChecksum(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

// Core checkpoint operations
async function createCheckpoint(workflowId, state, metadata = {}) {
  const checkpoint = {
    id: crypto.randomUUID(),
    workflowId,
    version: metadata.version || 1,
    state: { ...state },
    metadata: { ...metadata },
    checksum: generateChecksum(state),
    createdAt: Date.now(),
    parentId: metadata.parentId || null,
    incremental: metadata.incremental || false,
    expiresAt: Date.now() + CHECKPOINT_TTL,
  };

  storage.checkpoints.set(checkpoint.id, checkpoint);

  // Create associated snapshot
  const snapshot = {
    id: `snap-${checkpoint.id}`,
    checkpointId: checkpoint.id,
    workflowId,
    data: JSON.stringify(state),
    size: JSON.stringify(state).length,
    createdAt: Date.now(),
  };
  storage.snapshots.set(snapshot.id, snapshot);

  return checkpoint;
}

async function createIncrementalCheckpoint(workflowId, baseCheckpointId, deltaState, metadata = {}) {
  const baseCheckpoint = storage.checkpoints.get(baseCheckpointId);
  if (!baseCheckpoint) {
    throw new Error('Base checkpoint not found');
  }

  // Reconstruct full state
  const fullState = { ...baseCheckpoint.state, ...deltaState };

  const checkpoint = {
    id: crypto.randomUUID(),
    workflowId,
    version: baseCheckpoint.version + 1,
    state: fullState,
    delta: deltaState,
    metadata: { ...metadata },
    checksum: generateChecksum(fullState),
    createdAt: Date.now(),
    parentId: baseCheckpointId,
    incremental: true,
    expiresAt: Date.now() + CHECKPOINT_TTL,
  };

  storage.checkpoints.set(checkpoint.id, checkpoint);
  return checkpoint;
}

async function restoreFromCheckpoint(checkpointId) {
  const checkpoint = storage.checkpoints.get(checkpointId);
  if (!checkpoint) {
    throw new Error('Checkpoint not found');
  }

  if (checkpoint.incremental && checkpoint.parentId) {
    const parentState = await restoreFromCheckpoint(checkpoint.parentId);
    return { ...parentState, ...checkpoint.delta };
  }

  return checkpoint.state;
}

async function verifyCheckpoint(checkpointId) {
  const checkpoint = storage.checkpoints.get(checkpointId);
  if (!checkpoint) {
    return { valid: false, error: 'Checkpoint not found' };
  }

  const currentChecksum = generateChecksum(checkpoint.state);

  return {
    valid: currentChecksum === checkpoint.checksum,
    expected: checkpoint.checksum,
    actual: currentChecksum,
    checkpointId,
  };
}

async function listCheckpoints(workflowId, options = {}) {
  let checkpoints = Array.from(storage.checkpoints.values())
    .filter(c => c.workflowId === workflowId)
    .sort((a, b) => b.createdAt - a.createdAt);

  if (!options.includeDeleted) {
    checkpoints = checkpoints.filter(c => !c.deletedAt);
  }

  if (options.limit) {
    checkpoints = checkpoints.slice(0, options.limit);
  }

  return checkpoints;
}

async function deleteCheckpoint(checkpointId) {
  const checkpoint = storage.checkpoints.get(checkpointId);
  if (checkpoint) {
    checkpoint.deletedAt = Date.now();
    return true;
  }
  return false;
}

async function compareCheckpoints(checkpointId1, checkpointId2) {
  const state1 = await restoreFromCheckpoint(checkpointId1);
  const state2 = await restoreFromCheckpoint(checkpointId2);

  const differences = [];
  const allKeys = new Set([...Object.keys(state1), ...Object.keys(state2)]);

  for (const key of allKeys) {
    if (JSON.stringify(state1[key]) !== JSON.stringify(state2[key])) {
      differences.push({
        key,
        value1: state1[key],
        value2: state2[key],
      });
    }
  }

  return {
    checkpoint1: checkpointId1,
    checkpoint2: checkpointId2,
    differences,
    identical: differences.length === 0,
  };
}

async function pruneOldCheckpoints(workflowId, maxCheckpoints = MAX_CHECKPOINTS) {
  const checkpoints = await listCheckpoints(workflowId, { includeDeleted: true });

  if (checkpoints.length <= maxCheckpoints) {
    return { pruned: 0, remaining: checkpoints.filter(c => !c.deletedAt).length };
  }

  const toDelete = checkpoints.slice(maxCheckpoints);
  let pruned = 0;

  for (const cp of toDelete) {
    await deleteCheckpoint(cp.id);
    pruned++;
  }

  return {
    pruned,
    remaining: checkpoints.length - pruned,
  };
}

async function getLatestCheckpoint(workflowId) {
  const checkpoints = await listCheckpoints(workflowId);
  return checkpoints[0] || null;
}

async function getCheckpointChain(checkpointId) {
  const chain = [];
  let currentId = checkpointId;

  while (currentId) {
    const checkpoint = storage.checkpoints.get(currentId);
    if (!checkpoint) break;

    chain.push(checkpoint);
    currentId = checkpoint.parentId;
  }

  return chain.reverse();
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'checkpointing-engine', port: PORT });
});

app.post('/api/checkpoints', requireInternal, async (req, res) => {
  try {
    const { workflowId, state, metadata } = req.body;
    const checkpoint = await createCheckpoint(workflowId, state, metadata);
    res.json(checkpoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/checkpoints/incremental', requireInternal, async (req, res) => {
  try {
    const { workflowId, baseCheckpointId, deltaState, metadata } = req.body;
    const checkpoint = await createIncrementalCheckpoint(workflowId, baseCheckpointId, deltaState, metadata);
    res.json(checkpoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/checkpoints/:id', async (req, res) => {
  try {
    const checkpoint = storage.checkpoints.get(req.params.id);
    if (!checkpoint) {
      return res.status(404).json({ error: 'Checkpoint not found' });
    }
    res.json(checkpoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/checkpoints/:id/restore', requireInternal, async (req, res) => {
  try {
    const state = await restoreFromCheckpoint(req.params.id);
    res.json({ state });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/checkpoints/:id/verify', async (req, res) => {
  try {
    const result = await verifyCheckpoint(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/checkpoints/:id/chain', async (req, res) => {
  try {
    const chain = await getCheckpointChain(req.params.id);
    res.json(chain);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/checkpoints/:id', requireInternal, async (req, res) => {
  try {
    const deleted = await deleteCheckpoint(req.params.id);
    res.json({ deleted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows/:workflowId/checkpoints', async (req, res) => {
  try {
    const { limit, includeDeleted } = req.query;
    const checkpoints = await listCheckpoints(req.params.workflowId, {
      limit: limit ? parseInt(limit) : undefined,
      includeDeleted: includeDeleted === 'true',
    });
    res.json(checkpoints);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/workflows/:workflowId/checkpoints/latest', async (req, res) => {
  try {
    const checkpoint = await getLatestCheckpoint(req.params.workflowId);
    if (!checkpoint) {
      return res.status(404).json({ error: 'No checkpoints found' });
    }
    res.json(checkpoint);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/checkpoints/compare', requireInternal, async (req, res) => {
  try {
    const { checkpointId1, checkpointId2 } = req.body;
    const comparison = await compareCheckpoints(checkpointId1, checkpointId2);
    res.json(comparison);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/workflows/:workflowId/checkpoints/prune', requireInternal, async (req, res) => {
  try {
    const maxCheckpoints = req.body.maxCheckpoints || MAX_CHECKPOINTS;
    const result = await pruneOldCheckpoints(req.params.workflowId, maxCheckpoints);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/stats', (req, res) => {
  const stats = {
    totalCheckpoints: storage.checkpoints.size,
    activeCheckpoints: Array.from(storage.checkpoints.values()).filter(c => !c.deletedAt).length,
    deletedCheckpoints: Array.from(storage.checkpoints.values()).filter(c => c.deletedAt).length,
    totalSnapshots: storage.snapshots.size,
    workflows: new Set(Array.from(storage.checkpoints.values()).map(c => c.workflowId)).size,
  };
  res.json(stats);
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
  console.log(`Checkpointing Engine running on port ${PORT}`);
});

export { app, createCheckpoint, createIncrementalCheckpoint, restoreFromCheckpoint, verifyCheckpoint, listCheckpoints, deleteCheckpoint, compareCheckpoints, pruneOldCheckpoints, getLatestCheckpoint, getCheckpointChain };