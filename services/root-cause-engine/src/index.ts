import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import winston from 'winston';

import { analyzeRouter, historyRouter, recommendationsRouter } from './routes';
import { ApiResponse } from './types';

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
      )
    })
  ]
});

// Create Express app
const app = express();
const PORT = process.env.PORT || 4950;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/root-cause-engine';

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  const healthcheck: ApiResponse<{
    status: string;
    uptime: number;
    timestamp: string;
    mongodb: string;
    service: string;
    version: string;
  }> = {
    success: true,
    data: {
      status: 'healthy',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
      service: 'root-cause-engine',
      version: '1.0.0'
    }
  };
  res.status(200).json(healthcheck);
});

// Readiness check
app.get('/ready', async (req: Request, res: Response) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      throw new Error('MongoDB not connected');
    }
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: 'Service not ready' });
  }
});

// API routes
app.use('/api/analyze', analyzeRouter);
app.use('/api/history', historyRouter);
app.use('/api/recommendations', recommendationsRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  const response: ApiResponse<null> = {
    success: false,
    error: 'Endpoint not found',
    message: `Cannot ${req.method} ${req.path}`
  };
  res.status(404).json(response);
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  const response: ApiResponse<null> = {
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An unexpected error occurred'
  };
  res.status(500).json(response);
});

// Connect to MongoDB and start server
async function startServer() {
  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    logger.info('MongoDB connected successfully');

    app.listen(PORT, () => {
      logger.info(`Root Cause Engine running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API endpoints:`);
      logger.info(`  POST /api/analyze - Analyze complaints for root causes`);
      logger.info(`  GET  /api/history - Get analysis history`);
      logger.info(`  GET  /api/recommendations - Get recommendations`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();

export default app;
