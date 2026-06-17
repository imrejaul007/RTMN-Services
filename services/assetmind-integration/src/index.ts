import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Routes
import investmentRoutes from './routes/investment';
import portfolioRoutes from './routes/portfolio';
import analyticsRoutes from './routes/analytics';

// Services
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { WealthSync } from './services/wealthSync';

// Load environment
dotenv.config();

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

// Service instance
const app = express();
const PORT = process.env.PORT || 4969;

// Request ID middleware
app.use((req, res, next) => {
  (req as any).requestId = uuidv4();
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

// Security middleware
app.use(helmet());
app.use(cors());

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info({
    requestId: (req as any).requestId,
    method: req.method,
    path: req.path,
    query: req.query
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'assetmind-integration',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Service info
app.get('/api/info', (req, res) => {
  res.json({
    service: 'AssetMind Integration',
    description: 'Wealth Management - Customer Operations Bridge',
    port: PORT,
    twins: ['Industry Twin (Finance)', 'Payment Twin', 'Customer Twin'],
    routes: {
      investment: '/api/investments',
      portfolio: '/api/portfolio',
      analytics: '/api/analytics'
    }
  });
});

// Initialize services
const customerOpsBridge = new CustomerOpsBridge(logger);
const wealthSync = new WealthSync(logger);

// Inject services into routes
app.use('/api/investments', investmentRoutes(customerOpsBridge, wealthSync, logger));
app.use('/api/portfolio', portfolioRoutes(customerOpsBridge, wealthSync, logger));
app.use('/api/analytics', analyticsRoutes(customerOpsBridge, wealthSync, logger));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error({
    requestId: (req as any).requestId,
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({
    error: 'Internal Server Error',
    requestId: (req as any).requestId
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path
  });
});

// Start server
app.listen(PORT, async () => {
  logger.info(`AssetMind Integration Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Service info: http://localhost:${PORT}/api/info`);

  // Register with service registry
  try {
    await customerOpsBridge.registerService(PORT);
    logger.info('Service registered with registry');
  } catch (error) {
    logger.warn('Service registry registration failed (non-fatal):', error);
  }
});

export { app, logger };
