import express from 'express';
import axios from 'axios';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuid } from 'uuid';

const app = express();

app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));
app.use(express.json({ limit: "10kb" }));

const PORT = process.env.PORT || 4500;

// Platform service URLs
const SERVICES = {
  governance: process.env.GOVERNANCE_URL || 'http://localhost:4500',
  event: process.env.EVENT_URL || 'http://localhost:4510',
  memory: process.env.MEMORY_URL || 'http://localhost:4520',
  intelligence: process.env.INTELLIGENCE_URL || 'http://localhost:4530',
  agents: process.env.AGENTS_URL || 'http://localhost:4550',
  flow: process.env.FLOW_URL || 'http://localhost:4560',
  whatsapp: process.env.WHATSAPP_URL || 'http://localhost:4570',
  analytics: process.env.ANALYTICS_URL || 'http://localhost:4580',
  communications: process.env.COMMUNICATIONS_URL || 'http://localhost:4590'
};

// Request logging
app.use((req, res, next) => {
  (req as any).requestId = uuid();
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} [${(req as any).requestId}]`);
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

// Health
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-api-gateway',
    timestamp: new Date().toISOString(),
    services: Object.keys(SERVICES)
  });
});

// Route to appropriate service
async function proxyRequest(service: string, path: string, method: string, body?: any, headers?: any) {
  const baseUrl = SERVICES[service as keyof typeof SERVICES];
  if (!baseUrl) throw new Error(`Unknown service: ${service}`);

  const url = `${baseUrl}${path}`;
  const response = await axios({
    method,
    url,
    data: body,
    headers: {
      ...headers,
      'X-Request-ID': headers?.['x-request-id'] || uuid()
    },
    timeout: 30000
  });

  return response.data;
}

// Tenant middleware
function extractTenant(req: express.Request) {
  const tenantId = req.headers['x-tenant-id'] as string;
  if (!tenantId) {
    throw new Error('Tenant ID required (x-tenant-id header)');
  }
  return tenantId;
}

// =============================================================================
// ROUTES
// =============================================================================

// Events
app.post('/api/events', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('event', '/api/events', 'POST', req.body, req.headers);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    extractTenant(req);
    const query = new URLSearchParams(req.query as any).toString();
    const result = await proxyRequest('event', `/api/events?${query}`, 'GET', null, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/events/stats', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('event', '/api/events/stats', 'GET', null, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Memory
app.post('/api/memories', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('memory', '/api/memories', 'POST', req.body, req.headers);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/memories', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const query = new URLSearchParams(req.query as any).toString();
    const result = await proxyRequest('memory', `/api/memories?${query}`, 'GET', null, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/timeline', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const query = new URLSearchParams(req.query as any).toString();
    const result = await proxyRequest('memory', `/api/timeline?${query}`, 'GET', null, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/profiles', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('memory', '/api/profiles', 'GET', null, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/profiles', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('memory', '/api/profiles', 'POST', req.body, req.headers);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Predictions
app.get('/api/predict/:userId/:type', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const { userId, type } = req.params;
    const result = await proxyRequest('intelligence', `/api/predict/${userId}/${type}`, 'GET', null, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/predict/:userId/all', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('intelligence', `/api/predict/${req.params.userId}/all`, 'GET', null, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Recommendations
app.get('/api/recommend/:userId', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('intelligence', `/api/recommend/${req.params.userId}`, 'GET', null, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Decisions
app.post('/api/decide/cashback', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('intelligence', '/api/decide/cashback', 'POST', req.body, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/decide/fraud', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('intelligence', '/api/decide/fraud', 'POST', req.body, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Agents
app.post('/api/agents/:agentId/run', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('agents', `/api/agents/${req.params.agentId}/run`, 'POST', req.body, req.headers);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/insights', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('agents', '/api/insights', 'GET', null, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Workflows
app.post('/api/workflows', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('flow', '/api/workflows', 'POST', req.body, req.headers);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/workflows/:workflowId/run', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('flow', `/api/workflows/${req.params.workflowId}/run`, 'POST', req.body, req.headers);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Messages
app.post('/api/messages', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('communications', '/api/messages', 'POST', req.body, req.headers);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.post('/api/templates', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('communications', '/api/templates', 'POST', req.body, req.headers);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Attribution
app.post('/api/attribution/conversions', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const result = await proxyRequest('analytics', '/api/attribution/conversions', 'POST', req.body, req.headers);
    res.status(201).json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

app.get('/api/attribution', async (req, res) => {
  try {
    const tenantId = extractTenant(req);
    const query = new URLSearchParams(req.query as any).toString();
    const result = await proxyRequest('analytics', `/api/attribution?${query}`, 'GET', null, req.headers);
    res.json(result);
  } catch (error: any) {
    res.status(error.response?.status || 500).json(error.response?.data || { error: error.message });
  }
});

// Service discovery
app.get('/api/services', (req, res) => {
  res.json({
    services: Object.entries(SERVICES).map(([name, url]) => ({
      name,
      url,
      status: 'active'
    }))
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found', path: req.path });
});

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(`[Error] ${err.message}`);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`[Hojai API Gateway] Running on port ${PORT}`);
  console.log(`[Hojai API Gateway] Services: ${Object.keys(SERVICES).join(', ')}`);
});

export default app;
