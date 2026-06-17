import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

// Routes
import invoiceRoutes from './routes/invoices';
import paymentRoutes from './routes/payments';
import reportRoutes from './routes/reports';

// Models (for model registration)
import './models/Invoice';
import './models/LineItem';
import './models/PaymentRecord';

// Load environment variables
dotenv.config();

// Winston logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'invoice-twin' },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Extend Request type to include tenantId
declare global {
  namespace Express {
    interface Request {
      tenantId?: string;
      requestId?: string;
    }
  }
}

// Create Express application
const app: Application = express();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  req.requestId = uuidv4();
  next();
});

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info({
    requestId: req.requestId,
    method: req.method,
    path: req.path,
    tenantId: req.tenantId || 'unknown',
  });
  next();
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const dbStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  const health = {
    status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
    service: 'invoice-twin',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: {
      status: dbStatus,
      name: mongoose.connection.name,
    },
    memory: process.memoryUsage(),
  };

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Multi-tenant middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
  // Extract tenantId from header (in production, this would be from JWT)
  const tenantId = req.headers['x-tenant-id'] as string;
  if (tenantId) {
    req.tenantId = tenantId;
  }
  next();
});

// API Routes
app.use('/api/invoices', invoiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Invoice Twin',
    version: '1.0.0',
    description: 'Invoice management, billing, payments with tax tracking',
    endpoints: {
      health: '/health',
      invoices: '/api/invoices',
      payments: '/api/payments',
      reports: '/api/reports',
    },
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested resource does not exist',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({
    requestId: _req.requestId,
    error: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
    requestId: _req.requestId,
  });
});

// Database connection
const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/invoice-twin';

  try {
    await mongoose.connect(mongoUri);
    logger.info(`Connected to MongoDB at ${mongoUri}`);

    // Create indexes
    const Invoice = mongoose.model('Invoice');
    await Invoice.createIndexes();
    logger.info('Database indexes created');

  } catch (error) {
    logger.error('MongoDB connection error:', error);
    throw error;
  }
};

// Start server
const PORT = parseInt(process.env.PORT || '4904', 10);

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`Invoice Twin service running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received. Closing server...');
  await mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received. Closing server...');
  await mongoose.connection.close();
  process.exit(0);
});

// Start the application
startServer();

export default app;
