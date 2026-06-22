// ============================================================================
// SUTAR Marketplace - Main Entry Point
// ============================================================================

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { v4 as uuidv4 } from 'uuid';

// Import services
import { storage } from './services/storage';
import { categoryService } from './services/categoryService';
import { allRoutes } from './services/routes';
import { ApiResponse } from './services/types';

// Initialize Express app
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4250;
const START_TIME = Date.now();

// ============================================================================
// Middleware Setup
// ============================================================================

// Security headers
app.use(helmet({ contentSecurityPolicy: false }));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Marketplace-Request'],
}));

// Body parsing
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Stricter rate limit for write operations
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: { success: false, error: 'Too many write requests, please slow down' },
});
app.use('/api/v1/', writeLimiter);

// Request ID middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();
  res.setHeader('X-Request-ID', requestId);
  (req as any).requestId = requestId;
  next();
});

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      requestId: (req as any).requestId,
    }));
  });
  next();
});

// ============================================================================
// Helper Functions
// ============================================================================

const apiResponse = <T>(
  success: boolean,
  data?: T,
  error?: string,
  requestId?: string
): ApiResponse<T> => ({
  success,
  data,
  error,
  timestamp: new Date().toISOString(),
  requestId,
});

// ============================================================================
// Health Check Endpoints
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    status: 'healthy',
    service: 'sutar-marketplace',
    version: '2.0.0',
    uptime: Math.floor((Date.now() - START_TIME) / 1000),
    environment: process.env.NODE_ENV || 'development',
  }));
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    ready: true,
    services: {
      storage: storage.getStats('services').count >= 0,
      categories: categoryService.getAllCategories().length >= 0,
    },
  }));
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json(apiResponse(true, { alive: true }));
});

// ============================================================================
// API Routes
// ============================================================================

// Register all routes from routes.ts
Object.entries(allRoutes).forEach(([route, handler]) => {
  const [method, path] = route.split(' ');
  const httpMethod = method.toLowerCase() as 'get' | 'post' | 'put' | 'delete' | 'patch';

  if (app[httpMethod]) {
    app[httpMethod](path, handler as any);
  }
});

// ============================================================================
// Service Metadata Endpoint
// ============================================================================

app.get('/api/v1/metadata', (_req: Request, res: Response) => {
  res.json(apiResponse(true, {
    name: 'SUTAR Marketplace',
    version: '2.0.0',
    description: 'Service marketplace for SUTAR OS',
    port: PORT,
    endpoints: {
      services: '/api/v1/services',
      categories: '/api/v1/categories',
      plans: '/api/v1/plans',
      orders: '/api/v1/orders',
      payments: '/api/v1/payments',
      subscriptions: '/api/v1/subscriptions',
      favorites: '/api/v1/favorites',
      recommendations: '/api/v1/recommendations',
      analytics: '/api/v1/analytics',
      economy: '/api/v1/economy',
    },
    features: [
      'Service Catalog',
      'Hierarchical Categories',
      'Multiple Pricing Tiers',
      'Order Management',
      'Payment Processing',
      'Recurring Billing',
      'User Favorites',
      'Personalized Recommendations',
      'Marketplace Analytics',
      'Economy OS Integration',
    ],
  }));
});

// ============================================================================
// Storage Statistics Endpoint
// ============================================================================

app.get('/api/v1/stats', (_req: Request, res: Response) => {
  const stats = storage.getAllStats();
  res.json(apiResponse(true, stats));
});

// ============================================================================
// 404 Handler
// ============================================================================

app.use((_req: Request, res: Response) => {
  res.status(404).json(apiResponse(false, undefined, 'Endpoint not found'));
});

// ============================================================================
// Error Handler
// ============================================================================

app.use((err: Error, _req: Request, res: Response) => {
  console.error('Unhandled error:', err);
  res.status(500).json(apiResponse(false, undefined, err.message || 'Internal server error'));
});

// ============================================================================
// Graceful Shutdown
// ============================================================================

const gracefulShutdown = (signal: string) => {
  console.log(`\n[SHUTDOWN] Received ${signal}, shutting down gracefully...`);

  // Save all data
  storage.saveAll();
  storage.shutdown();

  // Close server
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  storage.saveAll();
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// ============================================================================
// Start Server
// ============================================================================

// Initialize default categories if needed
categoryService.initializeDefaultCategories();

// Start auto-save for storage
storage.startAutoSave();

// Start subscription expiry checker
setInterval(() => {
  // This would integrate with subscriptionService in production
  console.log('[CRON] Checking for expired subscriptions...');
}, 60 * 60 * 1000); // Every hour

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════╗
║                  SUTAR MARKETPLACE v2.0.0                     ║
╠══════════════════════════════════════════════════════════════════╣
║  Port: ${PORT}                                                      ║
║  Environment: ${process.env.NODE_ENV || 'development'}                                  ║
║  Data Directory: ${process.env.DATA_DIR || './data'}                             ║
║  Economy OS: ${process.env.ECONOMY_OS_URL || 'http://localhost:4251'}                   ║
╠══════════════════════════════════════════════════════════════════╣
║  Endpoints:                                                    ║
║    - Services:      GET/POST /api/v1/services                  ║
║    - Categories:     GET/POST /api/v1/categories               ║
║    - Plans:          GET/POST /api/v1/plans                    ║
║    - Orders:         GET/POST /api/v1/orders                   ║
║    - Payments:       POST /api/v1/orders/:id/pay                ║
║    - Subscriptions:  GET/POST /api/v1/subscriptions            ║
║    - Favorites:      GET/POST /api/v1/favorites                ║
║    - Recommendations: GET /api/v1/recommendations/:userId     ║
║    - Analytics:      GET /api/v1/analytics                     ║
║    - Economy:         GET /api/v1/economy/balance/:userId       ║
╠════���═════════════════════════════════════════════════════════════╣
║  Health:           GET /health                                ║
║  Ready:            GET /health/ready                           ║
║  Live:             GET /health/live                            ║
╚══════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
