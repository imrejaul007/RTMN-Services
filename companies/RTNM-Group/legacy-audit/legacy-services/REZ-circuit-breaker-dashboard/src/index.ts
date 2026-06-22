import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import path from 'path';
import Redis from 'ioredis';
import winston from 'winston';

// Load environment variables
dotenv.config();

// Import services
import { CircuitBreakerMonitor } from './services/circuitBreakerMonitor';
import { AlertManager } from './services/alertManager';
import { HealthAggregator } from './services/healthAggregator';

// Import routes
import { createDashboardRoutes } from './routes/dashboard';

// Import middleware
import { authMiddleware, requestLogger, corsMiddleware, errorHandler } from './middleware/security';

// Import types
import { WS_EVENT_TYPE, WSEvent } from './types';

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Create Express app
const app = express();
const server = http.createServer(app);

// Configure Socket.IO
const io = new SocketIOServer(server, {
  cors: {
    origin: (process.env.ALLOWED_ORIGINS || 'https://rez.money').split(','),
    credentials: true,
    methods: ['GET', 'POST']
  },
  path: '/socket.io'
});

// Initialize Redis
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3
});

redis.on('connect', () => {
  logger.info('Connected to Redis');
});

redis.on('error', (err) => {
  logger.error('Redis connection error:', err);
});

// Initialize services
const circuitMonitor = new CircuitBreakerMonitor(redis, logger);
const alertManager = new AlertManager(logger);
const healthAggregator = new HealthAggregator(logger, circuitMonitor);

// Connect services for WebSocket updates
function emitWsEvent(event: WSEvent): void {
  io.emit('event', event);
}

circuitMonitor.setWsEmitter(emitWsEvent);
alertManager.setWsEmitter(emitWsEvent);
healthAggregator.setWsEmitter(emitWsEvent);

// Middleware
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);
app.use(requestLogger);

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/v1', createDashboardRoutes(circuitMonitor, alertManager, healthAggregator));

// Health check endpoint (no auth required)
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    service: 'REZ Circuit Breaker Dashboard',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API status endpoint
app.get('/api/v1/status', (_req, res) => {
  res.json({
    success: true,
    data: {
      redis: redis.status === 'ready',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      timestamp: new Date()
    }
  });
});

// WebSocket connection handling
io.on('connection', (socket) => {
  logger.info(`Client connected: ${socket.id}`);

  // Send initial data
  socket.emit('event', {
    type: 'connected',
    payload: {
      socketId: socket.id,
      services: healthAggregator.getAllServices(),
      circuits: circuitMonitor.getAllCircuits(),
      healthStats: healthAggregator.getHealthStats(),
      alertStats: alertManager.getStats()
    },
    timestamp: new Date()
  });

  // Handle circuit subscription
  socket.on('subscribe:circuit', (circuitName: string) => {
    socket.join(`circuit:${circuitName}`);
    logger.debug(`Socket ${socket.id} subscribed to circuit: ${circuitName}`);
  });

  socket.on('unsubscribe:circuit', (circuitName: string) => {
    socket.leave(`circuit:${circuitName}`);
    logger.debug(`Socket ${socket.id} unsubscribed from circuit: ${circuitName}`);
  });

  // Handle service subscription
  socket.on('subscribe:service', (serviceName: string) => {
    socket.join(`service:${serviceName}`);
    logger.debug(`Socket ${socket.id} subscribed to service: ${serviceName}`);
  });

  socket.on('unsubscribe:service', (serviceName: string) => {
    socket.leave(`service:${serviceName}`);
    logger.debug(`Socket ${socket.id} unsubscribed from service: ${serviceName}`);
  });

  // Handle category subscription
  socket.on('subscribe:category', (category: string) => {
    socket.join(`category:${category}`);
    logger.debug(`Socket ${socket.id} subscribed to category: ${category}`);
  });

  // Handle forced health check
  socket.on('force:healthcheck', async (serviceName?: string) => {
    try {
      if (serviceName) {
        await healthAggregator.forceCheck(serviceName);
      } else {
        await healthAggregator.forceCheckAll();
      }
    } catch (error) {
      logger.error('Forced health check failed:', error);
    }
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.info(`Client disconnected: ${socket.id} (${reason})`);
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
async function shutdown(): Promise<void> {
  logger.info('Shutting down gracefully...');

  // Stop health checks
  healthAggregator.stopHealthChecks();

  // Cleanup alert manager
  alertManager.shutdown();

  // Close Redis connection
  await redis.quit();

  // Close HTTP server
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force exit after timeout
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const PORT = parseInt(process.env.PORT || '4028', 10);

async function start(): Promise<void> {
  try {
    // Load circuit states from Redis
    await circuitMonitor.loadFromRedis();

    // Start health checks
    healthAggregator.startHealthChecks();

    // Start HTTP server
    server.listen(PORT, () => {
      logger.info(`REZ Circuit Breaker Dashboard running on port ${PORT}`);
      logger.info(`Health check endpoint: http://localhost:${PORT}/health`);
      logger.info(`API base URL: http://localhost:${PORT}/api/v1`);
      logger.info(`WebSocket endpoint: ws://localhost:${PORT}/socket.io`);
      logger.info(`Dashboard UI: http://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

export { app, server, io };
