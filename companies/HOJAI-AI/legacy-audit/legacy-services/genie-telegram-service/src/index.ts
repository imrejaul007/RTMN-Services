/**
 * GENIE Telegram Service - Main Entry Point
 * Version: 1.0.0 | Date: June 1, 2026
 * Purpose: Telegram bot integration for GENIE Personal Intelligence OS
 *
 * Tagline: "You don't use Genie. You talk to Genie."
 *
 * Port: 4710
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import { createLogger } from './utils/logger.js';
import telegramRoutes from './routes/telegramRoutes.js';
import { createTelegramClient, TelegramAPI } from './services/telegramService.js';

// ============================================================================
// Configuration
// ============================================================================

const PORT = parseInt(process.env.PORT || '4710', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/genie-telegram';
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'genie-telegram-service';
const SERVICE_VERSION = '1.0.0';

// Telegram Bot Token (required)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';

// Webhook URL for receiving Telegram updates
const WEBHOOK_URL = process.env.TELEGRAM_WEBHOOK_URL || '';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET_TOKEN || '';

// ============================================================================
// Logger
// ============================================================================

const logger = createLogger(SERVICE_NAME);

// ============================================================================
// Telegram Client (optional - for sending messages)
// ============================================================================

let telegramClient: TelegramAPI | null = null;

async function initializeTelegramBot(): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    logger.warn('telegram_bot_token_not_configured', {
      message: 'Telegram bot token not set. Set TELEGRAM_BOT_TOKEN to enable bot functionality.',
    });
    return;
  }

  try {
    telegramClient = createTelegramClient(TELEGRAM_BOT_TOKEN);
    const initialized = await telegramClient.initialize();

    if (initialized) {
      logger.info('telegram_bot_ready');

      // Set up webhook if URL is configured
      if (WEBHOOK_URL) {
        await telegramClient.setWebhook(`${WEBHOOK_URL}/api/telegram/webhook/${WEBHOOK_SECRET}`, {
          max_connections: 40,
          allowed_updates: ['message', 'edited_message', 'callback_query'],
        });
        logger.info('webhook_configured', { url: WEBHOOK_URL });
      }

      // Set bot commands
      await telegramClient.setMyCommands([
        { command: 'start', description: 'Start interacting with GENIE' },
        { command: 'help', description: 'Get help with GENIE commands' },
        { command: 'link', description: 'Link your REZ account' },
        { command: 'unlink', description: 'Unlink your REZ account' },
        { command: 'briefing', description: 'Get your daily briefing' },
        { command: 'memory', description: 'Search your memories' },
        { command: 'context', description: 'Get current conversation context' },
      ]);
    } else {
      logger.error('telegram_bot_init_failed');
    }
  } catch (error) {
    logger.error('telegram_init_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// ============================================================================
// Express App
// ============================================================================

const app = express();

// ============================================================================
// Security Middleware
// ============================================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS
const corsOrigins = process.env.CORS_ORIGINS?.split(',') || ['*'];
app.use(cors({
  origin: corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-User-Id', 'X-Request-Id'],
  exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
}));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests, please try again later',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    return (req.headers['x-tenant-id'] as string) || req.ip || 'unknown';
  },
});

app.use('/api', globalLimiter);

// Stricter rate limit for write operations
const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many write requests, please slow down',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/telegram', writeLimiter);

// ============================================================================
// Body Parsing
// ============================================================================

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ============================================================================
// Compression
// ============================================================================

app.use(compression());

// ============================================================================
// Request Logging
// ============================================================================

app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  res.setHeader('X-Request-Id', requestId);

  logger.info('request_start', {
    requestId,
    method: req.method,
    path: req.path,
    tenantId: req.headers['x-tenant-id'],
  });

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info('request_end', {
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
    });
  });

  next();
});

// ============================================================================
// Health Endpoints
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    telegram: telegramClient?.isReady() ? 'connected' : 'not_configured',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    const mongoState = mongoose.connection.readyState;
    const isMongoReady = mongoState === 1;

    res.json({
      status: isMongoReady ? 'ready' : 'not_ready',
      checks: {
        mongodb: isMongoReady ? 'connected' : 'disconnected',
        telegram: telegramClient?.isReady() ? 'connected' : 'not_configured',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'not_ready',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ============================================================================
// API Routes
// ============================================================================

app.use('/api/telegram', telegramRoutes);

// ============================================================================
// 404 Handler
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'The requested resource was not found',
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================================================
// Error Handler
// ============================================================================

interface AppError extends Error {
  code?: string;
  statusCode?: number;
  details?: Record<string, unknown>;
}

app.use((err: AppError, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('request_error', {
    error: err.message,
    stack: err.stack,
    code: err.code,
    path: _req.path,
  });

  if (err.name === 'ValidationError' || err.code === 'VALIDATION_ERROR') {
    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: err.message,
        details: err.details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  if (err.name === 'MongoServerError' || err.name === 'MongooseError') {
    res.status(500).json({
      success: false,
      error: {
        code: 'DATABASE_ERROR',
        message: NODE_ENV === 'production' ? 'Database error' : err.message,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    });
    return;
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
    },
    meta: {
      timestamp: new Date().toISOString(),
    },
  });
});

// ============================================================================
// Database Connection
// ============================================================================

async function connectDatabase(): Promise<void> {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    logger.info('mongodb_connected', { uri: MONGODB_URI.replace(/\/\/.*@/, '//<credentials>@') });
  } catch (error) {
    logger.error('mongodb_connection_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    throw error;
  }
}

// ============================================================================
// Graceful Shutdown
// ============================================================================

async function shutdown(signal: string): Promise<void> {
  logger.info('shutdown_initiated', { signal });

  try {
    // Close Telegram bot
    if (telegramClient) {
      await telegramClient.close();
    }

    // Close MongoDB
    await mongoose.connection.close();
    logger.info('mongodb_disconnected');

    process.exit(0);
  } catch (error) {
    logger.error('shutdown_error', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// ============================================================================
// Start Server
// ============================================================================

async function start(): Promise<void> {
  try {
    logger.info('service_starting', {
      service: SERVICE_NAME,
      version: SERVICE_VERSION,
      port: PORT,
      environment: NODE_ENV,
    });

    // Connect to database
    await connectDatabase();

    // Initialize Telegram bot (async, non-blocking)
    initializeTelegramBot();

    // Start HTTP server
    app.listen(PORT, () => {
      logger.info('service_started', {
        service: SERVICE_NAME,
        version: SERVICE_VERSION,
        port: PORT,
        environment: NODE_ENV,
      });

      console.log(`
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   GENIE Telegram Service                                      ║
║   Personal Intelligence OS                                    ║
║                                                              ║
║   Status:  RUNNING                                           ║
║   Port:    ${PORT.toString().padEnd(51)}║
║   Version: ${SERVICE_VERSION.padEnd(51)}║
║   Telegram: ${(telegramClient?.isReady() ? 'CONNECTED' : 'NOT CONFIGURED').padEnd(43)}║
║                                                              ║
║   "You don't use Genie. You talk to Genie."                  ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    logger.error('service_start_failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
    });
    process.exit(1);
  }
}

// Start the service
start();

export default app;
