import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';

import simulateRoutes from './routes/simulate';
import scenariosRoutes from './routes/scenarios';
import resultsRoutes from './routes/results';

// Load environment variables
dotenv.config();

// Configure Winston logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
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

// Import models to register them with mongoose
import './models/Simulation';
import './models/Scenario';
import './models/Result';

const app: Express = express();
const PORT = process.env.PORT || 4952;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration: `${duration}ms`,
    });
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: 'healthy',
    service: 'simulation-engine',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoStatus,
  });
});

// API Routes
app.use('/api/simulate', simulateRoutes);
app.use('/api/scenarios', scenariosRoutes);
app.use('/api/results', resultsRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Simulation Intelligence Engine',
    description: 'Answers "What if?" questions about business decisions',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      simulate: {
        run: 'POST /api/simulate/run',
        list: 'GET /api/simulate',
        get: 'GET /api/simulate/:id',
        results: 'GET /api/simulate/:id/results',
        delete: 'DELETE /api/simulate/:id',
      },
      scenarios: {
        create: 'POST /api/scenarios',
        list: 'GET /api/scenarios',
        get: 'GET /api/scenarios/:id',
        update: 'PUT /api/scenarios/:id',
        delete: 'DELETE /api/scenarios/:id',
        clone: 'POST /api/scenarios/:id/clone',
        templates: 'POST /api/scenarios/templates/:type',
        validate: 'POST /api/scenarios/validate',
      },
      results: {
        list: 'GET /api/results',
        get: 'GET /api/results/:simulationId',
        summary: 'GET /api/results/:simulationId/summary',
        metrics: 'GET /api/results/:simulationId/metrics',
        recommendations: 'GET /api/results/:simulationId/recommendations',
        risk: 'GET /api/results/:simulationId/risk',
        compare: 'GET /api/results/compare',
      },
    },
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
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An internal error occurred'
        : err.message,
    },
  });
});

// Database connection and server start
async function startServer(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/simulation-engine';

  try {
    logger.info('Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB successfully');

    app.listen(PORT, () => {
      logger.info(`Simulation Intelligence Engine started on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API docs: http://localhost:${PORT}/`);
    });
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Graceful shutdown
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

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start the server
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
