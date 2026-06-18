import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';

// Routes
import forecastRoutes from './routes/forecast';
import pipelineRoutes from './routes/pipeline';
import performanceRoutes from './routes/performance';
import trendsRoutes from './routes/trends';

// Services
import { SalesOpsBridge } from './services/salesOpsBridge';
import { ForecastingService } from './services/forecasting';
import { PipelineAnalysisService } from './services/pipelineAnalysis';
import { TrendAnalysisService } from './services/trendAnalysis';

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
      )
    })
  ]
});

// Initialize services
const salesOpsBridge = new SalesOpsBridge();
const forecastingService = new ForecastingService();
const pipelineAnalysisService = new PipelineAnalysisService();
const trendAnalysisService = new TrendAnalysisService();

// Create Express application
const app: Application = express();
const PORT = process.env.PORT || 5181;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*'
}));
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
app.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    service: 'sales-intelligence',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      salesOpsBridge: await salesOpsBridge.healthCheck(),
      forecasting: forecastingService.healthCheck(),
      pipelineAnalysis: pipelineAnalysisService.healthCheck(),
      trendAnalysis: trendAnalysisService.healthCheck()
    }
  };

  const isHealthy = Object.values(health.services).every(s => s.healthy);

  res.status(isHealthy ? 200 : 503).json(health);
});

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    service: 'sales-intelligence',
    version: '1.0.0',
    description: 'AI-powered sales insights and forecasting',
    endpoints: {
      forecast: {
        'GET /api/forecast': 'Get revenue forecast',
        'GET /api/forecast/quota': 'Get quota attainment forecast',
        'GET /api/forecast/territory': 'Get territory forecasts'
      },
      pipeline: {
        'GET /api/pipeline/health': 'Get pipeline health score',
        'GET /api/pipeline/stages': 'Get stage analysis',
        'GET /api/pipeline/bottlenecks': 'Get bottleneck analysis'
      },
      performance: {
        'GET /api/performance/reps': 'Get rep performance metrics',
        'GET /api/performance/teams': 'Get team performance',
        'GET /api/performance/leaderboard': 'Get leaderboard'
      },
      trends: {
        'GET /api/trends': 'Get trend analysis',
        'GET /api/trends/seasonal': 'Get seasonal patterns',
        'GET /api/trends/anomalies': 'Get anomaly detection'
      }
    }
  });
});

// Mount routes with services
app.use('/api/forecast', forecastRoutes);
app.use('/api/pipeline', pipelineRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/trends', trendsRoutes);

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Shutting down gracefully...`);
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown');
    process.exit(1);
  }, 30000);
};

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Sales Intelligence Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API docs: http://localhost:${PORT}/api`);
});

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Export for testing
export { app, logger };
