/**
 * HOJAI InternetOS API Server
 *
 * HTTP gateway for all actor and watcher operations
 * Port: 4595
 *
 * Security:
 * - JWT authentication (optional, for external clients)
 * - Internal service token (for service-to-service)
 * - Rate limiting (per IP)
 * - Helmet security headers
 * - Request signing
 *
 * Integrates with existing HOJAI services:
 * - MemoryOS (4703) - Store scraped data
 * - TwinOS Hub (4705) - Register entities
 * - Knowledge Extraction (4784) - NER, entity linking
 * - Webhook Bus (4110) - Notifications
 * - SkillOS (4743) - Register skills
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { actorRoutes } from './routes/actors.js';
import { watcherRoutes } from './routes/watchers.js';
import { historyRoutes } from './routes/history.js';
import { researchRoutes } from './routes/research.js';
import { schedulerRoutes } from './routes/scheduler.js';
import { actorService } from './services/actorService.js';
import { watcherService } from './services/watcherService.js';
import { config } from './config.js';
import {
  jwtAuth,
  internalAuth,
  rateLimiter,
  securityHeaders,
  requestLogger,
  generateToken,
  AuthRequest,
} from './middleware/security.js';

const app = express();

// ============ Security Middleware ============

// Helmet for security headers
app.use(helmet({
  contentSecurityPolicy: false, // We have an admin dashboard
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

// CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// JSON body parsing
app.use(express.json({ limit: '10mb' }));

// Additional security headers
app.use(securityHeaders);

// Request logging with request ID
app.use(requestLogger);

// Rate limiting (apply to all routes)
app.use(rateLimiter({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
}));

// ============ Public Endpoints (no auth) ============

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'internet-os-api',
    port: config.port,
    timestamp: new Date().toISOString(),
  });
});

// Ready check
app.get('/ready', async (_req: Request, res: Response) => {
  try {
    const actorServiceReady = actorService.isHealthy();
    const watcherServiceReady = watcherService.isHealthy();

    res.json({
      ready: actorServiceReady && watcherServiceReady,
      services: {
        actorService: actorServiceReady,
        watcherService: watcherServiceReady,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      ready: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Token generation (for testing - in production, use a separate auth service)
app.post('/api/auth/token', (req: Request, res: Response) => {
  // Only allow in development
  if (process.env.NODE_ENV === 'production' && !process.env.ALLOW_TOKEN_ENDPOINT) {
    return res.status(403).json({ error: 'Token endpoint disabled in production' });
  }

  const { userId, scopes, expiresIn } = req.body || {};
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }

  const token = generateToken({
    userId,
    scopes: scopes || ['read', 'write'],
    expiresIn: expiresIn || '7d',
  });

  res.json({ token, expiresIn: expiresIn || '7d' });
});

// Serve admin dashboard (public)
const dashboardPath = path.resolve(__dirname, '../../admin-dashboard');
app.use('/admin', express.static(dashboardPath));
app.get('/dashboard', (_req: Request, res: Response) => {
  res.redirect('/admin/');
});
app.get('/', (_req: Request, res: Response) => {
  res.redirect('/admin/');
});

// ============ Protected API Routes ============
// These routes require either JWT or internal token

// Apply internal auth to all /api routes (except health, ready, token)
app.use('/api', internalAuth);

// Routes
app.use('/api/actors', actorRoutes);
app.use('/api/watchers', watcherRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/research', researchRoutes);
app.use('/api/scheduler', schedulerRoutes);

// Stats endpoint (uses same internal auth)
app.get('/api/stats', (_req: Request, res: Response) => {
  res.json({
    actors: actorService.getStats(),
    watchers: watcherService.getStats(),
    timestamp: new Date().toISOString(),
  });
});

// ============ Error Handling ============

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found' });
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' ? 'Something went wrong' : err.message,
  });
});

// ============ Start Server ============

async function startServer() {
  console.log('Loading actors...');
  const loaded = await actorService.loadAllActors();
  console.log(`✓ Loaded ${loaded} actors`);

  app.listen(config.port, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║              HOJAI InternetOS API Server                     ║
╠══════════════════════════════════════════════════════════════╣
║  Port:        ${String(config.port).padEnd(43)}║
║  Environment: ${String(process.env.NODE_ENV || 'development').padEnd(43)}║
║  Auth:        JWT or x-internal-token                       ║
║  Rate Limit:  ${String(config.rateLimit.maxRequests).padEnd(3)} req / ${String(config.rateLimit.windowMs / 1000).padEnd(2)} sec          ║
║                                                              ║
║  Public endpoints:                                           ║
║  - GET  /health              Health check (no auth)        ║
║  - GET  /ready               Readiness (no auth)           ║
║  - GET  /admin/              Admin dashboard (no auth)     ║
║  - POST /api/auth/token      Get JWT token (dev only)      ║
║                                                              ║
║  Protected endpoints (require auth):                        ║
║  - GET  /api/actors          List actors                   ║
║  - POST /api/actors/:id/run   Run actor                     ║
║  - GET  /api/watchers        List watchers                 ║
║  - POST /api/watchers        Create watcher                ║
║  - GET  /api/history         Search history                ║
║  - POST /api/research/*      Run research agents           ║
║  - /api/scheduler/*          Manage scheduled tasks       ║
║                                                              ║
║  Integrations:                                               ║
║  - MemoryOS:      ${String(config.services.memoryOs).padEnd(35)}║
║  - TwinOS Hub:    ${String(config.services.twinOs).padEnd(35)}║
║  - Knowledge:      ${String(config.services.knowledgeExtraction).padEnd(35)}║
║  - Webhook Bus:    ${String(config.services.webhookBus).padEnd(35)}║
║  - SkillOS:       ${String(config.services.skillOs).padEnd(35)}║
╚══════════════════════════════════════════════════════════════╝
  `);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;