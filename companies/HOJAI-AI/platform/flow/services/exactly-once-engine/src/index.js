/**
 * Exactly-Once Engine (Port 5377)
 * Phase 1.3 - Exactly-Once Semantics for FlowOS
 *
 * Ensures workflow steps execute exactly once even with retries.
 * Key features:
 * - Idempotency keys per workflow run
 * - In-memory deduplication (Redis-ready interface)
 * - Execution deduplication
 * - Result caching
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

const PORT = parseInt(process.env.PORT, 10) || 5377;
const SERVICE_NAME = 'exactly-once-engine';
const DATA_DIR = process.env.EXACTLY_ONCE_DATA_DIR || path.join(__dirname, '../data');
const KEY_TTL = parseInt(process.env.KEY_TTL, 10) || 86400; // 24 hours
const MAX_RETENTION = parseInt(process.env.MAX_RETENTION, 10) || 7 * 86400; // 7 days

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (_) {}
}

function getKeysPath() { return path.join(DATA_DIR, 'idempotency-keys.json'); }
function getResultsPath() { return path.join(DATA_DIR, 'execution-results.json'); }

function loadData(filePath, defaultVal = {}) {
  try {
    if (!fs.existsSync(filePath)) return defaultVal;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (_) { return defaultVal; }
}

function saveData(filePath, data) {
  ensureDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// In-memory stores
let idempotencyKeys = loadData(getKeysPath());
let executionResults = loadData(getResultsPath());

// ============================================================================
// IDEMPOTENCY TYPES
// ============================================================================

const KEY_TYPES = {
  WORKFLOW: 'workflow',
  STEP: 'step',
  ACTION: 'action',
  EVENT: 'event'
};

const EXECUTION_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  DUPLICATE: 'duplicate'
};

// ============================================================================
// IDEMPOTENCY FUNCTIONS
// ============================================================================

/**
 * Generate idempotency key for workflow/step
 */
function generateKey(workflowId, stepId, options = {}) {
  const { type = KEY_TYPES.STEP, customKey } = options;

  if (customKey) {
    return customKey;
  }

  const seed = `${workflowId}:${stepId}:${options.action || ''}:${options.contextHash || ''}`;
  return crypto.createHash('sha256').update(seed).digest('hex').substring(0, 32);
}

/**
 * Check if key exists and is valid
 */
function checkKey(key) {
  const entry = idempotencyKeys[key];

  if (!entry) {
    return { exists: false, status: null };
  }

  // Check expiration
  if (entry.expiresAt && Date.now() > entry.expiresAt) {
    return { exists: true, status: EXECUTION_STATUS.EXPIRED, entry };
  }

  return {
    exists: true,
    status: entry.status,
    entry,
    isProcessing: entry.status === EXECUTION_STATUS.PROCESSING,
    canRetry: entry.status === EXECUTION_STATUS.FAILED
  };
}

/**
 * Acquire idempotency lock (claim the key)
 */
function acquireLock(key, options = {}) {
  const { workflowId, stepId, ttl = KEY_TTL, context = {} } = options;

  // Check if key exists
  const existing = checkKey(key);

  if (existing.exists) {
    if (existing.isProcessing) {
      // Check for dead lock (stuck processing)
      const lockAge = Date.now() - existing.entry.lockedAt;
      const maxLockAge = (ttl * 1000) / 2; // Half the TTL

      if (lockAge > maxLockAge) {
        // Force release dead lock
        releaseLock(key);
      } else {
        return { acquired: false, reason: 'already_locked', existingEntry: existing.entry };
      }
    } else if (existing.status === EXECUTION_STATUS.COMPLETED) {
      return {
        acquired: false,
        reason: 'already_completed',
        existingEntry: existing.entry,
        cachedResult: executionResults[key]
      };
    } else if (existing.status === EXECUTION_STATUS.FAILED && !existing.canRetry) {
      return { acquired: false, reason: 'not_retryable', existingEntry: existing.entry };
    }
  }

  // Acquire lock
  idempotencyKeys[key] = {
    key,
    workflowId,
    stepId,
    status: EXECUTION_STATUS.PROCESSING,
    contextHash: options.contextHash,
    createdAt: Date.now(),
    lockedAt: Date.now(),
    expiresAt: Date.now() + (ttl * 1000),
    attempts: (existing.entry?.attempts || 0) + 1
  };

  saveData(getKeysPath(), idempotencyKeys);

  return { acquired: true, entry: idempotencyKeys[key] };
}

/**
 * Release idempotency lock
 */
function releaseLock(key) {
  if (idempotencyKeys[key]) {
    delete idempotencyKeys[key];
    saveData(getKeysPath(), idempotencyKeys);
  }
}

/**
 * Mark execution as completed
 */
function markCompleted(key, result, options = {}) {
  const { ttl = KEY_TTL } = options;

  if (!idempotencyKeys[key]) {
    throw new Error('Key not found - must acquire lock first');
  }

  idempotencyKeys[key].status = EXECUTION_STATUS.COMPLETED;
  idempotencyKeys[key].completedAt = Date.now();
  idempotencyKeys[key].resultChecksum = calculateChecksum(result);
  idempotencyKeys[key].expiresAt = Date.now() + (ttl * 1000);

  // Store result
  executionResults[key] = {
    key,
    result,
    checksum: idempotencyKeys[key].resultChecksum,
    storedAt: Date.now()
  };

  saveData(getKeysPath(), idempotencyKeys);
  saveData(getResultsPath(), executionResults);

  return { success: true, resultChecksum: idempotencyKeys[key].resultChecksum };
}

/**
 * Mark execution as failed
 */
function markFailed(key, error, options = {}) {
  const { retryable = true, maxAttempts = 3 } = options;

  if (!idempotencyKeys[key]) {
    throw new Error('Key not found');
  }

  const entry = idempotencyKeys[key];

  if (entry.attempts >= maxAttempts) {
    idempotencyKeys[key].status = EXECUTION_STATUS.FAILED;
    idempotencyKeys[key].notRetryable = true;
  }

  idempotencyKeys[key].failedAt = Date.now();
  idempotencyKeys[key].lastError = typeof error === 'string' ? error : error.message;

  saveData(getKeysPath(), idempotencyKeys);

  return {
    success: true,
    canRetry: entry.attempts < maxAttempts,
    attempts: entry.attempts
  };
}

/**
 * Get cached result for key
 */
function getCachedResult(key) {
  return executionResults[key] || null;
}

/**
 * Calculate result checksum
 */
function calculateChecksum(result) {
  const serialized = JSON.stringify(result);
  return crypto.createHash('sha256').update(serialized).digest('hex').substring(0, 16);
}

/**
 * Verify result integrity
 */
function verifyResult(key) {
  const entry = idempotencyKeys[key];
  const cached = executionResults[key];

  if (!entry || !cached) {
    return { valid: false, error: 'Not found' };
  }

  const currentChecksum = calculateChecksum(cached.result);
  return {
    valid: currentChecksum === cached.checksum,
    expectedChecksum: cached.checksum,
    actualChecksum: currentChecksum,
    verifiedAt: Date.now()
  };
}

/**
 * Execute with exactly-once guarantee
 */
async function executeOnce(key, executor, options = {}) {
  const { ttl = KEY_TTL, maxAttempts = 3 } = options;

  // Try to acquire lock
  const lockResult = acquireLock(key, { ...options, ttl });

  if (!lockResult.acquired) {
    if (lockResult.cachedResult) {
      return {
        executed: false,
        reason: 'duplicate',
        cachedResult: lockResult.cachedResult.result
      };
    }
    return {
      executed: false,
      reason: 'lock_failed',
      error: lockResult.reason
    };
  }

  try {
    // Execute the function
    const result = await executor();

    // Mark as completed
    markCompleted(key, result, { ttl });

    return {
      executed: true,
      result
    };

  } catch (error) {
    // Mark as failed
    const failedResult = markFailed(key, error, { retryable: true, maxAttempts });

    // Release lock for retry
    releaseLock(key);

    return {
      executed: false,
      reason: 'execution_failed',
      error: error.message,
      canRetry: failedResult.canRetry,
      attempts: failedResult.attempts
    };
  }
}

/**
 * Clean up expired keys
 */
function cleanup() {
  const now = Date.now();
  let cleaned = 0;

  Object.keys(idempotencyKeys).forEach(key => {
    const entry = idempotencyKeys[key];

    if (entry.expiresAt && now > entry.expiresAt) {
      delete idempotencyKeys[key];
      cleaned++;
    }
  });

  Object.keys(executionResults).forEach(key => {
    const entry = executionResults[key];
    if (now - entry.storedAt > MAX_RETENTION) {
      delete executionResults[key];
      cleaned++;
    }
  });

  saveData(getKeysPath(), idempotencyKeys);
  saveData(getResultsPath(), executionResults);

  return { cleaned };
}

/**
 * Get statistics
 */
function getStats() {
  const now = Date.now();
  const stats = {
    totalKeys: Object.keys(idempotencyKeys).length,
    byStatus: {},
    expiredKeys: 0,
    cachedResults: Object.keys(executionResults).length
  };

  Object.values(idempotencyKeys).forEach(entry => {
    stats.byStatus[entry.status] = (stats.byStatus[entry.status] || 0) + 1;
    if (entry.expiresAt && now > entry.expiresAt) {
      stats.expiredKeys++;
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
    keys: Object.keys(idempotencyKeys).length,
    results: Object.keys(executionResults).length,
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Generate idempotency key
app.post('/api/keys/generate', (req, res) => {
  const { workflowId, stepId, customKey, contextHash } = req.body;

  if (!workflowId || !stepId) {
    return res.status(400).json({ error: 'workflowId and stepId are required' });
  }

  const key = generateKey(workflowId, stepId, { customKey, contextHash });

  res.json({ key, workflowId, stepId });
});

// Check key status
app.get('/api/keys/:key', (req, res) => {
  const { key } = req.params;
  const result = checkKey(key);

  if (!result.exists) {
    return res.status(404).json({ exists: false });
  }

  res.json({
    exists: true,
    status: result.status,
    entry: result.entry,
    cachedResult: result.status === EXECUTION_STATUS.COMPLETED ? executionResults[key] : null
  });
});

// Acquire lock
app.post('/api/keys/:key/acquire', (req, res) => {
  const { key } = req.params;
  const { workflowId, stepId, ttl, contextHash } = req.body;

  if (!workflowId || !stepId) {
    return res.status(400).json({ error: 'workflowId and stepId are required' });
  }

  const result = acquireLock(key, { workflowId, stepId, ttl, contextHash });

  res.json(result);
});

// Release lock
app.post('/api/keys/:key/release', (req, res) => {
  const { key } = req.params;
  releaseLock(key);
  res.json({ success: true });
});

// Mark completed
app.post('/api/keys/:key/complete', (req, res) => {
  const { key } = req.params;
  const { result, ttl } = req.body;

  if (result === undefined) {
    return res.status(400).json({ error: 'result is required' });
  }

  try {
    const completeResult = markCompleted(key, result, { ttl });
    res.json(completeResult);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Mark failed
app.post('/api/keys/:key/fail', (req, res) => {
  const { key } = req.params;
  const { error, retryable, maxAttempts } = req.body;

  const result = markFailed(key, error || 'Unknown error', { retryable, maxAttempts });
  res.json(result);
});

// Get cached result
app.get('/api/results/:key', (req, res) => {
  const { key } = req.params;
  const result = getCachedResult(key);

  if (!result) {
    return res.status(404).json({ error: 'No cached result' });
  }

  res.json({ result: result.result, checksum: result.checksum });
});

// Verify result integrity
app.get('/api/verify/:key', (req, res) => {
  const { key } = req.params;
  const result = verifyResult(key);
  res.json(result);
});

// Get statistics
app.get('/api/stats', (req, res) => {
  res.json({ stats: getStats() });
});

// Cleanup
app.post('/api/cleanup', (req, res) => {
  const result = cleanup();
  res.json(result);
});

// List all keys (for debugging)
app.get('/api/keys', (req, res) => {
  const { workflowId, status, limit = 100 } = req.query;

  let keys = Object.values(idempotencyKeys);

  if (workflowId) {
    keys = keys.filter(k => k.workflowId === workflowId);
  }

  if (status) {
    keys = keys.filter(k => k.status === status);
  }

  res.json({
    count: keys.length,
    keys: keys.slice(0, parseInt(limit))
  });
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  ensureDir();
  console.log(`[${SERVICE_NAME}] Exactly-Once Engine started on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] Data directory: ${DATA_DIR}`);
  console.log(`[${SERVICE_NAME}] Key TTL: ${KEY_TTL}s`);

  // Periodic cleanup every hour
  setInterval(cleanup, 3600000);
});

module.exports = {
  KEY_TYPES,
  EXECUTION_STATUS,
  generateKey,
  checkKey,
  acquireLock,
  releaseLock,
  markCompleted,
  markFailed,
  getCachedResult,
  verifyResult,
  executeOnce,
  cleanup,
  getStats
};
