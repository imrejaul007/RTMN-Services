import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import authRoutes from './routes/auth';
import walletRoutes from './routes/wallet';
import paymentRoutes from './routes/payment';
import ledgerRoutes from './routes/ledger';

// Services
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { TrustSync } from './services/trustSync';
import { PaymentSync } from './services/paymentSync';

// Load environment variables
dotenv.config();

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
      )
    })
  ]
});

// Create Express app
const app: Express = express();
const PORT = process.env.PORT || 4963;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.headers['x-request-id']);
  next();
});

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
      requestId: req.headers['x-request-id']
    });
  });
  next();
});

// Initialize services
const customerOpsBridge = new CustomerOpsBridge(logger);
const trustSync = new TrustSync(logger);
const paymentSync = new PaymentSync(logger);

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    service: 'rabtul-integration',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      customerOpsBridge: customerOpsBridge.isHealthy(),
      trustSync: trustSync.isHealthy(),
      paymentSync: paymentSync.isHealthy()
    }
  };

  const isHealthy = Object.values(health.services).every(s => s);
  res.status(isHealthy ? 200 : 503).json(health);
});

// Service info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    name: 'RABTUL Integration Service',
    version: '1.0.0',
    description: 'Integration layer connecting RABTUL (Auth, Wallet, Payment) to Customer Operations',
    port: PORT,
    endpoints: {
      auth: '/api/auth/*',
      wallet: '/api/wallet/*',
      payment: '/api/payment/*',
      ledger: '/api/ledger/*'
    },
    integrations: [
      'RABTUL Auth → Identity Twin',
      'RABTUL Wallet → Payment Twin',
      'RABTUL Payment → Payment Twin',
      'Trust Scorer → Trust Intelligence'
    ]
  });
});

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/ledger', ledgerRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.headers['x-request-id']
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    message: err.message,
    stack: err.stack,
    requestId: req.headers['x-request-id']
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'An error occurred',
    requestId: req.headers['x-request-id']
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`RABTUL Integration Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API Info: http://localhost:${PORT}/api/info`);
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

export default app;
