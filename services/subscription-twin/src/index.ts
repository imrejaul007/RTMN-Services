import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import { config } from 'dotenv';

// Import routes
import subscriptionRoutes from './routes/subscriptions';
import planRoutes from './routes/plans';
import billingRoutes from './routes/billing';
import usageRoutes from './routes/usage';
import analyticsRoutes from './routes/analytics';

// Import logger
import { logger } from './services/logger';

// Load environment variables
config();

const app: Application = express();
const PORT = process.env.PORT || 4902;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/subscription_twin';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next) => {
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent')
  });
  next();
});

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  const healthcheck = {
    status: 'healthy',
    service: 'subscription-twin',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  };
  try {
    res.json(healthcheck);
  } catch (error) {
    healthcheck.status = 'unhealthy';
    res.status(503).json(healthcheck);
  }
});

// API Routes
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/billing', billingRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/analytics', analyticsRoutes);

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Subscription Twin',
    version: '1.0.0',
    description: 'Manages recurring subscriptions, plans, renewals, usage tracking',
    endpoints: {
      health: '/health',
      subscriptions: '/api/subscriptions',
      plans: '/api/plans',
      billing: '/api/billing',
      usage: '/api/usage',
      analytics: '/api/analytics'
    }
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use((err: Error, req: Request, res: Response) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack });
  res.status(500).json({ error: 'Internal server error' });
});

// Database connection and server start
const startServer = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB');

    app.listen(PORT, () => {
      logger.info(`Subscription Twin service running on port ${PORT}`);
      console.log(`\n🚀 Subscription Twin service running on http://localhost:${PORT}`);
      console.log(`   Health: http://localhost:${PORT}/health`);
      console.log(`   API: http://localhost:${PORT}/api/subscriptions\n`);
    });
  } catch (error) {
    logger.error('Failed to start server:', { error });
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

startServer();

export default app;
