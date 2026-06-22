import express, { Express, Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import Redis from 'ioredis';
import { Server as SocketIOServer } from 'socket.io';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import { logger } from './utils/logger.js';
import { syncService } from './services/syncService.js';
import healthRoutes from './health.js';
import twinRoutes from './routes/twins.js';
import relationshipRoutes from './routes/relationships.js';
import { tenantMiddleware } from './middleware/tenant.js';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      tenantContext?: {
        tenantId: string;
        userId?: string;
      };
    }
  }
}

// Configuration
const PORT = parseInt(process.env.PORT || '5005');
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-cosmic-twin';
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Initialize Redis client
let redisClient: Redis | null = null;

function createRedisClient(): Redis {
  const client = new Redis({
    host: REDIS_HOST,
    port: REDIS_PORT,
    password: REDIS_PASSWORD || undefined,
    retryStrategy: (times: number) => {
      if (times > 3) {
        logger.warn('Redis connection failed, continuing without Redis cache');
        return null; // Stop retrying
      }
      return Math.min(times * 100, 3000);
    },
    lazyConnect: true,
  });

  client.on('connect', () => {
    logger.info('Connected to Redis');
  });

  client.on('error', (err) => {
    logger.error('Redis connection error:', err);
  });

  client.on('close', () => {
    logger.warn('Redis connection closed');
  });

  return client;
}

// Create Express app
const app: Express = express();
const httpServer = createServer(app);

// Initialize Socket.IO
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: parseInt(process.env.WS_PING_INTERVAL || '25000'),
  pingTimeout: parseInt(process.env.WS_PING_TIMEOUT || '60000'),
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable for API service
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-user-id'],
}));

app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// MongoDB sanitize
app.use(mongoSanitize());

// Trust proxy (for reverse proxy setups)
app.set('trust proxy', 1);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    logger[logLevel](`${req.method} ${req.path}`, {
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
});

// Tenant middleware
app.use(tenantMiddleware);

// Health routes
app.use('/health', healthRoutes);

// API routes
app.use('/twins', twinRoutes);
app.use('/', relationshipRoutes); // Relationships at root level

// Socket.IO connection handling
io.on('connection', (socket) => {
  logger.info(`WebSocket client connected: ${socket.id}`);

  // Handle twin subscription
  socket.on('subscribe', (data: { twinId: string }) => {
    socket.join(`twin:${data.twinId}`);
    logger.debug(`Client ${socket.id} subscribed to twin ${data.twinId}`);
    socket.emit('subscribed', { twinId: data.twinId });
  });

  // Handle twin unsubscription
  socket.on('unsubscribe', (data: { twinId: string }) => {
    socket.leave(`twin:${data.twinId}`);
    logger.debug(`Client ${socket.id} unsubscribed from twin ${data.twinId}`);
    socket.emit('unsubscribed', { twinId: data.twinId });
  });

  // Handle batch subscription
  socket.on('subscribe_batch', (data: { twinIds: string[] }) => {
    for (const twinId of data.twinIds) {
      socket.join(`twin:${twinId}`);
    }
    logger.debug(`Client ${socket.id} subscribed to ${data.twinIds.length} twins`);
    socket.emit('subscribed_batch', { twinIds: data.twinIds });
  });

  // Handle ping/pong for keepalive
  socket.on('ping', () => {
    socket.emit('pong', { timestamp: Date.now() });
  });

  // Handle disconnect
  socket.on('disconnect', (reason) => {
    logger.info(`WebSocket client disconnected: ${socket.id}`, { reason });
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err, {
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// MongoDB connection
async function connectToMongoDB(): Promise<void> {
  try {
    const mongoOptions = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(MONGODB_URI, mongoOptions);
    logger.info('Connected to MongoDB');

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
    logger.error('Failed to connect to MongoDB:', error instanceof Error ? error : new Error(String(error)));
    throw error;
  }
}

// Redis connection
async function connectToRedis(): Promise<void> {
  redisClient = createRedisClient();

  try {
    await redisClient.connect();
  } catch (error) {
    logger.warn('Redis connection failed, continuing without cache', { error: error instanceof Error ? error.message : String(error) });
    redisClient = null;
  }
}

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Close MongoDB connection
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');

  // Close Redis connection
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }

  process.exit(0);
}

// Handle shutdown signals
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  shutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, _promise) => {
  logger.error('Unhandled promise rejection:', reason instanceof Error ? reason : new Error(String(reason)));
});

// Start server
async function start(): Promise<void> {
  try {
    // Connect to MongoDB
    await connectToMongoDB();

    // Connect to Redis (non-blocking)
    connectToRedis().catch((err) => {
      logger.warn('Redis connection error (non-blocking):', err);
    });

    // Initialize sync service
    syncService.initialize(httpServer);

    // Start HTTP server
    httpServer.listen(PORT, () => {
      logger.info(`REZ Cosmic Twin service started on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`MongoDB: ${MONGODB_URI}`);
      logger.info(`Redis: ${REDIS_HOST}:${REDIS_PORT}`);
      logger.info(`WebSocket: ws://localhost:${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error instanceof Error ? error : new Error(String(error)));
    process.exit(1);
  }
}

// Export for testing
export { app, httpServer, redisClient, io };

// Start the server
start();


// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'rez-cosmic-twin',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Liveness probe
app.get('/health/live', (req, res) => {
  res.json({ status: 'alive' });
});

// Readiness probe
app.get('/health/ready', (req, res) => {
  res.json({ status: 'ready' });
});
