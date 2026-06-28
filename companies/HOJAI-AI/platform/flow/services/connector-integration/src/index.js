/**
 * FlowOS Connector Integration Service
 *
 * Bridges FlowOS with the Connector Ecosystem
 * Enables workflow steps to invoke external services
 *
 * Port: 5375
 */

import express from 'express';
import cors from 'cors';
import crypto from 'crypto';

const app = express();
const PORT = process.env.CONNECTOR_HUB_PORT || 5375;

// Connector Hub URL (the actual connector runtime)
const CONNECTOR_HUB_URL = process.env.CONNECTOR_HUB_URL || 'http://localhost:4855';

// In-memory storage for connector configurations and executions
const storage = {
  configurations: new Map(),  // workflowId -> connector configs
  executions: new Map(),         // executionId -> connector execution logs
  rateLimits: new Map(),        // connectorId -> rate limit tracking
};

// Rate limiting configuration
const RATE_LIMITS = {
  default: { requests: 100, window: 60000 }, // 100 requests per minute
  salesforce: { requests: 50, window: 60000 },
  stripe: { requests: 100, window: 10000 },
};

app.use(cors());
app.use(express.json());

// ── Health ──────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'flow-connector-integration',
    version: '1.0.0',
    port: PORT,
    connectedTo: CONNECTOR_HUB_URL,
    connectorsConfigured: storage.configurations.size,
    timestamp: new Date().toISOString()
  });
});

// ── Connector Configuration ──────────────────────────────────────────────

/**
 * Register a connector configuration for a workflow
 * POST /api/connectors/configure
 */
app.post('/api/connectors/configure', async (req, res) => {
  try {
    const { workflowId, connectorId, config } = req.body || {};

    if (!workflowId || !connectorId) {
      return res.status(400).json({
        error: 'workflowId and connectorId are required'
      });
    }

    // Validate connector exists in Connector Hub
    const hubConnectors = await getConnectorHubConnectors();
    if (!hubConnectors.includes(connectorId)) {
      return res.status(404).json({
        error: `Connector '${connectorId}' not found in Connector Hub`,
        available: hubConnectors
      });
    }

    // Store configuration
    if (!storage.configurations.has(workflowId)) {
      storage.configurations.set(workflowId, new Map());
    }
    storage.configurations.get(workflowId).set(connectorId, {
      ...config,
      configuredAt: new Date().toISOString()
    });

    res.json({
      success: true,
      workflowId,
      connectorId,
      message: `Connector '${connectorId}' configured for workflow '${workflowId}'`
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get all connector configurations for a workflow
 * GET /api/connectors/configure/:workflowId
 */
app.get('/api/connectors/configure/:workflowId', (req, res) => {
  const { workflowId } = req.params;
  const configs = storage.configurations.get(workflowId);

  if (!configs) {
    return res.json({ workflowId, connectors: [] });
  }

  res.json({
    workflowId,
    connectors: Array.from(configs.entries()).map(([id, config]) => ({
      connectorId: id,
      ...config
    }))
  });
});

// ── Connector Invocation ─────────────────────────────────────────────────

/**
 * Invoke a connector action from a workflow step
 * POST /api/connectors/invoke
 */
app.post('/api/connectors/invoke', async (req, res) => {
  try {
    const { workflowId, connectorId, action, params = {}, idempotencyKey } = req.body || {};

    if (!connectorId || !action) {
      return res.status(400).json({
        error: 'connectorId and action are required'
      });
    }

    // Check idempotency
    if (idempotencyKey) {
      const existing = storage.executions.get(idempotencyKey);
      if (existing) {
        return res.json({
          ...existing,
          cached: true
        });
      }
    }

    // Check rate limit
    const rateLimit = RATE_LIMITS[connectorId] || RATE_LIMITS.default;
    if (!checkRateLimit(connectorId, rateLimit)) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        retryAfter: rateLimit.window / 1000
      });
    }

    // Create execution record
    const executionId = `exec_${crypto.randomUUID()}`;
    const startTime = Date.now();

    try {
      // Forward to Connector Hub
      const result = await forwardToConnectorHub(connectorId, action, params);

      const execution = {
        executionId,
        workflowId,
        connectorId,
        action,
        params,
        status: 'success',
        result,
        duration: Date.now() - startTime,
        executedAt: new Date().toISOString()
      };

      storage.executions.set(executionId, execution);
      if (idempotencyKey) {
        storage.executions.set(idempotencyKey, execution);
      }

      res.json(execution);
    } catch (error) {
      const execution = {
        executionId,
        workflowId,
        connectorId,
        action,
        params,
        status: 'error',
        error: error.message,
        duration: Date.now() - startTime,
        executedAt: new Date().toISOString()
      };

      storage.executions.set(executionId, execution);
      res.status(500).json(execution);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Batch invoke multiple connector actions
 * POST /api/connectors/batch
 */
app.post('/api/connectors/batch', async (req, res) => {
  try {
    const { requests } = req.body || {};

    if (!Array.isArray(requests) || requests.length === 0) {
      return res.status(400).json({ error: 'requests array is required' });
    }

    if (requests.length > 10) {
      return res.status(400).json({ error: 'Maximum 10 requests per batch' });
    }

    // Execute all requests in parallel
    const results = await Promise.allSettled(
      requests.map(req => invokeConnector(req.connectorId, req.action, req.params))
    );

    res.json({
      total: requests.length,
      successful: results.filter(r => r.status === 'fulfilled').length,
      failed: results.filter(r => r.status === 'rejected').length,
      results: results.map((r, i) => ({
        index: i,
        connectorId: requests[i].connectorId,
        action: requests[i].action,
        success: r.status === 'fulfilled',
        result: r.status === 'fulfilled' ? r.value : null,
        error: r.status === 'rejected' ? r.reason.message : null
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Connector Registry ───────────────────────────────────────────────────

/**
 * Get all available connectors from Connector Hub
 * GET /api/connectors/registry
 */
app.get('/api/connectors/registry', async (req, res) => {
  try {
    const connectors = await getConnectorHubConnectors();
    res.json({
      count: connectors.length,
      connectors
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get connector capabilities
 * GET /api/connectors/:connectorId/capabilities
 */
app.get('/api/connectors/:connectorId/capabilities', async (req, res) => {
  try {
    const { connectorId } = req.params;
    const capabilities = await getConnectorCapabilities(connectorId);

    if (!capabilities) {
      return res.status(404).json({
        error: `Connector '${connectorId}' not found`
      });
    }

    res.json({
      connectorId,
      ...capabilities
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ── Execution History ───────────────────────────────────────────────────

/**
 * Get connector execution history for a workflow
 * GET /api/connectors/history/:workflowId
 */
app.get('/api/connectors/history/:workflowId', (req, res) => {
  const { workflowId } = req.params;
  const { limit = 50 } = req.query;

  const executions = Array.from(storage.executions.values())
    .filter(e => e.workflowId === workflowId)
    .sort((a, b) => new Date(b.executedAt) - new Date(a.executedAt))
    .slice(0, parseInt(limit));

  res.json({
    workflowId,
    count: executions.length,
    executions
  });
});

/**
 * Get connector execution details
 * GET /api/connectors/executions/:executionId
 */
app.get('/api/connectors/executions/:executionId', (req, res) => {
  const { executionId } = req.params;
  const execution = storage.executions.get(executionId);

  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  res.json(execution);
});

// ── Rate Limiting ───────────────────────────────────────────────────────

function checkRateLimit(connectorId, limit) {
  const key = `rate_${connectorId}`;
  const now = Date.now();

  if (!storage.rateLimits.has(key)) {
    storage.rateLimits.set(key, { count: 0, windowStart: now });
  }

  const state = storage.rateLimits.get(key);

  // Reset window if expired
  if (now - state.windowStart > limit.window) {
    state.count = 0;
    state.windowStart = now;
  }

  // Check limit
  if (state.count >= limit.requests) {
    return false;
  }

  state.count++;
  return true;
}

// ── Connector Hub Communication ─────────────────────────────────────────

async function getConnectorHubConnectors() {
  try {
    const response = await fetch(`${CONNECTOR_HUB_URL}/api/connectors`);
    if (!response.ok) return getDefaultConnectors();
    const data = await response.json();
    return data.connectors?.map(c => c.name) || getDefaultConnectors();
  } catch {
    return getDefaultConnectors();
  }
}

async function getConnectorCapabilities(connectorId) {
  try {
    const response = await fetch(`${CONNECTOR_HUB_URL}/api/connectors/${connectorId}`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function forwardToConnectorHub(connectorId, action, params) {
  const response = await fetch(`${CONNECTOR_HUB_URL}/api/connectors/${connectorId}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `Connector Hub error: ${response.status}`);
  }

  return await response.json();
}

async function invokeConnector(connectorId, action, params) {
  return forwardToConnectorHub(connectorId, action, params);
}

// ── Startup ────────────────────────────────────────────────────────────

app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});

const server = app.listen(PORT, () => {
  console.log(`[flow-connector-integration] listening on :${PORT}`);
  console.log(`[flow-connector-integration] Connector Hub: ${CONNECTOR_HUB_URL}`);
});

process.on('SIGTERM', () => {
  console.log('[flow-connector-integration] Shutting down...');
  server.close();
});

export { app };
