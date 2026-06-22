import express, { Application, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import helmet from 'helmet';
import logger from './utils/logger';
import creditRoutes from './routes/credit';
import loanRoutes from './routes/loans';
import repaymentRoutes from './routes/repayments';
import { partnerAuth } from './middleware/partnerAuth';
import { authMiddleware, rateLimitMiddleware, requestIdMiddleware, errorHandler, ALLOWED_ORIGINS } from './middleware/auth';

// Event listeners - Initialize integrations with merchant and finance services
import './events/merchantEvents';
import './events/financeEvents';

dotenv.config();

const app: Application = express();

// Middleware
app.use(requestIdMiddleware);
app.use(helmet());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(rateLimitMiddleware);

// CORS
app.use((req: Request, res: Response, next: NextFunction) => {
  const origin = req.headers.origin;
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Internal-Token');
  next();
});

// Request logging
app.use((req: Request, res: Response, next: NextFunction) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    query: req.query,
  });
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'rez-capital-service',
    timestamp: new Date().toISOString(),
  });
});

// Apply authentication to API routes
app.use('/api', authMiddleware);

// API Routes
app.use('/api/credit', creditRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/repayments', repaymentRoutes);

// Error handler
app.use(errorHandler);

// Partner webhook endpoints (authenticated)
app.post('/api/webhooks/partner/:partnerId', partnerAuth, (req: Request, res: Response) => {
  const { partnerId } = req.params;
  const payload = req.body;

  logger.info(`Partner webhook received from ${partnerId}`, { payload });

  // Process webhook based on type
  const eventType = payload.event_type || payload.type;

  switch (eventType) {
    case 'disbursement_complete':
      logger.info(`Disbursement completed: ${payload.reference_id}`);
      break;
    case 'disbursement_failed':
      logger.error(`Disbursement failed: ${payload.reference_id}`, { error: payload.error });
      break;
    case 'repayment_received':
      logger.info(`Repayment received for loan: ${payload.loan_id}`);
      break;
    default:
      logger.warn(`Unknown webhook event: ${eventType}`);
  }

  res.json({ received: true });
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
  });
});

// Database connection
const connectDB = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez-capital';
    await mongoose.connect(mongoUri);
    logger.info('Connected to MongoDB');
  } catch (error: any) {
    logger.error('MongoDB connection error:', { error: error.message });
    process.exit(1);
  }
};

// Start server
const PORT = process.env.PORT || 3005;

const startServer = async (): Promise<void> => {
  await connectDB();

  app.listen(PORT, () => {
    logger.info(`ReZ Capital service running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
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

startServer().catch((error) => {
  logger.error('Failed to start server:', { error: error.message });
  process.exit(1);
});

export default app;
