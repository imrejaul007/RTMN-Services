import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import mongoose from 'mongoose';

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

// Import routes
import talkingPointsRouter from './routes/talking-points';
import prioritizeRouter from './routes/prioritize';
import recommendRouter from './routes/recommend';
import emailRouter from './routes/email';
import forecastRouter from './routes/forecast';

// Import types for API response
import { ApiResponse } from './types';

const app: Express = express();
const PORT = process.env.PORT || 4928;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const healthcheck = {
    uptime: process.uptime(),
    service: 'sales-copilot',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    status: 'healthy',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };

  try {
    const response: ApiResponse = {
      success: true,
      data: healthcheck,
      message: 'Sales Copilot service is running'
    };
    res.json(response);
  } catch (error) {
    healthcheck.status = 'unhealthy';
    const response: ApiResponse = {
      success: false,
      data: healthcheck,
      error: 'Health check failed'
    };
    res.status(503).json(response);
  }
});

// API Routes
app.use('/api/sales', talkingPointsRouter);
app.use('/api/sales', prioritizeRouter);
app.use('/api/sales', recommendRouter);
app.use('/api/sales', emailRouter);
app.use('/api/sales', forecastRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  const response: ApiResponse = {
    success: true,
    data: {
      service: 'Sales Copilot',
      version: '1.0.0',
      description: 'AI-powered sales assistant with lead prioritization, talking points, and forecasting',
      endpoints: {
        health: '/health',
        talkingPoints: '/api/sales/talking-points/:leadId',
        prioritize: '/api/sales/prioritize',
        recommend: '/api/sales/recommend/:leadId',
        email: '/api/sales/email/generate',
        forecast: '/api/sales/forecast'
      }
    },
    message: 'Welcome to Sales Copilot API'
  };
  res.json(response);
});

// 404 handler
app.use((req: Request, res: Response) => {
  const response: ApiResponse = {
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  };
  res.status(404).json(response);
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);

  const response: ApiResponse = {
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  };

  res.status(500).json(response);
});

// Database connection
const connectDB = async () => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/sales-copilot';

  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.warn('MongoDB connection failed, running in demo mode without persistence');
    logger.warn('Error:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Connect to database (non-blocking, continues if fails)
    connectDB();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                   Sales Copilot Service                        ║
╠═══════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                                ║
║  Status:   Running                                              ║
║  Version:  1.0.0                                                ║
║                                                               ║
║  Endpoints:                                                    ║
║  ├── GET  /health                                              ║
║  ├── GET  /api/sales/talking-points/:leadId                    ║
║  ├── GET  /api/sales/prioritize                                ║
║  ├── GET  /api/sales/recommend/:leadId                         ║
║  ├── POST /api/sales/email/generate                            ║
║  └── POST /api/sales/forecast                                  ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();

export default app;
