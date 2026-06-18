import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Routes
import leadsRouter from './routes/leads';
import dealsRouter from './routes/deals';
import customersRouter from './routes/customers';
import recommendationsRouter from './routes/recommendations';
import insightsRouter from './routes/insights';

// Services
import { SalesMindBridge } from './services/salesmindBridge';
import { SalesOSBridge } from './services/salesOSBridge';
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { BrandPulseBridge } from './services/brandpulseBridge';
import { SutarBridge } from './services/sutarBridge';
import { TrustBridge } from './services/trustBridge';
import { JourneyBridge } from './services/journeyBridge';

// Load environment variables
dotenv.config();

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
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

// Initialize bridges
const salesMindBridge = new SalesMindBridge(logger);
const salesOSBridge = new SalesOSBridge(logger);
const customerOpsBridge = new CustomerOpsBridge(logger);
const brandpulseBridge = new BrandPulseBridge(logger);
const sutarBridge = new SutarBridge(logger);
const trustBridge = new TrustBridge(logger);
const journeyBridge = new JourneyBridge(logger);

// Create Express app
const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  credentials: true
}));
app.use(express.json());

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  (req as any).requestId = uuidv4();
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - start
    });
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'sales-hub',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    port: process.env.PORT || 5180
  });
});

// API info endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({
    service: 'Sales Hub - Central Sales Orchestration',
    version: '1.0.0',
    description: 'Central Sales Orchestration Hub that pulls from everything and gives to everything',
    endpoints: {
      leads: '/api/leads',
      deals: '/api/deals',
      customers: '/api/customers',
      recommendations: '/api/recommendations',
      insights: '/api/insights'
    },
    bridges: {
      salesMind: process.env.REZ_SALES_MIND_URL,
      salesOS: process.env.SALES_OS_URL,
      customerOps: process.env.CUSTOMER_OPS_URL,
      brandpulse: process.env.BRANDPULSE_URL,
      sutarOS: process.env.SUTAR_OS_URL,
      trustService: process.env.TRUST_SERVICE_URL,
      journeyService: process.env.JOURNEY_SERVICE_URL
    }
  });
});

// Mount routes with bridges as request attributes
app.use('/api/leads', (req: Request, res: Response, next: NextFunction) => {
  (req as any).bridges = {
    salesMind: salesMindBridge,
    salesOS: salesOSBridge,
    customerOps: customerOpsBridge,
    brandpulse: brandpulseBridge,
    sutar: sutarBridge,
    trust: trustBridge,
    journey: journeyBridge
  };
  next();
}, leadsRouter);

app.use('/api/deals', (req: Request, res: Response, next: NextFunction) => {
  (req as any).bridges = {
    salesMind: salesMindBridge,
    salesOS: salesOSBridge,
    customerOps: customerOpsBridge,
    brandpulse: brandpulseBridge,
    sutar: sutarBridge,
    trust: trustBridge,
    journey: journeyBridge
  };
  next();
}, dealsRouter);

app.use('/api/customers', customersRouter);

app.use('/api/recommendations', recommendationsRouter);

app.use('/api/insights', insightsRouter);

// Bridge status endpoint
app.get('/api/bridges/status', async (req: Request, res: Response) => {
  const statuses = await Promise.allSettled([
    salesMindBridge.healthCheck(),
    salesOSBridge.healthCheck(),
    customerOpsBridge.healthCheck(),
    brandpulseBridge.healthCheck(),
    sutarBridge.healthCheck(),
    trustBridge.healthCheck(),
    journeyBridge.healthCheck()
  ]);

  const bridgeNames = [
    'salesMind', 'salesOS', 'customerOps',
    'brandpulse', 'sutar', 'trust', 'journey'
  ];

  const statusMap = statuses.map((status, i) => ({
    name: bridgeNames[i],
    status: status.status === 'fulfilled' ? 'healthy' : 'unhealthy',
    responseTime: status.status === 'fulfilled' ? status.value : null,
    error: status.status === 'rejected' ? status.reason?.message : null
  }));

  res.json({
    bridges: statusMap,
    total: bridgeNames.length,
    healthy: statusMap.filter(s => s.status === 'healthy').length
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    requestId: (req as any).requestId
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    requestId: (req as any).requestId,
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    requestId: (req as any).requestId
  });
});

// Start server
const PORT = process.env.PORT || 5180;

app.listen(PORT, () => {
  logger.info(`Sales Hub started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API info: http://localhost:${PORT}/api`);
});

export { app, logger };
