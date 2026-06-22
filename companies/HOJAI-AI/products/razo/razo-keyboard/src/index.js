import { requireAuth } from '@rtmn/shared/auth';
/**
 * RAZO Keyboard - Communication OS
 * Port 4299
 *
 * The keyboard that thinks - transforms text into actionable intents
 */

const express = require('express');
const { requireEnv } = require('@rtmn/shared/lib/env');
const { installGracefulShutdown } = require('@rtmn/shared/lib/shutdown');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');

// Import modules
const IntentRouter = require('./intents/router');
const ChannelBridge = require('./channels/bridge');
const ContextEngine = require('./context/engine');
const ActionEngine = require('./actions/engine');
const intentRoutes = require('./routes/intents');
const messageRoutes = require('./routes/messages');
const sessionRoutes = require('./routes/sessions');
const webhookRoutes = require('./routes/webhooks');

const app = express();

// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
const PORT = process.env.PORT || 4299;

// Logger setup
const logger = {
  info: (msg, meta = {}) => console.log(`[${new Date().toISOString()}] INFO: ${msg}`, meta),
  error: (msg, meta = {}) => console.error(`[${new Date().toISOString()}] ERROR: ${msg}`, meta)
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

app.use(requireAuth);app.use(express.urlencoded({ extended: true }));

// Request ID middleware
app.use((req, res, next) => {
  req.requestId = req.headers['x-request-id'] || uuidv4();
  res.setHeader('X-Request-ID', req.requestId);
  next();
});

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // 100 requests per minute
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } }
});
app.use('/api/', limiter);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'razo-keyboard',
    port: PORT,
    timestamp: new Date().toISOString()
  });
});

// Readiness check
app.get('/ready', (req, res) => {
  res.json({
    ready: true,
    services: {
      intentRouter: true,
      channelBridge: true,
      contextEngine: true,
      actionEngine: true
    }
  });
});

// Initialize modules
const intentRouter = new IntentRouter(logger);
const channelBridge = new ChannelBridge(logger);
const contextEngine = new ContextEngine(logger);
const actionEngine = new ActionEngine(logger, {
  genieGateway: process.env.GENIE_GATEWAY_URL || 'http://localhost:4701',
  doApp: process.env.DO_APP_URL || 'http://localhost:3001',
  suttar: process.env.SUTAR_GATEWAY_URL || 'http://localhost:4140',
  copilot: process.env.COPILOT_URL || 'http://localhost:4600',
  corpid: process.env.CORPID_URL || 'http://localhost:4300'
});

// API Routes
app.use('/api/intent', intentRoutes(intentRouter, contextEngine));
app.use('/api/message', messageRoutes(channelBridge));
app.use('/api/session', sessionRoutes(contextEngine));
app.use('/api/webhook', webhookRoutes(channelBridge));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RAZO Keyboard',
    tagline: 'The Keyboard That Thinks',
    version: '1.0.0',
    port: PORT,
    endpoints: {
      health: '/health',
      intent: '/api/intent/detect',
      message: '/api/message/send',
      session: '/api/session/create',
      webhook: '/api/webhook/whatsapp'
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { requestId: req.requestId, error: err.message, stack: err.stack });
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred'
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.requestId
    }
  });
});

// Start server
const server = app.listen(PORT, () => {
  logger.info(`RAZO Keyboard started on port ${PORT}`);
  logger.info(`Intent Router: ${intentRouter.getStats()}`);
  logger.info(`Channel Bridge: Ready for WhatsApp, Telegram, SMS, Email`);
});
installGracefulShutdown(server);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  channelBridge.disconnect();
  process.exit(0);
});

module.exports = app;
