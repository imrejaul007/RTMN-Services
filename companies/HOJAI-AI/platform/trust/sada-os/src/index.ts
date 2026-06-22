import { createLogger } from '@rtmn/shared/lib/logger';
import {
  verify as sharedVerify,
  tryVerify,
  timingSafeEqual,
} from '@rtmn/security-shared';
/**
 * SADA - Trust, Governance & Risk Platform
 *
 * Unified trust infrastructure for RTMN ecosystem
 * Port: 4190
 *
 * SECURITY FIX (HOJAI C-2): The authMiddleware below now actually
 * verifies JWT signatures against CorpID's public key, instead of
 * trusting the Bearer header presence. The TODO at the old line 71
 * has been implemented.
 */

import express, { Request, Response, NextFunction } from 'express';
import { requireEnv } from '@rtmn/shared/lib/env';
import { installGracefulShutdown } from '@rtmn/shared/lib/shutdown';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { randomBytes } from 'crypto';

// Import models
import { TrustScore, TrustHistory, TrustRelationship } from './models/trustScore.js';
import { Policy, PolicyViolation, ComplianceCheck, AuditLog } from './models/policy.js';
import { RiskAssessment, FraudAlert, RiskLimit, AnomalyModel } from './models/risk.js';
import { Verification, VerificationProvider, VerificationAudit } from './models/verification.js';

// Import the rich trust router (was orphaned before the move to HOJAI-AI)
import { trustRouter } from './modules/trustService.js';

const logger = createLogger('sada-os');

const app = express();


// Validate required env at startup
requireEnv(['PORT'], { allowDev: true });
// Middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') || '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('combined'));

// Rate limiting
app.use(rateLimit({ windowMs: 60 * 1000, max: 100 }));

// Config
const PORT = parseInt(process.env.PORT || '4190', 10);
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sada';
const SADA_REQUIRE_AUTH = (process.env.SADA_REQUIRE_AUTH ?? 'true').toLowerCase() !== 'false';
// SECURITY FIX (HOJAI C-5): No hardcoded fallback for the internal
// token. SADA OS now refuses to start in production if
// INTERNAL_SERVICE_TOKEN is missing or shorter than 32 bytes.
const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN;
if (process.env.NODE_ENV === 'production' &&
    (!INTERNAL_TOKEN || INTERNAL_TOKEN.length < 32)) {
  throw new Error(
    '[sada-os] INTERNAL_SERVICE_TOKEN must be set (>= 32 chars) in production. ' +
    'No insecure fallback is permitted.'
  );
}
// Always log the service token fingerprint at boot so test scripts can find it
if (INTERNAL_TOKEN) {
  logger.info('[sada-os] internal service token fingerprint:', INTERNAL_TOKEN.slice(0, 8) + '...');
}

// Connected services
const CORPID_URL = process.env.CORPID_SERVICE_URL || 'http://localhost:4702';
const SALAR_URL = process.env.SALAR_SERVICE_URL || 'http://localhost:4710';

// ============================================================================
// HELPERS
// ============================================================================

function generateId(prefix: string = 'SADA'): string {
  return `${prefix}-${randomBytes(4).toString('hex').toUpperCase()}-${Date.now().toString(36)}`;
}

/**
 * SECURITY FIX (HOJAI C-2): Now actually verifies the JWT signature,
 * issuer, and audience using @rtmn/security-shared. The previous
 * implementation only checked for the presence of a Bearer header.
 *
 * For service-to-service calls, uses timing-safe comparison against
 * INTERNAL_SERVICE_TOKEN (no fallback in production).
 *
 * Bypass: when SADA_REQUIRE_AUTH=false (set by dev-stack.sh for local dev),
 * the middleware is a no-op. Production must keep SADA_REQUIRE_AUTH unset
 * or true.
 */
function authMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!SADA_REQUIRE_AUTH) {
    (req as any).user = { id: 'dev-bypass', role: 'service', internal: true };
    return next();
  }
  // 1. Service-to-service: timing-safe compare against INTERNAL_TOKEN
  const presented = req.headers['x-internal-token'];
  if (presented && INTERNAL_TOKEN) {
    if (timingSafeEqual(String(presented), INTERNAL_TOKEN)) {
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
    const decoded = tryVerify(token, { issuer: 'rtmn-corpid', audience: 'rtmn-api' });
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
// HEALTH& INFO
// ============================================================================

app.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'SADA',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    modules: ['trust', 'governance', 'risk', 'verification'],
  });
});

app.get('/health/live', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/health/ready', async (_req: Request, res: Response) => {
  try {
    const dbState = mongoose.connection.readyState === 1 ? 'connected' : 'disconnected';
    res.json({ status: 'ready', mongodb: dbState });
  } catch (error) {
    res.status(503).json({ status: 'not_ready' });
  }
});

app.get('/', (_req: Request, res: Response) => {
  res.json({
    service: 'SADA',
    description: 'Trust, Governance & Risk Platform',
    version: '1.0.0',
    port: PORT,
    modules: {
      trust: { endpoints: ['/trust', '/trust/:entityId', '/trust/:entityId/activity'] },
      governance: { endpoints: ['/governance/policies', '/governance/validate'] },
      risk: { endpoints: ['/risk/assess', '/risk/:entityId'] },
      verification: { endpoints: ['/verification', '/verification/:entityId'] },
    },
  });
});

// ============================================================================
// TRUST SERVICE
// ============================================================================

// ============================================================================
// TRUST ROUTER (modules/trustService.ts)
// Wires the richer trust router that was orphaned before the move to HOJAI-AI.
// Exposed at /trust/v2 to keep backward compatibility with the inline routes below.
// ============================================================================
app.use('/trust/v2', authMiddleware, trustRouter);

/**
 * Create or get trust score
 * POST /trust
 */
app.post('/trust', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId, entityType, initialScore } = req.body;

    if (!entityId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'entityId required' },
      });
    }

    let trust = await TrustScore.findOne({ entityId }).lean();

    if (!trust) {
      const newTrust = new TrustScore({
        trustId: generateId('TRUST'),
        entityId,
        entityType: entityType || 'HUMAN',
        overallScore: initialScore || 50,
        dimensions: {
          reliability: initialScore || 50,
          quality: initialScore || 50,
          responsiveness: initialScore || 50,
          safety: initialScore || 50,
          compliance: initialScore || 50,
          financial: 50,
          technical: 50,
          social: 50,
        },
        history: {
          totalTransactions: 0,
          successfulTransactions: 0,
          failedTransactions: 0,
          disputedTransactions: 0,
          totalVolume: 0,
          avgResponseTime: 0,
          lastActivity: new Date(),
          firstActivity: new Date(),
        },
        riskLevel: 'MEDIUM',
        status: 'ACTIVE',
      });
      await newTrust.save();
      trust = newTrust.toObject();
    }

    res.json({ success: true, data: trust });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Get trust score
 * GET /trust/:entityId
 */
app.get('/trust/:entityId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const trust = await TrustScore.findOne({ entityId }).lean();

    if (!trust) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trust score not found' },
      });
    }

    res.json({ success: true, data: trust });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Record activity
 * POST /trust/:entityId/activity
 */
app.post('/trust/:entityId/activity', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { success, amount, responseTime, quality } = req.body;

    const trust = await TrustScore.findOne({ entityId });
    if (!trust) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Trust score not found' } });
    }

    // Update history
    trust.history.totalTransactions++;
    if (success) trust.history.successfulTransactions++;
    else trust.history.failedTransactions++;
    if (amount) trust.history.totalVolume += amount;
    if (responseTime) {
      trust.history.avgResponseTime =
        (trust.history.avgResponseTime * (trust.history.totalTransactions - 1) + responseTime) / trust.history.totalTransactions;
    }
    trust.history.lastActivity = new Date();

    // Recalculate
    const successRate = trust.history.totalTransactions > 0
      ? trust.history.successfulTransactions / trust.history.totalTransactions : 0.5;

    trust.dimensions.reliability = Math.round(successRate * 100);
    trust.dimensions.quality = quality !== undefined ? Math.round(trust.dimensions.quality * 0.9 + quality * 10) : trust.dimensions.quality;
    trust.overallScore = Math.round(
      trust.dimensions.reliability * 0.35 +
      trust.dimensions.quality * 0.25 +
      trust.dimensions.responsiveness * 0.15 +
      trust.dimensions.safety * 0.1 +
      trust.dimensions.compliance * 0.15
    );

    if (trust.overallScore >= 80) trust.riskLevel = 'LOW';
    else if (trust.overallScore >= 60) trust.riskLevel = 'MEDIUM';
    else if (trust.overallScore >= 40) trust.riskLevel = 'HIGH';
    else trust.riskLevel = 'CRITICAL';

    await trust.save();

    res.json({
      success: true,
      data: {
        entityId,
        overallScore: trust.overallScore,
        riskLevel: trust.riskLevel,
        history: trust.history,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Get trust history
 * GET /trust/:entityId/history
 */
app.get('/trust/:entityId/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const { limit = 50 } = req.query;

    const history = await TrustHistory.find({ entityId })
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .lean();

    res.json({ success: true, data: { items: history, total: history.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Get trust leaderboard
 * GET /trust/leaderboard
 */
app.get('/trust/leaderboard', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityType, limit = 20 } = req.query;
    const filter: any = { status: 'ACTIVE' };
    if (entityType) filter.entityType = entityType;

    const leaders = await TrustScore.find(filter)
      .sort({ overallScore: -1 })
      .limit(parseInt(limit as string))
      .select('entityId entityType overallScore riskLevel verification.level')
      .lean();

    res.json({ success: true, data: { items: leaders, total: leaders.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// ============================================================================
// GOVERNANCE SERVICE
// ============================================================================

/**
 * List policies
 * GET /governance/policies
 */
app.get('/governance/policies', authMiddleware, async (_req: Request, res: Response) => {
  try {
    const policies = await Policy.find().lean();
    res.json({ success: true, data: { policies, total: policies.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Create policy
 * POST /governance/policies
 */
app.post('/governance/policies', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { name, description, rules, scope, type } = req.body;

    if (!name || !rules) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'name and rules required' },
      });
    }

    const policy = new Policy({
      policyId: generateId('POL'),
      name,
      description: description || '',
      rules,
      scope: { level: scope || 'GLOBAL' },
      type: type || 'CUSTOM',
      status: 'ACTIVE',
      metadata: { createdBy: 'system' },
    });

    await policy.save();

    res.status(201).json({ success: true, data: policy });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Validate action against policies
 * POST /governance/validate
 */
app.post('/governance/validate', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId, action, context } = req.body;

    const policies = await Policy.find({ status: 'ACTIVE' }).lean();
    const violations: string[] = [];

    for (const policy of policies) {
      for (const rule of policy.rules || []) {
        // Simple rule matching
        if (rule.type === 'DENY') {
          violations.push(`${policy.name}: ${rule.action}`);
        }
      }
    }

    res.json({
      success: true,
      data: {
        allowed: violations.length === 0,
        violations,
        entityId,
        action,
      },
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// ============================================================================
// RISK SERVICE
// ============================================================================

/**
 * Assess risk
 * POST /risk/assess
 */
app.post('/risk/assess', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId, entityType, factors } = req.body;

    let totalContribution = 0;
    const riskFactors = (factors || []).map((f: any) => {
      totalContribution += f.contribution || 10;
      return {
        name: f.name,
        contribution: f.contribution || 10,
        severity: f.severity || 'MEDIUM',
      };
    });

    const score = Math.min(100, totalContribution);
    let overallRisk = 'MEDIUM';
    if (score >= 70) overallRisk = 'CRITICAL';
    else if (score >= 50) overallRisk = 'HIGH';
    else if (score >= 30) overallRisk = 'LOW';

    const assessment = new RiskAssessment({
      assessmentId: generateId('RISK'),
      entityId,
      entityType: entityType || 'UNKNOWN',
      assessmentType: 'TRIGGERED',
      riskScore: score,
      riskLevel: overallRisk,
      factors: riskFactors,
      recommendations: score > 50 ? ['Review transaction limits', 'Enable additional verification'] : [],
      status: 'ACTIVE',
    });

    await assessment.save();

    res.json({ success: true, data: assessment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Get risk assessment
 * GET /risk/:entityId
 */
app.get('/risk/:entityId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const assessment = await RiskAssessment.findOne({ entityId })
      .sort({ createdAt: -1 })
      .lean();

    if (!assessment) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Risk assessment not found' } });
    }

    res.json({ success: true, data: assessment });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Get risk history
 * GET /risk/:entityId/history
 */
app.get('/risk/:entityId/history', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const assessments = await RiskAssessment.find({ entityId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    res.json({ success: true, data: { items: assessments, total: assessments.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// ============================================================================
// VERIFICATION SERVICE
// ============================================================================

/**
 * Submit verification
 * POST /verification
 */
app.post('/verification', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId, type, entityType, documents } = req.body;

    const verification = new Verification({
      verificationId: generateId('VER'),
      entityId,
      type: type || 'KYC',
      entityType: entityType || 'HUMAN',
      level: 1,
      status: 'INITIATED',
      documents: (documents || []).map((d: any) => ({
        documentId: generateId('DOC'),
        type: d.type,
        status: 'UPLOADED',
 url: d.url,
      })),
      metadata: { initiatedAt: new Date() },
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    });

    await verification.save();

    res.status(201).json({ success: true, data: verification });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Get verification status
 * GET /verification/:entityId
 */
app.get('/verification/:entityId', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId } = req.params;
    const verification = await Verification.findOne({ entityId })
      .sort({ createdAt: -1 })
      .lean();

    if (!verification) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Verification not found' } });
    }

    res.json({ success: true, data: verification });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Approve verification
 * POST /verification/:verificationId/approve
 */
app.post('/verification/:verificationId/approve', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { verificationId } = req.params;

    const verification = await Verification.findOneAndUpdate(
      { verificationId },
      {
        $set: {
          status: 'VERIFIED',
          level: 3,
          'result.overallDecision': 'APPROVED',
          'result.decisionMaker': 'ADMIN',
          'metadata.completedAt': new Date(),
        },
      },
      { new: true }
    );

    if (!verification) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Verification not found' } });
    }

    res.json({ success: true, data: verification });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

/**
 * Get all verifications
 * GET /verification
 */
app.get('/verification', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { status, type } = req.query;
    const filter: any = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    const verifications = await Verification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    res.json({ success: true, data: { items: verifications, total: verifications.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// ============================================================================
// AUDIT LOG
// ============================================================================

/**
 * Get audit logs
 * GET /audit
 */
app.get('/audit', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { entityId, action, limit = 100 } = req.query;
    const filter: any = {};
    if (entityId) filter.entityId = entityId;
    if (action) filter['action.type'] = action;

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit as string))
      .lean();

    res.json({ success: true, data: { items: logs, total: logs.length } });
  } catch (error: any) {
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: error.message } });
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use((err: Error, _req: Request, res: Response, _next: Function) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: err.message } });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Endpoint not found' } });
});

// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    logger.info('Connected to MongoDB at', MONGODB_URI);

    // Create indexes
    await TrustScore.createIndexes();
    await TrustHistory.createIndexes();
    await Policy.createIndexes();
    await RiskAssessment.createIndexes();
    await Verification.createIndexes();
    await AuditLog.createIndexes();
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});



    // Gated listen — skip in test mode or when SADA_NO_LISTEN is set,
    // so vitest can import the app without binding the port.
    if (process.env.NODE_ENV === 'test' || process.env.SADA_NO_LISTEN) {
      logger.info('[sada-os] listen() skipped (test/no-listen mode)');
      return;
    }
    const server = app.listen(PORT, () => {
      logger.info(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   SADA - Trust, Governance & Risk Platform                    ║
║                                                               ║
║   Port: ${PORT}                                               ║
║   MongoDB: ${MONGODB_URI.split('@')[1] || 'localhost:27017'}                       ║
║                                                               ║
║   Modules:                                                     ║
║   • Trust Scores (with behavioral analysis)                  ║
║   • Governance (Policies & Compliance)                       ║
║   • Risk Assessment (ML-ready)                               ║
║   • Verification (KYC, KYB, Agent)                          ║
║   • Audit Ledger (Immutable history)                          ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
      `);
    });
    installGracefulShutdown(server);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Only auto-start when invoked as a script (not when imported by vitest).
// tsx sets `process.argv[1]` to the script path; vitest does not import
// index.ts as a script entry, so this guard keeps the test suite from
// calling mongoose.connect() (which would hang without a real Mongo).
if (process.env.NODE_ENV !== 'test' && !process.env.SADA_NO_LISTEN) {
  startServer();
}

export default app;
export {
  app,
  authMiddleware,
  generateId,
  SADA_REQUIRE_AUTH,
  PORT,
};
