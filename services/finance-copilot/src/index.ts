/**
 * Finance Copilot Service
 * AI assistant for finance with anomaly detection, cash flow prediction, budget recommendations
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Routes
import anomalyRoutes from './routes/anomaly';
import forecastRoutes from './routes/forecast';
import budgetRoutes from './routes/budget';
import refundRoutes from './routes/refund';
import fraudRoutes from './routes/fraud';
import insightsRoutes from './routes/insights';

// Load environment variables
dotenv.config();

// Logger setup
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()],
});

// Service info
const SERVICE_NAME = 'finance-copilot';
const SERVICE_VERSION = '1.0.0';
const SERVICE_PORT = parseInt(process.env.PORT || '4930');
const SERVICE_ID = uuidv4();

// Create Express app
const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({
    service: SERVICE_NAME,
    requestId: uuidv4(),
    method: req.method,
    path: req.path,
    query: req.query,
  });
  next();
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const mongoConnected = mongoose.connection.readyState === 1;

  const health = {
    status: mongoConnected ? 'healthy' : 'degraded',
    uptime: process.uptime(),
    timestamp: new Date(),
    service: {
      name: SERVICE_NAME,
      version: SERVICE_VERSION,
      id: SERVICE_ID,
      port: SERVICE_PORT,
    },
    services: {
      mongodb: mongoConnected,
    },
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// API Routes
app.use('/api/finance/anomaly', anomalyRoutes);
app.use('/api/finance/forecast', forecastRoutes);
app.use('/api/finance/budget', budgetRoutes);
app.use('/api/finance/refund', refundRoutes);
app.use('/api/finance/fraud', fraudRoutes);
app.use('/api/finance/insights', insightsRoutes);

// Summary route
app.get('/api/finance', async (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      description: 'Finance Copilot - AI assistant for finance',
      endpoints: {
        anomaly: '/api/finance/anomaly',
        forecast: '/api/finance/forecast',
        budget: '/api/finance/budget',
        refund: '/api/finance/refund',
        fraud: '/api/finance/fraud',
        insights: '/api/finance/insights',
      },
      features: [
        'Anomaly detection',
        'Cash flow forecasting',
        'Budget recommendations',
        'Refund analysis',
        'Fraud risk scoring',
        'Finance insights',
      ],
    },
    timestamp: new Date(),
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    timestamp: new Date(),
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({
    service: SERVICE_NAME,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date(),
  });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/finance_copilot';

async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.warn('MongoDB connection failed, running in demo mode:', error);
  }
}

// Graceful shutdown
function gracefulShutdown(signal: string): void {
  logger.info(`${signal} received, shutting down gracefully`);
  mongoose.connection.close().then(() => {
    logger.info('MongoDB connection closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer(): Promise<void> {
  await connectToDatabase();

  app.listen(SERVICE_PORT, () => {
    logger.info({
      message: `${SERVICE_NAME} started`,
      port: SERVICE_PORT,
      version: SERVICE_VERSION,
      mongodb: MONGODB_URI,
      environment: process.env.NODE_ENV || 'development',
    });

    console.log(`\n🚀 Finance Copilot Service`);
    console.log(`   Version: ${SERVICE_VERSION}`);
    console.log(`   Port: ${SERVICE_PORT}`);
    console.log(`   Health: http://localhost:${SERVICE_PORT}/health`);
    console.log(`   API: http://localhost:${SERVICE_PORT}/api/finance`);
    console.log(`\n   Endpoints:`);
    console.log(`   - GET  /api/finance/anomaly         - Anomaly detection`);
    console.log(`   - GET  /api/finance/forecast        - Cash flow forecasting`);
    console.log(`   - GET  /api/finance/budget/recommend - Budget recommendations`);
    console.log(`   - GET  /api/finance/refund/analysis  - Refund analysis`);
    console.log(`   - GET  /api/finance/fraud/risk      - Fraud risk scoring`);
    console.log(`   - GET  /api/finance/insights        - Finance insights`);
    console.log('');
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
