/**
 * LoopOS Certification Pipeline
 * Simulation → Trust → Certification flow for AI agents
 * Port: 4739
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4739;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Certification statuses
const STATUS = {
  PENDING: 'pending',
  SIMULATING: 'simulating',
  EVALUATING: 'evaluating',
  CERTIFIED: 'certified',
  FAILED: 'failed',
  REVOKED: 'revoked'
};

// In-memory stores
const certifications = new Map();  // certId -> Certification
const pipelines = new Map();       // pipelineId -> Pipeline
const badges = new Map();         // badgeId -> Badge
const testSuites = new Map();     // suiteId -> TestSuite

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));

function requireAuth(req, res, next) {
  const key = req.headers.authorization?.replace('Bearer ', '');
  if (key !== API_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
}

// ── Health ──────────────────────────────────────────────
app.get('/health', (_req, res) => res.json({
  status: 'ok',
  service: 'certification-pipeline',
  version: '1.0.0',
  port: PORT,
  certifications: certifications.size,
  pipelines: pipelines.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Test Suites ─────────────────────────────────────────

/**
 * Create test suite
 * POST /api/test-suites
 */
app.post('/api/test-suites', requireAuth, (req, res) => {
  const { name, category, tests = [], passingScore = 0.8 } = req.body || {};

  if (!name || !category) {
    return res.status(400).json({ error: 'name and category are required' });
  }

  const id = `suite-${randomUUID().slice(0, 8)}`;
  const suite = {
    id,
    name,
    category,
    tests,
    passingScore,
    createdAt: new Date().toISOString()
  };

  testSuites.set(id, suite);
  logger.info(`Test suite created: ${id} (${name})`);
  res.status(201).json(suite);
});

/**
 * List test suites
 * GET /api/test-suites
 */
app.get('/api/test-suites', (req, res) => {
  const { category } = req.query;
  let items = [...testSuites.values()];
  if (category) items = items.filter(s => s.category === category);
  res.json({ count: items.length, suites: items });
});

/**
 * Get test suite
 * GET /api/test-suites/:id
 */
app.get('/api/test-suites/:id', (req, res) => {
  const suite = testSuites.get(req.params.id);
  if (!suite) return res.status(404).json({ error: 'test suite not found' });
  res.json(suite);
});

// ── Certification Pipeline ───────────────────────────────

/**
 * Run certification pipeline
 * POST /api/certification/run
 */
app.post('/api/certification/run', requireAuth, (req, res) => {
  const {
    twinId,
    suiteId,
    scenarios = [],
    simulateOnly = false
  } = req.body || {};

  if (!twinId) return res.status(400).json({ error: 'twinId is required' });

  const id = `pipeline-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const pipeline = {
    id,
    twinId,
    suiteId: suiteId || null,
    scenarios,
    status: STATUS.PENDING,
    phases: {
      simulation: { status: 'pending', results: null, completedAt: null },
      evaluation: { status: 'pending', results: null, completedAt: null },
      trustUpdate: { status: 'pending', results: null, completedAt: null },
      certification: { status: 'pending', results: null, completedAt: null }
    },
    finalDecision: null,
    trustScoreDelta: 0,
    simulateOnly,
    createdAt: now,
    completedAt: null
  };

  pipelines.set(id, pipeline);

  // Start async pipeline
  runPipeline(pipeline);

  logger.info(`Certification pipeline started: ${id} for ${twinId}`);
  res.status(201).json(pipeline);
});

/**
 * Get pipeline status
 * GET /api/certification/:id
 */
app.get('/api/certification/:id', (req, res) => {
  const pipeline = pipelines.get(req.params.id);
  if (!pipeline) return res.status(404).json({ error: 'pipeline not found' });
  res.json(pipeline);
});

/**
 * List pipelines
 * GET /api/certifications
 */
app.get('/api/certifications', (req, res) => {
  const { twinId, status } = req.query;
  let items = [...pipelines.values()];

  if (twinId) items = items.filter(p => p.twinId === twinId);
  if (status) items = items.filter(p => p.status === status);

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ count: items.length, pipelines: items });
});

/**
 * Retry failed pipeline
 * POST /api/certification/:id/retry
 */
app.post('/api/certification/:id/retry', requireAuth, (req, res) => {
  const pipeline = pipelines.get(req.params.id);
  if (!pipeline) return res.status(404).json({ error: 'pipeline not found' });

  if (pipeline.status !== STATUS.FAILED) {
    return res.status(400).json({ error: 'Can only retry failed pipelines' });
  }

  pipeline.status = STATUS.PENDING;
  pipeline.completedAt = null;
  runPipeline(pipeline);

  res.json(pipeline);
});

/**
 * Cancel pipeline
 * POST /api/certification/:id/cancel
 */
app.post('/api/certification/:id/cancel', requireAuth, (req, res) => {
  const pipeline = pipelines.get(req.params.id);
  if (!pipeline) return res.status(404).json({ error: 'pipeline not found' });

  if (pipeline.status === STATUS.CERTIFIED || pipeline.status === STATUS.REVOKED) {
    return res.status(400).json({ error: 'Cannot cancel completed pipeline' });
  }

  pipeline.status = STATUS.FAILED;
  pipeline.finalDecision = 'cancelled';
  pipeline.completedAt = new Date().toISOString();

  res.json(pipeline);
});

// ── Manual Certification ─────────────────────────────────

/**
 * Grant certification manually
 * POST /api/certification/:twinId/grant
 */
app.post('/api/certification/:twinId/grant', requireAuth, (req, res) => {
  const { certType, issuer, expiresAt, reason, badges: earnedBadges = [] } = req.body || {};

  if (!certType) return res.status(400).json({ error: 'certType is required' });

  const id = `cert-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const cert = {
    id,
    twinId: req.params.twinId,
    type: certType,
    issuer: issuer || 'manual',
    status: STATUS.CERTIFIED,
    issuedAt: now,
    expiresAt: expiresAt || null,
    reason: reason || '',
    badges: earnedBadges,
    manual: true,
    createdAt: now
  };

  certifications.set(id, cert);

  logger.info(`Certification granted to ${req.params.twinId}: ${certType}`);
  res.status(201).json(cert);
});

/**
 * Revoke certification
 * POST /api/certification/:id/revoke
 */
app.post('/api/certification/:id/revoke', requireAuth, (req, res) => {
  const { reason } = req.body || {};
  const cert = certifications.get(req.params.id);

  if (!cert) return res.status(404).json({ error: 'certification not found' });

  cert.status = STATUS.REVOKED;
  cert.revokedAt = new Date().toISOString();
  cert.revocationReason = reason || '';

  logger.warn(`Certification revoked: ${cert.id}`);
  res.json(cert);
});

// ── Badges ─────────────────────────────────────────────

/**
 * Create badge
 * POST /api/badges
 */
app.post('/api/badges', requireAuth, (req, res) => {
  const { name, description, icon, criteria } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const id = `badge-${randomUUID().slice(0, 8)}`;
  const badge = {
    id,
    name,
    description: description || '',
    icon: icon || '🏅',
    criteria: criteria || {},
    createdAt: new Date().toISOString()
  };

  badges.set(id, badge);
  res.status(201).json(badge);
});

/**
 * List badges
 * GET /api/badges
 */
app.get('/api/badges', (_req, res) => {
  const all = [...badges.values()];
  res.json({ count: all.length, badges: all });
});

/**
 * Award badge to twin
 * POST /api/badges/:id/award
 */
app.post('/api/badges/:id/award', requireAuth, (req, res) => {
  const { twinId, reason } = req.body || {};
  const badge = badges.get(req.params.id);

  if (!badge) return res.status(404).json({ error: 'badge not found' });

  badge.awardedTo = badge.awardedTo || [];
  badge.awardedTo.push({
    twinId,
    reason,
    awardedAt: new Date().toISOString()
  });

  res.json(badge);
});

/**
 * Get earned badges for twin
 * GET /api/badges/:twinId/earned
 */
app.get('/api/badges/:twinId/earned', (req, res) => {
  const earned = [];

  for (const badge of badges.values()) {
    const award = badge.awardedTo?.find(a => a.twinId === req.params.twinId);
    if (award) {
      earned.push({ ...badge, awardedAt: award.awardedAt, reason: award.reason });
    }
  }

  res.json({ twinId: req.params.twinId, count: earned.length, badges: earned });
});

// ── Certification Status ───────────────────────────────

/**
 * Get certification status for twin
 * GET /api/certification/:twinId/status
 */
app.get('/api/certification/:twinId/status', (req, res) => {
  const twinCerts = [...certifications.values()]
    .filter(c => c.twinId === req.params.twinId);

  const active = twinCerts.filter(c => c.status === STATUS.CERTIFIED);
  const revoked = twinCerts.filter(c => c.status === STATUS.REVOKED);
  const expired = twinCerts.filter(c =>
    c.expiresAt && new Date(c.expiresAt) < new Date()
  );

  // Get earned badges
  const earnedBadges = [];
  for (const badge of badges.values()) {
    const award = badge.awardedTo?.find(a => a.twinId === req.params.twinId);
    if (award) {
      earnedBadges.push({ id: badge.id, name: badge.name, icon: badge.icon });
    }
  }

  // Get latest pipeline
  const latestPipeline = [...pipelines.values()]
    .filter(p => p.twinId === req.params.twinId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];

  res.json({
    twinId: req.params.twinId,
    certifications: {
      total: twinCerts.length,
      active: active.length,
      revoked: revoked.length,
      expired: expired.length
    },
    badges: {
      total: earnedBadges.length,
      items: earnedBadges
    },
    latestPipeline: latestPipeline ? {
      id: latestPipeline.id,
      status: latestPipeline.status,
      createdAt: latestPipeline.createdAt
    } : null,
    canOperate: active.length > 0 && expired.length === 0
  });
});

// ── Pipeline Execution ─────────────────────────────────

async function runPipeline(pipeline) {
  const now = new Date().toISOString();

  try {
    // Phase 1: Simulation
    pipeline.status = STATUS.SIMULATING;
    pipeline.phases.simulation.status = 'running';
    pipelines.set(pipeline.id, pipeline);

    const simResult = await runSimulation(pipeline);
    pipeline.phases.simulation.status = 'completed';
    pipeline.phases.simulation.results = simResult;
    pipeline.phases.simulation.completedAt = new Date().toISOString();
    pipelines.set(pipeline.id, pipeline);

    // Phase 2: Evaluation
    pipeline.status = STATUS.EVALUATING;
    pipeline.phases.evaluation.status = 'running';

    const evalResult = await runEvaluation(pipeline);
    pipeline.phases.evaluation.status = 'completed';
    pipeline.phases.evaluation.results = evalResult;
    pipeline.phases.evaluation.completedAt = new Date().toISOString();
    pipelines.set(pipeline.id, pipeline);

    // Phase 3: Decision
    if (evalResult.passed) {
      // Phase 3: Trust Update
      pipeline.phases.trustUpdate.status = 'running';
      const trustResult = await updateTrust(pipeline);
      pipeline.phases.trustUpdate.status = 'completed';
      pipeline.phases.trustUpdate.results = trustResult;
      pipeline.phases.trustUpdate.completedAt = new Date().toISOString();

      // Phase 4: Certification
      pipeline.phases.certification.status = 'running';
      const certResult = await grantCertification(pipeline);
      pipeline.phases.certification.status = 'completed';
      pipeline.phases.certification.results = certResult;
      pipeline.phases.certification.completedAt = new Date().toISOString();

      pipeline.status = STATUS.CERTIFIED;
      pipeline.finalDecision = 'certified';
      pipeline.trustScoreDelta = trustResult.delta;
    } else {
      pipeline.status = STATUS.FAILED;
      pipeline.finalDecision = 'failed';
    }

  } catch (err) {
    pipeline.status = STATUS.FAILED;
    pipeline.finalDecision = 'error';
    pipeline.error = err.message;
    logger.error(`Pipeline error: ${pipeline.id}`, err);
  }

  pipeline.completedAt = new Date().toISOString();
  pipelines.set(pipeline.id, pipeline);
  logger.info(`Pipeline completed: ${pipeline.id} (${pipeline.finalDecision})`);
}

async function runSimulation(pipeline) {
  // Simulate test scenarios
  const scenarios = pipeline.scenarios.length > 0
    ? pipeline.scenarios
    : getDefaultScenarios(pipeline.suiteId);

  const results = [];
  let passed = 0;

  for (const scenario of scenarios) {
    // Simulate execution (in production, this would call SimulationOS)
    const result = {
      scenario: scenario.name || scenario,
      status: 'success',
      duration: Math.random() * 1000,
      score: 0.7 + Math.random() * 0.3,
      details: {}
    };

    result.passed = result.score >= 0.8;
    if (result.passed) passed++;

    results.push(result);
  }

  const overallScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

  return {
    scenarios: results,
    overallScore: Math.round(overallScore * 100) / 100,
    passedCount: passed,
    totalCount: scenarios.length,
    passRate: Math.round((passed / scenarios.length) * 100)
  };
}

async function runEvaluation(pipeline) {
  const simResults = pipeline.phases.simulation.results;
  const passingScore = 0.8;

  const passed = simResults.overallScore >= passingScore;

  return {
    passed,
    score: simResults.overallScore,
    threshold: passingScore,
    checks: {
      performanceScore: simResults.overallScore >= 0.7,
      passRate: simResults.passRate >= 70,
      noCriticalFailures: !simResults.scenarios.some(s => s.score < 0.3)
    },
    recommendations: passed ? [] : [
      'Improve simulation performance',
      'Address failed test scenarios',
      'Consider additional training'
    ]
  };
}

async function updateTrust(pipeline) {
  // Calculate trust delta based on simulation results
  const simScore = pipeline.phases.simulation.results.overallScore;
  const delta = Math.round((simScore - 0.5) * 20); // +10 at perfect, -10 at 0

  return {
    twinId: pipeline.twinId,
    delta,
    reason: 'Certification pipeline passed',
    newScore: 50 + delta // Would actually query trust profile
  };
}

async function grantCertification(pipeline) {
  const id = `cert-${randomUUID().slice(0, 8)}`;
  const simResults = pipeline.phases.simulation.results;
  const now = new Date().toISOString();

  const cert = {
    id,
    twinId: pipeline.twinId,
    type: 'simulation_certified',
    issuer: 'certification-pipeline',
    pipelineId: pipeline.id,
    status: STATUS.CERTIFIED,
    score: simResults.overallScore,
    issuedAt: now,
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
    badges: determineBadges(simResults),
    createdAt: now
  };

  certifications.set(id, cert);

  // Award badges
  for (const badgeName of cert.badges) {
    const badge = [...badges.values()].find(b => b.name === badgeName);
    if (badge) {
      badge.awardedTo = badge.awardedTo || [];
      badge.awardedTo.push({
        twinId: pipeline.twinId,
        reason: 'Certification passed',
        awardedAt: now
      });
    }
  }

  return cert;
}

function getDefaultScenarios(suiteId) {
  if (suiteId) {
    const suite = testSuites.get(suiteId);
    if (suite) return suite.tests;
  }

  // Default scenarios
  return [
    { name: 'Basic functionality test', description: 'Verify core capabilities' },
    { name: 'Error handling test', description: 'Verify graceful error handling' },
    { name: 'Performance test', description: 'Verify response time within limits' },
    { name: 'Security test', description: 'Verify no security vulnerabilities' },
    { name: 'Compliance test', description: 'Verify adherence to policies' }
  ];
}

function determineBadges(results) {
  const earned = [];
  if (results.overallScore >= 0.95) earned.push('Excellence');
  if (results.passRate === 100) earned.push('Perfect Score');
  if (results.overallScore >= 0.8) earned.push('Certified');
  return earned;
}

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Certification Pipeline listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
