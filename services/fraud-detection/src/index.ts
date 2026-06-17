import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import checkRoutes from './routes/check';
import alertRoutes from './routes/alerts';
import patternRoutes from './routes/patterns';

// Services
import { FraudDetector } from './services/detector';
import { RiskScorer } from './services/riskscorer';
import { PatternMatcher } from './services/patterns';
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { TwinSync } from './services/twinSync';

// Load environment
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4985;

// Logger
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

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    requestId: req.headers['x-request-id'],
    ip: req.ip
  });
  next();
});

// Initialize services
const fraudDetector = new FraudDetector(logger);
const riskScorer = new RiskScorer(logger);
const patternMatcher = new PatternMatcher(logger);
const customerOpsBridge = new CustomerOpsBridge(logger);
const twinSync = new TwinSync(logger);

// Attach services to app
app.set('fraudDetector', fraudDetector);
app.set('riskScorer', riskScorer);
app.set('patternMatcher', patternMatcher);
app.set('customerOpsBridge', customerOpsBridge);
app.set('twinSync', twinSync);
app.set('logger', logger);

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'fraud-detection',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      detector: fraudDetector.getStatus(),
      riskScorer: riskScorer.getStatus(),
      patternMatcher: patternMatcher.getStatus()
    }
  });
});

// API Routes
app.use('/api/check', checkRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/patterns', patternRoutes);

// Service info
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: 'fraud-detection',
    version: '1.0.0',
    capabilities: [
      'real-time-transaction-scanning',
      'risk-scoring',
      'pattern-detection',
      'alert-management',
      'auto-block',
      'customer-ops-integration',
      'trust-twin-sync'
    ],
    thresholds: {
      high: process.env.HIGH_RISK_THRESHOLD || 75,
      medium: process.env.MEDIUM_RISK_THRESHOLD || 50,
      low: process.env.LOW_RISK_THRESHOLD || 25
    },
    autoBlockEnabled: process.env.AUTO_BLOCK_ENABLED === 'true',
    autoBlockThreshold: process.env.AUTO_BLOCK_THRESHOLD || 90
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    requestId: req.headers['x-request-id']
  });

  res.status(500).json({
    error: 'Internal server error',
    requestId: req.headers['x-request-id']
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`Fraud Detection Service started on port ${PORT}`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV
  });

  // Register with service registry
  customerOpsBridge.registerService({
    name: 'fraud-detection',
    url: `http://localhost:${PORT}`,
    capabilities: ['real-time-scanning', 'risk-scoring', 'pattern-detection']
  });

  // Sync initial patterns to twin
  twinSync.syncPatterns(patternMatcher.getPatterns());
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
