import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { createLogger } from './utils/logger.js';
import { createErrorResponse } from './types/index.js';

// Import routes
import memoryRoutes from './routes/memory.js';
import twinRoutes from './routes/twin.js';
import intelligenceRoutes from './routes/intelligence.js';
import agentRoutes from './routes/agent.js';
import workflowRoutes from './routes/workflow.js';
import executionRoutes from './routes/execution.js';
import simulationRoutes from './routes/simulation.js';
import queryRoutes from './routes/query.js';
import chatRoutes from './routes/chat.js';
import industryRoutes from './routes/industry.js';
import securityRoutes from './routes/security.js';
import voiceRoutes from './routes/voice.js';

const logger = createLogger('hojai-business-copilot');
const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Tenant-Id", "X-User-Id"]
}));
app.use(express.json({ limit: '10mb' }));

// Request ID middleware
app.use((req, res, next) => {
  (req as any).requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-Id', (req as any).requestId);
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.debug('http_request', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      requestId: (req as any).requestId,
    });
  });
  next();
});

// Health endpoints
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    service: 'hojai-business-copilot',
    version: '1.0.0',
    interfaces: [
      'memory', 'twin', 'intelligence', 'agent', 'workflow',
      'execution', 'simulation', 'chat',
      'industry', 'security', 'voice'
    ],
    timestamp: new Date().toISOString()
  });
});

app.get('/health/live', (_, res) => res.json({ status: 'alive' }));

app.get('/health/ready', async (_, res) => {
  const mongoState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
  if (mongoState !== 'connected') {
    res.status(503).json({ status: 'not_ready', checks: { mongodb: mongoState } });
    return;
  }
  res.json({ status: 'ready', checks: { mongodb: mongoState } });
});

// Interface health check endpoint
app.get('/health/interfaces', async (req, res) => {
  const axios = (await import('axios')).default;

  const interfaces = [
    { name: 'core-copilot', url: process.env.CORE_COPILOT_URL },
    { name: 'memory', url: process.env.MEMORY_SERVICE_URL },
    { name: 'twin', url: process.env.TWIN_SERVICE_URL },
    { name: 'graph', url: process.env.GRAPH_SERVICE_URL },
    { name: 'intelligence', url: process.env.INTELLIGENCE_SERVICE_URL },
    { name: 'expert-os', url: process.env.EXPERT_OS_URL },
    { name: 'flow-os', url: process.env.FLOW_OS_URL },
    { name: 'project', url: process.env.PROJECT_SERVICE_URL },
    { name: 'simulation', url: process.env.SIMULATION_OS_URL },
    { name: 'industry-ai', url: process.env.INDUSTRY_SERVICE_URL },
    { name: 'hib-code', url: process.env.HIB_CODE_SERVICE_URL },
    { name: 'hib-soar', url: process.env.HIB_SOAR_SERVICE_URL },
    { name: 'voice', url: process.env.VOICE_SERVICE_URL },
  ];

  const results = await Promise.all(
    interfaces.map(async (iface) => {
      const start = Date.now();
      try {
        // Try multiple health endpoints
        try {
          await axios.get(`${iface.url}/health`, { timeout: 2000 });
        } catch {
          try {
            await axios.get(`${iface.url}/health/live`, { timeout: 2000 });
          } catch {
            await axios.get(`${iface.url}/ready`, { timeout: 2000 });
          }
        }
        return {
          name: iface.name,
          status: 'healthy',
          responseTime: Date.now() - start,
          lastChecked: new Date().toISOString(),
        };
      } catch {
        return {
          name: iface.name,
          status: 'unavailable',
          responseTime: Date.now() - start,
          lastChecked: new Date().toISOString(),
        };
      }
    })
  );

  const allHealthy = results.every(r => r.status === 'healthy');
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'all_interfaces_healthy' : 'some_interfaces_unavailable',
    interfaces: results,
    timestamp: new Date().toISOString(),
  });
});

// API Routes
app.use('/api/memory', memoryRoutes);
app.use('/api/twin', twinRoutes);
app.use('/api/intelligence', intelligenceRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/execute', executionRoutes);
app.use('/api/simulate', simulationRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/industry', industryRoutes);
app.use('/api/security', securityRoutes);
app.use('/api/voice', voiceRoutes);

// Root endpoint
app.get('/', (_, res) => {
  res.json({
    service: 'hojai-business-copilot',
    version: '1.0.0',
    description: 'Unified Business Copilot with 7 interfaces + Chat',
    interfaces: {
      memory: 'Memory context and persistence',
      twin: 'Digital twins and predictions',
      intelligence: 'AI insights and graph intelligence',
      agent: 'Task execution agents',
      workflow: 'Workflow orchestration',
      execution: 'Task and project execution',
      simulation: 'What-if scenarios and simulations',
      chat: 'Chat interface (integrates with core/business-copilot)',
    },
    endpoints: {
      health: '/health',
      interfaces: '/health/interfaces',
      query: '/api/query',
      chat: '/api/chat',
      skills: '/api/chat/skills',
      industries: '/api/chat/industries',
      memory: '/api/memory',
      twin: '/api/twin',
      intelligence: '/api/intelligence',
      agent: '/api/agent',
      workflow: '/api/workflow',
      execute: '/api/execute',
      simulate: '/api/simulate',
    },
    connectedServices: {
      coreBusinessCopilot: process.env.CORE_COPILOT_URL || 'http://localhost:4002',
      memoryService: process.env.MEMORY_SERVICE_URL || 'http://localhost:4520',
      twinService: process.env.TWIN_SERVICE_URL || 'http://localhost:4860',
      graphService: process.env.GRAPH_SERVICE_URL || 'http://localhost:4810',
    },
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json(createErrorResponse('NOT_FOUND', `Route ${req.method} ${req.path} not found`));
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error('unhandled_error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    requestId: (req as any).requestId,
  });
  res.status(500).json(createErrorResponse('INTERNAL_ERROR', err.message || 'Internal server error'));
});

// Start server
const PORT = parseInt(process.env.PORT || '4600', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-business-copilot';
const SKIP_MONGODB = process.env.SKIP_MONGODB === 'true';

async function start() {
  // MongoDB is optional - service can run without it
  if (!SKIP_MONGODB) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
      logger.info('mongodb_connected', { uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });
    } catch (error: any) {
      logger.warn('mongodb_unavailable', { error: error.message });
      logger.info('starting_without_mongodb', {});
    }
  } else {
    logger.info('mongodb_skipped', {});
  }

  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════════╗
║           HOJAI BUSINESS COPILOT v1.0.0                      ║
╠══════════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                                  ║
║  Features: Chat | Memory | Twin | Intelligence | Agent         ║
║            Workflow | Execution | Simulation                     ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
  });
}

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  logger.info('shutdown_initiated', { signal: 'SIGTERM' });
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('shutdown_initiated', { signal: 'SIGINT' });
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('unhandled_rejection', { reason: reason?.message || reason });
  process.exit(1);
});

start();
