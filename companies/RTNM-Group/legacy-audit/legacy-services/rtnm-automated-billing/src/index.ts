import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import config from './config';
import billingRoutes from './routes/billing.routes';
import { logger } from './utils/logger';

// Initialize Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Internal-Token'],
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Rate limit exceeded. Please try again later.',
  },
});
app.use(limiter);

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  next();
});

// Health check endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'rtnm-automated-billing',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  const checks: Record<string, unknown> = {
    service: 'ok',
    mongodb: 'unknown',
  };

  // Check MongoDB connection
  if (mongoose.connection.readyState === 1) {
    checks.mongodb = 'ok';
  } else {
    checks.mongodb = 'disconnected';
  }

  const allHealthy = Object.values(checks).every((v) => v === 'ok');

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ok' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

// Metrics endpoint (Prometheus-style)
app.get('/metrics', (_req: Request, res: Response) => {
  const metrics = {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    mongodb_readyState: mongoose.connection.readyState,
    timestamp: new Date().toISOString(),
  };

  // Prometheus format
  const prometheusMetrics = `
# HELP rtnm_billing_uptime_seconds Service uptime in seconds
# TYPE rtnm_billing_uptime_seconds gauge
rtnm_billing_uptime_seconds ${metrics.uptime}

# HELP rtnm_billing_memory_heap_used_bytes Heap memory used in bytes
# TYPE rtnm_billing_memory_heap_used_bytes gauge
rtnm_billing_memory_heap_used_bytes ${metrics.memoryUsage.heapUsed}

# HELP rtnm_billing_memory_heap_total_bytes Total heap memory in bytes
# TYPE rtnm_billing_memory_heap_total_bytes gauge
rtnm_billing_memory_heap_total_bytes ${metrics.memoryUsage.heapTotal}

# HELP rtnm_billing_memory_rss_bytes Resident set size in bytes
# TYPE rtnm_billing_memory_rss_bytes gauge
rtnm_billing_memory_rss_bytes ${metrics.memoryUsage.rss}

# HELP rtnm_billing_mongodb_readystate MongoDB connection state (0=disconnected, 1=connected)
# TYPE rtnm_billing_mongodb_readystate gauge
rtnm_billing_mongodb_readystate ${metrics.mongodb_readyState}
`.trim();

  res.set('Content-Type', 'text/plain');
  res.send(prometheusMetrics);
});

// API routes
app.use('/api', billingRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'RTNM Automated Billing Service',
    version: '1.0.0',
    description: 'Automated billing, settlements, and reconciliation for RTNM Economic Network',
    endpoints: {
      health: '/health',
      healthReady: '/health/ready',
      healthLive: '/health/live',
      metrics: '/metrics',
      api: '/api',
    },
    companies: config.companies.registry.length,
    timestamp: new Date().toISOString(),
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not Found',
    message: 'The requested resource does not exist',
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'An unexpected error occurred',
  });
});

// Database connection
const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = config.mongodb.uri;

    await mongoose.connect(mongoUri, config.mongodb.options);

    logger.info('MongoDB connected successfully', {
      uri: mongoUri.replace(/\/\/.*@/, '//<credentials>@'),
    });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = (signal: string): void => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');

    mongoose.connection.close(false, () => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });

    // Force close after 10 seconds
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  });
};

// Start server
let server: ReturnType<typeof app.listen>;

const startServer = async (): Promise<void> => {
  await connectDB();

  server = app.listen(config.port, () => {
    logger.info(`RTNM Automated Billing Service started`, {
      port: config.port,
      nodeEnv: config.nodeEnv,
      pid: process.pid,
    });

    logger.info('Service ready to accept connections');
  });

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { promise, reason });
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

// Start the application
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;