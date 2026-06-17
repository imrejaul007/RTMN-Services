import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import productsRouter from './routes/products';
import issuesRouter from './routes/issues';
import partsRouter from './routes/parts';
import searchRouter from './routes/search';

// Load environment variables
dotenv.config();

// Configure Winston logger
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
const app: Application = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  (req as any).requestId = uuidv4();
  next();
});

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  const start = Date.now();
  _res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info({
      requestId: (req as any).requestId,
      method: req.method,
      path: req.path,
      statusCode: _res.statusCode,
      duration: `${duration}ms`
    });
  });
  next();
});

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  const healthcheck = {
    status: 'healthy',
    service: 'product-twin',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  res.json(healthcheck);
});

// API routes
app.use('/api/products', productsRouter);
app.use('/api/issues', issuesRouter);
app.use('/api/parts', partsRouter);
app.use('/api/search', searchRouter);

// API Documentation
app.get('/api', (_req: Request, res: Response) => {
  res.json({
    service: 'Product Twin',
    version: '1.0.0',
    description: 'Product knowledge management service',
    endpoints: {
      health: 'GET /health',
      products: {
        list: 'GET /api/products',
        get: 'GET /api/products/:id',
        create: 'POST /api/products',
        update: 'PUT /api/products/:id',
        delete: 'DELETE /api/products/:id',
        search: 'GET /api/products/search',
        related: 'GET /api/products/:id/related',
        insights: 'GET /api/products/:id/insights',
        metrics: 'GET /api/products/:id/metrics'
      },
      issues: {
        list: 'GET /api/issues',
        get: 'GET /api/issues/:id',
        create: 'POST /api/issues',
        update: 'PUT /api/issues/:id',
        delete: 'DELETE /api/issues/:id',
        byProduct: 'GET /api/issues/product/:productId'
      },
      parts: {
        list: 'GET /api/parts',
        get: 'GET /api/parts/:id',
        create: 'POST /api/parts',
        update: 'PUT /api/parts/:id',
        delete: 'DELETE /api/parts/:id',
        byProduct: 'GET /api/parts/product/:productId',
        compatible: 'GET /api/parts/compatible/:productId'
      },
      search: {
        products: 'GET /api/search/products',
        issues: 'GET /api/search/issues',
        parts: 'GET /api/search/parts'
      }
    }
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource was not found'
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({
    error: err.message,
    stack: err.stack
  });
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message
  });
});

// Database connection and server startup
const PORT = parseInt(process.env.PORT || '4889', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/product-twin';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Product Twin service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`API docs: http://localhost:${PORT}/api`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the server
startServer();

export default app;
