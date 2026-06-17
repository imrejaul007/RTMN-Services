/**
 * Cross-Ecosystem Bridge Service
 * Main entry point - Express server with all routes and services
 */

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import profileRoutes from './routes/profile';
import linksRoutes from './routes/links';
import offersRoutes from './routes/offers';

// Load environment variables
dotenv.config();

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
      ),
    }),
  ],
});

// Request ID middleware
const requestIdMiddleware = (req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
};

// Error handler middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    requestId: req.headers['x-request-id'],
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : err.message,
    },
  });
};

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestIdMiddleware);

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      requestId: req.headers['x-request-id'],
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
    });
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: 'ok',
    service: 'cross-ecosystem-bridge',
    version: '1.0.0',
    port: process.env.PORT || 4898,
    timestamp: new Date().toISOString(),
    dependencies: {
      mongodb: mongoStatus,
    },
  });
});

// API Routes
app.use('/api/profiles', profileRoutes);
app.use('/api/links', linksRoutes);
app.use('/api/offers', offersRoutes);

// Service info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: 'cross-ecosystem-bridge',
    version: '1.0.0',
    description: 'Cross-Ecosystem Bridge - Connects RTMN services for unified customer view',
    port: process.env.PORT || 4898,
    connectedServices: [
      'hojai',
      'rez-consumer',
      'rez-merchant',
      'rez-pos',
      'stayown',
      'adbazaar',
      'corpid',
    ],
    capabilities: [
      'identity-resolution',
      'unified-profile',
      'cross-service-linking',
      'offer-generation',
      'engagement-analysis',
    ],
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
});

// Error handler
app.use(errorHandler);

// Database connection and server start
const startServer = async () => {
  const PORT = process.env.PORT || 4898;
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/cross_ecosystem_bridge';

  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...', { uri: MONGODB_URI });
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB connected successfully');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Cross-Ecosystem Bridge Service started on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API docs: http://localhost:${PORT}/api/info`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Export app for testing
export { app, logger };

// Start server if running directly
if (require.main === module) {
  startServer();
}
