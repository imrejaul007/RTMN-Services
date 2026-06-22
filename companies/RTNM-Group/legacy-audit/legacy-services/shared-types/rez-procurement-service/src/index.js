/**
 * rez-procurement-service
 * Procurement service for NextaBizz integration.
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
const nextabizzRoutes = require('./routes/nextabizzRoutes');

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
  res.status(200).json({ status: 'ok', service: 'rez-procurement-service' });
});

app.get('/health/ready', (req, res) => {
  res.status(200).json({ status: 'ready', service: 'rez-procurement-service' });
});

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', service: 'rez-procurement-service' });
});

// Routes
app.use('/api/nextabizz', nextabizzRoutes);

// Error handler
app.use((err, req, res, next) => {
  Sentry.captureException(err);
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

const PORT = parseInt(process.env.PORT || '4012', 10);

const server = app.listen(PORT, () => {
  logger.info(rez-procurement-service running on :${PORT}`);
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

console.log('rez-procurement-service ready');
