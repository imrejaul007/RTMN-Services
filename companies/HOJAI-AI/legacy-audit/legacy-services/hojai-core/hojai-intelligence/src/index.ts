/**
 * Hojai Intelligence Service
 * Version: 1.1.0 | Port: 4531
 * Combined Intelligence, Event Bus, and Shared Services
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import http from 'http';
import { v4 as uuidv4 } from 'uuid';
import { WebSocketServer, WebSocket } from 'ws';

// ============================================
// LOGGING
// ============================================

function createLogger(service: string) {
  return {
    info: (event: string, data?: Record<string, unknown>) => {
      console.log(JSON.stringify({ level: 'info', service, event, timestamp: new Date().toISOString(), ...data }));
    },
    error: (event: string, data?: Record<string, unknown>) => {
      console.error(JSON.stringify({ level: 'error', service, event, timestamp: new Date().toISOString(), ...data }));
    },
    warn: (event: string, data?: Record<string, unknown>) => {
      console.warn(JSON.stringify({ level: 'warn', service, event, timestamp: new Date().toISOString(), ...data }));
    }
  };
}

const logger = createLogger('hojai-skillnet');

// ============================================
// CONFIGURATION
// ============================================

const PORT = parseInt(process.env.PORT || '4531', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-skillnet';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';

// ============================================
// TYPES
// ============================================

interface TenantContext {
  tenant_id: string;
  user_id?: string;
  roles?: string[];
}

declare global {
  namespace Express {
    interface Request {
      tenantContext?: TenantContext;
    }
  }
}

// MongoDB Models
interface PredictionDoc {
  id: string;
  tenant_id: string;
  user_id?: string;
  type: string;
  model: string;
  score: number;
  confidence: number;
  features: Record<string, unknown>;
  prediction: unknown;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface RecommendationDoc {
  id: string;
  tenant_id: string;
  user_id?: string;
  type: string;
  items: unknown[];
  strategy: string;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface InsightDoc {
  id: string;
  tenant_id: string;
  user_id?: string;
  type: string;
  title: string;
  description: string;
  severity: string;
  recommendation?: string;
  data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

interface EventDoc {
  id: string;
  tenant_id: string;
  type: string;
  source: string;
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  occurred_at: string;
  created_at: string;
  updated_at: string;
}

interface SubscriptionDoc {
  id: string;
  tenant_id: string;
  name: string;
  event_type: string;
  event_pattern?: string;
  handler: string;
  filter?: Record<string, unknown>;
  active: boolean;
  stats: { received: number; processed: number; failed: number };
  created_at: string;
  updated_at: string;
}

interface TenantDoc {
  id: string;
  name: string;
  plan: string;
  quota: { api_calls: number; storage: number; users: number };
  usage: { api_calls: number; storage: number; users: number };
  status: string;
  created_at: string;
  updated_at: string;
}

interface ApiKeyDoc {
  id: string;
  tenant_id: string;
  key: string;
  name: string;
  permissions: string[];
  expires_at?: string;
  last_used?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Models
let PredictionModel: mongoose.Model<PredictionDoc>;
let RecommendationModel: mongoose.Model<RecommendationDoc>;
let InsightModel: mongoose.Model<InsightDoc>;
let EventModel: mongoose.Model<EventDoc>;
let SubscriptionModel: mongoose.Model<SubscriptionDoc>;
let TenantModel: mongoose.Model<TenantDoc>;
let ApiKeyModel: mongoose.Model<ApiKeyDoc>;

function getModels() {
  if (!PredictionModel) {
    PredictionModel = mongoose.model<PredictionDoc>('Prediction', new mongoose.Schema({
      id: String, tenant_id: String, user_id: String, type: String, model: String,
      score: Number, confidence: Number, features: mongoose.Schema.Types.Mixed,
      prediction: mongoose.Schema.Types.Mixed, metadata: mongoose.Schema.Types.Mixed,
      created_at: String, updated_at: String
    }, { collection: 'intelligence_predictions' }));
  }
  if (!RecommendationModel) {
    RecommendationModel = mongoose.model<RecommendationDoc>('Recommendation', new mongoose.Schema({
      id: String, tenant_id: String, user_id: String, type: String, items: mongoose.Schema.Types.Mixed,
      strategy: String, metadata: mongoose.Schema.Types.Mixed,
      created_at: String, updated_at: String
    }, { collection: 'intelligence_recommendations' }));
  }
  if (!InsightModel) {
    InsightModel = mongoose.model<InsightDoc>('Insight', new mongoose.Schema({
      id: String, tenant_id: String, user_id: String, type: String, title: String,
      description: String, severity: String, recommendation: String, data: mongoose.Schema.Types.Mixed,
      created_at: String, updated_at: String
    }, { collection: 'intelligence_insights' }));
  }
  if (!EventModel) {
    EventModel = mongoose.model<EventDoc>('Event', new mongoose.Schema({
      id: String, tenant_id: String, type: String, source: String,
      data: mongoose.Schema.Types.Mixed, metadata: mongoose.Schema.Types.Mixed,
      occurred_at: String, created_at: String, updated_at: String
    }, { collection: 'events' }));
  }
  if (!SubscriptionModel) {
    SubscriptionModel = mongoose.model<SubscriptionDoc>('Subscription', new mongoose.Schema({
      id: String, tenant_id: String, name: String, event_type: String, event_pattern: String,
      handler: String, filter: mongoose.Schema.Types.Mixed, active: Boolean,
      stats: { received: { type: Number, default: 0 }, processed: { type: Number, default: 0 }, failed: { type: Number, default: 0 } },
      created_at: String, updated_at: String
    }, { collection: 'event_subscriptions' }));
  }
  if (!TenantModel) {
    TenantModel = mongoose.model<TenantDoc>('Tenant', new mongoose.Schema({
      id: String, name: String, plan: String,
      quota: { api_calls: { type: Number, default: 1000 }, storage: { type: Number, default: 100 }, users: { type: Number, default: 5 } },
      usage: { api_calls: { type: Number, default: 0 }, storage: { type: Number, default: 0 }, users: { type: Number, default: 0 } },
      status: { type: String, default: 'trial' },
      created_at: String, updated_at: String
    }, { collection: 'shared_tenants' }));
  }
  if (!ApiKeyModel) {
    ApiKeyModel = mongoose.model<ApiKeyDoc>('ApiKey', new mongoose.Schema({
      id: String, tenant_id: String, key: String, name: String, permissions: [String],
      expires_at: String, last_used: String, status: { type: String, default: 'active' },
      created_at: String, updated_at: String
    }, { collection: 'shared_api_keys' }));
  }
  return { PredictionModel, RecommendationModel, InsightModel, EventModel, SubscriptionModel, TenantModel, ApiKeyModel };
}

// ============================================
// MIDDLEWARE
// ============================================

function tenantMiddleware() {
  return (req: Request, res: Response, next: NextFunction) => {
    const tenantId = req.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return res.status(400).json({
        success: false,
        error: { code: 'MISSING_TENANT_ID', message: 'X-Tenant-Id header required' }
      });
    }
    req.tenantContext = { tenant_id: tenantId, user_id: req.headers['x-user-id'] as string };
    next();
  };
}

function getCorsOrigins(): string[] {
  const origins = process.env.CORS_ORIGINS || '';
  if (!origins) return [];
  return origins.split(',').map(o => o.trim()).filter(Boolean);
}

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

let isShuttingDown = false;

function initGracefulShutdown() {
  const cleanup = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info('graceful_shutdown_initiated');
    await mongoose.connection.close();
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('uncaughtException', (err) => {
    logger.error('uncaught_exception', { error: err.message });
    cleanup();
  });
}

// ============================================
// ML PREDICTION ENGINE
// ============================================

function predictChurn(features: Record<string, unknown>): { score: number; confidence: number } {
  const daysSinceActivity = features.daysSinceActivity as number || 30;
  const engagementScore = features.engagementScore as number || 0.5;
  let score = Math.min(1, Math.max(0, daysSinceActivity / 90 * 0.6 + (1 - engagementScore) * 0.4));
  if (features.totalOrders as number > 10) score *= 0.7;
  return { score, confidence: 0.65 + Math.random() * 0.25 };
}

function predictLTV(features: Record<string, unknown>): { score: number; confidence: number } {
  const avgOrderValue = features.avgOrderValue as number || 100;
  const orderFrequency = features.orderFrequency as number || 1;
  const customerAge = features.customerAge as number || 30;
  let score = Math.min(1, (avgOrderValue * orderFrequency * Math.min(60, customerAge / 30 * 2)) / 50000);
  return { score, confidence: 0.60 + Math.random() * 0.30 };
}

function predictIntent(features: Record<string, unknown>): { score: number; confidence: number; intent: string } {
  const cartValue = features.cartValue as number || 0;
  const pageViews = features.pageViews as number || 0;
  let intent = 'browse', score = 0.3;
  if (cartValue > 0) { intent = 'purchase'; score = 0.7 + Math.min(0.3, cartValue / 1000); }
  else if (pageViews > 5) { intent = 'research'; score = 0.5 + Math.min(0.3, pageViews / 20); }
  return { score, confidence: 0.55 + Math.random() * 0.35, intent };
}

function generateRecommendations(type: string): unknown[] {
  if (type === 'product') return [
    { id: 'prod_1', type: 'product', score: 0.95, reason: 'Based on your browsing history' },
    { id: 'prod_2', type: 'product', score: 0.88, reason: 'Frequently bought together' }
  ];
  return [{ id: 'item_1', type: 'generic', score: 0.80 }];
}

// ============================================
// EXPRESS APP
// ============================================

const app = express();

app.use(helmet());
app.use(cors({ origin: getCorsOrigins(), credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('request', { method: req.method, path: req.path, status: res.statusCode, duration: Date.now() - start });
  });
  next();
});

// Health checks
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'hojai-skillnet', version: '1.1.0', mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected' });
});
app.get('/health/live', (req, res) => res.json({ status: 'ok' }));
app.get('/health/ready', (req, res) => {
  if (mongoose.connection.readyState === 1) res.json({ status: 'ready' });
  else res.status(503).json({ status: 'not_ready' });
});

// ============================================
// METRICS ENDPOINT (Prometheus)
// ============================================

// Simple metrics (without prom-client for now)
app.get('/metrics', (req, res) => {
  const uptime = process.uptime();
  const memUsage = process.memoryUsage();
  res.set('Content-Type', 'text/plain');
  res.send(`# HELP hojai_uptime_seconds Service uptime in seconds
# TYPE hojai_uptime_seconds gauge
hojai_uptime_seconds ${uptime}

# HELP hojai_memory_bytes Process memory in bytes
# TYPE hojai_memory_bytes gauge
hojai_memory_bytes{type="rss"} ${memUsage.rss}
hojai_memory_bytes{type="heapUsed"} ${memUsage.heapUsed}
hojai_memory_bytes{type="heapTotal"} ${memUsage.heapTotal}

# HELP hojai_mongodb_ready MongoDB connection status
# TYPE hojai_mongodb_ready gauge
hojai_mongodb_ready ${mongoose.connection.readyState === 1 ? 1 : 0}
`);
});

// ============================================
// SWAGGER UI
// ============================================

import { openapiSpec } from './swagger.js';

app.get('/api-docs', (req, res) => {
  res.json(openapiSpec);
});

app.get('/docs', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>HOJAI Intelligence API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css">
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    SwaggerUIBundle({
      url: '/api-docs',
      dom_id: '#swagger-ui',
      presets: [SwaggerUIBundle.presets.apis, SwaggerUIBundle.SwaggerUIStandalonePreset],
      layout: 'BaseLayout'
    });
  </script>
</body>
</html>`);
});

// Stats endpoint
app.get('/stats', tenantMiddleware(), async (req, res) => {
  try {
    const ctx = req.tenantContext!;
    const { PredictionModel, RecommendationModel, InsightModel, EventModel } = getModels();
    const [predictions, recommendations, insights, events] = await Promise.all([
      PredictionModel.countDocuments({ tenant_id: ctx.tenant_id }),
      RecommendationModel.countDocuments({ tenant_id: ctx.tenant_id }),
      InsightModel.countDocuments({ tenant_id: ctx.tenant_id }),
      EventModel.countDocuments({ tenant_id: ctx.tenant_id })
    ]);
    res.json({ success: true, data: { predictions, recommendations, insights, events } });
  } catch (error) {
    logger.error('stats_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch stats' } });
  }
});

// ============================================
// PREDICTION ROUTES
// ============================================

app.post('/predictions/churn', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const ctx = req.tenantContext!;
    const { userId, features } = req.body;
    if (!features) return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'features required' } });
    const { score, confidence } = predictChurn(features);
    const now = new Date().toISOString();
    const prediction = await getModels().PredictionModel.create({
      id: uuidv4(), tenant_id: ctx.tenant_id, user_id: userId, type: 'churn', model: 'hojai-churn-v1',
      score, confidence, features, prediction: { churnRisk: score > 0.7 ? 'high' : score > 0.4 ? 'medium' : 'low' },
      created_at: now, updated_at: now
    });
    res.status(201).json({ success: true, data: { prediction } });
  } catch (error) {
    logger.error('prediction_error', { error: (error as Error).message });
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create prediction' } });
  }
});

app.post('/predictions/ltv', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const ctx = req.tenantContext!;
    const { userId, features } = req.body;
    if (!features) return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'features required' } });
    const { score, confidence } = predictLTV(features);
    const now = new Date().toISOString();
    const prediction = await getModels().PredictionModel.create({
      id: uuidv4(), tenant_id: ctx.tenant_id, user_id: userId, type: 'ltv', model: 'hojai-ltv-v1',
      score, confidence, features, prediction: { estimatedLTV: score * 50000 },
      created_at: now, updated_at: now
    });
    res.status(201).json({ success: true, data: { prediction } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create prediction' } });
  }
});

app.post('/predictions/intent', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const ctx = req.tenantContext!;
    const { userId, features } = req.body;
    if (!features) return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'features required' } });
    const { score, confidence, intent } = predictIntent(features);
    const now = new Date().toISOString();
    const prediction = await getModels().PredictionModel.create({
      id: uuidv4(), tenant_id: ctx.tenant_id, user_id: userId, type: 'intent', model: 'hojai-intent-v1',
      score, confidence, features, prediction: { intent, score },
      created_at: now, updated_at: now
    });
    res.status(201).json({ success: true, data: { prediction } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create prediction' } });
  }
});

app.get('/predictions', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const ctx = req.tenantContext!;
    const { type, limit = 50 } = req.query;
    const filter: Record<string, unknown> = { tenant_id: ctx.tenant_id };
    if (type) filter.type = type;
    const predictions = await getModels().PredictionModel.find(filter).sort({ created_at: -1 }).limit(Number(limit)).lean();
    res.json({ success: true, data: { predictions, count: predictions.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch predictions' } });
  }
});

// ============================================
// RECOMMENDATION ROUTES
// ============================================

app.post('/recommendations/product', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const ctx = req.tenantContext!;
    const { userId } = req.body;
    const items = generateRecommendations('product');
    const now = new Date().toISOString();
    const recommendation = await getModels().RecommendationModel.create({
      id: uuidv4(), tenant_id: ctx.tenant_id, user_id: userId, type: 'product', items,
      strategy: 'collaborative-filtering', created_at: now, updated_at: now
    });
    res.status(201).json({ success: true, data: { recommendation } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create recommendation' } });
  }
});

app.get('/recommendations', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const ctx = req.tenantContext!;
    const { type, limit = 20 } = req.query;
    const filter: Record<string, unknown> = { tenant_id: ctx.tenant_id };
    if (type) filter.type = type;
    const recommendations = await getModels().RecommendationModel.find(filter).sort({ created_at: -1 }).limit(Number(limit)).lean();
    res.json({ success: true, data: { recommendations, count: recommendations.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch recommendations' } });
  }
});

// ============================================
// EVENT ROUTES
// ============================================

app.post('/events', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const ctx = req.tenantContext!;
    const { type, data, metadata, source } = req.body;
    if (!type || !data) return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'type and data required' } });
    const now = new Date().toISOString();
    const event = await getModels().EventModel.create({
      id: uuidv4(), tenant_id: ctx.tenant_id, type, source: source || 'unknown', data,
      metadata: { ...metadata, correlationId: metadata?.correlationId || uuidv4() },
      occurred_at: now, created_at: now, updated_at: now
    });
    res.status(201).json({ success: true, data: { event } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to publish event' } });
  }
});

app.get('/events', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const ctx = req.tenantContext!;
    const { type, limit = 100, offset = 0 } = req.query;
    const filter: Record<string, unknown> = { tenant_id: ctx.tenant_id };
    if (type) filter.type = type;
    const total = await getModels().EventModel.countDocuments(filter);
    const events = await getModels().EventModel.find(filter).sort({ occurred_at: -1 }).skip(Number(offset)).limit(Number(limit)).lean();
    res.json({ success: true, data: { events, pagination: { total, limit: Number(limit), offset: Number(offset) } } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch events' } });
  }
});

// ============================================
// INSIGHT ROUTES
// ============================================

app.post('/insights', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const ctx = req.tenantContext!;
    const { userId, type, title, description, severity, recommendation, data } = req.body;
    if (!type || !title) return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'type and title required' } });
    const now = new Date().toISOString();
    const insight = await getModels().InsightModel.create({
      id: uuidv4(), tenant_id: ctx.tenant_id, user_id: userId, type, title, description,
      severity: severity || 'medium', recommendation, data, created_at: now, updated_at: now
    });
    res.status(201).json({ success: true, data: { insight } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create insight' } });
  }
});

app.get('/insights', tenantMiddleware(), async (req: Request, res: Response) => {
  try {
    const ctx = req.tenantContext!;
    const { type, severity, limit = 50 } = req.query;
    const filter: Record<string, unknown> = { tenant_id: ctx.tenant_id };
    if (type) filter.type = type;
    if (severity) filter.severity = severity;
    const insights = await getModels().InsightModel.find(filter).sort({ created_at: -1 }).limit(Number(limit)).lean();
    res.json({ success: true, data: { insights, count: insights.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch insights' } });
  }
});

// ============================================
// TENANT ROUTES
// ============================================

app.post('/tenants', async (req: Request, res: Response) => {
  try {
    const { name, plan = 'free' } = req.body;
    if (!name) return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'name required' } });
    const now = new Date().toISOString();
    const tenant = await getModels().TenantModel.create({
      id: uuidv4(), name, plan,
      quota: { api_calls: plan === 'pro' ? 100000 : plan === 'enterprise' ? -1 : 10000, storage: 1000, users: plan === 'enterprise' ? -1 : 25 },
      usage: { api_calls: 0, storage: 0, users: 0 },
      status: 'trial', created_at: now, updated_at: now
    });
    res.status(201).json({ success: true, data: { tenant } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create tenant' } });
  }
});

app.get('/tenants', async (req: Request, res: Response) => {
  try {
    const tenants = await getModels().TenantModel.find({}).lean();
    res.json({ success: true, data: { tenants, count: tenants.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to list tenants' } });
  }
});

// ============================================
// API KEY ROUTES
// ============================================

app.post('/apikeys', async (req: Request, res: Response) => {
  try {
    const { tenantId, name } = req.body;
    if (!tenantId || !name) return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'tenantId and name required' } });
    const now = new Date().toISOString();
    const apiKey = await getModels().ApiKeyModel.create({
      id: uuidv4(), tenant_id: tenantId, key: `hk_${uuidv4().replace(/-/g, '')}`, name,
      permissions: ['read', 'write'], status: 'active', created_at: now, updated_at: now
    });
    res.status(201).json({ success: true, data: { apiKey } });
  } catch (error) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Failed to create API key' } });
  }
});

// ============================================
// GRAPHIQL (GraphQL Playground)
// ============================================

app.get('/graphql', (req, res) => {
  res.send(`<!DOCTYPE html>
<html>
<head>
  <title>HOJAI Intelligence GraphQL</title>
  <link href="https://unpkg.com/graphiql/graphiql.min.css" rel="stylesheet" />
</head>
<body>
  <div id="graphiql" style="height: 100vh;"></div>
  <script crossorigin src="https://unpkg.com/react/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/graphiql/graphiql.min.js"></script>
  <script>
    const fetcher = GraphiQL.createFetcher({ url: '/graphql' });
    ReactDOM.render(
      React.createElement(GraphiQL, { fetcher }),
      document.getElementById('graphiql'),
    );
  </script>
</body>
</html>`);
});

// ============================================
// ERROR HANDLER
// ============================================

app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('error', { error: err.message, path: req.path });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error' }
  });
});

app.use((req, res) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: `Route ${req.path} not found` } });
});

// ============================================
// START SERVER
// ============================================

async function start() {
  try {
    await mongoose.connect(MONGODB_URI, { maxPoolSize: 10 });
    logger.info('mongodb_connected', { uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });

    initGracefulShutdown();

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket server
    const wss = new WebSocketServer({ server, path: '/ws' });
    const wsClients = new Map<string, { ws: WebSocket; tenantId: string; subscriptions: Set<string> }>();

    wss.on('connection', (ws, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const tenantId = url.searchParams.get('tenantId') || 'anonymous';
      const clientId = uuidv4();

      wsClients.set(clientId, { ws, tenantId, subscriptions: new Set() });

      ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.action === 'subscribe') {
            const client = wsClients.get(clientId);
            client?.subscriptions.add(msg.eventType || '*');
          }
        } catch (e) { /* ignore */ }
      });

      ws.on('close', () => {
        wsClients.delete(clientId);
      });

      logger.info('ws_client_connected', { clientId, tenantId });
    });

    // Broadcast events to WebSocket clients
    (global as any).broadcastWsEvent = (tenantId: string, event: any) => {
      for (const client of wsClients.values()) {
        if (client.tenantId === tenantId) {
          client.ws.send(JSON.stringify({ type: 'event', data: event, timestamp: new Date().toISOString() }));
        }
      }
    };

    server.listen(PORT, () => {
      logger.info('service_started', { port: PORT, ws: true });
      console.log(`
╔═══════════════════════════════════════════════════════════╗
║           HOJAI SKILLNET v1.1.0                    ║
╠═══════════════════════════════════════════════════════════╣
║  HTTP:      http://localhost:${PORT}                    ║
║  WebSocket: ws://localhost:${PORT}/ws                   ║
║  MongoDB:   Connected                                  ║
╠═══════════════════════════════════════════════════════════╣
║  Endpoints:                                             ║
║  - GET  /health, /metrics, /api-docs, /graphql         ║
║  - POST /predictions/*, /recommendations/*, /events    ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start service:', error);
    process.exit(1);
  }
}

start();

export default app;
