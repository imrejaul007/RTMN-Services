import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { paymentsRouter, refundsRouter, walletRouter } from './routes';
import { tenantMiddleware, requestIdMiddleware, corsMiddleware } from './middleware/tenant';
import { logger } from './utils/logger';
import {
  getPaymentAnalytics,
  getRefundAnalytics,
  getWalletAnalytics,
  getTransactionAnalytics,
  getCustomerAnalytics,
  getDashboardSummary,
} from './services/analytics';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 4901;

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors(corsMiddleware()));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(tenantMiddleware);
app.use(requestIdMiddleware);

// Request logging
app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.info('Incoming request', {
    method: req.method,
    path: req.path,
    requestId: req.requestId,
    tenantId: req.tenantId,
  });
  next();
});

// Health check endpoint
app.get('/health', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  res.json({
    status: 'ok',
    service: 'payment-twin',
    version: process.env.SERVICE_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongodb: mongoStatus,
  });
});

// Readiness check
app.get('/ready', async (_req: Request, res: Response) => {
  const isReady = mongoose.connection.readyState === 1;

  if (isReady) {
    res.json({ status: 'ready' });
  } else {
    res.status(503).json({ status: 'not ready', mongodb: 'disconnected' });
  }
});

// API Routes
app.use('/api/payments', paymentsRouter);
app.use('/api/refunds', refundsRouter);
app.use('/api/wallets', walletRouter);

// Analytics Routes
app.get('/api/analytics/payments', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';
    const { from, to } = req.query;

    const dateRange = from && to
      ? { from: new Date(from as string), to: new Date(to as string) }
      : undefined;

    const analytics = await getPaymentAnalytics(tenantId, dateRange);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching payment analytics', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

app.get('/api/analytics/refunds', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';
    const { from, to } = req.query;

    const dateRange = from && to
      ? { from: new Date(from as string), to: new Date(to as string) }
      : undefined;

    const analytics = await getRefundAnalytics(tenantId, dateRange);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching refund analytics', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

app.get('/api/analytics/wallets', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';
    const { from, to } = req.query;

    const dateRange = from && to
      ? { from: new Date(from as string), to: new Date(to as string) }
      : undefined;

    const analytics = await getWalletAnalytics(tenantId, dateRange);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching wallet analytics', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

app.get('/api/analytics/transactions', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';
    const { from, to } = req.query;

    const dateRange = from && to
      ? { from: new Date(from as string), to: new Date(to as string) }
      : undefined;

    const analytics = await getTransactionAnalytics(tenantId, dateRange);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching transaction analytics', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

app.get('/api/analytics/customers', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';
    const { from, to } = req.query;

    const dateRange = from && to
      ? { from: new Date(from as string), to: new Date(to as string) }
      : undefined;

    const analytics = await getCustomerAnalytics(tenantId, dateRange);

    res.json({
      success: true,
      data: analytics,
    });
  } catch (error) {
    logger.error('Error fetching customer analytics', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

app.get('/api/analytics/dashboard', async (req: Request, res: Response) => {
  try {
    const tenantId = req.headers['x-tenant-id'] as string || 'rtmn';

    const summary = await getDashboardSummary(tenantId);

    res.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    logger.error('Error fetching dashboard summary', { error });
    res.status(500).json({
      success: false,
      error: 'Internal server error',
    });
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Database connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/payment_twin';

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB', { uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
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
async function startServer(): Promise<void> {
  await connectDatabase();

  app.listen(PORT, () => {
    logger.info(`Payment Twin service started`, {
      port: PORT,
      nodeEnv: process.env.NODE_ENV || 'development',
      mongodb: MONGODB_URI,
    });
    console.log(`\nPayment Twin Service running on http://localhost:${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
    console.log(`\nAvailable endpoints:`);
    console.log(`  POST   /api/payments           - Create payment`);
    console.log(`  GET    /api/payments           - List payments`);
    console.log(`  GET    /api/payments/:id       - Get payment`);
    console.log(`  POST   /api/payments/:id/process - Process payment`);
    console.log(`  POST   /api/refunds            - Create refund`);
    console.log(`  GET    /api/refunds            - List refunds`);
    console.log(`  POST   /api/refunds/:id/process - Process refund`);
    console.log(`  POST   /api/wallets            - Create wallet`);
    console.log(`  GET    /api/wallets            - List wallets`);
    console.log(`  GET    /api/wallets/:id        - Get wallet`);
    console.log(`  POST   /api/wallets/:id/topup  - Topup wallet`);
    console.log(`  POST   /api/wallets/:id/withdraw - Withdraw from wallet`);
    console.log(`  POST   /api/wallets/:id/transfer - Transfer between wallets`);
    console.log(`  GET    /api/analytics/payments - Payment analytics`);
    console.log(`  GET    /api/analytics/refunds  - Refund analytics`);
    console.log(`  GET    /api/analytics/wallets  - Wallet analytics`);
    console.log(`  GET    /api/analytics/dashboard - Dashboard summary`);
  });
}

startServer();

export default app;
