/**
 * RTMN Unified Twin Architecture
 *
 * Provides unified taxonomy for all digital twins:
 * - Human Twin (Customer, Employee, Patient, Guest)
 * - Business Twin (Store, Restaurant, Hotel, Clinic)
 * - Asset Twin (Property, Vehicle, Equipment)
 * - Market Twin (Competitor, Region, Demand)
 * - Agent Twin (AI Workers)
 * - Relationship Twin (Connections between twins)
 *
 * Port: 3014
 */

import express from 'express';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import cors from 'cors';
import helmet from 'helmet';
import { v4 as uuidv4 } from 'uuid';
import winston from 'winston';
import Redis from 'ioredis';

// Routes
import taxonomyRoutes from './routes/taxonomy.js';
import twinRoutes from './routes/twins.js';
import federationRoutes from './routes/federation.js';

const app = express();

// ── Internal Auth ────────────────────────────────────────────────
function requireInternal(req, res, next) {
  const token = req.headers['x-internal-token'];
  const expected = process.env.INTERNAL_SERVICE_TOKEN;
  if (token && expected && token === expected) {
    req.user = { type: 'service', id: 'internal' };
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized' });
}

const PORT = process.env.PORT || 3014;

// Logger setup
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [new winston.transports.Console()]
});

// Redis connection
const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

// Twin Types - Unified Taxonomy
export const TWIN_TYPES = {
  HUMAN: 'human',             // Customer, Employee, Patient, Guest
  BUSINESS: 'business',       // Store, Restaurant, Hotel, Clinic
  ASSET: 'asset',            // Property, Vehicle, Equipment
  MARKET: 'market',           // Competitor, Region, Demand
  AGENT: 'agent',            // AI Workers
  RELATIONSHIP: 'relationship' // Connections between twins
};

// Human Subtypes
export const HUMAN_SUBTYPES = {
  CUSTOMER: 'customer',
  EMPLOYEE: 'employee',
  PATIENT: 'patient',
  GUEST: 'guest',
  MEMBER: 'member',
  USER: 'user'
};

// Business Subtypes
export const BUSINESS_SUBTYPES = {
  STORE: 'store',
  RESTAURANT: 'restaurant',
  HOTEL: 'hotel',
  CLINIC: 'clinic',
  SALON: 'salon',
  GYM: 'gym',
  OFFICE: 'office',
  WAREHOUSE: 'warehouse'
};

// Asset Subtypes
export const ASSET_SUBTYPES = {
  PROPERTY: 'property',
  VEHICLE: 'vehicle',
  EQUIPMENT: 'equipment',
  INVENTORY: 'inventory',
  MACHINE: 'machine'
};

// Market Subtypes
export const MARKET_SUBTYPES = {
  COMPETITOR: 'competitor',
  REGION: 'region',
  DEMAND: 'demand',
  SUPPLY: 'supply',
  TREND: 'trend'
};

// Agent Subtypes
export const AGENT_SUBTYPES = {
  AI_WORKER: 'ai_worker',
  AI_MANAGER: 'ai_manager',
  AI_SPECIALIST: 'ai_specialist'
};

// Relationship Types
export const RELATIONSHIP_TYPES = {
  OWNS: 'owns',
  WORKS_AT: 'works_at',
  CUSTOMER_OF: 'customer_of',
  PARTNER: 'partner',
  SUPPLIER: 'supplier',
  COMPETES_WITH: 'competes_with',
  LOCATED_IN: 'located_in'
};

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
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
app.get('/health', async (req, res) => {
  try {
    await redis.ping();
    res.json({
      status: 'healthy',
      service: 'unified-twin-os',
      version: '1.0.0',
      port: PORT,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'RTMN Unified Twin Architecture',
    version: '1.0.0',
    description: 'Unified taxonomy for all digital twins',
    port: PORT,
    twinTypes: Object.values(TWIN_TYPES),
    subtypes: {
      human: Object.values(HUMAN_SUBTYPES),
      business: Object.values(BUSINESS_SUBTYPES),
      asset: Object.values(ASSET_SUBTYPES),
      market: Object.values(MARKET_SUBTYPES),
      agent: Object.values(AGENT_SUBTYPES)
    },
    endpoints: [
      'GET /api/taxonomy',
      'POST /api/twins',
      'GET /api/twins/:id',
      'GET /api/twins/type/:type',
      'POST /api/twins/federate',
      'GET /api/twins/:id/related',
      'POST /api/relationships'
    ]
  });
});

// Routes
app.use('/api/taxonomy', taxonomyRoutes);
app.use('/api/twins', twinRoutes);
app.use('/api/relationships', federationRoutes);

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  res.status(500).json({ error: err.message });
});

// Start server
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});


const server = app.listen(PORT, () => {
  logger.info(`Unified Twin Architecture running on port ${PORT}`);
});
installGracefulShutdown(server);

export { app, redis, logger };
