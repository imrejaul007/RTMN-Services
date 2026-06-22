import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import linksRoutes from './routes/links.routes';
import webhookRoutes from './routes/webhook.routes';

dotenv.config();

// SECURITY FIX: Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  logger.error('[FATAL] MONGODB_URI environment variable is required');
  process.exit(1);
}

const connectMongoDB = async () => {
  const isProduction = process.env.NODE_ENV === 'production';

  try {
    await mongoose.connect(MONGODB_URI, {
      ...(isProduction && {
        tls: true,
        tlsAllowInvalidCertificates: false,
        tlsAllowInvalidHostnames: false,
      }),
    });
    logger.info('[MongoDB] Connected successfully');
  } catch (error) {
    logger.error('[MongoDB] Connection failed', { error });
    process.exit(1);
  }
};

const app: Express = express();
const PORT = process.env.PORT || 4020;

// SECURITY FIX: Global rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: 'Too many requests, please try again later' }
});

app.use(limiter);

app.use(helmet());

// SECURITY FIX: Validate CORS origins at startup
const corsOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(o => o.trim())
  .filter(Boolean);

if (process.env.NODE_ENV === 'production' && corsOrigins.length === 0) {
  logger.error('[FATAL] CORS_ORIGIN must be set in production');
  process.exit(1);
}

app.use(cors({
  origin: corsOrigins.length > 0 ? corsOrigins : undefined,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-API-Key', 'X-Webhook-Signature'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request completed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip
    });
  });

  next();
});

// HEALTH CHECK: Comprehensive health endpoint
app.get('/health', async (req: Request, res: Response) => {
  const health = {
    status: 'healthy',
    service: 'rez-payment-links-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    checks: {
      mongodb: 'unknown'
    }
  };

  try {
    // Verify MongoDB connection
    if (mongoose.connection.readyState === 1) {
      health.checks.mongodb = 'connected';
    } else {
      health.checks.mongodb = 'disconnected';
      health.status = 'degraded';
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    health.status = 'unhealthy';
    health.checks.mongodb = 'error';
    res.status(503).json(health);
  }
});

// READINESS CHECK: For Kubernetes
app.get('/ready', async (req: Request, res: Response) => {
  const isReady = mongoose.connection.readyState === 1;

  if (isReady) {
    res.json({
      ready: true,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(503).json({
      ready: false,
      reason: 'MongoDB not connected',
      timestamp: new Date().toISOString()
    });
  }
});

app.use('/api/v1/links', linksRoutes);

app.use('/webhooks', webhookRoutes);

app.get('/l/:shortId', async (req: Request, res: Response) => {
  const { shortId } = req.params;

  const { paymentService } = await import('./services/paymentService');
  const link = await paymentService.getPaymentLinkByShortId(shortId);

  if (!link) {
    res.status(404).json({
      success: false,
      error: 'Payment link not found or expired'
    });
    return;
  }

  res.json({
    success: true,
    data: {
      id: link.id,
      amount: link.amount,
      currency: link.currency,
      purpose: link.purpose,
      description: link.description,
      customerName: link.customerName,
      status: link.status,
      expiresAt: link.expiresAt,
      qrCodeDataUrl: link.qrCodeDataUrl,
      paymentUrl: `${process.env.BASE_URL || 'https://pay.rezpay.in'}/pay/${link.id}`
    }
  });
});

app.get('/pay/:id', async (req: Request, res: Response) => {
  const { id } = req.params;

  const { paymentService } = await import('./services/paymentService');
  const link = await paymentService.getPaymentLink(id);

  if (!link) {
    res.status(404).json({
      success: false,
      error: 'Payment link not found or expired'
    });
    return;
  }

  if (new Date() > link.expiresAt) {
    res.status(410).json({
      success: false,
      error: 'Payment link has expired'
    });
    return;
  }

  res.json({
    success: true,
    data: {
      id: link.id,
      amount: link.amount,
      currency: link.currency,
      purpose: link.purpose,
      description: link.description,
      customerName: link.customerName,
      upiId: link.upiId,
      status: link.status,
      qrCodeDataUrl: link.qrCodeDataUrl,
      expiresAt: link.expiresAt
    }
  });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    code: 'NOT_FOUND'
  });
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
});

const server = app.listen(PORT, async () => {
  // Connect to MongoDB before accepting requests
  await connectMongoDB();

  logger.info(`Payment Links Service started`, {
    port: PORT,
    nodeEnv: process.env.NODE_ENV || 'development',
    baseUrl: process.env.BASE_URL || 'https://pay.rezpay.in'
  });
});

const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received, shutting down gracefully`);

  server.close((err) => {
    if (err) {
      logger.error('Error during server shutdown', { error: err.message });
      process.exit(1);
    }

    logger.info('Server shutdown complete');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forced shutdown due to timeout');
    process.exit(1);
  }, 30000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err: Error) => {
  logger.error('Uncaught exception', {
    error: err.message,
    stack: err.stack
  });
  process.exit(1);
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled rejection', {
    reason: reason instanceof Error ? reason.message : reason
  });
  process.exit(1);
});

export default app;
