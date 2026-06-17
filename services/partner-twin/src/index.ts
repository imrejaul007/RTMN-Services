import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import winston from 'winston';

// Import routes
import partnersRouter from './routes/partners';
import contractsRouter from './routes/contracts';
import slaRouter from './routes/sla';
import performanceRouter from './routes/performance';

// Import trust score service
import trustScoreService from './services/trustScore';

// Logger configuration
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

// Initialize Express app
const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'partner-twin',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

// API Routes
// Partners
app.use('/api/partners', partnersRouter);

// Contracts
app.use('/api/contracts', contractsRouter);

// SLAs
app.use('/api/slas', slaRouter);

// Performance
app.use('/api/performance', performanceRouter);

// Trust Score endpoints
app.post('/api/partners/:partnerId/trust-score/calculate', async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const result = await trustScoreService.calculateTrustScore({ partnerId, tenantId });

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Calculate trust score error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to calculate trust score',
    });
  }
});

app.get('/api/partners/:partnerId/trust-score', async (req: Request, res: Response) => {
  try {
    const { partnerId } = req.params;
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const result = await trustScoreService.getTrustScore(partnerId, tenantId);

    if (!result) {
      return res.status(404).json({
        success: false,
        error: 'Trust score not found. Calculate it first.',
      });
    }

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Get trust score error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get trust score',
    });
  }
});

app.post('/api/trust-scores/batch', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const result = await trustScoreService.batchCalculateTrustScores(tenantId);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    logger.error('Batch calculate trust scores error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to batch calculate trust scores',
    });
  }
});

// Financial routes (simplified inline - could be separated)
app.get('/api/partners/:partnerId/financial', async (req: Request, res: Response) => {
  try {
    const { PartnerFinancial } = await import('./models/Financial');
    const tenantId = req.headers['x-tenant-id'] as string || 'default';

    const financial = await PartnerFinancial.findOne({
      partnerId: req.params.partnerId,
      tenantId,
      isDeleted: false,
    });

    if (!financial) {
      return res.status(404).json({
        success: false,
        error: 'Financial data not found',
      });
    }

    res.json({
      success: true,
      data: financial,
    });
  } catch (error: any) {
    logger.error('Get financial error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get financial data',
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// Database connection
const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/partner-twin';

  try {
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

// Start server
const PORT = parseInt(process.env.PORT || '4892', 10);

const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`Partner Twin service running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API Base: http://localhost:${PORT}/api`);
  });
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

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
startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
