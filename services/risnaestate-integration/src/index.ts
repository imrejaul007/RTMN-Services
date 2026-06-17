import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

import propertiesRoutes from './routes/properties';
import bookingsRoutes from './routes/bookings';
import inquiriesRoutes from './routes/inquiries';
import { CustomerOpsBridge } from './services/customerOpsBridge';
import { PropertySync } from './services/propertySync';

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

// Initialize Express app
const app: Express = express();
const PORT = process.env.PORT || 4971;

// Middleware
app.use(helmet());
app.use(cors({
  origin: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
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
const propertySync = new PropertySync(logger, customerOpsBridge);

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    service: 'risnaestate-integration',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    twins: {
      assetTwin: 'unknown',
      customerTwin: 'unknown',
      leadTwin: 'unknown'
    }
  };

  try {
    // Check twin connectivity
    health.twins.assetTwin = await customerOpsBridge.checkTwinHealth('assetTwin') ? 'connected' : 'disconnected';
    health.twins.customerTwin = await customerOpsBridge.checkTwinHealth('customerTwin') ? 'connected' : 'disconnected';
    health.twins.leadTwin = await customerOpsBridge.checkTwinHealth('leadTwin') ? 'connected' : 'disconnected';
  } catch (error) {
    health.status = 'degraded';
  }

  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// API routes
app.use('/api/properties', propertiesRoutes(customerOpsBridge, propertySync));
app.use('/api/bookings', bookingsRoutes(customerOpsBridge));
app.use('/api/inquiries', inquiriesRoutes(customerOpsBridge));

// Service info endpoint
app.get('/api/info', (req: Request, res: Response) => {
  res.json({
    service: 'risnaestate-integration',
    name: 'RisnaEstate Integration',
    description: 'Real Estate OS - Customer Operations Bridge',
    version: '1.0.0',
    port: PORT,
    connectedTwins: ['AssetTwin', 'CustomerTwin', 'LeadTwin', 'AreaTwin'],
    endpoints: {
      properties: '/api/properties',
      bookings: '/api/bookings',
      inquiries: '/api/inquiries',
      health: '/health'
    }
  });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error({
    requestId: req.headers['x-request-id'],
    error: err.message,
    stack: err.stack
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    requestId: req.headers['x-request-id']
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    requestId: req.headers['x-request-id']
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`RisnaEstate Integration service started on port ${PORT}`);
  logger.info(`Health check: http://localhost:${PORT}/health`);
  logger.info(`API info: http://localhost:${PORT}/api/info`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

export { app, server, logger };
