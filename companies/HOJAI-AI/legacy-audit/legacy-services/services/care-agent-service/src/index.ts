import dotenv from 'dotenv';
import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './utils/logger';
import agentRoutes from './routes/agentRoutes';

// Load environment variables
dotenv.config();

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '4592', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// App Setup
// ============================================================================

const app: Express = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
  credentials: true,
  maxAge: 86400,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction): void => {
  req.headers['x-request-id'] = req.headers['x-request-id'] as string || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction): void => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('HTTP Request', {
      requestId: req.headers['x-request-id'],
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    });
  });

  next();
});

// Trust proxy (for rate limiting behind reverse proxy)
app.set('trust proxy', 1);

// ============================================================================
// Health Check Endpoints
// ============================================================================

/**
 * Basic health check
 */
app.get('/health', (req: Request, res: Response): void => {
  res.status(200).json({
    status: 'healthy',
    service: 'hojai-care-agent-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

/**
 * Detailed health check with service dependencies
 */
app.get('/health/detailed', async (req: Request, res: Response): Promise<void> => {
  const healthStatus = {
    status: 'healthy',
    service: 'hojai-care-agent-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      memory: {
        status: 'healthy',
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
      memoryService: {
        status: 'unknown',
        url: process.env.MEMORY_SERVICE_URL || 'http://localhost:4591',
      },
      voiceService: {
        status: 'unknown',
        url: process.env.VOICE_SERVICE_URL || 'http://localhost:4590',
      },
      risaCareApi: {
        status: 'unknown',
        url: process.env.RISACARE_API_URL || 'http://localhost:4701',
      },
    },
  };

  // Check service dependencies (lightweight checks)
  const axios = (await import('axios')).default;

  const checkServices = [
    {
      name: 'memoryService',
      url: process.env.MEMORY_SERVICE_URL || 'http://localhost:4591',
    },
    {
      name: 'voiceService',
      url: process.env.VOICE_SERVICE_URL || 'http://localhost:4590',
    },
    {
      name: 'risaCareApi',
      url: process.env.RISACARE_API_URL || 'http://localhost:4701',
    },
  ];

  for (const service of checkServices) {
    try {
      await axios.get(`${service.url}/health`, { timeout: 2000 });
      healthStatus.checks[service.name as keyof typeof healthStatus.checks].status = 'healthy';
    } catch {
      healthStatus.checks[service.name as keyof typeof healthStatus.checks].status = 'degraded';
      healthStatus.status = 'degraded';
    }
  }

  // Check memory usage
  const memUsage = process.memoryUsage();
  const memUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

  if (memUsedPercent > 90) {
    healthStatus.checks.memory.status = 'critical';
    healthStatus.status = 'unhealthy';
  } else if (memUsedPercent > 75) {
    healthStatus.checks.memory.status = 'warning';
    if (healthStatus.status === 'healthy') {
      healthStatus.status = 'degraded';
    }
  }

  const statusCode = healthStatus.status === 'healthy' ? 200 :
    healthStatus.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(healthStatus);
});

/**
 * Readiness probe
 */
app.get('/ready', (req: Request, res: Response): void => {
  res.status(200).json({
    ready: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Liveness probe
 */
app.get('/live', (req: Request, res: Response): void => {
  res.status(200).json({
    alive: true,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Service info
 */
app.get('/', (req: Request, res: Response): void => {
  res.status(200).json({
    service: 'HOJAI Care Agent Service',
    description: 'Healthcare AI agent service for patient interactions, symptom assessment, and care coordination',
    version: '1.0.0',
    documentation: '/api/docs',
    endpoints: {
      health: '/health',
      healthDetailed: '/health/detailed',
      ready: '/ready',
      live: '/live',
      chat: 'POST /agent/chat',
      explainReport: 'POST /agent/explain',
      assessSymptoms: 'POST /agent/symptoms',
      prepareAppointment: 'GET /agent/prepare/:appointmentId',
      recallHistory: 'GET /agent/recall/:profileId',
      generateCarePlan: 'POST /agent/care-plan',
    },
  });
});

// ============================================================================
// API Routes
// ============================================================================

// Mount agent routes
app.use('/agent', agentRoutes);

// API documentation placeholder
app.get('/api/docs', (req: Request, res: Response): void => {
  res.status(200).json({
    title: 'HOJAI Care Agent API',
    version: '1.0.0',
    endpoints: [
      {
        method: 'POST',
        path: '/agent/chat',
        description: 'Chat with the care agent',
        body: {
          message: 'string (required)',
          sessionId: 'string (optional)',
          profileId: 'string (optional)',
        },
      },
      {
        method: 'POST',
        path: '/agent/explain',
        description: 'Explain a health report',
        body: {
          profileId: 'string (required)',
          reportId: 'string (required)',
        },
      },
      {
        method: 'POST',
        path: '/agent/symptoms',
        description: 'Assess symptoms',
        body: {
          profileId: 'string (required)',
          symptoms: 'string[] (required)',
          duration: 'string (optional)',
          severity: 'mild | moderate | severe (optional)',
        },
      },
      {
        method: 'GET',
        path: '/agent/prepare/:appointmentId',
        description: 'Prepare for an appointment',
        params: {
          appointmentId: 'string (required)',
        },
        query: {
          profileId: 'string (optional)',
        },
      },
      {
        method: 'GET',
        path: '/agent/recall/:profileId',
        description: 'Recall care history',
        params: {
          profileId: 'string (required)',
        },
        query: {
          topic: 'string (required)',
        },
      },
      {
        method: 'POST',
        path: '/agent/care-plan',
        description: 'Generate a care plan',
        body: {
          profileId: 'string (required)',
        },
      },
    ],
  });
});

// ============================================================================
// 404 Handler
// ============================================================================

app.use((req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: `Cannot ${req.method} ${req.path}`,
    timestamp: new Date().toISOString(),
  });
});

// ============================================================================
// Error Handler
// ============================================================================

app.use((err: Error, req: Request, res: Response, next: NextFunction): void => {
  logger.error('Unhandled error', err, {
    requestId: req.headers['x-request-id'],
    path: req.path,
    method: req.method,
  });

  // Check if headers have already been sent
  if (res.headersSent) {
    next(err);
    return;
  }

  // Handle JSON parsing errors
  if (err instanceof SyntaxError && 'body' in err) {
    res.status(400).json({
      success: false,
      error: 'Invalid JSON',
      message: 'Request body contains invalid JSON',
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Default error response
  const statusCode = (err as { statusCode?: number }).statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: statusCode === 500 ? 'Internal Server Error' : err.name,
    message: NODE_ENV === 'development' ? err.message : 'An unexpected error occurred',
    timestamp: new Date().toISOString(),
    requestId: req.headers['x-request-id'],
  });
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

let isShuttingDown = false;

const gracefulShutdown = (signal: string): void => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Stop accepting new connections
  const server = app.listen();

  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    logger.error('Graceful shutdown timed out. Forcing exit.');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err: Error): void => {
  logger.error('Uncaught exception', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: unknown): void => {
  logger.error('Unhandled rejection', reason);
  process.exit(1);
});

// ============================================================================
// Start Server
// ============================================================================

const startServer = (): void => {
  app.listen(PORT, () => {
    logger.info(`HOJAI Care Agent Service started`, {
      port: PORT,
      nodeEnv: NODE_ENV,
      pid: process.pid,
    });

    logger.info(`Server is running on http://localhost:${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API docs: http://localhost:${PORT}/api/docs`);
  });
};

startServer();

export default app;
