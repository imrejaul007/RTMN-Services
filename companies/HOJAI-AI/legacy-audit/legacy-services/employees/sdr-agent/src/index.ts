// ============================================
// HOJAI AI - SDR Agent Main Entry Point
// ============================================

import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';

import { logger } from './utils/logger';
import { requireInternalAuth } from './middleware/auth';
import {
  prospectRoutes,
  leadRoutes,
  outreachRoutes,
  followupRoutes,
  qualificationRoutes
} from './routes';
import aiSDRRoutes from './ai-sdr.js';

const app: Express = express();
const PORT = process.env.PORT || 4757;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-sdr';

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
    service: 'sdr-agent',
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
    service: 'sdr-agent',
    checks: {
      mongodb: mongoStatus
    },
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', requireInternalAuth);
app.use('/api/prospects', prospectRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/outreach', outreachRoutes);
app.use('/api/followups', followupRoutes);
app.use('/api/qualification', qualificationRoutes);

// AI SDR routes (Real LLM-powered assistant)
app.use('/api/ai', aiSDRRoutes);

// Webhook endpoint for CRM callbacks
app.post('/webhooks/crm', async (req: Request, res: Response) => {
  try {
    const { crmConnector } = require('./services/crmConnector');

    if (!crmConnector.isConnected()) {
      return res.status(400).json({
        success: false,
        error: 'CRM not configured'
      });
    }

    const result = await crmConnector.handleWebhook(req.body);

    if (result) {
      logger.info('CRM webhook received', { type: result.type });
    }

    res.json({ success: true });
  } catch (error) {
    logger.error('CRM webhook error', { error });
    res.status(500).json({
      success: false,
      error: 'Webhook processing failed'
    });
  }
});

// Webhook for email events (SendGrid, Mailgun, etc.)
app.post('/webhooks/email', async (req: Request, res: Response) => {
  try {
    const { outreachEngine } = require('./services/outreachEngine');
    const { OutreachStatus } = require('./types');

    const { type, outreachId, timestamp } = req.body;

    let status: string;
    let metadata: Record<string, Date> = {};

    switch (type) {
      case 'delivered':
        status = 'delivered';
        metadata = { deliveredAt: new Date(timestamp) };
        break;
      case 'opened':
        status = 'opened';
        metadata = { openedAt: new Date(timestamp) };
        break;
      case 'clicked':
        status = 'clicked';
        metadata = { clickedAt: new Date(timestamp) };
        break;
      case 'replied':
        status = 'replied';
        metadata = { repliedAt: new Date(timestamp) };
        break;
      case 'bounced':
        status = 'bounced';
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Unknown webhook event type'
        });
    }

    await outreachEngine.updateOutreachStatus(
      req.headers['x-tenant-id'] as string || 'default',
      outreachId,
      status,
      metadata
    );

    logger.info(`Email webhook: ${type}`, { outreachId });

    res.json({ success: true });
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
      logger.info(`HOJAI SDR Agent started on port ${PORT}`, {
        port: PORT,
        env: process.env.NODE_ENV || 'development',
        mongoStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
      });

      console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎯 HOJAI AI - SDR Agent                                 ║
║   Sales Development Representative Service                 ║
║                                                           ║
║   Port: ${PORT}                                             ║
║   Status: Running                                          ║
║                                                           ║
║   Endpoints:                                              ║
║   • POST /api/prospects/find     - Find prospects         ║
║   • POST /api/prospects/qualify  - Qualify lead          ║
║   • POST /api/outreach/send      - Send outreach          ║
║   • POST /api/followups/schedule - Schedule follow-ups    ║
║   • GET  /api/leads              - List qualified leads   ║
║   • PUT  /api/leads/:id/stage    - Update stage           ║
║                                                           ║
║   Health: http://localhost:${PORT}/health                   ║
║   Ready:  http://localhost:${PORT}/ready                   ║
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
    const { Contact, Company, Lead, Qualification, Outreach, Followup, Activity } = require('./models');

    // Contact indexes
    await Contact.collection.createIndex({ tenantId: 1, email: 1 }, { unique: true, sparse: true });
    await Contact.collection.createIndex({ tenantId: 1, industry: 1 });
    await Contact.collection.createIndex({ tenantId: 1, companySize: 1 });

    // Company indexes
    await Company.collection.createIndex({ tenantId: 1, domain: 1 }, { unique: true, sparse: true });
    await Company.collection.createIndex({ tenantId: 1, industry: 1 });

    // Lead indexes
    await Lead.collection.createIndex({ tenantId: 1, stage: 1 });
    await Lead.collection.createIndex({ tenantId: 1, score: 1 });
    await Lead.collection.createIndex({ tenantId: 1, nextFollowupAt: 1 });
    await Lead.collection.createIndex({ tenantId: 1, contactId: 1 }, { unique: true });

    // Qualification indexes
    await Qualification.collection.createIndex({ tenantId: 1, leadId: 1 }, { unique: true });

    // Outreach indexes
    await Outreach.collection.createIndex({ tenantId: 1, status: 1 });
    await Outreach.collection.createIndex({ tenantId: 1, sentAt: 1 });

    // Followup indexes
    await Followup.collection.createIndex({ tenantId: 1, status: 1, scheduledFor: 1 });

    // Activity indexes
    await Activity.collection.createIndex({ tenantId: 1, leadId: 1, createdAt: -1 });

    logger.info('MongoDB indexes created successfully');
  } catch (error) {
    logger.warn('Error creating indexes (may already exist)', { error });
  }
}

// Export for testing
export { app };

// Start the server
start();
