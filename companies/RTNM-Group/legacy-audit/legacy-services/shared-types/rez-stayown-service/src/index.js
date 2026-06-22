/**
 * rez-stayown-service
 * StayOwn Hotel integration for CorpPerks.
 * Uses StayOwn (ReZ's own Hotel OTA + PMS).
 */

require('dotenv').config();

// Sentry initialization
const Sentry = require('@sentry/node');
const { expressIntegration, setupExpressErrorHandler } = require('@sentry/node');
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [expressIntegration()],
  environment: process.env.NODE_ENV || 'development',
});

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const stayownRoutes = require('./routes/stayownRoutes');
const roomQRRoutes = require('./routes/room-qr-routes');

const app = express();

// Middleware
app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({
  origin: (process.env.CORS_ORIGIN || 'https://admin.rez.money').split(',').map((s) => s.trim()),
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());

// Logging middleware
app.use((req, res, next) => {
  logger.info([${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// Health endpoints
app.get('/health/live', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'rez-stayown-service' });
});

app.get('/health/ready', (req, res) => {
  res.status(200).json({ status: 'ready', service: 'rez-stayown-service' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'rez-stayown-service' });
});

app.get('/health/detailed', async (req, res) => {
  const checks = {};
  let isHealthy = true;

  // Check MongoDB with latency
  try {
    const mongoose = require('mongoose');
    const mongoStart = Date.now();
    if (mongoose.connection.readyState !== 1) throw new Error('not connected');
    await mongoose.connection.db.admin().ping();
    checks.database = { status: 'up', latencyMs: Date.now() - mongoStart };
  } catch (err) {
    checks.database = { status: 'down', error: err.message };
    isHealthy = false;
  }

  const overallStatus = isHealthy ? 'healthy' : 'unhealthy';
  res.status(overallStatus === 'healthy' ? 200 : 503).json({
    status: overallStatus,
    timestamp: new Date().toISOString(),
    version: process.env.SERVICE_VERSION || '1.0.0',
    uptime: process.uptime(),
    checks,
  });
});

// Routes
app.use('/api/hotels', stayownRoutes);
app.use('/api/room-qr', roomQRRoutes);

// Error handler
app.use((err, req, res, next) => {
  Sentry.captureException(err);
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '4015', 10);

const server = app.listen(PORT, () => {
  logger.info(rez-hotel-service running on :${PORT}`);
});

// Graceful shutdown
let isShuttingDown = false;
const shutdown = async (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.info([SHUTDOWN] ${signal}`);
  server.close(() => {
    console.log('[SHUTDOWN] Complete');
    process.exit(0);
  });
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

console.log('rez-hotel-service ready');
