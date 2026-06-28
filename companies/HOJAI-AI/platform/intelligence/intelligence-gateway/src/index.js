/**
 * RTMN Intelligence Gateway v1.0
 *
 * Unified entry point for all RTMN intelligence services.
 * Routes requests to appropriate service and aggregates responses.
 *
 * @port 4750
 */

import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 4750;
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || 'intelligence-gateway-token';

app.use(express.json());

// Service endpoints configuration
const SERVICES = {
  // Core AI
  'ai-intelligence': {
    url: process.env.AI_INTELLIGENCE_URL || 'http://localhost:4881',
    timeout: 30000
  },
  // Intelligence Engines
  'predictive-intelligence': {
    url: process.env.PREDICTIVE_URL || 'http://localhost:4754',
    timeout: 30000
  },
  'risk-intelligence': {
    url: process.env.RISK_URL || 'http://localhost:4755',
    timeout: 30000
  },
  'decision-intelligence': {
    url: process.env.DECISION_URL || 'http://localhost:4756',
    timeout: 30000
  },
  // Personal Intelligence
  'reasoning-engine': {
    url: process.env.REASONING_URL || 'http://localhost:4933',
    timeout: 45000
  },
  'intent-engine': {
    url: process.env.INTENT_URL || 'http://localhost:4786',
    timeout: 10000
  },
  'reflection-engine': {
    url: process.env.REFLECTION_URL || 'http://localhost:4787',
    timeout: 15000
  },
  'proactive-engine': {
    url: process.env.PROACTIVE_URL || 'http://localhost:4789',
    timeout: 10000
  },
  // Personalization
  'personalization': {
    url: process.env.PERSONALIZATION_URL || 'http://localhost:4893',
    timeout: 15000
  },
  // Knowledge
  'knowledge-registry': {
    url: process.env.KNOWLEDGE_URL || 'http://localhost:4900',
    timeout: 20000
  },
  'rag-platform': {
    url: process.env.RAG_URL || 'http://localhost:4751',
    timeout: 30000
  },
  'vector-db': {
    url: process.env.VECTOR_URL || 'http://localhost:4752',
    timeout: 20000
  },
  // Events
  'event-platform': {
    url: process.env.EVENT_URL || 'http://localhost:4901',
    timeout: 10000
  },
  // Fallback
  'micro-intelligence': {
    url: process.env.MICRO_URL || 'http://localhost:4753',
    timeout: 5000
  }
};

// Cache for responses
const responseCache = new Map();
const CACHE_TTL = 60000; // 1 minute

// Request counter
let requestCount = 0;
const startTime = Date.now();

// Middleware for request logging
app.use((req, res, next) => {
  requestCount++;
  const started = Date.now();
  res.on('finish', () => {
    console.log(`[gateway] ${req.method} ${req.path} -> ${res.statusCode} (${Date.now() - started}ms)`);
  });
  next();
});

// Authentication middleware
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  const internalToken = req.headers['x-internal-token'];

  if (token || internalToken === INTERNAL_TOKEN) {
    next();
  } else {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Authentication required' });
  }
}

// Cache helper
function getCacheKey(service, action, body) {
  return `${service}:${action}:${JSON.stringify(body || {})}`;
}

function getCachedResponse(key) {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedResponse(key, data) {
  // Limit cache size
  if (responseCache.size > 1000) {
    const firstKey = responseCache.keys().next().value;
    responseCache.delete(firstKey);
  }
  responseCache.set(key, { data, timestamp: Date.now() });
}

// Clear cache endpoint
app.post('/api/cache/clear', requireAuth, (req, res) => {
  const { pattern } = req.body;
  if (pattern) {
    for (const key of responseCache.keys()) {
      if (key.includes(pattern)) {
        responseCache.delete(key);
      }
    }
  } else {
    responseCache.clear();
  }
  res.json({ success: true, cleared: pattern ? 'pattern' : 'all' });
});

// List all services
app.get('/api/services', (req, res) => {
  const serviceList = Object.entries(SERVICES).map(([name, config]) => ({
    name,
    url: config.url,
    timeout: config.timeout
  }));
  res.json({ services: serviceList, count: serviceList.length });
});

// Health check for all services
app.get('/api/services/health', async (req, res) => {
  const results = {};
  const promises = Object.entries(SERVICES).map(async ([name, config]) => {
    try {
      const response = await axios.get(`${config.url}/health`, { timeout: 5000 });
      results[name] = { status: 'healthy', latency: response.headers['x-response-time'] || 0 };
    } catch (error) {
      results[name] = { status: 'unhealthy', error: error.message };
    }
  });

  await Promise.all(promises);
  const healthyCount = Object.values(results).filter(r => r.status === 'healthy').length;

  res.json({
    services: results,
    summary: { total: Object.keys(results).length, healthy: healthyCount },
    gateway: { status: 'healthy', uptime: Date.now() - startTime }
  });
});

// Health check for specific service
app.get('/api/services/:service/health', async (req, res) => {
  const { service } = req.params;
  const config = SERVICES[service];

  if (!config) {
    return res.status(404).json({ error: 'SERVICE_NOT_FOUND', message: `Service ${service} not found` });
  }

  try {
    const response = await axios.get(`${config.url}/health`, { timeout: 5000 });
    res.json({ service, status: 'healthy', data: response.data });
  } catch (error) {
    res.json({ service, status: 'unhealthy', error: error.message });
  }
});

// Unified intelligence endpoint
app.post('/api/intelligence/:service/:action', requireAuth, async (req, res) => {
  const { service, action } = req.params;
  const config = SERVICES[service];

  if (!config) {
    return res.status(404).json({ error: 'SERVICE_NOT_FOUND', message: `Service ${service} not found` });
  }

  // Check cache for GET-like requests
  const cacheKey = getCacheKey(service, action, req.body);
  const cached = getCachedResponse(cacheKey);
  if (cached && req.method === 'GET') {
    return res.json({ ...cached, cached: true });
  }

  try {
    // Build the target URL
    const targetUrl = `${config.url}/api/${action}`;

    // Forward the request
    const response = await axios.post(targetUrl, {
      ...req.body,
      _gatewayRequestId: uuidv4(),
      _gatewayTimestamp: new Date().toISOString()
    }, {
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'x-internal-token': INTERNAL_TOKEN,
        'x-gateway-service': service,
        'x-gateway-action': action
      }
    });

    const result = response.data;

    // Cache the response
    if (req.method === 'GET') {
      setCachedResponse(cacheKey, result);
    }

    res.json(result);
  } catch (error) {
    console.error(`[gateway] Error routing to ${service}/${action}:`, error.message);

    // Try fallback to micro-intelligence
    if (service !== 'micro-intelligence') {
      const fallbackUrl = SERVICES['micro-intelligence'].url;
      try {
        const fallbackResponse = await axios.post(`${fallbackUrl}/api/execute/${service}`, {
          payload: req.body
        }, { timeout: 5000 });

        return res.json({
          ...fallbackResponse.data,
          fallback: true,
          originalError: error.message
        });
      } catch (fallbackError) {
        console.error(`[gateway] Fallback also failed:`, fallbackError.message);
      }
    }

    res.status(500).json({
      error: 'GATEWAY_ERROR',
      service,
      action,
      message: error.message
    });
  }
});

// Batch intelligence request
app.post('/api/intelligence/batch', requireAuth, async (req, res) => {
  const { requests } = req.body;

  if (!Array.isArray(requests)) {
    return res.status(400).json({ error: 'INVALID_BATCH', message: 'requests must be an array' });
  }

  const results = await Promise.allSettled(
    requests.map(async (req) => {
      const { service, action, data } = req;
      const config = SERVICES[service];

      if (!config) {
        return { service, action, error: 'SERVICE_NOT_FOUND' };
      }

      try {
        const response = await axios.post(`${config.url}/api/${action}`, {
          ...data,
          _gatewayRequestId: uuidv4()
        }, { timeout: config.timeout });

        return { service, action, data: response.data };
      } catch (error) {
        return { service, action, error: error.message };
      }
    })
  );

  res.json({
    results: results.map(r => r.status === 'fulfilled' ? r.value : { error: r.reason?.message }),
    success: results.filter(r => r.status === 'fulfilled' && !r.value.error).length,
    failed: results.filter(r => r.status === 'rejected' || r.value.error).length
  });
});

// Chain intelligence services
app.post('/api/intelligence/chain', requireAuth, async (req, res) => {
  const { steps } = req.body;

  if (!Array.isArray(steps) || steps.length === 0) {
    return res.status(400).json({ error: 'INVALID_CHAIN', message: 'steps must be a non-empty array' });
  }

  const results = [];
  let context = {};

  for (const step of steps) {
    const { service, action, data: stepData, saveAs } = step;
    const config = SERVICES[service];

    if (!config) {
      return res.status(400).json({
        error: 'STEP_FAILED',
        step: service,
        message: `Service ${service} not found`
      });
    }

    try {
      const response = await axios.post(`${config.url}/api/${action}`, {
        ...context, // Pass previous results as context
        ...stepData
      }, { timeout: config.timeout });

      const stepResult = response.data;

      if (saveAs) {
        context[saveAs] = stepResult;
      }

      results.push({
        service,
        action,
        result: stepResult
      });
    } catch (error) {
      return res.status(500).json({
        error: 'CHAIN_STEP_FAILED',
        step: service,
        action,
        message: error.message,
        completedSteps: results.length
      });
    }
  }

  res.json({
    steps: results,
    finalContext: context
  });
});

// Health endpoints
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'intelligence-gateway',
    port: PORT,
    uptime: Date.now() - startTime,
    requestCount
  });
});

app.get('/ready', (req, res) => {
  res.json({
    status: 'ready',
    services: Object.keys(SERVICES).length
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'RTMN Intelligence Gateway',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      services: '/api/services',
      health: '/api/services/health',
      intelligence: '/api/intelligence/:service/:action',
      batch: '/api/intelligence/batch',
      chain: '/api/intelligence/chain',
      cache: '/api/cache/clear'
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[intelligence-gateway] Started on port ${PORT}`);
  console.log(`[intelligence-gateway] Connected services: ${Object.keys(SERVICES).join(', ')}`);
});

export default app;
