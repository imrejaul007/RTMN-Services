import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import syncRoutes from './routes/sync';
import webhookRoutes from './routes/webhooks';

// Services
import { BrandOpsBridge } from './services/brandOpsBridge';
import { TwinSyncService } from './services/twinSync';
import { TrustSyncService } from './services/trustSync';

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
  defaultMeta: { service: 'brandpulse-integration' },
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
const brandOpsBridge = new BrandOpsBridge(logger);
const twinSyncService = new TwinSyncService(logger);
const trustSyncService = new TrustSyncService(logger);

// Create Express app
const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = uuidv4();
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('HTTP Request', {
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - start
    });
  });
  next();
});

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'brandpulse-integration',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API info endpoint
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    service: 'BrandPulse Integration Bridge',
    version: '1.0.0',
    description: 'Integration bridge connecting BrandPulse to Customer Operations OS',
    endpoints: {
      sync: {
        'POST /api/sync/campaigns': 'Sync brand campaigns',
        'POST /api/sync/mentions': 'Sync brand mentions',
        'POST /api/sync/sentiment': 'Sync sentiment scores',
        'GET /api/sync/status/:syncId': 'Get sync status'
      },
      webhooks: {
        'POST /webhooks/social': 'Social media webhooks',
        'POST /webhooks/brandpulse': 'BrandPulse events'
      },
      dashboard: {
        'GET /api/dashboard/brand-health': 'Brand health KPIs'
      }
    },
    connectedServices: [
      'Campaign Twin',
      'Journey Twin',
      'Trust Intelligence',
      'Customer Operations OS',
      'Executive Dashboard'
    ]
  });
});

// Mount routes with services
app.use('/api/sync', syncRoutes(brandOpsBridge, twinSyncService, trustSyncService, logger));
app.use('/webhooks', webhookRoutes(brandOpsBridge, twinSyncService, trustSyncService, logger));

// Error handling middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist'
  });
});

// Start server
const PORT = process.env.PORT || 4974;

app.listen(PORT, () => {
  logger.info(`BrandPulse Integration Service started on port ${PORT}`);
  logger.info('Connected to:', {
    campaignTwin: process.env.CAMPAIGN_TWIN_URL,
    journeyTwin: process.env.JOURNEY_TWIN_URL,
    trustIntelligence: process.env.TRUST_INTELLIGENCE_URL,
    customerOps: process.env.CUSTOMER_OPS_URL,
    dashboard: process.env.DASHBOARD_URL
  });
});

export { app, logger };
