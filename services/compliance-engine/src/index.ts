import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import dotenv from 'dotenv';

// Routes
import kycRoutes from './routes/kyc';
import gdprRoutes from './routes/gdpr';
import amlRoutes from './routes/aml';
import auditRoutes from './routes/audit';

// Services
import { AuditLogger } from './services/auditLogger';

// Load environment variables
dotenv.config();

// Logger configuration
const logger = winston.createLogger({
  level: process.env.AUDIT_LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'compliance-audit.log' })
  ]
});

// Initialize audit logger
const auditLogger = new AuditLogger(logger);

const app: Application = express();
const PORT = process.env.PORT || 4986;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  req.headers['x-request-id'] = req.headers['x-request-id'] || uuidv4();
  res.setHeader('x-request-id', req.headers['x-request-id']);
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    requestId: req.headers['x-request-id'],
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'compliance-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    capabilities: ['GDPR', 'KYC', 'AML']
  });
});

// Routes
app.use('/api/kyc', kycRoutes);
app.use('/api/gdpr', gdprRoutes);
app.use('/api/aml', amlRoutes);
app.use('/api/audit', auditRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.path,
    requestId: req.headers['x-request-id']
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    requestId: req.headers['x-request-id'],
    error: err.message,
    stack: err.stack
  });

  auditLogger.logError(
    'SYSTEM',
    'Unhandled Error',
    { error: err.message, stack: err.stack },
    req.headers['x-request-id'] as string
  );

  res.status(500).json({
    error: 'Internal Server Error',
    requestId: req.headers['x-request-id']
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Compliance Engine started on port ${PORT}`);
  console.log(`Compliance Engine running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

export { app, auditLogger, logger };
