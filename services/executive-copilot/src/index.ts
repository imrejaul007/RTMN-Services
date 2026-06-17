import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import briefingRoutes from './routes/briefing';
import alertsRoutes from './routes/alerts';
import summaryRoutes from './routes/summary';
import recommendationsRoutes from './routes/recommendations';
import forecastRoutes from './routes/forecast';

// Services
import { scheduleBriefingGeneration } from './services/scheduler';

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

// Extend Request type to include requestId
declare global {
  namespace Express {
    interface Request {
      requestId: string;
    }
  }
}

const app: Application = express();
const PORT = process.env.PORT || 4933;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/executive-copilot';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  next();
});

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    query: req.query
  });
  next();
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const healthcheck = {
    service: 'executive-copilot',
    status: 'healthy',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };

  try {
    // Ping MongoDB
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.db?.admin().ping();
    }
    res.json(healthcheck);
  } catch (error) {
    healthcheck.status = 'degraded';
    res.status(503).json(healthcheck);
  }
});

// API info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    service: 'Executive Copilot',
    version: '1.0.0',
    description: 'AI assistant for CEOs and leadership',
    endpoints: {
      briefing: {
        'GET /api/executive/briefing': 'Get latest briefing',
        'POST /api/executive/briefing/generate': 'Generate new briefing'
      },
      alerts: {
        'GET /api/executive/alerts': 'Get all alerts',
        'GET /api/executive/alerts/unread': 'Get unread alerts',
        'POST /api/executive/alerts/:id/acknowledge': 'Acknowledge alert'
      },
      summary: {
        'GET /api/executive/summary': 'Get executive summary',
        'GET /api/executive/summary/weekly': 'Get weekly summary',
        'GET /api/executive/summary/monthly': 'Get monthly summary'
      },
      recommendations: {
        'GET /api/executive/recommendations': 'Get AI recommendations'
      },
      forecast: {
        'GET /api/executive/forecast/revenue': 'Get revenue forecast',
        'GET /api/executive/forecast/growth': 'Get growth forecast'
      }
    }
  });
});

// Mount routes
app.use('/api/executive/briefing', briefingRoutes);
app.use('/api/executive/alerts', alertsRoutes);
app.use('/api/executive/summary', summaryRoutes);
app.use('/api/executive/recommendations', recommendationsRoutes);
app.use('/api/executive/forecast', forecastRoutes);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({
    requestId: _req.requestId,
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Database connection
async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB successfully');
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
async function startServer(): Promise<void> {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      logger.info(`Executive Copilot service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API docs: http://localhost:${PORT}/api`);

      // Schedule daily briefing generation at 6 AM
      scheduleBriefingGeneration(logger);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
