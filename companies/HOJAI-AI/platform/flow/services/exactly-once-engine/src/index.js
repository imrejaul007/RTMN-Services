/**
 * Exactly-Once Engine - Ensures workflow steps and actions execute exactly once
 * even with retries, network failures, or duplicate requests
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
const PORT = process.env.PORT || 5377;

app.use(cors());
app.use(express.json());

// In-memory storage (replace with Redis/DB in production)
const storage = {
  keys: new Map(),
  locks: new Map(),
  results: new Map(),
};

// Configuration
const KEY_TYPES = {
  WORKFLOW: 'workflow',
  STEP: 'step',
  ACTION: 'action',
  EVENT: 'event',
};

const EXECUTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DUPLICATE: 'duplicate',
};

const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours
const LOCK_TTL = 60 * 1000; // 1 minute

// Utility functions
function generateKey(type, namespace, identifier) {
  return `eo:${type}:${namespace}:${identifier}`;
}

function generateExecutionId() {
  return crypto.randomUUID();
}

// Core operations
async function checkKey(keyType, namespace, identifier) {
  const key = generateKey(keyType, namespace, identifier);
  const record = storage.keys.get(key);

  if (!record) {
    return { exists: false, status: null };
  }

  if (record.expiresAt && record.expiresAt < Date.now()) {
    storage.keys.delete(key);
    return { exists: false, status: null };
  }

  return { exists: true, status: record.status };
}

async function acquireLock(lockType, namespace, identifier, ownerId = null) {
  const lockKey = `lock:${lockType}:${namespace}:${identifier}`;
  const effectiveOwnerId = ownerId || generateExecutionId();

  const existing = storage.locks.get(lockKey);
  if (existing && existing.ownerId !== effectiveOwnerId && existing.expiresAt > Date.now()) {
    return { acquired: false, lockKey, ownerId: effectiveOwnerId };
  }

  storage.locks.set(lockKey, {
    ownerId: effectiveOwnerId,
    expiresAt: Date.now() + LOCK_TTL,
  });

  return { acquired: true, lockKey, ownerId: effectiveOwnerId };
}

async function releaseLock(lockType, namespace, identifier, ownerId) {
  const lockKey = `lock:${lockType}:${namespace}:${identifier}`;
  const existing = storage.locks.get(lockKey);

  if (existing && existing.ownerId === ownerId) {
    storage.locks.delete(lockKey);
    return true;
  }
  return false;
}

async function markProcessing(keyType, namespace, identifier, executionId) {
  const key = generateKey(keyType, namespace, identifier);
  storage.keys.set(key, {
    status: EXECUTION_STATUS.PROCESSING,
    executionId,
    startedAt: Date.now(),
    updatedAt: Date.now(),
    expiresAt: Date.now() + DEFAULT_TTL,
  });
  return true;
}

async function markCompleted(keyType, namespace, identifier, result) {
  const key = generateKey(keyType, namespace, identifier);
  const record = storage.keys.get(key);

  storage.keys.set(key, {
    status: EXECUTION_STATUS.COMPLETED,
    executionId: record?.executionId,
    startedAt: record?.startedAt,
    completedAt: Date.now(),
    result,
    expiresAt: Date.now() + DEFAULT_TTL,
  });

  if (result && result.id) {
    storage.results.set(result.id, result);
  }

  return true;
}

async function markFailed(keyType, namespace, identifier, error) {
  const key = generateKey(keyType, namespace, identifier);
  const record = storage.keys.get(key);

  storage.keys.set(key, {
    status: EXECUTION_STATUS.FAILED,
    executionId: record?.executionId,
    startedAt: record?.startedAt,
    failedAt: Date.now(),
    error: typeof error === 'string' ? error : error.message,
    expiresAt: Date.now() + DEFAULT_TTL,
    retryCount: (record?.retryCount || 0),
  });

  return true;
}

async function markDuplicate(keyType, namespace, identifier, originalExecutionId) {
  const key = generateKey(keyType, namespace, identifier);

  storage.keys.set(key, {
    status: EXECUTION_STATUS.DUPLICATE,
    originalExecutionId,
    detectedAt: Date.now(),
    expiresAt: Date.now() + DEFAULT_TTL,
  });

  return true;
}

async function getResult(keyType, namespace, identifier) {
  const key = generateKey(keyType, namespace, identifier);
  const record = storage.keys.get(key);

  if (!record || record.status !== EXECUTION_STATUS.COMPLETED) {
    return null;
  }

  return record.result;
}

async function executeOnce(keyType, namespace, identifier, fn, options = {}) {
  const { ownerId = generateExecutionId() } = options;

  // Check if already executed
  const existing = await checkKey(keyType, namespace, identifier);
  if (existing.exists) {
    if (existing.status === EXECUTION_STATUS.COMPLETED) {
      const result = await getResult(keyType, namespace, identifier);
      return { executed: false, duplicate: true, result };
    }
    if (existing.status === EXECUTION_STATUS.PROCESSING) {
      return { executed: false, duplicate: false, reason: 'already_processing' };
    }
  }

  // Acquire lock
  const lockResult = await acquireLock(keyType, namespace, identifier, ownerId);
  if (!lockResult.acquired) {
    return { executed: false, duplicate: false, reason: 'lock_failed' };
  }

  // Mark as processing
  await markProcessing(keyType, namespace, identifier, ownerId);

  try {
    const result = await fn();

    await markCompleted(keyType, namespace, identifier, result);
    await releaseLock(keyType, namespace, identifier, ownerId);

    return { executed: true, duplicate: false, result };
  } catch (error) {
    await markFailed(keyType, namespace, identifier, error);
    await releaseLock(keyType, namespace, identifier, ownerId);

    return { executed: false, duplicate: false, reason: 'execution_failed', error: error.message };
  }
}

async function retryFailed(keyType, namespace, identifier, maxRetries = 3) {
  const key = generateKey(keyType, namespace, identifier);
  const record = storage.keys.get(key);

  if (!record) {
    return { retried: false, reason: 'not_found' };
  }

  if (record.status !== EXECUTION_STATUS.FAILED) {
    return { retried: false, reason: 'not_failed' };
  }

  if ((record.retryCount || 0) >= maxRetries) {
    return { retried: false, reason: 'max_retries_exceeded' };
  }

  record.retryCount = (record.retryCount || 0) + 1;
  record.status = EXECUTION_STATUS.PENDING;
  record.updatedAt = Date.now();

  storage.keys.set(key, record);

  return { retried: true, retryCount: record.retryCount };
}

async function getStats() {
  let total = 0;
  const counts = {
    completed: 0,
    processing: 0,
    failed: 0,
    pending: 0,
    duplicate: 0,
  };

  for (const record of storage.keys.values()) {
    total++;
    switch (record.status) {
      case EXECUTION_STATUS.COMPLETED: counts.completed++; break;
      case EXECUTION_STATUS.PROCESSING: counts.processing++; break;
      case EXECUTION_STATUS.FAILED: counts.failed++; break;
      case EXECUTION_STATUS.PENDING: counts.pending++; break;
      case EXECUTION_STATUS.DUPLICATE: counts.duplicate++; break;
    }
  }

  const hitRate = total > 0 ? ((counts.duplicate / total) * 100).toFixed(2) + '%' : '0%';

  return {
    total,
    byStatus: counts,
    hitRate,
  };
}

// API Routes
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'exactly-once-engine', port: PORT });
});

app.get('/api/status', async (req, res) => {
  try {
    const stats = await getStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/keys/check', requireInternal, async (req, res) => {
  try {
    const { keyType, namespace, identifier } = req.body;
    const result = await checkKey(keyType, namespace, identifier);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/keys/generate', requireInternal, async (req, res) => {
  try {
    const { keyType, namespace, identifier } = req.body;
    const key = generateKey(keyType, namespace, identifier);
    res.json({ key });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/locks/acquire', requireInternal, async (req, res) => {
  try {
    const { lockType, namespace, identifier, ownerId } = req.body;
    const result = await acquireLock(lockType, namespace, identifier, ownerId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/locks/release', requireInternal, async (req, res) => {
  try {
    const { lockType, namespace, identifier, ownerId } = req.body;
    const released = await releaseLock(lockType, namespace, identifier, ownerId);
    res.json({ released });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/execution/mark', requireInternal, async (req, res) => {
  try {
    const { keyType, namespace, identifier, status, executionId, result, error } = req.body;

    switch (status) {
      case 'processing':
        await markProcessing(keyType, namespace, identifier, executionId);
        break;
      case 'completed':
        await markCompleted(keyType, namespace, identifier, result);
        break;
      case 'failed':
        await markFailed(keyType, namespace, identifier, error);
        break;
      case 'duplicate':
        await markDuplicate(keyType, namespace, identifier, executionId);
        break;
      default:
        return res.status(400).json({ error: 'Invalid status' });
    }

    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/execution/result', requireInternal, async (req, res) => {
  try {
    const { keyType, namespace, identifier } = req.body;
    const result = await getResult(keyType, namespace, identifier);
    res.json({ result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/execution/retry', requireInternal, async (req, res) => {
  try {
    const { keyType, namespace, identifier, maxRetries } = req.body;
    const result = await retryFailed(keyType, namespace, identifier, maxRetries);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/execute-once', requireInternal, async (req, res) => {
  try {
    const { keyType, namespace, identifier, ownerId } = req.body;

    // In real usage, the function would be passed differently
    // Here we demonstrate the interface
    res.json({
      message: 'Use the SDK for executeOnce with a function',
      keyType,
      namespace,
      identifier,
      ownerId
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/cleanup', requireInternal, async (req, res) => {
  try {
    const expiresBefore = req.body.expiresBefore || Date.now();
    let cleaned = 0;

    for (const [key, record] of storage.keys.entries()) {
      if (record.expiresAt && record.expiresAt < expiresBefore) {
        storage.keys.delete(key);
        cleaned++;
      }
    }

    res.json({ cleaned });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/key-types', (req, res) => {
  res.json(KEY_TYPES);
});

app.get('/api/status-types', (req, res) => {
  res.json(EXECUTION_STATUS);
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
  console.log(`Exactly-Once Engine running on port ${PORT}`);
});

export { app, generateKey, checkKey, acquireLock, releaseLock, markProcessing, markCompleted, markFailed, executeOnce, getStats, KEY_TYPES, EXECUTION_STATUS };