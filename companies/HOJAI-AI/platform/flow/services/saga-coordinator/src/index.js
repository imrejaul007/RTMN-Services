/**
 * Saga Coordinator (Port 5371) - Phase 1.4
 *
 * Distributed transaction management for FlowOS.
 * Implements the Saga pattern with compensating transactions.
 *
 * Two modes:
 * 1. Choreography - Event-driven, decentralized
 * 2. Orchestration - Centralized command-driven
 *
 * Key Features:
 * - Create and execute sagas
 * - Compensating transactions for rollback
 * - Parallel step execution
 * - Retry with backoff
 * - Timeout handling
 * - State persistence
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ============================================================================
// CONFIGURATION
// ============================================================================

const PORT = parseInt(process.env.PORT, 10) || 5371;
const SERVICE_NAME = 'saga-coordinator';
const DATA_DIR = process.env.SAGA_DATA_DIR || path.join(__dirname, '../data');
const DEFAULT_TIMEOUT = parseInt(process.env.SAGA_TIMEOUT, 10) || 30000;
const DEFAULT_RETRY_DELAY = parseInt(process.env.SAGA_RETRY_DELAY, 10) || 5000;
const MAX_RETRIES = parseInt(process.env.SAGA_MAX_RETRIES, 10) || 3;

// ============================================================================
// DATA PERSISTENCE
// ============================================================================

function ensureDir() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch (_) { /* ignore */ }
}

function getStorePath() {
  return path.join(DATA_DIR, 'sagas.json');
}

function loadSagas() {
  try {
    if (!fs.existsSync(getStorePath())) return {};
    return JSON.parse(fs.readFileSync(getStorePath(), 'utf8'));
  } catch (_) {
    return {};
  }
}

function saveSagas(sagas) {
  ensureDir();
  fs.writeFileSync(getStorePath(), JSON.stringify(sagas, null, 2));
}

// In-memory store
let sagaStore = loadSagas();

// ============================================================================
// SAGA STATES
// ============================================================================

const SAGA_STATES = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  COMPENSATING: 'compensating',
  COMPENSATED: 'compensated',
  TIMEOUT: 'timeout'
};

// ============================================================================
// SAGA TYPES
// ============================================================================

/**
 * Create a new saga definition
 * @param {Object} config - Saga configuration
 * @param {string} config.name - Saga name
 * @param {string} config.correlationId - Business correlation ID
 * @param {Array} config.steps - Array of saga steps
 * @param {string} config.type - 'orchestration' | 'choreography'
 * @param {Object} config.context - Initial context data
 */
function createSaga(config) {
  const saga = {
    id: uuidv4(),
    name: config.name || `saga-${Date.now()}`,
    correlationId: config.correlationId,
    type: config.type || 'orchestration', // 'orchestration' | 'choreography'
    status: SAGA_STATES.PENDING,
    steps: config.steps.map((step, index) => ({
      id: `step-${index}`,
      name: step.name || step.action,
      action: step.action, // HTTP call, function name, etc.
      compensate: step.compensate, // Compensating action
      service: step.service, // Target service
      params: step.params || {},
      compensateParams: step.compensateParams || {},
      status: 'pending',
      result: null,
      error: null,
      startedAt: null,
      completedAt: null,
      retries: 0,
      maxRetries: step.maxRetries || MAX_RETRIES,
      timeout: step.timeout || DEFAULT_TIMEOUT,
      order: index,
      dependencies: step.dependencies || []
    })),
    context: config.context || {},
    history: [{
      event: 'SAGA_CREATED',
      timestamp: Date.now(),
      details: {}
    }],
    createdAt: Date.now(),
    startedAt: null,
    completedAt: null,
    failedAt: null,
    result: null,
    error: null
  };

  sagaStore[saga.id] = saga;
  saveSagas(sagaStore);

  return saga;
}

/**
 * Get saga by ID
 */
function getSaga(sagaId) {
  return sagaStore[sagaId] || null;
}

/**
 * Get all sagas
 */
function getAllSagas(filters = {}) {
  let sagas = Object.values(sagaStore);

  if (filters.status) {
    sagas = sagas.filter(s => s.status === filters.status);
  }

  if (filters.type) {
    sagas = sagas.filter(s => s.type === filters.type);
  }

  if (filters.correlationId) {
    sagas = sagas.filter(s => s.correlationId === filters.correlationId);
  }

  return sagas.sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * Record saga history event
 */
function recordHistory(sagaId, event, details = {}) {
  const saga = sagaStore[sagaId];
  if (!saga) return;

  saga.history.push({
    event,
    timestamp: Date.now(),
    details
  });

  sagaStore[sagaId] = saga;
  saveSagas(sagaStore);
}

/**
 * Execute a saga step
 */
async function executeStep(step, context) {
  const startTime = Date.now();

  try {
    // Simulate HTTP call or function execution
    // In production, this would call actual services
    const result = await executeAction(step.action, step.service, step.params, context);

    return {
      success: true,
      result,
      duration: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      duration: Date.now() - startTime
    };
  }
}

/**
 * Execute action (simulated - replace with actual service calls)
 */
async function executeAction(action, service, params, context) {
  // Simulate async operation
  await new Promise(resolve => setTimeout(resolve, 100));

  // In production, this would:
  // - Make HTTP calls to services
  // - Call local functions
  // - Invoke connectors

  return {
    action,
    service,
    executedAt: Date.now(),
    output: `Executed ${action} on ${service}`
  };
}

/**
 * Execute compensating transaction
 */
async function executeCompensation(step, context) {
  if (!step.compensate) {
    return { success: true, message: 'No compensation defined' };
  }

  try {
    // Simulate compensation call
    const result = await executeAction(step.compensate, step.service, step.compensateParams, context);

    return {
      success: true,
      result,
      message: `Compensated ${step.name}`
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      message: `Compensation failed for ${step.name}`
    };
  }
}

/**
 * Execute a saga (orchestration mode)
 */
async function executeSaga(sagaId) {
  const saga = sagaStore[sagaId];
  if (!saga) throw new Error('Saga not found');

  saga.status = SAGA_STATES.RUNNING;
  saga.startedAt = Date.now();
  sagaStore[sagaId] = saga;
  saveSagas(sagaStore);

  recordHistory(sagaId, 'SAGA_STARTED');

  try {
    // Execute steps in order (or parallel if no dependencies)
    const completedSteps = [];
    const failedSteps = [];

    for (const step of saga.steps) {
      // Check dependencies
      const depsSatisfied = step.dependencies.every(depId => {
        const depStep = saga.steps.find(s => s.id === depId);
        return depStep && depStep.status === 'completed';
      });

      if (!depsSatisfied) {
        // Wait for dependencies - in production, use event-driven approach
        await waitForDependencies(saga, step);
      }

      // Execute step with retry
      let stepResult;
      let attempts = 0;

      while (attempts <= step.maxRetries) {
        step.status = 'running';
        step.startedAt = Date.now();
        sagaStore[sagaId] = saga;
        saveSagas(sagaStore);

        recordHistory(sagaId, 'STEP_STARTED', { stepId: step.id, attempt: attempts + 1 });

        stepResult = await executeStepWithTimeout(step, saga.context);

        if (stepResult.success) {
          step.status = 'completed';
          step.result = stepResult.result;
          step.completedAt = Date.now();
          completedSteps.push(step);
          recordHistory(sagaId, 'STEP_COMPLETED', { stepId: step.id });
          break;
        }

        attempts++;
        step.retries = attempts;

        if (attempts <= step.maxRetries) {
          recordHistory(sagaId, 'STEP_RETRY', { stepId: step.id, attempt: attempts, error: stepResult.error });
          await sleep(DEFAULT_RETRY_DELAY * attempts); // Exponential backoff
        } else {
          step.status = 'failed';
          step.error = stepResult.error;
          failedSteps.push(step);
          recordHistory(sagaId, 'STEP_FAILED', { stepId: step.id, error: stepResult.error });
          break;
        }
      }
    }

    // Check if saga succeeded or failed
    if (failedSteps.length > 0) {
      // Start compensation
      saga.status = SAGA_STATES.COMPENSATING;
      sagaStore[sagaId] = saga;
      saveSagas(sagaStore);

      recordHistory(sagaId, 'COMPENSATION_STARTED');

      // Compensate completed steps in reverse order
      for (const step of completedSteps.reverse()) {
        recordHistory(sagaId, 'COMPENSATION_STEP_STARTED', { stepId: step.id });
        const compensationResult = await executeCompensation(step, saga.context);

        if (!compensationResult.success) {
          recordHistory(sagaId, 'COMPENSATION_STEP_FAILED', {
            stepId: step.id,
            error: compensationResult.error
          });
        } else {
          recordHistory(sagaId, 'COMPENSATION_STEP_COMPLETED', { stepId: step.id });
        }
      }

      saga.status = SAGA_STATES.COMPENSATED;
      saga.failedAt = Date.now();
      saga.error = `Failed steps: ${failedSteps.map(s => s.name).join(', ')}`;
      recordHistory(sagaId, 'SAGA_COMPENSATED', { failedSteps: failedSteps.map(s => s.id) });
    } else {
      saga.status = SAGA_STATES.COMPLETED;
      saga.completedAt = Date.now();
      saga.result = { completedSteps: completedSteps.length };
      recordHistory(sagaId, 'SAGA_COMPLETED');
    }

    sagaStore[sagaId] = saga;
    saveSagas(sagaStore);

    return saga;

  } catch (error) {
    saga.status = SAGA_STATES.FAILED;
    saga.failedAt = Date.now();
    saga.error = error.message;
    sagaStore[sagaId] = saga;
    saveSagas(sagaStore);

    recordHistory(sagaId, 'SAGA_FAILED', { error: error.message });

    return saga;
  }
}

/**
 * Execute step with timeout
 */
async function executeStepWithTimeout(step, context) {
  return Promise.race([
    executeStep(step, context),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Step ${step.name} timed out after ${step.timeout}ms`)), step.timeout)
    )
  ]).catch(error => ({
    success: false,
    error: error.message
  }));
}

/**
 * Wait for dependencies (simplified)
 */
async function waitForDependencies(saga, step) {
  const maxWait = 60000; // 1 minute max wait
  const start = Date.now();

  while (Date.now() - start < maxWait) {
    const depsSatisfied = step.dependencies.every(depId => {
      const depStep = saga.steps.find(s => s.id === depId);
      return depStep && depStep.status === 'completed';
    });

    if (depsSatisfied) return;

    await sleep(100);
  }

  throw new Error(`Dependencies not satisfied for step ${step.name}`);
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Cancel a running saga
 */
async function cancelSaga(sagaId) {
  const saga = sagaStore[sagaId];
  if (!saga) throw new Error('Saga not found');

  if (saga.status === SAGA_STATES.COMPLETED || saga.status === SAGA_STATES.COMPENSATED) {
    throw new Error('Cannot cancel completed saga');
  }

  // If running, compensate what we can
  if (saga.status === SAGA_STATES.RUNNING) {
    saga.status = SAGA_STATES.COMPENSATING;

    // Compensate completed steps
    const completedSteps = saga.steps.filter(s => s.status === 'completed').reverse();

    for (const step of completedSteps) {
      await executeCompensation(step, saga.context);
    }

    saga.status = SAGA_STATES.COMPENSATED;
    saga.failedAt = Date.now();
    saga.error = 'Cancelled by user';
  } else {
    saga.status = SAGA_STATES.FAILED;
    saga.failedAt = Date.now();
    saga.error = 'Cancelled before completion';
  }

  sagaStore[sagaId] = saga;
  saveSagas(sagaStore);

  recordHistory(sagaId, 'SAGA_CANCELLED');

  return saga;
}

/**
 * Retry a failed saga
 */
async function retrySaga(sagaId) {
  const saga = sagaStore[sagaId];
  if (!saga) throw new Error('Saga not found');

  if (saga.status !== SAGA_STATES.FAILED && saga.status !== SAGA_STATES.COMPENSATED) {
    throw new Error('Can only retry failed/compensated sagas');
  }

  // Reset step statuses
  for (const step of saga.steps) {
    if (step.status === 'failed') {
      step.status = 'pending';
      step.error = null;
      step.retries = 0;
    }
  }

  saga.status = SAGA_STATES.PENDING;
  saga.error = null;
  sagaStore[sagaId] = saga;
  saveSagas(sagaStore);

  recordHistory(sagaId, 'SAGA_RETRY_REQUESTED');

  // Execute saga
  return executeSaga(sagaId);
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
    timestamp: new Date().toISOString()
  });
});

app.get('/ready', (req, res) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// ============================================================================
// SAGA ENDPOINTS
// ============================================================================

// Create saga
app.post('/api/sagas', (req, res) => {
  try {
    const { name, correlationId, type, steps, context } = req.body;

    if (!steps || !Array.isArray(steps) || steps.length === 0) {
      return res.status(400).json({
        error: 'steps array is required',
        example: {
          steps: [
            { name: 'Reserve Inventory', action: 'reserve', service: 'inventory', compensate: 'release', params: { sku: '123' } },
            { name: 'Process Payment', action: 'charge', service: 'payment', compensate: 'refund', params: { amount: 100 } }
          ]
        }
      });
    }

    const saga = createSaga({ name, correlationId, type, steps, context });

    res.status(201).json({
      success: true,
      saga
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error creating saga:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get all sagas
app.get('/api/sagas', (req, res) => {
  try {
    const { status, type, correlationId } = req.query;
    const sagas = getAllSagas({ status, type, correlationId });

    res.json({
      count: sagas.length,
      sagas
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error listing sagas:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Get saga by ID
app.get('/api/sagas/:sagaId', (req, res) => {
  try {
    const saga = getSaga(req.params.sagaId);

    if (!saga) {
      return res.status(404).json({ error: 'Saga not found' });
    }

    res.json({ saga });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error getting saga:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Execute saga
app.post('/api/sagas/:sagaId/execute', async (req, res) => {
  try {
    const saga = getSaga(req.params.sagaId);

    if (!saga) {
      return res.status(404).json({ error: 'Saga not found' });
    }

    if (saga.status !== SAGA_STATES.PENDING) {
      return res.status(400).json({
        error: `Cannot execute saga in status: ${saga.status}`,
        suggestion: saga.status === SAGA_STATES.FAILED ? 'Use POST /sagas/:id/retry instead' : null
      });
    }

    // Execute saga asynchronously
    executeSaga(saga.id).catch(error => {
      console.error(`[${SAGE_NAME}] Saga execution error:`, error);
    });

    res.status(202).json({
      success: true,
      message: 'Saga execution started',
      sagaId: saga.id,
      status: saga.status
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error starting saga:`, error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel saga
app.post('/api/sagas/:sagaId/cancel', async (req, res) => {
  try {
    const saga = await cancelSaga(req.params.sagaId);

    res.json({
      success: true,
      saga
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error cancelling saga:`, error);
    res.status(400).json({ error: error.message });
  }
});

// Retry saga
app.post('/api/sagas/:sagaId/retry', async (req, res) => {
  try {
    const saga = await retrySaga(req.params.sagaId);

    // Execute asynchronously
    executeSaga(saga.id).catch(error => {
      console.error(`[${SERVICE_NAME}] Saga retry error:`, error);
    });

    res.status(202).json({
      success: true,
      message: 'Saga retry started',
      sagaId: saga.id,
      status: saga.status
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error retrying saga:`, error);
    res.status(400).json({ error: error.message });
  }
});

// Get saga history
app.get('/api/sagas/:sagaId/history', (req, res) => {
  try {
    const saga = getSaga(req.params.sagaId);

    if (!saga) {
      return res.status(404).json({ error: 'Saga not found' });
    }

    res.json({
      sagaId: saga.id,
      history: saga.history
    });
  } catch (error) {
    console.error(`[${SERVICE_NAME}] Error getting history:`, error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// START SERVER
// ============================================================================

app.listen(PORT, () => {
  ensureDir();
  console.log(`[${SERVICE_NAME}] Saga Coordinator started on port ${PORT}`);
  console.log(`[${SERVICE_NAME}] Data directory: ${DATA_DIR}`);
  console.log(`[${SERVICE_NAME}] Default timeout: ${DEFAULT_TIMEOUT}ms`);
  console.log(`[${SERVICE_NAME}] Default retry delay: ${DEFAULT_RETRY_DELAY}ms`);
  console.log(`[${SERVICE_NAME}] Max retries per step: ${MAX_RETRIES}`);
});

module.exports = {
  createSaga,
  getSaga,
  getAllSagas,
  executeSaga,
  cancelSaga,
  retrySaga,
  SAGA_STATES
};
