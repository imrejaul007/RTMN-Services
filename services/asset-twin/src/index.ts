import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createLogger, format, transports } from 'winston';

// Routes
import assetsRouter from './routes/assets';
import maintenanceRouter from './routes/maintenance';
import iotRouter from './routes/iot';
import claimsRouter from './routes/claims';

// Load environment variables
dotenv.config();

// Logger configuration
const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp(),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    new transports.Console({
      format: format.combine(format.colorize(), format.simple())
    })
  ]
});

// Create Express app
const app: Express = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
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
      duration: `${duration}ms`
    });
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    service: 'asset-twin',
    status: 'running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoStatus,
    uptime: process.uptime()
  });
});

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    service: 'Asset Twin Service',
    version: '1.0.0',
    description: 'Manages equipment/assets with warranty, AMC, maintenance history, IoT status, and performance metrics',
    endpoints: {
      assets: {
        'GET /api/assets': 'List all assets',
        'GET /api/assets/:id': 'Get single asset',
        'POST /api/assets': 'Create asset',
        'PUT /api/assets/:id': 'Update asset',
        'DELETE /api/assets/:id': 'Delete asset',
        'GET /api/assets/:id/health': 'Get health score',
        'PATCH /api/assets/:id/metrics': 'Update metrics',
        'GET /api/assets/stats/summary': 'Get statistics'
      },
      maintenance: {
        'GET /api/maintenance': 'List maintenance records',
        'GET /api/maintenance/:id': 'Get single record',
        'POST /api/maintenance': 'Create maintenance record',
        'PUT /api/maintenance/:id': 'Update record',
        'DELETE /api/maintenance/:id': 'Delete record',
        'GET /api/maintenance/scheduled/upcoming': 'Get upcoming maintenance',
        'GET /api/maintenance/stats/:assetId': 'Get maintenance statistics'
      },
      iot: {
        'GET /api/iot': 'List IoT devices',
        'GET /api/iot/:id': 'Get single device',
        'GET /api/iot/asset/:assetId': 'Get IoT status by asset',
        'POST /api/iot': 'Register IoT device',
        'PUT /api/iot/:id': 'Update device',
        'POST /api/iot/:id/metrics': 'Update metrics',
        'POST /api/iot/:id/alerts': 'Update alerts',
        'GET /api/iot/alerts/active': 'Get active alerts',
        'DELETE /api/iot/:id': 'Unregister device'
      },
      claims: {
        'GET /api/claims': 'List claims',
        'GET /api/claims/:id': 'Get single claim',
        'POST /api/claims': 'Create claim',
        'PUT /api/claims/:id': 'Update claim',
        'DELETE /api/claims/:id': 'Delete claim',
        'POST /api/claims/:id/submit': 'Submit claim',
        'POST /api/claims/:id/approve': 'Approve claim',
        'POST /api/claims/:id/reject': 'Reject claim',
        'GET /api/claims/stats/summary': 'Get claim statistics'
      }
    }
  });
});

// API Routes
app.use('/api/assets', assetsRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/iot', iotRouter);
app.use('/api/claims', claimsRouter);

// Warranty routes (standalone)
import warrantyRouter from './routes/warranty';
import amcRouter from './routes/amc';
app.use('/api/warranties', warrantyRouter);
app.use('/api/amc', amcRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'Route not found' });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message
  });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/asset-twin';

async function connectToDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');
  } catch (error) {
    logger.error('MongoDB connection error:', error);
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

// Start server
const PORT = process.env.PORT || 4890;

async function startServer(): Promise<void> {
  await connectToDatabase();

  app.listen(PORT, () => {
    logger.info(`Asset Twin service running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API info: http://localhost:${PORT}/api`);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
