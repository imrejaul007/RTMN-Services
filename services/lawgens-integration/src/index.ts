import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import contractsRouter from './routes/contracts';
import complianceRouter from './routes/compliance';
import documentsRouter from './routes/documents';

// Services
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { LegalSyncService } from './services/legalSync';

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

// Express app
const app: Express = express();
const PORT = process.env.PORT || 4970;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = uuidv4();
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info({
    requestId: req.headers['x-request-id'],
    method: req.method,
    path: req.path,
    query: req.query
  });
  next();
});

// Initialize services
const customerOpsBridge = new CustomerOpsBridge(logger);
const legalSyncService = new LegalSyncService(logger);

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'lawgens-integration',
    port: PORT,
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    integrations: {
      knowledgeTwin: 'connected',
      journeyTwin: 'connected',
      industryTwin: 'connected',
      customerOps: 'connected'
    }
  });
});

// API Routes
app.use('/api/contracts', contractsRouter(customerOpsBridge, legalSyncService, logger));
app.use('/api/compliance', complianceRouter(customerOpsBridge, legalSyncService, logger));
app.use('/api/documents', documentsRouter(customerOpsBridge, legalSyncService, logger));

// Integration endpoints
app.get('/api/integrations', (req: Request, res: Response) => {
  res.json({
    service: 'lawgens-integration',
    connectedServices: [
      {
        name: 'Knowledge Twin',
        url: process.env.KNOWLEDGE_TWIN_URL || 'http://localhost:4705',
        status: 'active',
        purpose: 'Legal knowledge base and document storage'
      },
      {
        name: 'Journey Twin',
        url: process.env.JOURNEY_TWIN_URL || 'http://localhost:3016',
        status: 'active',
        purpose: 'Customer journey tracking for legal milestones'
      },
      {
        name: 'Industry Twin',
        url: process.env.INDUSTRY_TWIN_URL || 'http://localhost:4705',
        status: 'active',
        purpose: 'Legal industry standards and regulations'
      },
      {
        name: 'Customer Operations',
        url: 'internal',
        status: 'active',
        purpose: 'Customer data and operations bridge'
      }
    ]
  });
});

// Sync trigger endpoint
app.post('/api/sync', async (req: Request, res: Response) => {
  try {
    await legalSyncService.syncAll();
    res.json({ status: 'sync_completed', timestamp: new Date().toISOString() });
  } catch (error) {
    logger.error('Sync failed:', error);
    res.status(500).json({ status: 'sync_failed', error: (error as Error).message });
  }
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    requestId: req.headers['x-request-id'],
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({
    error: 'Internal server error',
    requestId: req.headers['x-request-id']
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`LawGens Integration Service started on port ${PORT}`);
  logger.info(`Connected to Knowledge Twin: ${process.env.KNOWLEDGE_TWIN_URL}`);
  logger.info(`Connected to Journey Twin: ${process.env.JOURNEY_TWIN_URL}`);
  logger.info(`Connected to Industry Twin: ${process.env.INDUSTRY_TWIN_URL}`);

  // Register with service registry
  customerOpsBridge.registerService().catch(err => {
    logger.warn('Service registration failed:', err.message);
  });

  // Start auto-sync if enabled
  if (process.env.AUTO_SYNC_ENABLED === 'true') {
    legalSyncService.startAutoSync();
  }
});

export { app, logger };
