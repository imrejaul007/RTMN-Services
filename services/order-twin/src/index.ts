import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import winston from 'winston';

// Routes
import ordersRouter from './routes/orders';
import trackingRouter from './routes/tracking';
import analyticsRouter from './routes/analytics';

// Load environment variables
dotenv.config();

// Winston logger setup
export const logger = winston.createLogger({
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
      ),
    }),
  ],
});

// Express app setup
const app: Application = express();
const PORT = process.env.PORT || 4900;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/order-twin';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: 'ok',
    service: 'order-twin',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    mongodb: mongoStatus,
    uptime: process.uptime(),
  });
});

// API Routes
app.use('/api/orders', ordersRouter);
app.use('/api/tracking', trackingRouter);
app.use('/api/analytics', analyticsRouter);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Order Twin',
    description: 'Order lifecycle management with items, shipping, delivery, tracking',
    version: '1.0.0',
    endpoints: {
      health: 'GET /health',
      orders: {
        list: 'GET /api/orders',
        get: 'GET /api/orders/:orderId',
        create: 'POST /api/orders',
        update: 'PUT /api/orders/:orderId',
        updateStatus: 'PATCH /api/orders/:orderId/status',
        updateTracking: 'PATCH /api/orders/:orderId/tracking',
        delete: 'DELETE /api/orders/:orderId',
        customerOrders: 'GET /api/orders/customer/:customerId',
      },
      tracking: {
        list: 'GET /api/tracking',
        get: 'GET /api/tracking/:trackingId',
        byOrder: 'GET /api/tracking/by-order/:orderId',
        byNumber: 'GET /api/tracking/by-number/:carrier/:trackingNumber',
        create: 'POST /api/tracking',
        addEvent: 'POST /api/tracking/:trackingId/events',
        sync: 'POST /api/tracking/:trackingId/sync',
        update: 'PATCH /api/tracking/:trackingId',
        delete: 'DELETE /api/tracking/:trackingId',
      },
      analytics: {
        overview: 'GET /api/analytics/overview',
        orders: 'GET /api/analytics/orders',
        revenue: 'GET /api/analytics/revenue',
        customers: 'GET /api/analytics/customers',
        products: 'GET /api/analytics/products',
        trends: 'GET /api/analytics/trends',
        status: 'GET /api/analytics/status',
        aov: 'GET /api/analytics/aov',
      },
    },
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Database connection
async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info(`Connected to MongoDB at ${MONGODB_URI}`);
  } catch (error) {
    logger.error('Failed to connect to MongoDB:', error);
    process.exit(1);
  }
}

// Graceful shutdown
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

// Start server
async function startServer() {
  await connectToDatabase();

  app.listen(PORT, () => {
    logger.info(`Order Twin service running on port ${PORT}`);
    logger.info(`Health check: http://localhost:${PORT}/health`);
    logger.info(`API docs: http://localhost:${PORT}/`);
  });
}

startServer().catch((error) => {
  logger.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
