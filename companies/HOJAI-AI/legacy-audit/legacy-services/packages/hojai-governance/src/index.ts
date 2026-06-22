import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuid } from 'uuid';
import { TenantModel } from './services/tenant/tenantManager.js';
import { tenantManager } from './services/tenant/tenantManager.js';
import { rbacService } from './services/rbac/rbacService.js';
import { auditLogger } from './services/audit/auditLogger.js';
import authRoutes, { globalLimiter, authLimiter, requestLogger } from './services/api-gateway/apiGateway.js';
import tenantRoutes from './routes/tenant/tenantRoutes.js';
import { TenantType } from './types/index.js';

// ============================================================================
// CONFIG
// ============================================================================

const PORT = process.env.PORT || 4501;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai-governance';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// ============================================================================
// EXPRESS APP
// ============================================================================

const app = express();

// Security middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Global rate limiting
app.use(globalLimiter);

// Request logging
app.use(requestLogger);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hojai-governance',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Readiness check
app.get('/ready', async (req, res) => {
  try {
    const mongoStatus = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: 'ready',
      service: 'hojai-governance',
      mongodb: mongoStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: 'Service unavailable' });
  }
});

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = (req.headers['x-request-id'] as string) || uuid();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// ============================================================================
// ROUTES
// ============================================================================

// Auth routes (login, register, token refresh)
app.use('/api/auth', authLimiter, authRoutes);

// Tenant routes
app.use('/api/tenants', tenantRoutes);

// ============================================================================
// ERROR HANDLER
// ============================================================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  const statusCode = (err as any).statusCode || 500;
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;

  console.error('[Error]', {
    requestId: req.requestId,
    path: req.path,
    method: req.method,
    error: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
  });

  // Log to audit
  auditLogger.log({
    tenantId: (req as any).tenantId,
    userId: (req as any).userId,
    action: 'error',
    resource: req.path,
    status: 'failure',
    metadata: { error: err.message, statusCode }
  }).catch(console.error);

  res.status(statusCode).json({
    success: false,
    error: message,
    requestId: req.requestId
  });
});

// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {
  console.log('[Hojai Governance] Starting server...');

  // Connect to MongoDB
  await mongoose.connect(MONGODB_URI);
  console.log('[MongoDB] Connected to', MONGODB_URI);

  // Initialize tenant manager
  await tenantManager.initialize();
  console.log('[Tenant Manager] Initialized');

  // Initialize RBAC
  await rbacService.initialize();
  console.log('[RBAC] Initialized');

  // Start server
  app.listen(PORT, () => {
    console.log(`[Hojai Governance] Server running on port ${PORT}`);
    console.log(`[Hojai Governance] Health check: http://localhost:${PORT}/health`);
  });
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Hojai Governance] Shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[Hojai Governance] Shutting down...');
  await mongoose.disconnect();
  process.exit(0);
});

startServer().catch((error) => {
  console.error('[Hojai Governance] Failed to start:', error);
  process.exit(1);
});

export default app;
