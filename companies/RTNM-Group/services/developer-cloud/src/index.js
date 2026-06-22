/**
 * RTMN Developer Cloud
 *
 * Unified API platform for RTMN ecosystem.
 * Provides SDKs, documentation, and API gateway for developers.
 *
 * Port: 3040
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';

import apisRoutes from './routes/apis.js';
import sdkRoutes from './routes/sdk.js';
import docsRoutes from './routes/docs.js';
import authRoutes from './routes/auth.js';

const app = express();
const PORT = process.env.PORT || 3040;

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// API Categories
export const API_CATEGORIES = {
  CORE: 'core',
  INDUSTRY: 'industry',
  PLATFORM: 'platform',
  DATA: 'data',
  AI: 'ai'
};

// Plan Types
export const PLAN_TYPES = {
  FREE: 'free',
  STARTER: 'starter',
  PROFESSIONAL: 'professional',
  ENTERPRISE: 'enterprise'
};

// Rate Limits
export const RATE_LIMITS = {
  free: { requests: 1000, window: 'minute' },
  starter: { requests: 10000, window: 'minute' },
  professional: { requests: 100000, window: 'minute' },
  enterprise: { requests: Infinity, window: 'minute' }
};

// API Registry
export const apiRegistry = new Map();

// Developer Registry
export const developerRegistry = new Map();

// Initialize default APIs
function initializeAPIs() {
  const apis = [
    { id: 'capability-matrix', name: 'Capability Matrix', category: API_CATEGORIES.CORE, version: '1.0' },
    { id: 'unified-twin', name: 'Unified Twin', category: API_CATEGORIES.CORE, version: '1.0' },
    { id: 'memory-network', name: 'Memory Network', category: API_CATEGORIES.CORE, version: '1.0' },
    { id: 'boa-council', name: 'BOA Council', category: API_CATEGORIES.CORE, version: '1.0' },
    { id: 'economic-graph', name: 'Economic Graph', category: API_CATEGORIES.DATA, version: '1.0' },
    { id: 'simulation', name: 'Simulation OS', category: API_CATEGORIES.AI, version: '1.0' },
    { id: 'marketing', name: 'Marketing OS', category: API_CATEGORIES.PLATFORM, version: '1.0' },
    { id: 'workforce', name: 'Workforce OS', category: API_CATEGORIES.PLATFORM, version: '1.0' },
    { id: 'commerce', name: 'Commerce OS', category: API_CATEGORIES.PLATFORM, version: '1.0' },
    { id: 'finance', name: 'Finance OS', category: API_CATEGORIES.PLATFORM, version: '1.0' }
  ];

  for (const api of apis) {
    apiRegistry.set(api.id, {
      ...api,
      status: 'active',
      endpoints: generateEndpoints(api.id),
      createdAt: new Date().toISOString()
    });
  }

  logger.info(`Initialized ${apis.length} APIs`);
}

function generateEndpoints(apiId) {
  return [
    { path: `/${apiId}/health`, method: 'GET', description: 'Service health check' },
    { path: `/${apiId}/status`, method: 'GET', description: 'Service status' }
  ];
}

initializeAPIs();

export { logger };

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info({
      method: req.method,
      path: req.path,
      duration: Date.now() - start,
      status: res.statusCode
    });
  });
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'developer-cloud',
    version: '1.0.0',
    port: PORT,
    apis: apiRegistry.size,
    developers: developerRegistry.size,
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RTMN Developer Cloud',
    version: '1.0.0',
    description: 'Unified API platform for RTMN ecosystem',
    port: PORT,
    capabilities: [
      'Unified API gateway',
      'Multi-language SDKs',
      'Interactive documentation',
      'API key management'
    ],
    endpoints: [
      'GET /api/apis',
      'GET /api/sdk',
      'GET /api/docs',
      'POST /api/auth/token'
    ]
  });
});

// Routes
app.use('/api/apis', apisRoutes);
app.use('/api/sdk', sdkRoutes);
app.use('/api/docs', docsRoutes);
app.use('/api/auth', authRoutes);

app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  logger.info(`Developer Cloud running on port ${PORT}`);
  logger.info(`${apiRegistry.size} APIs available`);
});

export { app };
