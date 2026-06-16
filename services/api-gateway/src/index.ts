import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.js';
import { defaultLimiter, authLimiter, apiLimiter } from './middleware/rateLimit.js';
import { requestLogger, responseLogger } from './middleware/logging.js';
import { tenantMiddleware } from './middleware/tenant.js';
import { setupRoutes } from './services/proxy.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '4001', 10);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-Id', 'X-Project-Id', 'X-Trace-Id']
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(requestLogger);
app.use(responseLogger);

// Rate limiting
app.use('/auth', authLimiter);
app.use('/api', apiLimiter);
app.use(defaultLimiter);

// Tenant isolation
app.use(tenantMiddleware);

// Auth (skip for health/routes)
app.use((req, res, next) => {
  if (req.path.startsWith('/health') || req.path.startsWith('/metrics')) {
    return next();
  }
  authMiddleware(req, res, next);
});

// Setup service routes
setupRoutes(app);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path,
    traceId: (req as any).traceId
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Gateway error:', {
    error: err.message,
    stack: err.stack,
    traceId: (req as any).traceId
  });

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    traceId: (req as any).traceId
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║                    RTMN API GATEWAY                    ║
╠════════════════════════════════════════════════════════════╣
║  Port:     ${PORT}                                      ║
║  Health:   http://localhost:${PORT}/health                   ║
║  Ready:    http://localhost:${PORT}/health/ready             ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
