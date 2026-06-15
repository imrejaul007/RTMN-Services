import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import logger from './utils/logger.js';
import store from './utils/store.js';

import authRoutes from './routes/auth.js';
import servicesRoutes from './routes/services.js';
import billingRoutes from './routes/billing.js';
import proxyRoutes from './routes/proxy.js';

const app = express();
const PORT = parseInt(process.env.PORT || '4399', 10);

// Trust proxy (Railway, Render, etc. all sit behind a proxy)
app.set('trust proxy', 1);

// Security & utility middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || true, credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));

// Rate limit (general)
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '60000', 10),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  standardHeaders: true,
  legacyHeaders: false
});
app.use(generalLimiter);

// Stricter limiter for auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/v1/auth/login', authLimiter);
app.use('/v1/auth/signup', authLimiter);

// Health & readiness
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'rtmn-pilot-onboarding',
    port: PORT,
    uptime: process.uptime(),
    stats: store.stats(),
    timestamp: new Date().toISOString()
  });
});

app.get('/', (req, res) => {
  res.json({
    service: 'RTMN Pilot Onboarding',
    docs: '/v1/services',
    endpoints: [
      'POST /v1/auth/signup',
      'GET  /v1/auth/verify/:token',
      'POST /v1/auth/login',
      'GET  /v1/auth/me',
      'GET  /v1/services',
      'POST /v1/services/select',
      'POST /v1/billing/checkout',
      'POST /v1/billing/mock-confirm/:paymentId  (dev only)',
      'POST /v1/billing/webhook                   (Stripe)',
      'ALL  /v1/proxy/:industry/*'
    ]
  });
});

// Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/services', servicesRoutes);
app.use('/v1/billing', billingRoutes);
app.use('/v1/proxy', proxyRoutes);

// 404
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 RTMN Pilot Onboarding listening on :${PORT}`);
  logger.info(`   Health: http://localhost:${PORT}/health`);
  logger.info(`   Catalog: 24 industry services available at /v1/services`);
});
