/**
 * LoopOS Retry Engine
 * Circuit breaker, exponential backoff, and retry policies
 * Port: 4743
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4743;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// Circuit breaker states
const STATES = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Failing, reject requests
  HALF_OPEN: 'half_open' // Testing if recovery possible
};

// In-memory stores
const circuits = new Map();      // circuitId -> CircuitBreaker
const retryPolicies = new Map(); // policyId -> RetryPolicy
const retryHistory = new Map();  // historyId -> RetryAttempt[]

// Default retry policy
const DEFAULT_POLICY = {
  maxRetries: 3,
  baseDelay: 1000,        // 1 second
  maxDelay: 60000,        // 1 minute
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: ['timeout', 'network', 'server_error'],
  circuitBreaker: {
    enabled: true,
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000  // 30 seconds
  }
};

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'loopos-retry-engine',
  version: '1.0.0',
  port: PORT,
  activeCircuits: circuits.size,
  policies: retryPolicies.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Circuit Breaker Management ──────────────────────────

/**
 * Get circuit status
 * GET /api/circuits/:id
 */
app.get('/api/circuits/:id', (req, res) => {
  const circuit = circuits.get(req.params.id);
  if (!circuit) {
    return res.status(404).json({ error: 'circuit not found' });
  }
  res.json(getCircuitStatus(circuit));
});

/**
 * List all circuits
 * GET /api/circuits
 */
app.get('/api/circuits', (req, res) => {
  const { status } = req.query;
  let items = [...circuits.values()].map(getCircuitStatus);

  if (status) items = items.filter(c => c.state === status);

  res.json({ count: items.length, circuits: items });
});

/**
 * Reset a circuit
 * POST /api/circuits/:id/reset
 */
app.post('/api/circuits/:id/reset', requireAuth, (req, res) => {
  const circuit = circuits.get(req.params.id);
  if (!circuit) return res.status(404).json({ error: 'circuit not found' });

  circuit.state = STATES.CLOSED;
  circuit.failureCount = 0;
  circuit.successCount = 0;
  circuit.nextAttempt = null;

  logger.info(`Circuit ${req.params.id} reset to CLOSED`);
  res.json(getCircuitStatus(circuit));
});

// ── Retry Policies ─────────────────────────────────────

/**
 * Create retry policy
 * POST /api/policies
 */
app.post('/api/policies', requireAuth, (req, res) => {
  const { name, ...policyConfig } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = `policy-${randomUUID().slice(0, 8)}`;
  const policy = {
    id,
    name,
    ...DEFAULT_POLICY,
    ...policyConfig,
    createdAt: new Date().toISOString()
  };

  retryPolicies.set(id, policy);
  logger.info(`Retry policy created: ${id} (${name})`);
  res.status(201).json(policy);
});

/**
 * Get policy
 * GET /api/policies/:id
 */
app.get('/api/policies/:id', (req, res) => {
  const policy = retryPolicies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'policy not found' });
  res.json(policy);
});

/**
 * List policies
 * GET /api/policies
 */
app.get('/api/policies', (req, res) => {
  const items = [...retryPolicies.values()];
  res.json({ count: items.length, policies: items });
});

/**
 * Update policy
 * PUT /api/policies/:id
 */
app.put('/api/policies/:id', requireAuth, (req, res) => {
  const policy = retryPolicies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'policy not found' });

  const updates = req.body || {};
  const allowed = ['maxRetries', 'baseDelay', 'maxDelay', 'backoffMultiplier', 'retryableErrors'];

  for (const key of allowed) {
    if (updates[key] !== undefined) policy[key] = updates[key];
  }

  res.json(policy);
});

// ── Execute with Retry ──────────────────────────────────

/**
 * Execute with retry policy
 * POST /api/execute
 */
app.post('/api/execute', requireAuth, async (req, res) => {
  const { actionId, action, policyId, circuitId, maxCost, timeout = 30000 } = req.body || {};

  if (!action) return res.status(400).json({ error: 'action is required' });

  // Get or create circuit
  const circuit = circuitId ? circuits.get(circuitId) : getOrCreateCircuit(circuitId || `circuit-${actionId}`);

  // Check circuit breaker
  if (!canExecute(circuit)) {
    return res.status(503).json({
      error: 'Circuit breaker open',
      circuitState: circuit.state,
      nextRetry: circuit.nextAttempt,
      retryAfter: circuit.nextAttempt ? Math.max(0, circuit.nextAttempt - Date.now()) : null
    });
  }

  // Get policy
  const policy = policyId ? retryPolicies.get(policyId) : DEFAULT_POLICY;

  // Execute with retry
  const result = await executeWithRetry(action, circuit, policy, { maxCost, timeout });

  res.json(result);
});

/**
 * Check if circuit allows execution
 * POST /api/circuits/:id/can-execute
 */
app.post('/api/circuits/:id/can-execute', (req, res) => {
  const circuit = circuits.get(req.params.id);
  if (!circuit) return res.status(404).json({ error: 'circuit not found' });

  const allowed = canExecute(circuit);
  res.json({
    allowed,
    state: circuit.state,
    nextRetry: circuit.nextAttempt,
    reason: allowed ? 'Circuit is closed or half-open' : 'Circuit is open'
  });
});

// ── Retry History ───────────────────────────────────────

/**
 * Get retry history
 * GET /api/history/:actionId
 */
app.get('/api/history/:actionId', (req, res) => {
  const history = retryHistory.get(req.params.actionId) || [];
  res.json({ actionId: req.params.actionId, count: history.length, attempts: history });
});

/**
 * Clear retry history
 * DELETE /api/history/:actionId
 */
app.delete('/api/history/:actionId', requireAuth, (req, res) => {
  retryHistory.delete(req.params.actionId);
  res.json({ cleared: true, actionId: req.params.actionId });
});

// ── Execute with Retry Logic ────────────────────────────

async function executeWithRetry(action, circuit, policy, options = {}) {
  const { maxCost, timeout } = options;
  const attempts = [];
  let lastError;
  let totalCost = 0;
  const startTime = Date.now();

  // Ensure history exists
  if (!retryHistory.has(action.id)) {
    retryHistory.set(action.id, []);
  }

  for (let attempt = 0; attempt <= policy.maxRetries; attempt++) {
    const attemptStart = Date.now();
    let attemptCost = 0;

    try {
      // Check cost limit
      if (maxCost && totalCost >= maxCost) {
        throw new Error(`Cost limit exceeded: ${totalCost} >= ${maxCost}`);
      }

      // Check timeout
      if (Date.now() - startTime >= timeout) {
        throw new Error(`Timeout exceeded: ${timeout}ms`);
      }

      // Execute the action
      // In real implementation, this would call the actual function
      const result = await executeAction(action, attempt);

      // Success!
      const attemptResult = {
        attempt: attempt + 1,
        status: 'success',
        duration: Date.now() - attemptStart,
        cost: attemptCost,
        result,
        timestamp: new Date().toISOString()
      };

      attempts.push(attemptResult);
      retryHistory.get(action.id).push(attemptResult);

      // Record success for circuit breaker
      recordSuccess(circuit, policy);

      return {
        success: true,
        attempts: attempts.length,
        totalDuration: Date.now() - startTime,
        totalCost,
        result
      };

    } catch (err) {
      lastError = err;
      attemptCost = Math.random() * 0.1; // Simulate cost
      totalCost += attemptCost;

      const attemptResult = {
        attempt: attempt + 1,
        status: 'failed',
        error: err.message,
        duration: Date.now() - attemptStart,
        cost: attemptCost,
        timestamp: new Date().toISOString()
      };

      attempts.push(attemptResult);
      retryHistory.get(action.id).push(attemptResult);

      // Check if error is retryable
      if (!isRetryable(err, policy) || attempt >= policy.maxRetries) {
        // Record failure for circuit breaker
        recordFailure(circuit, policy);

        return {
          success: false,
          attempts: attempts.length,
          totalDuration: Date.now() - startTime,
          totalCost,
          error: err.message,
          lastError: err.message
        };
      }

      // Calculate delay with exponential backoff
      const delay = calculateDelay(attempt, policy);
      logger.info(`Retrying action ${action.id} in ${delay}ms (attempt ${attempt + 1}/${policy.maxRetries})`);

      await sleep(delay);
    }
  }

  // Should not reach here, but handle it
  recordFailure(circuit, policy);
  return {
    success: false,
    attempts: attempts.length,
    totalDuration: Date.now() - startTime,
    totalCost,
    error: lastError?.message || 'Unknown error'
  };
}

async function executeAction(action, attempt) {
  // Simulate action execution
  // In real implementation, this would call the actual function
  if (action.execute) {
    return await action.execute();
  }

  // For demo purposes, simulate occasional failures
  if (Math.random() < 0.3 - (attempt * 0.1)) {
    throw new Error('Simulated failure');
  }

  return { success: true, data: 'Action completed', attempt };
}

function calculateDelay(attempt, policy) {
  let delay = policy.baseDelay * Math.pow(policy.backoffMultiplier, attempt);
  delay = Math.min(delay, policy.maxDelay);

  // Add jitter
  if (policy.jitter) {
    delay = delay * (0.5 + Math.random());
  }

  return Math.round(delay);
}

function isRetryable(error, policy) {
  const errorType = categorizeError(error);
  return policy.retryableErrors.includes(errorType);
}

function categorizeError(error) {
  const message = error.message.toLowerCase();
  if (message.includes('timeout')) return 'timeout';
  if (message.includes('network') || message.includes('ECONNREFUSED')) return 'network';
  if (message.includes('500') || message.includes('server error')) return 'server_error';
  if (message.includes('429') || message.includes('rate limit')) return 'rate_limit';
  return 'unknown';
}

// ── Circuit Breaker Logic ──────────────────────────────

function getOrCreateCircuit(id) {
  if (!circuits.has(id)) {
    circuits.set(id, {
      id,
      state: STATES.CLOSED,
      failureCount: 0,
      successCount: 0,
      lastFailure: null,
      nextAttempt: null,
      totalRequests: 0,
      totalFailures: 0,
      totalSuccesses: 0
    });
  }
  return circuits.get(id);
}

function canExecute(circuit) {
  if (circuit.state === STATES.CLOSED) return true;

  if (circuit.state === STATES.OPEN) {
    // Check if timeout has passed
    if (circuit.nextAttempt && Date.now() >= circuit.nextAttempt) {
      circuit.state = STATES.HALF_OPEN;
      logger.info(`Circuit ${circuit.id} transitioning to HALF_OPEN`);
      return true;
    }
    return false;
  }

  // HALF_OPEN - allow one test request
  return true;
}

function recordSuccess(circuit, policy) {
  circuit.successCount++;
  circuit.totalSuccesses++;
  circuit.totalRequests++;

  if (circuit.state === STATES.HALF_OPEN) {
    if (circuit.successCount >= (policy.circuitBreaker.successThreshold || 2)) {
      circuit.state = STATES.CLOSED;
      circuit.failureCount = 0;
      circuit.successCount = 0;
      logger.info(`Circuit ${circuit.id} recovered to CLOSED`);
    }
  } else {
    circuit.failureCount = 0;
  }
}

function recordFailure(circuit, policy) {
  circuit.failureCount++;
  circuit.totalFailures++;
  circuit.totalRequests++;
  circuit.lastFailure = new Date().toISOString();

  if (circuit.state === STATES.HALF_OPEN) {
    // Immediately open again
    circuit.state = STATES.OPEN;
    circuit.nextAttempt = Date.now() + (policy.circuitBreaker.timeout || 30000);
    logger.warn(`Circuit ${circuit.id} failed during HALF_OPEN, returning to OPEN`);
  } else if (circuit.failureCount >= (policy.circuitBreaker.failureThreshold || 5)) {
    circuit.state = STATES.OPEN;
    circuit.nextAttempt = Date.now() + (policy.circuitBreaker.timeout || 30000);
    logger.warn(`Circuit ${circuit.id} opened due to ${circuit.failureCount} failures`);
  }
}

function getCircuitStatus(circuit) {
  return {
    id: circuit.id,
    state: circuit.state,
    failureCount: circuit.failureCount,
    successCount: circuit.successCount,
    totalRequests: circuit.totalRequests,
    totalFailures: circuit.totalFailures,
    totalSuccesses: circuit.totalSuccesses,
    lastFailure: circuit.lastFailure,
    nextAttempt: circuit.nextAttempt,
    healthScore: circuit.totalRequests > 0
      ? Math.round((circuit.totalSuccesses / circuit.totalRequests) * 100)
      : 100
  };
}

// ── Helpers ───────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Periodic circuit health check
setInterval(() => {
  for (const [id, circuit] of circuits) {
    if (circuit.state === STATES.OPEN && circuit.nextAttempt) {
      if (Date.now() >= circuit.nextAttempt) {
        circuit.state = STATES.HALF_OPEN;
        logger.info(`Circuit ${id} timeout passed, transitioning to HALF_OPEN`);
      }
    }
  }
}, 5000);

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`LoopOS Retry Engine listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;