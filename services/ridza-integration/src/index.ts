import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import { v4 as uuidv4 } from 'uuid';

// Routes
import remittanceRoutes from './routes/remittance';
import cfoRoutes from './routes/cfo';
import insuranceRoutes from './routes/insurance';

// Services
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { FinanceSync } from './services/financeSync';

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

// Initialize services
const customerOpsBridge = new CustomerOpsBridge(logger);
const financeSync = new FinanceSync(logger);

// Create Express app
const app: Application = express();
const PORT = process.env.PORT || 4972;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, res: Response, next) => {
  (req as any).requestId = uuidv4();
  res.setHeader('X-Request-ID', (req as any).requestId);
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info({
    requestId: (req as any).requestId,
    method: req.method,
    path: req.path,
    query: req.query
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'ridza-integration',
    version: '1.0.0',
    port: PORT,
    timestamp: new Date().toISOString(),
    connectedServices: {
      paymentTwin: true,
      industryTwin: true,
      trustIntelligence: true,
      customerOps: true
    }
  });
});

// Service info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: 'RidZa Financial Services',
    description: 'Financial services connecting to Customer Operations',
    port: PORT,
    capabilities: [
      'Remittance & Money Transfers',
      'CFO Dashboard & Analytics',
      'Insurance Products',
      'Trust Intelligence Integration',
      'Payment Twin Sync'
    ],
    industry: 'Financial Services',
    connectedTwins: [
      'Payment Twin',
      'Industry Twin (finance)',
      'Trust Intelligence'
    ]
  });
});

// Mount routes
app.use('/api/remittance', remittanceRoutes(customerOpsBridge, logger));
app.use('/api/cfo', cfoRoutes(financeSync, logger));
app.use('/api/insurance', insuranceRoutes(customerOpsBridge, logger));

// Error handling middleware
app.use((err: Error, req: Request, res: Response) => {
  logger.error({
    requestId: (req as any).requestId,
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    requestId: (req as any).requestId
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`RidZa Integration Service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`Service info: http://localhost:${PORT}/api/info`);
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

export { app, server };
