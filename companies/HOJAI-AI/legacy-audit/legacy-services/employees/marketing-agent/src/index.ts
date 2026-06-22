// ============================================
// HOJAI AI - Marketing Agent Main Entry Point
// ============================================

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

import { logger } from './utils/logger';
import { requireInternalAuth } from './middleware/auth';
import {
  contentRoutes,
  socialRoutes,
  campaignRoutes,
  seoRoutes,
  emailRoutes,
  adRoutes
} from './routes';

const app: Express = express();
const PORT = process.env.PORT || 4761;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-marketing';

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:']
    }
  }
}));

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Internal-Token']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: parseInt(process.env.RATE_LIMIT || '100'),
  message: JSON.stringify({
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later.'
    }
  }),
  standardHeaders: true,
  legacyHeaders: false
});

app.use('/api', limiter);

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log request
  logger.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
    contentType: req.get('content-type')
  });

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
});

// Health check endpoints (no auth required)
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'marketing-agent',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

app.get('/ready', async (req: Request, res: Response) => {
  const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';

  const isReady = mongoStatus === 'connected';

  res.status(isReady ? 200 : 503).json({
    status: isReady ? 'ready' : 'not_ready',
    service: 'marketing-agent',
    checks: {
      mongodb: mongoStatus
    },
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', requireInternalAuth);

// Content routes
app.use('/api/content', contentRoutes);

// Social media routes
app.use('/api/social', socialRoutes);

// Campaign routes
app.use('/api/campaigns', campaignRoutes);

// SEO routes
app.use('/api/seo', seoRoutes);

// Email routes
app.use('/api/email', emailRoutes);

// Ad routes
app.use('/api/ads', adRoutes);

// Webhook endpoint for social media analytics
app.post('/webhooks/social/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const { postId, event, metrics } = req.body;

    logger.info('Social webhook received', { platform, event, postId });

    // Process webhook event
    // In production, this would update engagement metrics
    res.json({ success: true, processed: true });
  } catch (error) {
    logger.error('Social webhook error', { error });
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

// Webhook for email events
app.post('/webhooks/email', async (req: Request, res: Response) => {
  try {
    const { type, emailCampaignId, timestamp, data } = req.body;

    logger.info('Email webhook received', { type, emailCampaignId });

    // Update email campaign stats based on webhook
    // In production, this would update open/click/bounce metrics
    res.json({ success: true, processed: true });
  } catch (error) {
    logger.error('Email webhook error', { error });
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production'
        ? 'An unexpected error occurred'
        : err.message
    }
  });
});

// Graceful shutdown
async function shutdown(signal: string): Promise<void> {
  logger.info(`Received ${signal}, shutting down gracefully...`);

  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
  } catch (error) {
    logger.error('Error closing MongoDB connection', { error });
  }

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Start server
async function start(): Promise<void> {
  try {
    // Connect to MongoDB
    logger.info('Connecting to MongoDB...', { uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });

    await mongoose.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000
    });

    logger.info('Connected to MongoDB');

    // Create indexes
    await createIndexes();

    // Start listening
    app.listen(PORT, () => {
      logger.info(`HOJAI Marketing Agent started on port ${PORT}`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      });

      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎯 HOJAI AI - Marketing Agent                          ║
║   Content Generation, Campaigns & Social Media             ║
║                                                           ║
║   Port: ${PORT}                                             ║
║   Status: Running                                         ║
║                                                           ║
║   Endpoints:                                              ║
║   • POST /api/content/generate - Generate content          ║
║   • POST /api/social/post    - Post to social            ║
║   • POST /api/campaigns/create - Create campaign          ║
║   • POST /api/campaigns/:id/launch - Launch campaign     ║
║   • POST /api/seo/optimize   - SEO optimization          ║
║   • POST /api/email/campaign - Email campaign            ║
║   • POST /api/ads/copy       - Generate ad copy          ║
║                                                           ║
║   Health: http://localhost:${PORT}/health                     ║
║   Ready:  http://localhost:${PORT}/ready                     ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
}

// Create MongoDB indexes
async function createIndexes(): Promise<void> {
  try {
    const { Content, SocialPost, Campaign, EmailCampaign, SEOOptimization, AdCopy } = require('./models');

    // Content indexes
    await Content.collection.createIndex({ tenantId: 1, status: 1 });
    await Content.collection.createIndex({ tenantId: 1, type: 1 });
    await Content.collection.createIndex({ tenantId: 1, createdBy: 1 });

    // Social Post indexes
    await SocialPost.collection.createIndex({ tenantId: 1, status: 1 });
    await SocialPost.collection.createIndex({ tenantId: 1, platform: 1 });
    await SocialPost.collection.createIndex({ tenantId: 1, scheduledFor: 1 });

    // Campaign indexes
    await Campaign.collection.createIndex({ tenantId: 1, status: 1 });
    await Campaign.collection.createIndex({ tenantId: 1, type: 1 });
    await Campaign.collection.createIndex({ tenantId: 1, createdBy: 1 });

    // Email Campaign indexes
    await EmailCampaign.collection.createIndex({ tenantId: 1, status: 1 });
    await EmailCampaign.collection.createIndex({ tenantId: 1, campaignId: 1 });

    // SEO Optimization indexes
    await SEOOptimization.collection.createIndex({ tenantId: 1, type: 1 });
    await SEOOptimization.collection.createIndex({ tenantId: 1, url: 1 }, { sparse: true });

    // Ad Copy indexes
    await AdCopy.collection.createIndex({ tenantId: 1, adType: 1 });
    await AdCopy.collection.createIndex({ tenantId: 1, productName: 1 });

    logger.info('MongoDB indexes created successfully');
  } catch (error) {
    logger.warn('Error creating indexes (may already exist)', { error });
  }
}

// Export for testing
export { app };

// Start the server
start();
