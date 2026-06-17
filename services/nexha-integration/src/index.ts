import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import procurementRoutes from './routes/procurement';
import distributionRoutes from './routes/distribution';
import supplierRoutes from './routes/supplier';

// Services
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { OrderSync } from './services/orderSync';

// Logger setup
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
const customerOpsBridge = new CustomerOpsBridge(logger);
const orderSync = new OrderSync(logger);

// Express app
const app: Application = express();
const PORT = process.env.PORT || 4966;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  req.headers['x-request-id'] = requestId;
  logger.info({
    type: 'request',
    requestId,
    method: req.method,
    path: req.path,
    query: req.query
  });
  next();
});

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'nexha-integration',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    connectedTwins: ['Order Twin', 'Payment Twin', 'Asset Twin']
  });
});

// API Routes
app.use('/api/procurement', procurementRoutes(customerOpsBridge, orderSync, logger));
app.use('/api/distribution', distributionRoutes(customerOpsBridge, orderSync, logger));
app.use('/api/suppliers', supplierRoutes(customerOpsBridge, logger));

// Service info
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    service: 'Nexha Integration Service',
    version: '1.0.0',
    description: 'Nexha Commerce Integration - Procurement, Distribution & Supplier Network',
    capabilities: [
      'Procurement management',
      'Distribution sync',
      'Supplier network',
      'Order Twin sync',
      'Payment Twin sync',
      'Asset Twin sync'
    ],
    endpoints: {
      procurement: '/api/procurement',
      distribution: '/api/distribution',
      suppliers: '/api/suppliers'
    }
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
    service: 'nexha-integration'
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({
    type: 'error',
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    service: 'nexha-integration'
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Nexha Integration Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API docs: http://localhost:${PORT}/api/info`);

  // Initialize connections to Twins
  customerOpsBridge.initialize().catch((err) => {
    logger.warn('Twin bridge initialization warning:', err.message);
  });

  // Start order sync service
  orderSync.startSyncLoop().catch((err) => {
    logger.warn('Order sync initialization warning:', err.message);
  });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, logger };
