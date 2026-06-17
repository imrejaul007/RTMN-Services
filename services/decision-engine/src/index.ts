import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { tenantMiddleware, requestIdMiddleware } from './middleware/tenant';

// Routes
import decideRoutes from './routes/decide';
import policiesRoutes from './routes/policies';
import historyRoutes from './routes/history';

// Load environment variables
dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 4951;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/decision_engine';

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Custom middleware
app.use(requestIdMiddleware);
app.use(tenantMiddleware);

// Request logging
app.use((req: Request, res: Response, next) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      requestId: req.requestId,
      tenantId: req.tenantId
    });
  });

  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    service: 'decision-engine',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API routes
app.use('/api/decide', decideRoutes);
app.use('/api/policies', policiesRoutes);
app.use('/api/history', historyRoutes);

// API documentation endpoint
app.get('/api', (req: Request, res: Response) => {
  res.status(200).json({
    name: 'Decision Intelligence Engine API',
    version: '1.0.0',
    description: 'Explainable, traceable AI decisions for refunds, cancellations, discounts, escalations',
    endpoints: {
      decide: {
        'POST /api/decide': 'Make a single decision',
        'POST /api/decide/batch': 'Make multiple decisions',
        'POST /api/decide/simulate': 'Simulate a decision without persisting'
      },
      policies: {
        'GET /api/policies': 'List all policies',
        'GET /api/policies/:policyId': 'Get a specific policy',
        'POST /api/policies': 'Create a new policy',
        'PUT /api/policies/:policyId': 'Update a policy',
        'DELETE /api/policies/:policyId': 'Deactivate a policy',
        'POST /api/policies/:policyId/activate': 'Activate a policy',
        'POST /api/policies/seed': 'Seed default policies'
      },
      history: {
        'GET /api/history': 'Get decision history',
        'GET /api/history/:decisionId': 'Get a specific decision',
        'GET /api/history/stats/summary': 'Get decision statistics',
        'GET /api/history/approvals/pending': 'Get pending approvals',
        'GET /api/history/customer/:customerId': 'Get customer decisions'
      }
    },
    documentation: 'https://docs.rtmn.dev/decision-engine'
  });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// Database connection
async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB', { uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });
  } catch (error) {
    logger.error('Failed to connect to MongoDB', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    // Don't exit in production - let the service start and retry
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
}

// Graceful shutdown
function setupGracefulShutdown(): void {
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];

  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.info(`Received ${signal}, shutting down gracefully...`);

      try {
        await mongoose.connection.close();
        logger.info('MongoDB connection closed');

        process.exit(0);
      } catch (error) {
        logger.error('Error during shutdown', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        process.exit(1);
      }
    });
  });
}

// Start server
async function startServer(): Promise<void> {
  await connectDatabase();
  setupGracefulShutdown();

  app.listen(PORT, () => {
    logger.info(`Decision Intelligence Engine started`, {
      port: PORT,
      nodeEnv: process.env.NODE_ENV || 'development',
      mongodbUri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@')
    });

    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                   DECISION INTELLIGENCE ENGINE                     ║
╠═══════════════════════════════════════════════════════════════════╣
║  Status:     Running                                               ║
║  Port:       ${PORT}                                                    ║
║  Environment: ${(process.env.NODE_ENV || 'development').padEnd(42)}║
║                                                                   ║
║  Endpoints:                                                       ║
║    POST /api/decide           - Make a decision                    ║
║    POST /api/decide/batch    - Batch decisions                     ║
║    GET  /api/policies        - List policies                       ║
║    GET  /api/history          - Decision history                   ║
║    GET  /health              - Health check                        ║
║                                                                   ║
║  Decision Types:                                                  ║
║    refund | cancel | discount | escalate | policy_exception        ║
╚═══════════════════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch(error => {
  logger.error('Failed to start server', {
    error: error instanceof Error ? error.message : 'Unknown error'
  });
  process.exit(1);
});

export default app;
