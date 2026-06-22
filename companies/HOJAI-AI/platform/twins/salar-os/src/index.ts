/**
 * Salar OS - Workforce Intelligence Service
 *
 * The Workforce Intelligence Network
 *
 * Modules:
 * - Capability Registry: Maps capabilities to humans, agents, teams
 * - Agent Twin: Digital twin for AI agents
 * - Human Twin: Digital twin for employees
 * - Hybrid Twin: Digital twin for human-agent teams
 * - Sutar Bridge: Integration with Sutar Decision Engine
 */

import express, { Request, Response, NextFunction } from 'express';
import { PersistentMap } from '@rtmn/shared/lib/persistent-map';
import { requireEnv } from '@rtmn/shared/lib/env';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'crypto';
import { createLogger } from '@rtmn/shared/lib/logger';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import {
  tryVerify as sharedTryVerify,
  timingSafeEqual as sharedTimingSafeEqual,
} from '@rtmn/security-shared';

const logger = createLogger('salar-os');

// SECURITY FIX (HOJAI C-3): Read JWT secret from environment. Production
// requires that JWT_SECRET (shared with CorpID token issuer) is present.
const JWT_SECRET_PRESENT = !!process.env.JWT_SECRET;
if (process.env.NODE_ENV === 'production' && !JWT_SECRET_PRESENT) {
  throw new Error(
    '[salar-os] JWT_SECRET must be set in production (must match the ' +
    'CorpID token issuer secret so issued tokens can be verified).'
  );
}

// Import modules
import { capabilityRouter, Capability, CapabilityMapping } from './modules/capabilityRegistry.js';
import { agentTwinRouter, AgentTwin, InteractionLog } from './modules/agentTwin.js';
import { hybridTwinRouter, HybridTeamTwin, HumanTwin } from './modules/hybridTwin.js';
import { salarSutarBridgeRouter } from './modules/salarSutarBridge.js';
import { seederRouter } from './modules/aiEmployeeSeeder.js';
import { integrationRouter } from './modules/integrationScripts.js';
import { aiEmployeeLLMRouter } from './modules/aiEmployeeLLM.js';
import { organizationTwinRouter } from './modules/organizationTwin.js';
import { vectorStoreRouter } from './modules/vectorStore.js';
import { paymentRouter } from './modules/paymentIntegration.js';
import { mlPipelineRouter } from './modules/mlTrainingPipeline.js';
import { sadaTrustRouter } from './modules/sadaTrustIntegration.js';
import { dataConnectorsRouter } from './modules/dataConnectors.js';

const app = express();


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
// Middleware
app.use(helmet());
// SECURITY FIX (HOJAI hardening): avoid wildcard origin with credentials.
// In dev (no ALLOWED_ORIGINS set), fall back to permissive single-origin
// config without credentials. Production requires explicit allow-list.
const _allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || [];
app.use(cors({
  origin: _allowedOrigins.length ? _allowedOrigins : (process.env.NODE_ENV === 'production' ? false : true),
  credentials: _allowedOrigins.length > 0,
}));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } }
}));

// Config
const PORT = parseInt(process.env.PORT || '4297', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/salaros';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;

if (IS_PRODUCTION && !INTERNAL_TOKEN) {
  throw new Error('INTERNAL_SERVICE_TOKEN must be set in production');
}

// CorpID Services
const CORPID_URL = process.env.CORPID_SERVICE_URL || 'http://localhost:4702';
const ASSERTION_URL = process.env.ASSERTION_SERVICE_URL || 'http://localhost:4707';
const AGENT_REGISTRY_URL = process.env.AGENT_REGISTRY_URL || 'http://localhost:4708';

function generateId(prefix: string = 'SAL'): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`;
}

/**
 * SECURITY FIX (HOJAI C-3): Now actually verifies the JWT signature,
 * issuer, and audience using @rtmn/security-shared. The previous
 * implementation only checked for the presence of a Bearer header.
 *
 * For service-to-service calls, uses timing-safe comparison against
 * INTERNAL_SERVICE_TOKEN (no fallback in production).
 */
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Service-to-service: timing-safe compare against INTERNAL_TOKEN
  const presented = req.headers['x-internal-token'];
  if (presented && INTERNAL_TOKEN) {
    if (sharedTimingSafeEqual(String(presented), INTERNAL_TOKEN)) {
      (req as any).isInternalCall = true;
      (req as any).user = { id: 'system', role: 'service', internal: true };
      return next();
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid internal token',
    });
  }

  // 2. User-facing: verify the JWT signature, issuer, audience, expiry.
  //    Tokens are issued by CorpID with issuer='rtmn-corpid' (default).
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const decoded = sharedTryVerify(token, {
      issuer: 'rtmn-corpid',
      audience: 'rtmn-api',
    });
    if (decoded) {
      (req as any).user = {
        id: decoded.sub || decoded.userId,
        role: decoded.role || 'user',
        organizationId: decoded.organizationId,
        permissions: decoded.permissions || [],
        ...decoded,
      };
      return next();
    }
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid or expired token',
    });
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'Provide either x-internal-token header or Authorization: Bearer <jwt>',
  });
}

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'salar-os',
    version: '2.0',
    timestamp: new Date().toISOString(),
    modules: [
      'capability-registry',
      'agent-twin',
      'human-twin',
      'hybrid-twin',
      'sutar-bridge',
    ],
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({
      status: 'ready',
      mongodb: dbState,
    });
  } catch (error) {
    res.status(503).json({ status: 'not_ready', error: 'MongoDB check failed' });
  }
});

// ============================================================================
// INFO
// ============================================================================

app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'Salar OS',
    description: 'Workforce Intelligence Network',
    version: '2.0',
    tagline: 'Understand what humans and AI agents know, can do, should do, and are trusted to do.',
    modules: {
      'capability-registry': {
        description: 'Maps capabilities to humans, agents, teams',
        endpoints: [
          'POST /capabilities/init',
          'GET /capabilities',
          'POST /capabilities/mappings',
          'POST /capabilities/mappings/find',
          'GET /capabilities/matrix',
        ],
      },
      'agent-twin': {
        description: 'Digital twin for AI agents',
        endpoints: [
          'POST /agent-twin',
          'GET /agent-twin/:agentId',
          'POST /agent-twin/:agentId/task',
          'POST /agent-twin/find',
        ],
      },
      'human-twin': {
        description: 'Digital twin for employees',
        endpoints: [
          'POST /human-twin',
          'GET /human-twin/:id',
          'POST /human-twin/:id/delegate',
          'GET /human-twin',
        ],
      },
      'hybrid-twin': {
        description: 'Digital twin for human-agent teams',
        endpoints: [
          'POST /hybrid-team',
          'POST /hybrid-team/find-optimal',
          'GET /hybrid-team',
          'GET /network',
        ],
      },
      'sutar-bridge': {
        description: 'Integration with Sutar Decision Engine',
        endpoints: [
          'POST /sutar/bridge/workforce-decision',
          'POST /sutar/bridge/outcome',
          'POST /sutar/bridge/capability-check',
          'POST /sutar/bridge/simulation',
        ],
      },
    },
    docs: '/docs',
  });
});

// ============================================================================
// MOUNT MODULES
// ============================================================================

app.use('/capabilities', authMiddleware, capabilityRouter);
app.use('/agent-twin', authMiddleware, agentTwinRouter);
app.use('/human-twin', authMiddleware, hybridTwinRouter);
app.use('/hybrid-team', authMiddleware, hybridTwinRouter);
app.use('/hybrid-twin', authMiddleware, hybridTwinRouter);
app.use('/sutar', authMiddleware, salarSutarBridgeRouter);
app.use('/seed', authMiddleware, seederRouter);
app.use('/integrations', authMiddleware, integrationRouter);
app.use('/ai-employee-llm', authMiddleware, aiEmployeeLLMRouter);
app.use('/organization-twin', authMiddleware, organizationTwinRouter);
app.use('/vector', authMiddleware, vectorStoreRouter);
app.use('/payments', authMiddleware, paymentRouter);
app.use('/ml', authMiddleware, mlPipelineRouter);
app.use('/connectors', authMiddleware, dataConnectorsRouter);
app.use('/sada-trust', authMiddleware, sadaTrustRouter);

// ============================================================================
// WORKFORCE TWIN NETWORK AGGREGATE ENDPOINT
// ============================================================================

app.get('/network', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const [humanCount, agentCount, hybridCount] = await Promise.all([
      HumanTwin.countDocuments({ 'health.status': 'ACTIVE' }),
      AgentTwin.countDocuments({ 'health.status': 'ACTIVE' }),
      HybridTeamTwin.countDocuments({ 'health.status': 'ACTIVE' }),
    ]);

    const [capabilityCount, mappingCount] = await Promise.all([
      Capability.countDocuments(),
      CapabilityMapping.countDocuments({ status: 'ACTIVE' }),
    ]);

    res.json({
      success: true,
      data: {
        network: {
          status: 'ACTIVE',
          entities: {
            humans: humanCount,
            agents: agentCount,
            hybridTeams: hybridCount,
            total: humanCount + agentCount + hybridCount,
          },
          capabilities: {
            defined: capabilityCount,
            mapped: mappingCount,
          },
        },
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error fetching network status:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch network status' },
    });
  }
});

// ============================================================================
// WORKFORCE TWIN FIND
// ============================================================================

app.post('/workforce/find', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { task, capabilities, preferHuman, allowHybrid, budget } = req.body;

    const capabilityMappings = await CapabilityMapping.find({
      'capabilityId': { $in: capabilities || [] },
      status: 'ACTIVE',
    }).lean();

    const entityMap = new PersistentMap('entity-map', { serviceName: 'salar-os' });
    for (const mapping of capabilityMappings) {
      if (!entityMap.has(mapping.entityId)) {
        entityMap.set(mapping.entityId, {
          entityId: mapping.entityId,
          entityType: mapping.entityType,
          capabilities: [],
          totalConfidence: 0,
        });
      }
      const entry = entityMap.get(mapping.entityId);
      entry.capabilities.push(mapping);
      entry.totalConfidence += mapping.metrics?.confidence || 0.5;
    }

    const candidates = Array.from(entityMap.values())
      .map(e => ({
        ...e,
        score: e.totalConfidence / (e.capabilities.length || 1),
      }))
      .sort((a, b) => b.score - a.score);

    const humans = candidates.filter(c => c.entityType === 'HUMAN').slice(0, 5);
    const agents = candidates.filter(c => c.entityType === 'AGENT').slice(0, 5);

    let hybridRecommendation = null;
    if (allowHybrid && humans.length > 0 && agents.length > 0) {
      hybridRecommendation = {
        description: 'Hybrid team recommended for optimal results',
        humans: humans.slice(0, 2),
        agents: agents.slice(0, 2),
      };
    }

    res.json({
      success: true,
      data: {
        task,
        capabilities,
        candidates: { humans, agents },
        hybridRecommendation,
        totalCandidates: candidates.length,
      },
    });
  } catch (error) {
    logger.error('Error finding workforce:', error);
    res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to find workforce' },
    });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: err.message },
  });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Endpoint not found' },
  });
});

// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB at', MONGODB_URI);

    try {
      await Capability.createIndexes();
      await CapabilityMapping.createIndexes();
      await AgentTwin.createIndexes();
      await HumanTwin.createIndexes();
      await HybridTeamTwin.createIndexes();
      logger.info('Indexes created');
    } catch (indexError) {
      logger.warn('Some indexes may already exist:', indexError);
    }
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



    const server = app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                           ║
║   Salar OS - Workforce Intelligence Network             ║
║                                                           ║
║   Port: ${PORT}                                         ║
║                                                           ║
║   Modules:                                             ║
║   • Capability Registry                                ║
║   • Agent Twin                                        ║
║   • Human Twin                                        ║
║   • Hybrid Twin                                       ║
║   • Sutar Bridge                                      ║
║                                                           ║
║   Docs: http://localhost:${PORT}/                           ║
║                                                           ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
    installGracefulShutdown(server);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

export default app;
