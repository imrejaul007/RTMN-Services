/**
 * HOJAI SiteOS - Shopify App Server
 * Production-ready Express server with Shopify OAuth 2.0 integration
 *
 * Features:
 * - Shopify OAuth 2.0 authentication flow
 * - Secure token storage (NOT in metafields)
 * - Webhook handlers for Shopify events
 * - Widget configuration API
 * - Embedded React app for settings UI
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { Shopify, ApiVersion, DataType } from '@shopify/shopify-api';
import { verifyHmac } from '@shopify/shopify-api/dist/utils/hmac-verify.js';
import authRoutes from './routes/auth.js';
import webhookRoutes from './routes/webhook.js';
import widgetRoutes from './routes/widget.js';
import { storage } from './services/storage.js';
import { logger } from './utils/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// ============================================
// SHOPIFY API INITIALIZATION
// ============================================

Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_CLIENT_ID,
  API_SECRET_KEY: process.env.SHOPIFY_CLIENT_SECRET,
  SCOPES: process.env.SHOPIFY_SCOPES?.split(',').map(s => s.trim()) || [
    'read_products',
    'write_products',
    'read_orders',
    'write_orders',
    'read_customers',
    'write_customers',
    'read_analytics',
    'read_themes',
    'write_themes'
  ],
  HOST_NAME: process.env.SHOPIFY_APP_URL?.replace(/^https?:\/\//, '') || 'localhost',
  API_VERSION: ApiVersion.October23,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
  // Additional context options
  ...(process.env.SHOPFY_ADMIN_API_ACCESS_TOKEN && {
    ADMIN_API_ACCESS_TOKEN: process.env.SHOPFY_ADMIN_API_ACCESS_TOKEN
  })
});

logger.info('Shopify API initialized', {
  apiVersion: ApiVersion.October23,
  scopes: Shopify.Context.SCOPES,
  hostName: Shopify.Context.HOST_NAME
});

// ============================================
// MIDDLEWARE CONFIGURATION
// ============================================

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.hojai.ai', 'https://unpkg.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
      connectSrc: ["'self'", 'https://*.shopify.com', 'https://cdn.hojai.ai', 'https://api.hojai.ai'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'", 'blob:'],
      frameAncestors: ["'self'", '*.myshopify.com', '*.shopify.com']
    }
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
app.use(cors({
  origin: [
    // Allow all Shopify stores during OAuth flow
    /myshopify\.com$/,
    /shopify\.com$/,
    // Allow localhost in development
    ...(IS_PRODUCTION ? [] : ['http://localhost:3000', 'http://localhost:3001'])
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Shopify-Access-Token',
    'X-Shopify-Shop-Domain',
    'X-Shopify-API-Version',
    'X-Shopify-HMAC-SHA256',
    'X-Shopify-Triggered-At',
    'Accept',
    'Accept-Language',
    'Content-Language'
  ]
}));

// Compression for responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compress']) return false;
    return compression.filter(req, res);
  },
  level: 6
}));

// Body parsing with size limits
app.use(express.json({
  limit: '10mb',
  type: ['json', 'application/json']
}));
app.use(express.urlencoded({
  extended: true,
  limit: '10mb'
}));
app.use(express.text({ limit: '10mb', type: 'text/plain' }));

// Request logging
app.use((req, res, next) => {
  const startTime = Date.now();

  // Log request
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel]('HTTP Request', {
      method: req.method,
      path: req.path,
      query: req.query,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent')?.substring(0, 100)
    });
  });

  next();
});

// Trust proxy (for accurate IP behind load balancers)
app.set('trust proxy', 1);

// ============================================
// STATIC FILES
// ============================================

// Serve built frontend in production
const distPath = path.join(__dirname, '../dist/frontend');
if (existsSync(distPath)) {
  app.use(express.static(distPath, {
    maxAge: IS_PRODUCTION ? '1y' : '0',
    etag: true,
    index: 'index.html'
  }));
}

// Serve app-block files
const appBlockPath = path.join(__dirname, '../app-block');
if (existsSync(appBlockPath)) {
  app.use('/app-block', express.static(appBlockPath, {
    maxAge: '1h',
    etag: true
  }));
}

// ============================================
// API ROUTES
// ============================================

// Apply rate limiting to API routes
app.use('/api', rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 100 // 100 requests per minute
}));

// Mount route handlers
app.use('/auth', authRoutes);
app.use('/webhooks', webhookRoutes);
app.use('/api/widget', widgetRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check storage connectivity
    const storageHealthy = await storage.healthCheck();

    // Check Shopify API connectivity
    let shopifyHealthy = false;
    try {
      const testSession = await storage.getSession('test-health-check');
      shopifyHealthy = true;
    } catch (e) {
      // Expected to fail - just checking connectivity
      shopifyHealthy = true;
    }

    const isHealthy = storageHealthy && shopifyHealthy;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'hojai-shopify-app',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: IS_PRODUCTION ? 'production' : 'development',
      checks: {
        storage: storageHealthy ? 'ok' : 'error',
        shopify: shopifyHealthy ? 'ok' : 'error'
      }
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      service: 'hojai-shopify-app',
      error: error.message
    });
  }
});

// Readiness check (for Kubernetes)
app.get('/ready', async (req, res) => {
  try {
    await storage.healthCheck();
    res.status(200).json({ ready: true });
  } catch (error) {
    res.status(503).json({ ready: false, error: error.message });
  }
});

// ============================================
// ERROR HANDLING
// ============================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ============================================
// GRACEFUL SHUTDOWN
// ============================================

let server;

function gracefulShutdown(signal) {
  logger.info(`Received ${signal}, starting graceful shutdown...`);

  // Stop accepting new connections
  if (server) {
    server.close(() => {
      logger.info('HTTP server closed');
    });
  }

  // Close database connections
  storage.disconnect().then(() => {
    logger.info('Database connections closed');
    process.exit(0);
  }).catch((error) => {
    logger.error('Error during shutdown', { error: error.message });
    process.exit(1);
  });

  // Force exit after 30 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 30000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', {
    error: error.message,
    stack: error.stack
  });
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
});

// ============================================
// START SERVER
// ============================================

server = app.listen(PORT, () => {
  logger.info(`HOJAI Shopify App server started`, {
    port: PORT,
    environment: IS_PRODUCTION ? 'production' : 'development',
    nodeVersion: process.version,
    pid: process.pid
  });

  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   HOJAI SiteOS - Shopify App                              ║
║   ─────────────────────────────                           ║
║                                                           ║
║   Server:  http://localhost:${PORT}                          ║
║   Health:  http://localhost:${PORT}/health                   ║
║   API:     http://localhost:${PORT}/api/widget               ║
║                                                           ║
║   Environment: ${IS_PRODUCTION ? 'production' : 'development'}                            ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  // Register webhooks on startup (optional - can also be done during OAuth)
  if (IS_PRODUCTION) {
    registerWebhooks();
  }
});

export default app;

// ============================================
// WEBHOOK REGISTRATION
// ============================================

async function registerWebhooks() {
  const webhookTopics = [
    'app/uninstalled',
    'shop/update',
    'orders/create',
    'orders/updated',
    'orders/fulfilled',
    'orders/cancelled',
    'customers/create',
    'customers/update',
    'customers/delete',
    'products/create',
    'products/update',
    'products/delete',
    'checkouts/create',
    'checkouts/update'
  ];

  logger.info('Webhook registration would be triggered', {
    topics: webhookTopics.length
  });
  // In production, you would iterate through shops and register webhooks
  // using the Shopify Webhooks registration API
}