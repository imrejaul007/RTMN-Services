/**
 * HOJAI Unified Gateway
 *
 * Single entry point for all HOJAI services.
 * Routes requests to appropriate microservices.
 *
 * Port: 4800
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { v4 as uuid } from 'uuid';

// Configuration
const PORT = parseInt(process.env.PORT || '4800', 10);
const JWT_SECRET = process.env.JWT_SECRET || throw new Error('JWT_SECRET environment variable is required');
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Service endpoints
const SERVICES = {
  // RABTUL Services
  auth: process.env.AUTH_SERVICE_URL || 'http://localhost:4002',
  payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:4001',
  wallet: process.env.WALLET_SERVICE_URL || 'http://localhost:4004',
  order: process.env.ORDER_SERVICE_URL || 'http://localhost:4003',
  catalog: process.env.CATALOG_SERVICE_URL || 'http://localhost:4005',
  search: process.env.SEARCH_SERVICE_URL || 'http://localhost:4006',
  delivery: process.env.DELIVERY_SERVICE_URL || 'http://localhost:4007',
  notifications: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4011',
  profile: process.env.PROFILE_SERVICE_URL || 'http://localhost:4013',

  // HOJAI Core Services
  governance: process.env.GOVERNANCE_SERVICE_URL || 'http://localhost:4501',
  event: process.env.EVENT_SERVICE_URL || 'http://localhost:4510',
  memory: process.env.MEMORY_SERVICE_URL || 'http://localhost:4520',
  intelligence: process.env.INTELLIGENCE_SERVICE_URL || 'http://localhost:4530',
  agents: process.env.AGENTS_SERVICE_URL || 'http://localhost:4550',
  flow: process.env.FLOW_SERVICE_URL || 'http://localhost:4560',
  communications: process.env.COMMUNICATIONS_SERVICE_URL || 'http://localhost:4590',
  analytics: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:4580',
  identity: process.env.IDENTITY_SERVICE_URL || 'http://localhost:4600',

  // REZ Intelligence Services
  intent: process.env.INTENT_SERVICE_URL || 'http://localhost:4018',
  eventBus: process.env.EVENT_BUS_URL || 'http://localhost:4025',
  identityGraph: process.env.IDENTITY_GRAPH_URL || 'http://localhost:4050',
  signalAggregator: process.env.SIGNAL_AGGREGATOR_URL || 'http://localhost:4121',
  attribution: process.env.ATTRIBUTION_URL || 'http://localhost:4120',
  recommendation: process.env.RECOMMENDATION_URL || 'http://localhost:4150',
  predictive: process.env.PREDICTIVE_URL || 'http://localhost:4141',
};

// Create Express app
const app = express();

// Trust proxy for rate limiting
app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: "10kb" }));

// Rate limiting
const limiter = rateLimit({
  store: new RedisStore({
    sendCommand: (...args: string[]) => redisClient.sendCommand(args),
  }),
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests', code: 'RATE_LIMITED' }
});
app.use(limiter);

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestId = uuid();
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

// Redis client
let redisClient: ReturnType<typeof createClient>;

async function initRedis() {
  redisClient = createClient({ url: REDIS_URL });
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  await redisClient.connect();
  console.log('Redis connected');
}

// Validation schemas
const TokenPayloadSchema = z.object({
  sub: z.string(),
  tenantId: z.string(),
  type: z.enum(['user', 'api_key', 'service']),
  permissions: z.array(z.string()).optional(),
});

type TokenPayload = z.infer<typeof TokenPayloadSchema>;

// Auth middleware
async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header', code: 'AUTH_REQUIRED' });
  }

  try {
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : authHeader;

    const decoded = jwt.verify(token, JWT_SECRET) as TokenPayload;
    const validated = TokenPayloadSchema.parse(decoded);

    (req as any).user = validated;
    (req as any).tenantId = validated.tenantId;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid token', code: 'AUTH_INVALID' });
  }
}

// Service proxy helper
async function proxyToService(
  serviceUrl: string,
  req: Request,
  res: Response
) {
  try {
    const axios = (await import('axios')).default;
    const response = await axios({
      method: req.method,
      url: `${serviceUrl}${req.path}`,
      data: req.body,
      headers: {
        ...req.headers,
        'X-Tenant-Id': (req as any).tenantId,
        'X-Request-Id': (req as any).requestId,
      },
      timeout: 30000,
    });

    res.status(response.status).json(response.data);
  } catch (error: any) {
    console.error('Proxy error:', error.message);
    res.status(error.response?.status || 500).json(
      error.response?.data || { error: 'Service unavailable', code: 'SERVICE_ERROR' }
    );
  }
}

// Health endpoints
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    service: 'hojai-unified-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

app.get('/health/ready', async (req, res) => {
  try {
    await redisClient.ping();
    res.json({ status: 'ready', redis: 'ok' });
  } catch (error) {
    res.status(503).json({ status: 'not ready', redis: 'error' });
  }
});

// Service discovery
app.get('/api/services', (_, res) => {
  const serviceList = Object.entries(SERVICES).map(([name, url]) => ({
    name,
    url: url.replace('http://localhost:', '').replace('https://', ''),
    status: 'available'
  }));

  res.json({ success: true, data: serviceList });
});

// ============================================
// RABTUL SERVICE ROUTES
// ============================================

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  await proxyToService(SERVICES.auth, req, res);
});

app.post('/api/auth/register', async (req, res) => {
  await proxyToService(SERVICES.auth, req, res);
});

app.post('/api/auth/verify', async (req, res) => {
  await proxyToService(SERVICES.auth, req, res);
});

// Payment routes
app.post('/api/payments/create', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.payment, req, res);
});

app.post('/api/payments/webhook', async (req, res) => {
  await proxyToService(SERVICES.payment, req, res);
});

// Wallet routes
app.get('/api/wallet/balance', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.wallet, req, res);
});

app.post('/api/wallet/transfer', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.wallet, req, res);
});

// Order routes
app.post('/api/orders', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.order, req, res);
});

app.get('/api/orders/:id', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.order, req, res);
});

// ============================================
// HOJAI CORE SERVICE ROUTES
// ============================================

// Event routes
app.post('/api/events/publish', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.event, req, res);
});

app.get('/api/events/subscribe/:topic', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.event, req, res);
});

// Memory routes
app.post('/api/memory/store', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.memory, req, res);
});

app.get('/api/memory/:userId', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.memory, req, res);
});

app.get('/api/memory/search', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.memory, req, res);
});

// Intelligence routes
app.post('/api/ai/predict/:model', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.intelligence, req, res);
});

app.get('/api/ai/recommendations/:userId', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.intelligence, req, res);
});

// Agent routes
app.post('/api/agents/execute', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.agents, req, res);
});

app.get('/api/agents/:id/status', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.agents, req, res);
});

// Flow/Workflow routes
app.post('/api/workflows/execute', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.flow, req, res);
});

app.get('/api/workflows/:id/status', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.flow, req, res);
});

// ============================================
// REZ INTELLIGENCE ROUTES
// ============================================

// Intent prediction
app.post('/api/intent/predict', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.intent, req, res);
});

// Identity Graph
app.get('/api/identity/resolve', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.identityGraph, req, res);
});

app.post('/api/identity/link', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.identityGraph, req, res);
});

// Signal aggregation
app.post('/api/signals/ingest', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.signalAggregator, req, res);
});

app.get('/api/signals/:userId', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.signalAggregator, req, res);
});

// Attribution
app.get('/api/attribution/track', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.attribution, req, res);
});

// Recommendations
app.get('/api/recommendations/:userId', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.recommendation, req, res);
});

// Predictive
app.get('/api/predict/churn/:userId', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.predictive, req, res);
});

app.get('/api/predict/ltv/:userId', authMiddleware, async (req, res) => {
  await proxyToService(SERVICES.predictive, req, res);
});

// ============================================
// UNIFIED ROUTES
// ============================================

// Unified search across all services
app.get('/api/unified/search', authMiddleware, async (req: Request, res: Response) => {
  const { q, type } = req.query;

  if (!q) {
    return res.status(400).json({ error: 'Query required', code: 'QUERY_REQUIRED' });
  }

  try {
    const results: any = {
      query: q,
      timestamp: new Date().toISOString(),
    };

    // Search multiple services in parallel
    const axios = (await import('axios')).default;
    const tenantId = (req as any).tenantId;

    const promises = [
      // Search catalog
      axios.get(`${SERVICES.catalog}/search?q=${q}`, {
        headers: { 'X-Tenant-Id': tenantId }
      }).catch(() => null),

      // Search knowledge
      axios.get(`${SERVICES.memory}/search?q=${q}`, {
        headers: { 'X-Tenant-Id': tenantId }
      }).catch(() => null),

      // Search intent
      axios.post(`${SERVICES.intent}/predict`, { query: q }, {
        headers: { 'X-Tenant-Id': tenantId }
      }).catch(() => null),
    ];

    const [catalogResult, memoryResult, intentResult] = await Promise.all(promises);

    results.products = catalogResult?.data?.products || [];
    results.knowledge = memoryResult?.data?.results || [];
    results.intent = intentResult?.data || null;

    res.json({ success: true, data: results });
  } catch (error: any) {
    console.error('Unified search error:', error.message);
    res.status(500).json({ error: 'Search failed', code: 'SEARCH_ERROR' });
  }
});

// Unified profile
app.get('/api/unified/profile/:userId', authMiddleware, async (req: Request, res: Response) => {
  const { userId } = req.params;
  const tenantId = (req as any).tenantId;

  try {
    const axios = (await import('axios')).default;

    const promises = [
      axios.get(`${SERVICES.profile}/${userId}`, {
        headers: { 'X-Tenant-Id': tenantId }
      }).catch(() => null),

      axios.get(`${SERVICES.identityGraph}/resolve/${userId}`, {
        headers: { 'X-Tenant-Id': tenantId }
      }).catch(() => null),

      axios.get(`${SERVICES.memory}/${userId}`, {
        headers: { 'X-Tenant-Id': tenantId }
      }).catch(() => null),

      axios.get(`${SERVICES.signalAggregator}/${userId}`, {
        headers: { 'X-Tenant-Id': tenantId }
      }).catch(() => null),
    ];

    const [profileResult, identityResult, memoryResult, signalsResult] = await Promise.all(promises);

    const unifiedProfile = {
      userId,
      profile: profileResult?.data || null,
      identity: identityResult?.data || null,
      memory: memoryResult?.data || null,
      signals: signalsResult?.data || null,
    };

    res.json({ success: true, data: unifiedProfile });
  } catch (error: any) {
    console.error('Unified profile error:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile', code: 'PROFILE_ERROR' });
  }
});

// Unified event tracking
app.post('/api/unified/track', authMiddleware, async (req: Request, res: Response) => {
  const { event, userId, properties } = req.body;
  const tenantId = (req as any).tenantId;

  try {
    const axios = (await import('axios')).default;

    const promises = [
      // Track in event bus
      axios.post(`${SERVICES.event}/publish`, {
        type: event,
        userId,
        properties,
        tenantId,
        timestamp: new Date().toISOString()
      }, {
        headers: { 'X-Tenant-Id': tenantId }
      }).catch(() => null),

      // Track in signals
      axios.post(`${SERVICES.signalAggregator}/ingest`, {
        event,
        userId,
        properties,
        tenantId
      }, {
        headers: { 'X-Tenant-Id': tenantId }
      }).catch(() => null),

      // Track in analytics
      axios.post(`${SERVICES.analytics}/track`, {
        event,
        userId,
        properties,
        tenantId
      }, {
        headers: { 'X-Tenant-Id': tenantId }
      }).catch(() => null),
    ];

    await Promise.all(promises);

    res.json({ success: true, tracked: true });
  } catch (error: any) {
    console.error('Unified track error:', error.message);
    res.status(500).json({ error: 'Tracking failed', code: 'TRACK_ERROR' });
  }
});

// ============================================
// BILLING ROUTES (Placeholder)
// ============================================

// Billing will be handled by separate billing service
app.get('/api/billing/plans', (_, res) => {
  res.json({
    success: true,
    data: [
      { id: 'starter', name: 'Starter', price: 99, features: ['10 AI employees', 'Basic support'] },
      { id: 'professional', name: 'Professional', price: 499, features: ['50 AI employees', 'Priority support'] },
      { id: 'enterprise', name: 'Enterprise', price: 1999, features: ['Unlimited AI employees', 'Dedicated support'] },
    ]
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Gateway error:', err);
  res.status(500).json({
    error: 'Internal server error',
    code: 'GATEWAY_ERROR',
    requestId: (req as any).requestId
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    code: 'NOT_FOUND',
    path: req.path
  });
});

// Start server
async function start() {
  try {
    await initRedis();

    app.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════════════╗
║         HOJAI UNIFIED GATEWAY v1.0.0                         ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                               ║
║  Services: ${Object.keys(SERVICES).length}                                              ║
╠═══════════════════════════════════════════════════════════════╣
║  RABTUL:   Auth, Payment, Wallet, Order, Catalog           ║
║  HOJAI:    Event, Memory, Intelligence, Agents, Flow         ║
║  REZ:      Intent, Identity, Signals, Attribution             ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start gateway:', error);
    process.exit(1);
  }
}

start();

export default app;
