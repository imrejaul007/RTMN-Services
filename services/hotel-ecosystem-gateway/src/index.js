/**
 * Hotel Ecosystem Gateway
 *
 * Unified API Gateway that connects:
 * - RTMN-OS (Hotel OS)
 * - REZ-Merchant (Mind Hotel, Booking)
 * - StayOwn-Hospitality (OTA, PMS)
 *
 * This gateway provides:
 * - Single entry point for all hotel operations
 * - Unified authentication
 * - Event publishing to Event Bus
 * - Cross-service data aggregation
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import winston from 'winston';
import { createClient } from 'redis';

// Routes
import hotelRoutes from './routes/hotel.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import guestRoutes from './routes/guest.routes.js';
import serviceRoutes from './routes/service.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';
import walletRoutes from './routes/wallet.routes.js';

// Services
import { EventPublisher } from './services/eventPublisher.js';
import { ServiceRegistry } from './services/serviceRegistry.js';

// Load environment
dotenv.config();

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Configuration - Load from env with fallback to DEV_ vars
const config = {
  PORT: process.env.PORT || 4950,
  NODE_ENV: process.env.NODE_ENV || 'development',

  // RTMN-OS Services
  HOTEL_OS_URL: process.env.HOTEL_OS_URL || process.env.DEV_HOTEL_OS_URL || 'http://localhost:5025',

  // REZ-Merchant Services
  REZ_MERCHANT_URL: process.env.REZ_MERCHANT_URL || process.env.DEV_REZ_MERCHANT_URL || 'http://localhost:4800',
  REZ_BOOKING_URL: process.env.REZ_BOOKING_URL || process.env.DEV_REZ_BOOKING_URL || 'http://localhost:4015',
  REZ_MIND_HOTEL_URL: process.env.REZ_MIND_HOTEL_URL || process.env.DEV_REZ_MIND_HOTEL_URL || 'http://localhost:4017',
  REZ_WALLET_URL: process.env.REZ_WALLET_URL || process.env.DEV_REZ_WALLET_URL || 'http://localhost:4004',

  // StayOwn Services
  STAYOWN_API_URL: process.env.STAYOWN_API_URL || process.env.DEV_STAYOWN_API_URL || 'http://localhost:3000',
  STAYOWN_OTA_WEB_URL: process.env.STAYOWN_OTA_WEB_URL || process.env.DEV_STAYOWN_OTA_WEB_URL || 'http://localhost:3003',
  STAYOWN_HOTEL_PANEL_URL: process.env.STAYOWN_HOTEL_PANEL_URL || process.env.DEV_STAYOWN_HOTEL_PANEL_URL || 'http://localhost:3001',

  // Integration Hub
  EVENT_BUS_URL: process.env.EVENT_BUS_URL || process.env.DEV_EVENT_BUS_URL || 'http://localhost:4510',
  SERVICE_REGISTRY_URL: process.env.SERVICE_REGISTRY_URL || process.env.DEV_SERVICE_REGISTRY_URL || 'http://localhost:4399',

  // RTMN Foundation
  CORPID_URL: process.env.CORPID_URL || process.env.DEV_CORPID_URL || 'http://localhost:4702',
  MEMORY_OS_URL: process.env.MEMORY_OS_URL || process.env.DEV_MEMORY_OS_URL || 'http://localhost:4703',
  TWIN_OS_HUB_URL: process.env.TWIN_OS_HUB_URL || process.env.DEV_TWIN_OS_HUB_URL || 'http://localhost:4705',

  // Redis for caching
  REDIS_URL: process.env.REDIS_URL || process.env.DEV_REDIS_URL || 'redis://localhost:6379',
};

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:3003'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  logger.info({
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip
  });
  next();
});

// Initialize services
let eventPublisher = null;
let serviceRegistry = null;
let redisClient = null;

async function initializeServices() {
  try {
    // Initialize Redis
    try {
      redisClient = createClient({ url: config.REDIS_URL });
      await redisClient.connect();
      logger.info('Redis connected');
    } catch (err) {
      logger.warn('Redis not available, continuing without cache');
    }

    // Initialize Event Publisher
    eventPublisher = new EventPublisher(config.EVENT_BUS_URL, logger);
    await eventPublisher.connect();

    // Initialize Service Registry
    serviceRegistry = new ServiceRegistry(config.SERVICE_REGISTRY_URL, logger);
    await serviceRegistry.register('hotel-ecosystem-gateway', config.PORT);

    logger.info('All services initialized');
  } catch (err) {
    logger.error('Failed to initialize services:', err);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'hotel-ecosystem-gateway',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    connected_services: {
      hotel_os: config.HOTEL_OS_URL,
      rez_merchant: config.REZ_MERCHANT_URL,
      stayown: config.STAYOWN_API_URL,
      event_bus: config.EVENT_BUS_URL
    }
  });
});

// Service status endpoint
app.get('/api/status', async (req, res) => {
  try {
    const status = {
      gateway: 'healthy',
      services: {},
      timestamp: new Date().toISOString()
    };

    // Check each service
    const serviceChecks = [
      { name: 'hotel_os', url: `${config.HOTEL_OS_URL}/health` },
      { name: 'rez_merchant', url: `${config.REZ_MERCHANT_URL}/health` },
      { name: 'stayown_api', url: `${config.STAYOWN_API_URL}/health` },
      { name: 'event_bus', url: `${config.EVENT_BUS_URL}/health` },
    ];

    for (const check of serviceChecks) {
      try {
        const response = await fetch(check.url);
        status.services[check.name] = {
          status: response.ok ? 'healthy' : 'degraded',
          url: check.url
        };
      } catch (err) {
        status.services[check.name] = {
          status: 'unhealthy',
          url: check.url,
          error: err.message
        };
      }
    }

    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Mount routes
app.use('/api/hotels', hotelRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/guests', guestRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/wallet', walletRoutes);

// RTMN Foundation routes
app.get('/api/twins/:type', async (req, res) => {
  try {
    const { type } = req.params;
    const response = await fetch(`${config.TWIN_OS_HUB_URL}/api/twins/${type}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Memory routes
app.post('/api/memory/store', async (req, res) => {
  try {
    const response = await fetch(`${config.MEMORY_OS_URL}/api/memory`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/memory/:type/:entityId', async (req, res) => {
  try {
    const { type, entityId } = req.params;
    const response = await fetch(`${config.MEMORY_OS_URL}/api/memory/${type}/${entityId}`);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Identity verification
app.post('/api/identity/verify', async (req, res) => {
  try {
    const response = await fetch(`${config.CORPID_URL}/api/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: req.path
  });

  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    path: req.path
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Start server
async function start() {
  await initializeServices();

  app.listen(config.PORT, () => {
    logger.info(`Hotel Ecosystem Gateway running on port ${config.PORT}`);
    logger.info(`Environment: ${config.NODE_ENV}`);
    logger.info('Connected services:', {
      hotel_os: config.HOTEL_OS_URL,
      rez_merchant: config.REZ_MERCHANT_URL,
      stayown: config.STAYOWN_API_URL
    });
  });
}

start();

export { app, config, eventPublisher, logger };
