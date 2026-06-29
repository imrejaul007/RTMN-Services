/**
 * LoopOS Trust Profile Service
 * Progressive autonomy and trust scoring for AI agents
 * Port: 4736
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4736;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Autonomy levels
const AUTONOMY_LEVELS = {
  1: { name: 'Restricted', description: 'Needs approval for everything' },
  2: { name: 'Assisted', description: 'Routine auto, complex needs approval' },
  3: { name: 'Supervised', description: 'Most tasks, escalation for edge cases' },
  4: { name: 'Delegated', description: 'Full autonomy with reporting' },
  5: { name: 'Fully Autonomous', description: 'Complete autonomy' }
};

// Trust dimensions
const DIMENSIONS = ['execution', 'policy', 'customer', 'financial', 'security', 'collaboration'];

// In-memory stores
const profiles = new Map();      // twinId -> TrustProfile
const certifications = new Map(); // certId -> Certification
const violations = new Map();    // twinId -> PolicyViolation[]
const events = new Map();        // twinId -> TrustEvent[]

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '1mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'trust-profile',
  version: '1.0.0',
  port: PORT,
  profiles: profiles.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Trust Profile CRUD ────────────────────────────────

/**
 * Create or initialize trust profile
 * POST /api/profiles
 */
app.post('/api/profiles', requireAuth, (req, res) => {
  const { twinId, initialScore = 50, dimensions = {} } = req.body || {};

  if (!twinId) return res.status(400).json({ error: 'twinId is required' });
  if (profiles.has(twinId)) return res.status(409).json({ error: 'profile already exists' });

  const profile = {
    twinId,
    overallScore: initialScore,
    dimensions: initializeDimensions(dimensions, initialScore),
    autonomyLevel: calculateAutonomyLevel(initialScore),
    status: 'active',
    violations: [],
    approvals: [],
    history: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  profiles.set(twinId, profile);
  events.set(twinId, []);

  logger.info(`Trust profile created for: ${twinId}`);
  res.status(201).json(profile);
});

/**
 * Get trust profile
 * GET /api/profiles/:twinId
 */
app.get('/api/profiles/:twinId', (req, res) => {
  const profile = profiles.get(req.params.twinId);
  if (!profile) return res.status(404).json({ error: 'profile not found' });

  res.json({
    ...profile,
    autonomyLevelInfo: AUTONOMY_LEVELS[profile.autonomyLevel]
  });
});

/**
 * List all profiles
 * GET /api/profiles
 */
app.get('/api/profiles', (req, res) => {
  const { minScore, autonomyLevel, status } = req.query;
  let items = [...profiles.values()];

  if (minScore) items = items.filter(p => p.overallScore >= Number(minScore));
  if (autonomyLevel) items = items.filter(p => p.autonomyLevel === Number(autonomyLevel));
  if (status) items = items.filter(p => p.status === status);

  res.json({ count: items.length, profiles: items });
});

/**
 * Update trust score
 * POST /api/profiles/:twinId/update
 */
app.post('/api/profiles/:twinId/update', requireAuth, (req, res) => {
  const { dimension, delta, reason, source } = req.body || {};
  const profile = profiles.get(req.params.twinId);

  if (!profile) return res.status(404).json({ error: 'profile not found' });

  const now = new Date().toISOString();

  if (dimension && DIMENSIONS.includes(dimension)) {
    // Update specific dimension
    const oldScore = profile.dimensions[dimension];
    profile.dimensions[dimension] = Math.max(0, Math.min(100, oldScore + (delta || 0)));
  }

  // Recalculate overall score (weighted average)
  profile.overallScore = calculateOverallScore(profile.dimensions);
  profile.autonomyLevel = calculateAutonomyLevel(profile.overallScore);
  profile.updatedAt = now;

  // Record event
  const event = {
    id: `event-${randomUUID().slice(0, 8)}`,
    type: 'score_update',
    dimension,
    delta,
    reason,
    source,
    timestamp: now
  };
  profile.history.push(event);

  if (events.has(profile.twinId)) {
    events.get(profile.twinId).push(event);
  }

  logger.info(`Trust updated for ${profile.twinId}: ${profile.overallScore}`);
  res.json(profile);
});

/**
 * Get autonomy level
 * GET /api/profiles/:twinId/autonomy
 */
app.get('/api/profiles/:twinId/autonomy', (req, res) => {
  const profile = profiles.get(req.params.twinId);
  if (!profile) return res.status(404).json({ error: 'profile not found' });

  res.json({
    twinId: profile.twinId,
    level: profile.autonomyLevel,
    name: AUTONOMY_LEVELS[profile.autonomyLevel].name,
    description: AUTONOMY_LEVELS[profile.autonomyLevel].description,
    score: profile.overallScore,
    permissions: getPermissionsForLevel(profile.autonomyLevel)
  });
});

/**
 * Promote autonomy level
 * POST /api/profiles/:twinId/autonomy/promote
 */
app.post('/api/profiles/:twinId/autonomy/promote', requireAuth, (req, res) => {
  const { reason } = req.body || {};
  const profile = profiles.get(req.params.twinId);

  if (!profile) return res.status(404).json({ error: 'profile not found' });

  if (profile.autonomyLevel >= 5) {
    return res.status(400).json({ error: 'Already at maximum autonomy level' });
  }

  // Check if eligible for promotion
  if (profile.overallScore < (profile.autonomyLevel + 1) * 15) {
    return res.status(400).json({
      error: 'Score too low for promotion',
      required: (profile.autonomyLevel + 1) * 15,
      current: profile.overallScore
    });
  }

  const oldLevel = profile.autonomyLevel;
  profile.autonomyLevel++;
  profile.updatedAt = new Date().toISOString();

  const event = {
    id: `event-${randomUUID().slice(0, 8)}`,
    type: 'autonomy_promotion',
    from: oldLevel,
    to: profile.autonomyLevel,
    reason,
    timestamp: new Date().toISOString()
  };
  profile.history.push(event);

  logger.info(`Autonomy promoted for ${profile.twinId}: ${oldLevel} -> ${profile.autonomyLevel}`);
  res.json(profile);
});

/**
 * Demote autonomy level
 * POST /api/profiles/:twinId/autonomy/demote
 */
app.post('/api/profiles/:twinId/autonomy/demote', requireAuth, (req, res) => {
  const { reason, violation = false } = req.body || {};
  const profile = profiles.get(req.params.twinId);

  if (!profile) return res.status(404).json({ error: 'profile not found' });

  const oldLevel = profile.autonomyLevel;
  profile.autonomyLevel = Math.max(1, profile.autonomyLevel - 1);
  profile.overallScore = Math.max(10, profile.overallScore - (violation ? 20 : 10));
  profile.updatedAt = new Date().toISOString();

  const event = {
    id: `event-${randomUUID().slice(0, 8)}`,
    type: violation ? 'policy_violation' : 'autonomy_demotion',
    from: oldLevel,
    to: profile.autonomyLevel,
    reason,
    timestamp: new Date().toISOString()
  };
  profile.history.push(event);

  logger.warn(`Autonomy demoted for ${profile.twinId}: ${oldLevel} -> ${profile.autonomyLevel}`);
  res.json(profile);
});

// ── Certifications ─────────────────────────────────────

/**
 * Add certification
 * POST /api/profiles/:twinId/certify
 */
app.post('/api/profiles/:twinId/certify', requireAuth, (req, res) => {
  const { certType, issuer, expiresAt, metadata = {} } = req.body || {};
  const profile = profiles.get(req.params.twinId);

  if (!profile) return res.status(404).json({ error: 'profile not found' });
  if (!certType) return res.status(400).json({ error: 'certType is required' });

  const cert = {
    id: `cert-${randomUUID().slice(0, 8)}`,
    twinId: req.params.twinId,
    type: certType,
    issuer: issuer || 'system',
    status: 'active',
    issuedAt: new Date().toISOString(),
    expiresAt: expiresAt || null,
    metadata
  };

  certifications.set(cert.id, cert);
  profile.certifications = profile.certifications || [];
  profile.certifications.push({ id: cert.id, type: certType, issuedAt: cert.issuedAt });

  // Boost trust score for certification
  profile.overallScore = Math.min(100, profile.overallScore + 5);
  profile.updatedAt = new Date().toISOString();

  const event = {
    id: `event-${randomUUID().slice(0, 8)}`,
    type: 'certification_added',
    certType,
    timestamp: new Date().toISOString()
  };
  profile.history.push(event);

  logger.info(`Certification added for ${profile.twinId}: ${certType}`);
  res.status(201).json(cert);
});

/**
 * Get certifications
 * GET /api/profiles/:twinId/certifications
 */
app.get('/api/profiles/:twinId/certifications', (req, res) => {
  const profile = profiles.get(req.params.twinId);
  if (!profile) return res.status(404).json({ error: 'profile not found' });

  const certs = profile.certifications || [];
  res.json({ count: certs.length, certifications: certs });
});

/**
 * Revoke certification
 * POST /api/certifications/:id/revoke
 */
app.post('/api/certifications/:id/revoke', requireAuth, (req, res) => {
  const cert = certifications.get(req.params.id);
  if (!cert) return res.status(404).json({ error: 'certification not found' });

  cert.status = 'revoked';
  cert.revokedAt = new Date().toISOString();

  // Deduct trust score
  const profile = profiles.get(cert.twinId);
  if (profile) {
    profile.overallScore = Math.max(0, profile.overallScore - 10);
    profile.updatedAt = new Date().toISOString();
  }

  logger.warn(`Certification revoked: ${cert.id}`);
  res.json(cert);
});

// ── Policy Violations ──────────────────────────────────

/**
 * Record violation
 * POST /api/profiles/:twinId/violations
 */
app.post('/api/profiles/:twinId/violations', requireAuth, (req, res) => {
  const { type, severity = 'medium', description, policy } = req.body || {};
  const profile = profiles.get(req.params.twinId);

  if (!profile) return res.status(404).json({ error: 'profile not found' });

  const violation = {
    id: `viol-${randomUUID().slice(0, 8)}`,
    twinId: req.params.twinId,
    type: type || 'unknown',
    severity,
    description: description || '',
    policy,
    status: 'open',
    createdAt: new Date().toISOString(),
    resolvedAt: null
  };

  violations.set(violation.id, violation);
  profile.violations.push(violation);

  // Deduct trust score based on severity
  const penalty = { low: 5, medium: 15, high: 25, critical: 40 };
  profile.overallScore = Math.max(0, profile.overallScore - (penalty[severity] || 10));
  profile.autonomyLevel = calculateAutonomyLevel(profile.overallScore);
  profile.updatedAt = new Date().toISOString();

  const event = {
    id: `event-${randomUUID().slice(0, 8)}`,
    type: 'violation',
    violationId: violation.id,
    severity,
    timestamp: new Date().toISOString()
  };
  profile.history.push(event);

  logger.warn(`Violation recorded for ${profile.twinId}: ${type} (${severity})`);
  res.status(201).json(violation);
});

/**
 * Get violations
 * GET /api/profiles/:twinId/violations
 */
app.get('/api/profiles/:twinId/violations', (req, res) => {
  const { status } = req.query;
  const profile = profiles.get(req.params.twinId);
  if (!profile) return res.status(404).json({ error: 'profile not found' });

  let items = profile.violations || [];
  if (status) items = items.filter(v => v.status === status);

  res.json({ count: items.length, violations: items });
});

/**
 * Resolve violation
 * POST /api/violations/:id/resolve
 */
app.post('/api/violations/:id/resolve', requireAuth, (req, res) => {
  const { resolution, forgiven = false } = req.body || {};
  const violation = violations.get(req.params.id);

  if (!violation) return res.status(404).json({ error: 'violation not found' });

  violation.status = 'resolved';
  violation.resolvedAt = new Date().toISOString();
  violation.resolution = resolution || '';

  // Restore some trust if forgiven
  if (forgiven) {
    const profile = profiles.get(violation.twinId);
    if (profile) {
      profile.overallScore = Math.min(100, profile.overallScore + 5);
      profile.updatedAt = new Date().toISOString();
    }
  }

  res.json(violation);
});

// ── Trust History ──────────────────────────────────────

/**
 * Get trust history
 * GET /api/profiles/:twinId/history
 */
app.get('/api/profiles/:twinId/history', (req, res) => {
  const { limit = 100, type } = req.query;
  const profile = profiles.get(req.params.twinId);
  if (!profile) return res.status(404).json({ error: 'profile not found' });

  let history = profile.history || [];
  if (type) history = history.filter(e => e.type === type);

  res.json({ count: history.length, events: history.slice(-Number(limit)) });
});

/**
 * Get trust summary (for dashboards)
 * GET /api/trust/summary
 */
app.get('/api/trust/summary', (req, res) => {
  const allProfiles = [...profiles.values()];

  const byLevel = {};
  for (let i = 1; i <= 5; i++) {
    byLevel[i] = allProfiles.filter(p => p.autonomyLevel === i).length;
  }

  const avgScore = allProfiles.length > 0
    ? Math.round(allProfiles.reduce((sum, p) => sum + p.overallScore, 0) / allProfiles.length)
    : 0;

  const byDimension = {};
  for (const dim of DIMENSIONS) {
    const scores = allProfiles.map(p => p.dimensions[dim]).filter(Boolean);
    byDimension[dim] = scores.length > 0
      ? Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length)
      : 0;
  }

  res.json({
    totalProfiles: allProfiles.length,
    avgTrustScore: avgScore,
    byAutonomyLevel: byLevel,
    byDimension,
    timestamp: new Date().toISOString()
  });
});

// ── Helper Functions ───────────────────────────────────

function initializeDimensions(dimensions, baseScore) {
  const result = {};
  for (const dim of DIMENSIONS) {
    result[dim] = dimensions[dim] || baseScore;
  }
  return result;
}

function calculateOverallScore(dimensions) {
  const scores = Object.values(dimensions);
  return Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length);
}

function calculateAutonomyLevel(score) {
  if (score >= 90) return 5;
  if (score >= 75) return 4;
  if (score >= 55) return 3;
  if (score >= 35) return 2;
  return 1;
}

function getPermissionsForLevel(level) {
  const permissions = {
    1: ['view', 'read'],
    2: ['view', 'read', 'execute_routine'],
    3: ['view', 'read', 'execute_routine', 'execute_complex', 'escalate'],
    4: ['view', 'read', 'execute_routine', 'execute_complex', 'escalate', 'delegate'],
    5: ['view', 'read', 'execute_routine', 'execute_complex', 'escalate', 'delegate', 'full_autonomy']
  };
  return permissions[level] || permissions[1];
}

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Trust Profile Service listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
