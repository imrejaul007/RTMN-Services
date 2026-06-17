import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';

// Routes
import consumerRoutes from './routes/consumer';
import merchantRoutes from './routes/merchant';
import deliveryRoutes from './routes/delivery';

// Services
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { TwinSyncService } from './services/twinSync';

// Load environment variables
dotenv.config();

// Configure logger
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

// Initialize Express app
const app: Application = express();
const PORT = process.env.PORT || 4961;

// Initialize services
const customerOpsBridge = new CustomerOpsBridge();
const twinSyncService = new TwinSyncService();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined
  });
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'rez-integration',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    twins: twinSyncService.getStatus(),
    bridges: customerOpsBridge.getStatus()
  });
});

// API Routes
app.use('/api/consumer', consumerRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/delivery', deliveryRoutes);

// Twin sync endpoints
app.get('/api/twins/sync', async (_req: Request, res: Response) => {
  try {
    const results = await twinSyncService.syncAll();
    res.json({ success: true, results });
  } catch (error) {
    logger.error('Twin sync failed:', error);
    res.status(500).json({ success: false, error: 'Sync failed' });
  }
});

app.get('/api/twins/:twinType', async (req: Request, res: Response) => {
  try {
    const { twinType } = req.params;
    const status = twinSyncService.getTwinStatus(twinType);
    res.json({ success: true, twinType, status });
  } catch (error) {
    logger.error(`Twin status failed for ${req.params.twinType}:`, error);
    res.status(500).json({ success: false, error: 'Status check failed' });
  }
});

// Bridge status endpoints
app.get('/api/bridges/customer-ops', async (_req: Request, res: Response) => {
  try {
    const status = customerOpsBridge.getStatus();
    res.json({ success: true, ...status });
  } catch (error) {
    logger.error('Bridge status failed:', error);
    res.status(500).json({ success: false, error: 'Status check failed' });
  }
});

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Not found'
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`REZ Integration Service started on port ${PORT}`);
  logger.info(`REZ Consumer: ${process.env.REZ_CONSUMER_URL}`);
  logger.info(`REZ Merchant: ${process.env.REZ_MERCHANT_URL}`);
  logger.info(`REZ Delivery: ${process.env.REZ_DELIVERY_URL}`);
  logger.info(`Customer Ops: ${process.env.CUSTOMER_OPS_URL}`);

  // Initialize twin sync
  twinSyncService.initialize().catch(err => {
    logger.error('Twin sync initialization failed:', err);
  });
});

export { app, logger, customerOpsBridge, twinSyncService };
