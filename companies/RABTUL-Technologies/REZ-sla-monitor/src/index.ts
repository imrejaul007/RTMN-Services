import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { authMiddleware } from './middleware/auth';
import { rateLimit } from './middleware/rateLimit';
import { eventBus } from './utils/eventBus';
import slaRoutes from './routes/sla';
import monitoringRoutes from './routes/monitoring';
import reportsRoutes from './routes/reports';
import metricsRoutes from './routes/metrics';

const app = express();
const START_TIME = Date.now();
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '').split(',').map(o => o.trim()).filter(Boolean);

// Request ID Tracing
app.use((req: Request, res: Response, next) => {
  const requestId = (req.headers['x-request-id'] as string) || crypto.randomUUID();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
});

// Strict Security Headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true },
}));

// Strict CORS
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (origin, cb) => origin && ALLOWED_ORIGINS.includes(origin) ? cb(null, true) : cb(new Error('Not allowed'))
    : '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID', 'X-Internal-Token'],
  maxAge: 86400,
}));

app.use(express.json({ limit: '10mb' }));

// Global rate limiting
app.use(rateLimit({ windowMs: 60000, max: 100 }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'healthy', service: config.serviceName, version: config.version, environment: config.environment, uptime: Math.floor((Date.now() - START_TIME) / 1000), timestamp: new Date().toISOString() });
});

app.get('/api/v1/info', (_req: Request, res: Response) => {
  res.json({
    success: true, data: {
      name: config.serviceName, description: 'RABTUL SLA Monitor - Tracks Service Level Agreements', version: config.version,
      features: ['SLA definition with multiple targets', 'Metric collection (uptime, latency, throughput, error rate)', 'Uptime calculation', 'Latency percentiles (p50, p95, p99)', 'Threshold checking', 'Real-time alerting', 'SLA reports (daily, weekly, monthly)', 'Breach detection integration', 'Event-driven architecture'],
      endpoints: { sla: '/api/v1/sla', monitoring: '/api/v1/monitoring', reports: '/api/v1/reports', metrics: '/api/v1/metrics' },
    }, timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/sla', authMiddleware, slaRoutes);
app.use('/api/v1/monitoring', authMiddleware, monitoringRoutes);
app.use('/api/v1/reports', authMiddleware, reportsRoutes);
app.use('/api/v1/metrics', authMiddleware, metricsRoutes);

app.post('/api/v1/event', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try { const { type, data } = req.body; logger.info(`[EVENT] ${type}`); res.json({ success: true, data: { eventId: uuidv4(), type, status: 'processed' }, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    logger.info(`REZ-SLA-MONITOR running on port ${config.port}`);
    eventBus.publish('sla-monitor.ready', { service: 'rez-sla-monitor', port: config.port, version: config.version });
  });
}

export default app;
