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
import breachRoutes from './routes/breach';
import detectionRoutes from './routes/detection';
import incidentRoutes from './routes/incidents';
import remediationRoutes from './routes/remediation';

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
      name: config.serviceName, description: 'RABTUL Breach Detector - Real-time SLA breach detection and remediation', version: config.version,
      features: ['Threshold-based detection', 'Anomaly detection (z-score)', 'Spike detection (3x baseline)', 'Pattern recognition', 'Sustained degradation detection', 'Auto-remediation by severity', 'Multi-channel notifications (email, Slack, PagerDuty, webhook, SMS)', 'Incident management', 'Root cause analysis', 'Event stream (SSE)', 'Event-driven architecture'],
      endpoints: { breach: '/api/v1/breach', detection: '/api/v1/detection', incident: '/api/v1/incident', remediation: '/api/v1/remediation' },
    }, timestamp: new Date().toISOString(),
  });
});

app.use('/api/v1/breach', authMiddleware, breachRoutes);
app.use('/api/v1/detection', authMiddleware, detectionRoutes);
app.use('/api/v1/incident', authMiddleware, incidentRoutes);
app.use('/api/v1/remediation', authMiddleware, remediationRoutes);

app.post('/api/v1/event', authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try { const { type, data } = req.body; logger.info(`[EVENT] ${type}`); res.json({ success: true, data: { eventId: uuidv4(), type, status: 'processed' }, timestamp: new Date().toISOString() }); }
  catch (error) { next(error); }
});

app.use(notFoundHandler);
app.use(errorHandler);

if (require.main === module) {
  app.listen(config.port, () => {
    logger.info(`REZ-BREACH-DETECTOR running on port ${config.port}`);
    eventBus.publish('breach-detector.ready', { service: 'rez-breach-detector', port: config.port, version: config.version });
  });
}

export default app;
