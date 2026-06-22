import 'dotenv/config';
import express from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import { requireAuth } from '@rtmn/shared/auth';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from './utils/logger.js';
import store from './utils/store.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import authRoutes from './routes/auth.js';
import servicesRoutes from './routes/services.js';
import billingRoutes from './routes/billing.js';
import proxyRoutes from './routes/proxy.js';

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = parseInt(process.env.PORT || '4399', 10);

// Trust proxy (Railway, Render, etc. all sit behind a proxy)
app.set('trust proxy', 1);

// Security & utility middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || true, credentials: true }));
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '1mb' }));


app.use(requireAuth);// Rate limit (general)
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
  res.sendFile(path.join(__dirname, '..', 'public', 'dashboard.html'));
});

// Routes
app.use('/v1/auth', authRoutes);
app.use('/v1/services', servicesRoutes);
app.use('/v1/billing', billingRoutes);
app.use('/v1/proxy', proxyRoutes);

// 404
app.use((req, res, next) => {
  // Serve static files from public/ (dashboard.html)
  if (req.method === 'GET' && !req.path.startsWith('/v1/')) {
    const filePath = path.join(__dirname, '..', 'public', req.path === '/' ? 'dashboard.html' : req.path);
    return res.sendFile(filePath, err => {
      if (err) next(); // fall through to 404
    });
  }
  next();
});
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
  res.status(500).json({ error: 'Internal server error' });
});
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 RTMN Pilot Onboarding listening on :${PORT}`);
  logger.info(`   Health: http://localhost:${PORT}/health`);
  logger.info(`   Catalog: 24 industry services available at /v1/services`);
});
installGracefulShutdown(server);
