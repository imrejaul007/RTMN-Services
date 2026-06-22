import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { logger } from './utils/logger';
import { tenantMiddleware, optionalTenantMiddleware } from './middleware/tenant';
import { contractService } from './services/contractService';
import { reminderService } from './services/reminderService';
import { workflowEngine } from './services/workflowEngine';
import { signatureService } from './services/signatureService';

import contractsRouter from './routes/contracts';
import templatesRouter from './routes/templates';
import signaturesRouter from './routes/signatures';
import clausesRouter from './routes/clauses';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5003;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID', 'X-User-ID', 'X-User-Email', 'X-User-Roles']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use((req: Request, _res: Response, next: NextFunction) => {
  logger.debug(`${req.method} ${req.path}`, {
    query: req.query,
    ip: req.ip
  });
  next();
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'rez-contract-management',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

app.get('/ready', async (_req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  if (mongoStatus !== 'connected') {
    res.status(503).json({
      status: 'not ready',
      mongodb: mongoStatus
    });
    return;
  }

  res.json({
    status: 'ready',
    mongodb: mongoStatus
  });
});

app.use('/contracts', optionalTenantMiddleware, contractsRouter);
app.use('/templates', tenantMiddleware, templatesRouter);
app.use('/signatures', signaturesRouter);
app.use('/clauses', tenantMiddleware, clausesRouter);

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.path} not found`
  });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message
  });
});

const connectDB = async (): Promise<void> => {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rez_contract_management';

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    logger.info('MongoDB connected successfully', { uri: mongoUri.replace(/\/\/.*@/, '//<credentials>@') });

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error', { error: err.message });
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

  } catch (error) {
    logger.error('Failed to connect to MongoDB', { error });
    throw error;
  }
};

const startScheduledTasks = (): void => {
  const tenantId = process.env.DEFAULT_TENANT_ID || 'default';

  setInterval(async () => {
    try {
      await signatureService.expireOldSignatures();
      await contractService.markExpired();
    } catch (error) {
      logger.error('Error in scheduled task', { error });
    }
  }, 60 * 60 * 1000);

  setInterval(async () => {
    try {
      await reminderService.processRenewalReminders(tenantId);
    } catch (error) {
      logger.error('Error processing renewal reminders', { error });
    }
  }, 24 * 60 * 60 * 1000);

  reminderService.startScheduledTasks(tenantId);
  logger.info('Scheduled tasks started');
};

const gracefulShutdown = async (signal: string): Promise<void> => {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  reminderService.stopScheduledTasks();
  workflowEngine.cleanup();

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error });
  }

  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      logger.info(`REZ Contract Management Service started on port ${PORT}`, {
        port: PORT,
        environment: process.env.NODE_ENV || 'development'
      });

      startScheduledTasks();
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer();

export default app;
