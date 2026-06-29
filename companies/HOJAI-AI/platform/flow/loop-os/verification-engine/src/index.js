/**
 * LoopOS Verification Engine
 * Maker → Checker → Guardian verification pattern
 * Port: 4723
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { randomUUID } from 'node:crypto';
import winston from 'winston';

const app = express();
const PORT = process.env.PORT || 4723;
const API_KEY = process.env.HOJAI_API_KEY || 'dev-key';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  transports: [new winston.transports.Console()]
});

// Verification levels
const LEVELS = {
  MAKER_ONLY: 'maker_only',         // Just maker, no verification
  MAKER_CHECKER: 'maker_checker',   // Maker + Checker
  MAKER_CHECKER_GUARDIAN: 'maker_checker_guardian', // Full pipeline
  FULL: 'full'                      // All + human approval
};

// Verification statuses
const STATUS = {
  PENDING: 'pending',
  MAKER_COMPLETE: 'maker_complete',
  CHECKER_PASSED: 'checker_passed',
  CHECKER_FAILED: 'checker_failed',
  GUARDIAN_PASSED: 'guardian_passed',
  GUARDIAN_FAILED: 'guardian_failed',
  HUMAN_APPROVED: 'human_approved',
  HUMAN_REJECTED: 'human_rejected',
  COMPLETED: 'completed',
  FAILED: 'failed'
};

// Guardian types
const GUARDIAN_TYPES = {
  SECURITY: 'security',
  COMPLIANCE: 'compliance',
  LEGAL: 'legal',
  PRIVACY: 'privacy',
  BRAND: 'brand',
  POLICY: 'policy'
};

// In-memory stores
const verifications = new Map();
const verificationPolicies = new Map();

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
  service: 'verification-engine',
  version: '1.0.0',
  port: PORT,
  verifications: verifications.size
}));

app.get('/ready', (_req, res) => res.json({ ready: true, timestamp: new Date().toISOString() }));

// ── Verification Policies ───────────────────────────────

/**
 * Create verification policy
 * POST /api/policies
 */
app.post('/api/policies', requireAuth, (req, res) => {
  const {
    name,
    level = LEVELS.MAKER_CHECKER,
    checkerType = 'general',
    guardians = [GUARDIAN_TYPES.COMPLIANCE],
    riskThreshold = 0.5,
    requireHumanAboveRisk = 0.8,
    autoFailOnGuardian = true
  } = req.body || {};

  if (!name) return res.status(400).json({ error: 'name is required' });

  const policy = {
    id: `policy-${randomUUID().slice(0, 8)}`,
    name,
    level,
    checkerType,
    guardians,
    riskThreshold,
    requireHumanAboveRisk,
    autoFailOnGuardian,
    createdAt: new Date().toISOString()
  };

  verificationPolicies.set(policy.id, policy);
  logger.info(`Verification policy created: ${policy.id} (${name})`);
  res.status(201).json(policy);
});

/**
 * List policies
 * GET /api/policies
 */
app.get('/api/policies', (_req, res) => {
  const policies = [...verificationPolicies.values()];
  res.json({ count: policies.length, policies });
});

/**
 * Get policy
 * GET /api/policies/:id
 */
app.get('/api/policies/:id', (req, res) => {
  const policy = verificationPolicies.get(req.params.id);
  if (!policy) return res.status(404).json({ error: 'policy not found' });
  res.json(policy);
});

// ── Verification Pipeline ────────────────────────────────

/**
 * Submit for verification
 * POST /api/verify
 */
app.post('/api/verify', requireAuth, (req, res) => {
  const {
    requestId,
    makerAgentId,
    content,
    action,
    policyId,
    riskLevel = 'medium',
    metadata = {}
  } = req.body || {};

  if (!makerAgentId) return res.status(400).json({ error: 'makerAgentId is required' });
  if (!content && !action) return res.status(400).json({ error: 'content or action is required' });

  const id = `verify-${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const verification = {
    id,
    requestId: requestId || null,
    makerAgentId,
    content: content || null,
    action: action || null,
    policyId: policyId || null,
    riskLevel,
    status: STATUS.PENDING,
    stages: {
      maker: {
        status: 'completed',
        completedAt: now,
        output: content || action,
        confidence: metadata.makerConfidence || 0.85
      },
      checker: {
        status: 'pending',
        completedAt: null,
        result: null,
        confidence: 0
      },
      guardian: {
        status: 'pending',
        completedAt: null,
        results: [],
        passed: false
      }
    },
    humanApproval: {
      required: riskLevel === 'high' || riskLevel === 'critical',
      status: 'pending',
      requestedAt: null,
      respondedAt: null,
      approver: null,
      decision: null
    },
    finalDecision: null,
    createdAt: now,
    completedAt: null
  };

  verifications.set(id, verification);
  logger.info(`Verification submitted: ${id} by ${makerAgentId}`);

  // Auto-run pipeline
  runVerificationPipeline(verification);

  res.status(201).json(verification);
});

/**
 * Get verification result
 * GET /api/verification/:id
 */
app.get('/api/verification/:id', (req, res) => {
  const verification = verifications.get(req.params.id);
  if (!verification) return res.status(404).json({ error: 'verification not found' });
  res.json(verification);
});

/**
 * List verifications
 * GET /api/verifications
 */
app.get('/api/verifications', (req, res) => {
  const { status, makerAgentId, limit = 50 } = req.query;
  let items = [...verifications.values()];

  if (status) items = items.filter(v => v.status === status);
  if (makerAgentId) items = items.filter(v => v.makerAgentId === makerAgentId);

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  items = items.slice(0, Number(limit));

  res.json({ count: items.length, verifications: items });
});

/**
 * Re-verify (retry failed verification)
 * POST /api/verification/:id/verify
 */
app.post('/api/verification/:id/verify', requireAuth, (req, res) => {
  const verification = verifications.get(req.params.id);
  if (!verification) return res.status(404).json({ error: 'verification not found' });

  // Reset stages
  verification.status = STATUS.PENDING;
  verification.stages.checker = { status: 'pending', completedAt: null, result: null, confidence: 0 };
  verification.stages.guardian = { status: 'pending', completedAt: null, results: [], passed: false };
  verification.humanApproval = {
    ...verification.humanApproval,
    status: 'pending',
    requestedAt: null,
    respondedAt: null
  };
  verification.completedAt = null;

  runVerificationPipeline(verification);
  res.json(verification);
});

// ── Human Approval ───────────────────────────────────────

/**
 * Request human approval
 * POST /api/verification/:id/approval
 */
app.post('/api/verification/:id/approval', requireAuth, (req, res) => {
  const verification = verifications.get(req.params.id);
  if (!verification) return res.status(404).json({ error: 'verification not found' });

  verification.humanApproval.required = true;
  verification.humanApproval.status = 'pending';
  verification.humanApproval.requestedAt = new Date().toISOString();
  verification.status = STATUS.PENDING;

  logger.info(`Human approval requested for: ${verification.id}`);
  res.json(verification);
});

/**
 * Approve verification
 * POST /api/verification/:id/approve
 */
app.post('/api/verification/:id/approve', requireAuth, (req, res) => {
  const { approver, reason } = req.body || {};
  const verification = verifications.get(req.params.id);

  if (!verification) return res.status(404).json({ error: 'verification not found' });

  verification.humanApproval.status = 'approved';
  verification.humanApproval.respondedAt = new Date().toISOString();
  verification.humanApproval.approver = approver || 'human';
  verification.humanApproval.decision = reason || 'Approved';
  verification.status = STATUS.HUMAN_APPROVED;
  verification.completedAt = new Date().toISOString();
  verification.finalDecision = 'approved';

  logger.info(`Verification approved: ${verification.id} by ${approver}`);
  res.json(verification);
});

/**
 * Reject verification
 * POST /api/verification/:id/reject
 */
app.post('/api/verification/:id/reject', requireAuth, (req, res) => {
  const { approver, reason } = req.body || {};
  const verification = verifications.get(req.params.id);

  if (!verification) return res.status(404).json({ error: 'verification not found' });

  verification.humanApproval.status = 'rejected';
  verification.humanApproval.respondedAt = new Date().toISOString();
  verification.humanApproval.approver = approver || 'human';
  verification.humanApproval.decision = reason || 'Rejected';
  verification.status = STATUS.HUMAN_REJECTED;
  verification.completedAt = new Date().toISOString();
  verification.finalDecision = 'rejected';

  logger.info(`Verification rejected: ${verification.id} by ${approver}`);
  res.json(verification);
});

/**
 * Get pending human approvals
 * GET /api/approvals
 */
app.get('/api/approvals', (_req, res) => {
  const pending = [];

  for (const [, v] of verifications) {
    if (v.humanApproval.required && v.humanApproval.status === 'pending') {
      pending.push({
        id: v.id,
        makerAgentId: v.makerAgentId,
        content: v.content,
        action: v.action,
        riskLevel: v.riskLevel,
        requestedAt: v.humanApproval.requestedAt
      });
    }
  }

  res.json({ count: pending.length, approvals: pending });
});

// ── Pipeline Logic ───────────────────────────────────────

async function runVerificationPipeline(verification) {
  const policy = verification.policyId ? verificationPolicies.get(verification.policyId) : null;
  const level = policy?.level || LEVELS.MAKER_CHECKER;

  try {
    // Stage 1: Maker (already completed on submit)
    verification.stages.maker.status = 'completed';

    // Stage 2: Checker (if required)
    if (level !== LEVELS.MAKER_ONLY) {
      const checkerResult = await runChecker(verification);
      verification.stages.checker = checkerResult;

      if (checkerResult.confidence < 0.5) {
        verification.status = STATUS.CHECKER_FAILED;
        verification.finalDecision = 'rejected';
        verification.completedAt = new Date().toISOString();
        verifications.set(verification.id, verification);
        return;
      }

      verification.status = STATUS.CHECKER_PASSED;
    }

    // Stage 3: Guardian (if required)
    if (level === LEVELS.MAKER_CHECKER_GUARDIAN || level === LEVELS.FULL) {
      const guardianResult = await runGuardians(verification, policy?.guardians || [GUARDIAN_TYPES.COMPLIANCE]);
      verification.stages.guardian = guardianResult;

      if (policy?.autoFailOnGuardian && !guardianResult.passed) {
        verification.status = STATUS.GUARDIAN_FAILED;
        verification.finalDecision = 'rejected';
        verification.completedAt = new Date().toISOString();
        verifications.set(verification.id, verification);
        return;
      }

      verification.status = STATUS.GUARDIAN_PASSED;
    }

    // Stage 4: Human Approval (if required by risk)
    const riskScore = getRiskScore(verification);
    if (verification.humanApproval.required || riskScore > (policy?.requireHumanAboveRisk || 0.8)) {
      verification.status = STATUS.PENDING;
      verification.humanApproval.status = 'pending';
      verification.humanApproval.requestedAt = new Date().toISOString();
      verifications.set(verification.id, verification);
      return;
    }

    // Auto-approve if confidence is high enough
    const avgConfidence = calculateConfidence(verification);
    if (avgConfidence >= 0.8) {
      verification.status = STATUS.COMPLETED;
      verification.finalDecision = 'approved';
    } else {
      verification.status = STATUS.FAILED;
      verification.finalDecision = 'rejected';
    }

    verification.completedAt = new Date().toISOString();
    verifications.set(verification.id, verification);
    logger.info(`Verification ${verification.id} completed: ${verification.finalDecision}`);

  } catch (err) {
    verification.status = STATUS.FAILED;
    verification.finalDecision = 'error';
    verification.completedAt = new Date().toISOString();
    verification.error = err.message;
    verifications.set(verification.id, verification);
    logger.error(`Verification error: ${verification.id}`, err);
  }
}

async function runChecker(verification) {
  // Placeholder: In production, this would call actual checker agents
  // - Grammar checker for text
  // - Logic verifier for decisions
  // - Fact checker for data

  const content = verification.content || verification.action;
  const length = content?.length || 0;

  // Simulate checker analysis
  const hasContent = length > 10;
  const isStructured = content?.includes('{') || content?.includes('[');
  const confidence = hasContent ? (isStructured ? 0.92 : 0.78) : 0.3;

  return {
    status: 'completed',
    completedAt: new Date().toISOString(),
    result: {
      hasContent,
      isStructured,
      issues: hasContent ? [] : ['Content too short or empty'],
      confidence
    },
    confidence
  };
}

async function runGuardians(verification, guardianTypes) {
  // Placeholder: In production, this would call actual guardian agents
  // - Security Guardian: SQL injection, XSS, secrets
  // - Privacy Guardian: PII, GDPR, consent
  // - Legal Guardian: compliance, regulations
  // - Brand Guardian: tone, messaging, reputation

  const results = [];

  for (const type of guardianTypes) {
    const result = await runGuardianCheck(verification, type);
    results.push(result);
  }

  const passed = results.every(r => r.passed);

  return {
    status: 'completed',
    completedAt: new Date().toISOString(),
    results,
    passed
  };
}

async function runGuardianCheck(verification, guardianType) {
  // Placeholder guardian checks
  const content = verification.content || verification.action || '';

  const checks = {
    [GUARDIAN_TYPES.SECURITY]: {
      hasSqlKeywords: /SELECT|INSERT|UPDATE|DELETE|DROP/i.test(content),
      hasSecrets: /password|secret|api_key|token/i.test(content),
      passed: true // Pass for now, real implementation would block secrets
    },
    [GUARDIAN_TYPES.COMPLIANCE]: {
      hasPII: /\b\d{3}-\d{2}-\d{4}\b|\b[A-Z]{2}\d{6,}\b/i.test(content),
      passed: true
    },
    [GUARDIAN_TYPES.PRIVACY]: {
      hasEmail: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/.test(content),
      hasPhone: /\b\d{10,}\b/.test(content),
      passed: true
    },
    [GUARDIAN_TYPES.LEGAL]: {
      hasLegalKeywords: /contract|agreement|liability|indemnify/i.test(content),
      passed: true
    },
    [GUARDIAN_TYPES.BRAND]: {
      hasBrandKeywords: /company|brand|competitor/i.test(content),
      passed: true
    },
    [GUARDIAN_TYPES.POLICY]: {
      hasPolicyKeywords: /policy|rule|regulation|guideline/i.test(content),
      passed: true
    }
  };

  const check = checks[guardianType] || { passed: true };

  return {
    type: guardianType,
    ...check,
    recommendations: check.passed ? [] : [`Action flagged by ${guardianType} guardian`]
  };
}

function getRiskScore(verification) {
  const riskMap = { low: 0.2, medium: 0.5, high: 0.8, critical: 1.0 };
  return riskMap[verification.riskLevel] || 0.5;
}

function calculateConfidence(verification) {
  const makerConf = verification.stages.maker?.confidence || 0.85;
  const checkerConf = verification.stages.checker?.confidence || 0;
  const guardianConf = verification.stages.guardian?.passed ? 0.95 : 0.5;

  if (!verification.stages.checker.completedAt) return makerConf;
  if (!verification.stages.guardian.completedAt) return (makerConf + checkerConf) / 2;

  return (makerConf + checkerConf + guardianConf) / 3;
}

// ── Start Server ────────────────────────────────────────
const server = app.listen(PORT, () => {
  logger.info(`Verification Engine listening on port ${PORT}`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));

export default app;
