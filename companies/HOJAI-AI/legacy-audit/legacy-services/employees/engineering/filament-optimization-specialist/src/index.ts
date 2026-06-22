/**
 * HOJAI Engineering Filament Optimization Specialist
 * Port: 4913
 *
 * AI-powered filament-optimization-specialist for engineering operations
 */

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { persona } from './persona.js';
import chatRoutes from './routes/chat.js';

const PORT = 4913;
const NODE_ENV = process.env.NODE_ENV || 'development';
const SERVICE_NAME = 'filament-optimization-specialist';
const SERVICE_VERSION = '1.0.0';

const app = express();

// Security Middleware
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
}));

// Rate Limiting
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Too many requests' },
    meta: { timestamp: new Date().toISOString() },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api', globalLimiter);

// Body Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Request Logging
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  console.log(`[${SERVICE_NAME}] ${req.method} ${req.path}`);

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    console.log(`[${SERVICE_NAME}] ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
  });

  next();
});

// Health Endpoints
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/health/ready', (_req: Request, res: Response) => {
  res.json({ status: 'ready', timestamp: new Date().toISOString() });
});

// Service Info
app.get('/api/info', (_req: Request, res: Response) => {
  res.json({
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
    description: persona.identity.role,
    tagline: persona.vibe || '',
    capabilities: {
      chat: true,
      persona: true,
    },
    persona: {
      name: persona.identity.name,
      role: persona.identity.role,
      personality: persona.identity.personality,
    },
    endpoints: {
      chat: 'POST /api/chat',
      info: 'GET /api/info',
    },
    timestamp: new Date().toISOString(),
  });
});

// Chat Routes
app.use('/api', chatRoutes);

// 404 Handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Resource not found' },
    meta: { timestamp: new Date().toISOString() },
  });
});

// Error Handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(`[${SERVICE_NAME}] Error:`, err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message },
    meta: { timestamp: new Date().toISOString() },
  });
});

// Graceful Shutdown
process.on('SIGTERM', () => {
  console.log(`[${SERVICE_NAME}] Shutting down...`);
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log(`[${SERVICE_NAME}] Shutting down...`);
  process.exit(0);
});

// Start Server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════════════════════╗
║                                                                          ║
║   HOJAI Engineering Filament Optimization Specialist                ║
║   Engineering Division AI Agent                                          ║
║                                                                          ║
║   Status:    RUNNING                                                     ║
║   Port:      4913                                                    ║
║   Version:   1.0.0                                                   ║
║                                                                          ║
║   "Pragmatic perfectionist — streamlines complex admin environments.     "  ║
║                                                                          ║
╚══════════════════════════════════════════════════════════════════════════╝
  `);
});

export default app;
