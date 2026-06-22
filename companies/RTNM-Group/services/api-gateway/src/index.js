/**
 * RTMN API Gateway
 * Unified entry point for all industry services
 */
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import winston from 'winston';
import { createProxyMiddleware } from 'http-proxy-middleware';

import authRoutes from './routes/auth.js';
import twinRoutes from './routes/twins.js';
import agentRoutes from './routes/agents.js';
import industryRoutes from './routes/industries.js';
import crmRoutes from './routes/crm.js';
import { authMiddleware } from './middleware/auth.js';
import { loggingMiddleware, errorHandler } from './middleware/logging.js';
import { serviceRegistry } from './services/serviceRegistry.js';
import { cacheMiddleware } from './middleware/cache.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting - 40 requests per 60 seconds
const limiter = rateLimit({
  windowMs: 60000,
  max: 40,
  message: { error: 'Rate limit exceeded. Max 40 requests per minute.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use('/api/', limiter);

// Logging
app.use(loggingMiddleware);

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: serviceRegistry.getStatus()
  });
});

// Service discovery
app.get('/services', (req, res) => {
  res.json(serviceRegistry.getAll());
});

// Auth routes (public)
app.use('/api/auth', authRoutes);

// Protected routes
app.use('/api/twins', authMiddleware, twinRoutes);
app.use('/api/agents', authMiddleware, agentRoutes);
app.use('/api/industries', authMiddleware, industryRoutes);
app.use('/api/crm', authMiddleware, crmRoutes);

// Industry-specific proxy routes
const industryProxies = {
  legal: process.env.LEGAL_OS_URL || 'http://localhost:3001',
  healthcare: process.env.HEALTHCARE_OS_URL || 'http://localhost:3002',
  finance: process.env.FINANCE_OS_URL || 'http://localhost:3003',
  retail: process.env.RETAIL_OS_URL || 'http://localhost:3004',
  education: process.env.EDUCATION_OS_URL || 'http://localhost:3005',
  manufacturing: process.env.MANUFACTURING_OS_URL || 'http://localhost:3006',
  realestate: process.env.REALESTATE_OS_URL || 'http://localhost:3007',
  travel: process.env.TRAVEL_OS_URL || 'http://localhost:3008',
  restaurant: process.env.RESTAURANT_OS_URL || 'http://localhost:3009',
  fitness: process.env.FITNESS_OS_URL || 'http://localhost:3010',
  automotive: process.env.AUTOMOTIVE_OS_URL || 'http://localhost:3011',
  entertainment: process.env.ENTERTAINMENT_OS_URL || 'http://localhost:3012',
  gaming: process.env.GAMING_OS_URL || 'http://localhost:3013',
  agriculture: process.env.AGRICULTURE_OS_URL || 'http://localhost:3014',
  construction: process.env.CONSTRUCTION_OS_URL || 'http://localhost:3015',
  beauty: process.env.BEAUTY_OS_URL || 'http://localhost:3016',
  fashion: process.env.FASHION_OS_URL || 'http://localhost:3017',
  sports: process.env.SPORTS_OS_URL || 'http://localhost:3018',
  government: process.env.GOVERNMENT_OS_URL || 'http://localhost:3019',
  homeservices: process.env.HOMESERVICES_OS_URL || 'http://localhost:3020',
  professional: process.env.PROFESSIONAL_OS_URL || 'http://localhost:3021',
  nonprofit: process.env.NONPROFIT_OS_URL || 'http://localhost:3022',
  media: process.env.MEDIA_OS_URL || 'http://localhost:3023',
  energy: process.env.ENERGY_OS_URL || 'http://localhost:3024'
};

// Create proxy for each industry
Object.entries(industryProxies).forEach(([industry, target]) => {
  app.use(`/api/v1/${industry}`, authMiddleware, cacheMiddleware, createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: { [`^/api/v1/${industry}`]: '' },
    onProxyReq: (proxyReq, req) => {
      proxyReq.setHeader('X-Industry', industry);
      proxyReq.setHeader('X-Request-Id', req.requestId);
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${industry}: ${err.message}`);
      res.status(503).json({ error: 'Service unavailable', industry });
    }
  }));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not found', path: req.path });
});

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  logger.info(`RTMN API Gateway started on port ${PORT}`);
  logger.info(`Registered services: ${serviceRegistry.getAll().length}`);
});

export default app;
