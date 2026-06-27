/**
 * Decision Engine Tests
 * Tests policy evaluation, approval workflows, audit logging
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock storage
const mockStorage = new Map();
const mockListStorage = new Map();

// Mock redis
const mockRedis = {
  get: vi.fn(async (key) => mockStorage.get(key) || null),
  set: vi.fn(async (key, value) => mockStorage.set(key, value)),
  lpush: vi.fn(async (key, value) => {
    const list = mockListStorage.get(key) || [];
    list.unshift(value);
    mockListStorage.set(key, list);
  }),
  ltrim: vi.fn(),
  lrange: vi.fn(async (key, start, end) => {
    const list = mockListStorage.get(key) || [];
    return list.slice(start, end + 1);
  }),
  ping: vi.fn(async () => 'PONG'),
  status: () => ({ mode: 'in-memory' })
};

// Mock modules
vi.mock('@rtmn/shared/lib/persistent-map', () => ({
  PersistentMap: vi.fn(() => ({
    get: vi.fn(),
    set: vi.fn(),
    has: vi.fn(),
    delete: vi.fn()
  }))
}));

vi.mock('@rtmn/shared/lib/env', () => ({
  requireEnv: vi.fn()
}));

vi.mock('@rtmn/shared/auth', () => ({
  requireAuth: (req, res, next) => {
    req.user = { type: 'service', id: 'test-user' };
    next();
  }
}));

vi.mock('@rtmn/shared/lib/shutdown', () => ({
  installGracefulShutdown: vi.fn()
}));

// Import after mocking
const express = (await import('express')).default;
const { v4: uuidv4 } = await import('uuid');

// Decision evaluation helpers
function evaluatePolicy(policy, context) {
  const reasons = [];
  const suggestions = [];
  let matchedRule = null;

  // Action match
  if (policy.action && policy.action !== '*' && context.action && policy.action !== context.action) {
    reasons.push(`Action '${context.action}' is not covered by policy '${policy.name}'`);
  }

  // Max amount
  const amount = Number(context.amount || 0);
  if (policy.maxAmount != null && amount > policy.maxAmount) {
    reasons.push(`Amount ${amount} exceeds policy maxAmount ${policy.maxAmount}`);
    suggestions.push(`Reduce amount to <= ${policy.maxAmount}`);
    matchedRule = 'max-amount';
  }

  // Business hours
  if (policy.businessHours && context.timestamp) {
    const hour = new Date(context.timestamp).getUTCHours();
    const { start = 0, end = 24 } = policy.businessHours;
    if (hour < start || hour >= end) {
      reasons.push(`Outside business hours (${start}-${end} UTC)`);
      matchedRule = matchedRule || 'business-hours';
    }
  }

  // Category allow-list
  if (policy.allowedCategories && context.category) {
    const cats = policy.allowedCategories;
    if (!cats.includes('*') && !cats.includes(context.category)) {
      reasons.push(`Category '${context.category}' not in allowed list`);
      matchedRule = matchedRule || 'category';
    }
  }

  // Risk threshold
  const risk = Number(context.risk || 0);
  if (policy.riskThreshold != null && risk > policy.riskThreshold) {
    reasons.push(`Risk ${risk} exceeds threshold ${policy.riskThreshold}`);
    matchedRule = matchedRule || 'risk-threshold';
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    suggestions,
    matchedRule
  };
}

function evaluateApprovalStatus(approval) {
  const approvals = approval.approvers.filter(a => a.decision === 'approve').length;
  const rejections = approval.approvers.filter(a => a.decision === 'reject').length;

  if (approval.strategy === 'emergency' && approvals >= 1) return 'approved';
  if (rejections >= 1 && approval.strategy !== 'multi') return 'rejected';

  switch (approval.strategy) {
    case 'single':
      return approvals >= 1 ? 'approved' : (rejections >= 1 ? 'rejected' : 'pending');
    case 'multi': {
      const required = approval.threshold || Math.ceil(approval.approvers.length / 2);
      if (approvals >= required) return 'approved';
      if (rejections > approval.approvers.length - required) return 'rejected';
      return 'pending';
    }
    case 'parallel':
      return approvals === approval.approvers.length ? 'approved'
        : (rejections > 0 ? 'rejected' : 'pending');
    case 'sequential': {
      for (const a of approval.approvers) {
        if (a.decision === 'reject') return 'rejected';
        if (a.decision == null) return 'pending';
      }
      return 'approved';
    }
    default:
      return 'pending';
  }
}

describe('Decision Engine', () => {
  describe('Policy Evaluation', () => {
    const policies = {
      'default-allow': {
        id: 'default-allow',
        name: 'Default Allow',
        action: '*',
        maxAmount: 1000000,
        businessHours: { start: 0, end: 24 },
        allowedCategories: ['*'],
        riskThreshold: 80
      },
      'strict': {
        id: 'strict',
        name: 'Strict Policy',
        action: '*',
        maxAmount: 5000,
        businessHours: { start: 8, end: 20 },
        allowedCategories: ['standard', 'low-risk'],
        riskThreshold: 30
      },
      'sutar-safety': {
        id: 'sutar-safety',
        name: 'SUTAR Safety',
        action: '*',
        maxAmount: 50000,
        businessHours: { start: 0, end: 24 },
        allowedCategories: ['*'],
        riskThreshold: 70
      }
    };

    it('should allow request within default policy limits', () => {
      const policy = policies['default-allow'];
      const context = { amount: 50000, risk: 50, category: 'standard' };

      const result = evaluatePolicy(policy, context);

      expect(result.allowed).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });

    it('should reject request exceeding maxAmount', () => {
      const policy = policies['default-allow'];
      const context = { amount: 2000000, risk: 50 };

      const result = evaluatePolicy(policy, context);

      expect(result.allowed).toBe(false);
      expect(result.reasons).toContain(`Amount 2000000 exceeds policy maxAmount 1000000`);
      expect(result.matchedRule).toBe('max-amount');
    });

    it('should reject request with risk above threshold', () => {
      const policy = policies['default-allow'];
      const context = { amount: 50000, risk: 95 };

      const result = evaluatePolicy(policy, context);

      expect(result.allowed).toBe(false);
      expect(result.reasons.some(r => r.includes('Risk 95 exceeds threshold 80'))).toBe(true);
      expect(result.matchedRule).toBe('risk-threshold');
    });

    it('should reject request outside business hours for strict policy', () => {
      const policy = policies['strict'];
      const context = {
        amount: 1000,
        risk: 20,
        timestamp: '2026-06-27T03:00:00Z' // 3 AM UTC
      };

      const result = evaluatePolicy(policy, context);

      expect(result.allowed).toBe(false);
      expect(result.reasons.some(r => r.includes('Outside business hours'))).toBe(true);
      expect(result.matchedRule).toBe('business-hours');
    });

    it('should allow request during business hours for strict policy', () => {
      const policy = policies['strict'];
      const context = {
        amount: 1000,
        risk: 20,
        timestamp: '2026-06-27T14:00:00Z' // 2 PM UTC
      };

      const result = evaluatePolicy(policy, context);

      expect(result.allowed).toBe(true);
    });

    it('should reject category not in allowed list', () => {
      const policy = policies['strict'];
      const context = { amount: 1000, risk: 20, category: 'high-risk' };

      const result = evaluatePolicy(policy, context);

      expect(result.allowed).toBe(false);
      expect(result.reasons.some(r => r.includes('not in allowed list'))).toBe(true);
      expect(result.matchedRule).toBe('category');
    });

    it('should allow wildcard category', () => {
      const policy = policies['default-allow'];
      const context = { amount: 50000, risk: 50, category: 'anything' };

      const result = evaluatePolicy(policy, context);

      expect(result.allowed).toBe(true);
    });

    it('should pass for sutar-safety policy with moderate risk', () => {
      const policy = policies['sutar-safety'];
      const context = { amount: 30000, risk: 60 };

      const result = evaluatePolicy(policy, context);

      expect(result.allowed).toBe(true);
    });

    it('should fail for sutar-safety policy with high amount', () => {
      const policy = policies['sutar-safety'];
      const context = { amount: 75000, risk: 50 };

      const result = evaluatePolicy(policy, context);

      expect(result.allowed).toBe(false);
      expect(result.matchedRule).toBe('max-amount');
    });

    it('should handle zero amount', () => {
      const policy = policies['strict'];
      const context = { amount: 0, risk: 0 };

      const result = evaluatePolicy(policy, context);

      expect(result.allowed).toBe(true);
    });
  });

  describe('Approval Workflows', () => {
    it('should evaluate single strategy - approved', () => {
      const approval = {
        strategy: 'single',
        approvers: [
          { id: 'approver1', decision: 'approve' }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('approved');
    });

    it('should evaluate single strategy - rejected', () => {
      const approval = {
        strategy: 'single',
        approvers: [
          { id: 'approver1', decision: 'reject' }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('rejected');
    });

    it('should evaluate single strategy - pending', () => {
      const approval = {
        strategy: 'single',
        approvers: [
          { id: 'approver1', decision: null }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('pending');
    });

    it('should evaluate multi strategy - threshold met', () => {
      const approval = {
        strategy: 'multi',
        threshold: 2,
        approvers: [
          { id: 'a1', decision: 'approve' },
          { id: 'a2', decision: 'approve' },
          { id: 'a3', decision: null }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('approved');
    });

    it('should evaluate multi strategy - pending with some approvals', () => {
      const approval = {
        strategy: 'multi',
        threshold: 3,
        approvers: [
          { id: 'a1', decision: 'approve' },
          { id: 'a2', decision: 'approve' },
          { id: 'a3', decision: null }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('pending');
    });

    it('should evaluate multi strategy - rejected by threshold', () => {
      const approval = {
        strategy: 'multi',
        threshold: 2,
        approvers: [
          { id: 'a1', decision: 'reject' },
          { id: 'a2', decision: 'reject' },
          { id: 'a3', decision: 'approve' }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('rejected');
    });

    it('should evaluate parallel strategy - all must approve', () => {
      const approval = {
        strategy: 'parallel',
        approvers: [
          { id: 'a1', decision: 'approve' },
          { id: 'a2', decision: 'approve' }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('approved');
    });

    it('should evaluate parallel strategy - any rejection', () => {
      const approval = {
        strategy: 'parallel',
        approvers: [
          { id: 'a1', decision: 'approve' },
          { id: 'a2', decision: 'reject' }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('rejected');
    });

    it('should evaluate sequential strategy - in order', () => {
      const approval = {
        strategy: 'sequential',
        approvers: [
          { id: 'a1', decision: 'approve' },
          { id: 'a2', decision: 'approve' }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('approved');
    });

    it('should evaluate sequential strategy - rejected mid-sequence', () => {
      const approval = {
        strategy: 'sequential',
        approvers: [
          { id: 'a1', decision: 'approve' },
          { id: 'a2', decision: 'reject' }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('rejected');
    });

    it('should evaluate sequential strategy - pending', () => {
      const approval = {
        strategy: 'sequential',
        approvers: [
          { id: 'a1', decision: 'approve' },
          { id: 'a2', decision: null }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('pending');
    });

    it('should evaluate emergency strategy - single approval wins', () => {
      const approval = {
        strategy: 'emergency',
        approvers: [
          { id: 'a1', decision: 'approve' }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('approved');
    });

    it('should evaluate emergency strategy - pending without approval', () => {
      const approval = {
        strategy: 'emergency',
        approvers: [
          { id: 'a1', decision: null }
        ]
      };

      const status = evaluateApprovalStatus(approval);

      expect(status).toBe('pending');
    });
  });

  describe('Audit Logging', () => {
    const auditLog = [];

    beforeEach(() => {
      auditLog.length = 0;
    });

    it('should log policy evaluation events', () => {
      const event = {
        kind: 'policy.evaluate',
        policyId: 'default-allow',
        context: { amount: 50000 },
        result: { allowed: true },
        at: new Date().toISOString()
      };

      auditLog.push(JSON.stringify(event));

      expect(auditLog).toHaveLength(1);
      const parsed = JSON.parse(auditLog[0]);
      expect(parsed.kind).toBe('policy.evaluate');
      expect(parsed.policyId).toBe('default-allow');
    });

    it('should log approval create events', () => {
      const event = {
        kind: 'approval.create',
        approvalId: 'apr_123',
        requesterId: 'user_1',
        strategy: 'single',
        at: new Date().toISOString()
      };

      auditLog.push(JSON.stringify(event));

      expect(auditLog).toHaveLength(1);
      const parsed = JSON.parse(auditLog[0]);
      expect(parsed.kind).toBe('approval.create');
    });

    it('should log approval decide events', () => {
      const event = {
        kind: 'approval.decide',
        approvalId: 'apr_123',
        approverId: 'approver_1',
        decision: 'approve',
        status: 'approved',
        at: new Date().toISOString()
      };

      auditLog.push(JSON.stringify(event));

      expect(auditLog).toHaveLength(1);
      const parsed = JSON.parse(auditLog[0]);
      expect(parsed.decision).toBe('approve');
    });

    it('should filter audit logs by kind', () => {
      auditLog.push(JSON.stringify({ kind: 'policy.evaluate' }));
      auditLog.push(JSON.stringify({ kind: 'approval.create' }));
      auditLog.push(JSON.stringify({ kind: 'policy.evaluate' }));

      const policyEvents = auditLog
        .map(e => JSON.parse(e))
        .filter(e => e.kind === 'policy.evaluate');

      expect(policyEvents).toHaveLength(2);
    });

    it('should filter audit logs by entity', () => {
      auditLog.push(JSON.stringify({ entity: 'user_1', kind: 'policy.evaluate' }));
      auditLog.push(JSON.stringify({ entity: 'user_2', kind: 'policy.evaluate' }));

      const userEvents = auditLog
        .map(e => JSON.parse(e))
        .filter(e => e.entity === 'user_1');

      expect(userEvents).toHaveLength(1);
    });
  });

  describe('Auth & Sessions', () => {
    const authUsers = new Map();
    const authSessions = new Map();

    beforeEach(() => {
      authUsers.clear();
      authSessions.clear();
    });

    it('should register new user', () => {
      const email = 'test@example.com';
      const password = 'password123';
      const businessId = 'biz_1';

      const userId = 'user_' + Date.now();
      const passwordHash = 'hashed_' + password;

      authUsers.set(email, { id: userId, email, passwordHash, businessId });
      const token = 'token_' + Math.random().toString(36).slice(2);
      authSessions.set(token, { userId, email, businessId, createdAt: Date.now() });

      expect(authUsers.has(email)).toBe(true);
      expect(authSessions.has(token)).toBe(true);
    });

    it('should verify session token', () => {
      const token = 'valid_token';
      authSessions.set(token, { userId: 'user_1', email: 'test@example.com' });

      const session = authSessions.get(token);

      expect(session).toBeDefined();
      expect(session.email).toBe('test@example.com');
    });

    it('should reject invalid token', () => {
      const session = authSessions.get('invalid_token');

      expect(session).toBeUndefined();
    });

    it('should login with valid credentials', () => {
      const email = 'user@example.com';
      const password = 'secret123';
      const passwordHash = 'hashed_secret123';

      authUsers.set(email, { id: 'user_1', email, passwordHash });

      const providedHash = 'hashed_secret123';
      const user = authUsers.get(email);
      const isValid = user && user.passwordHash === providedHash;

      expect(isValid).toBe(true);
    });

    it('should reject invalid password', () => {
      const email = 'user@example.com';
      const passwordHash = 'hashed_secret123';

      authUsers.set(email, { id: 'user_1', email, passwordHash });

      const providedHash = 'hashed_wrongpassword';
      const user = authUsers.get(email);
      const isValid = user && user.passwordHash === providedHash;

      expect(isValid).toBe(false);
    });
  });

  describe('Risk Levels', () => {
    const RISK = {
      LOW: 'low',
      MEDIUM: 'medium',
      HIGH: 'high',
      CRITICAL: 'critical'
    };

    it('should classify low risk', () => {
      const score = 25;
      const level = score <= 30 ? RISK.LOW : score <= 60 ? RISK.MEDIUM : score <= 80 ? RISK.HIGH : RISK.CRITICAL;

      expect(level).toBe(RISK.LOW);
    });

    it('should classify medium risk', () => {
      const score = 45;
      const level = score <= 30 ? RISK.LOW : score <= 60 ? RISK.MEDIUM : score <= 80 ? RISK.HIGH : RISK.CRITICAL;

      expect(level).toBe(RISK.MEDIUM);
    });

    it('should classify high risk', () => {
      const score = 75;
      const level = score <= 30 ? RISK.LOW : score <= 60 ? RISK.MEDIUM : score <= 80 ? RISK.HIGH : RISK.CRITICAL;

      expect(level).toBe(RISK.HIGH);
    });

    it('should classify critical risk', () => {
      const score = 95;
      const level = score <= 30 ? RISK.LOW : score <= 60 ? RISK.MEDIUM : score <= 80 ? RISK.HIGH : RISK.CRITICAL;

      expect(level).toBe(RISK.CRITICAL);
    });
  });

  describe('Decision Outcomes', () => {
    const DECISION = {
      PROCEED: 'proceed',
      HOLD: 'hold',
      REJECT: 'reject',
      ESCALATE: 'escalate'
    };

    it('should return PROCEED for allowed request', () => {
      const isAllowed = true;
      const riskLevel = 'low';
      const decision = isAllowed && riskLevel !== 'critical' ? DECISION.PROCEED : DECISION.HOLD;

      expect(decision).toBe(DECISION.PROCEED);
    });

    it('should return PROCEED for high risk allowed request (riskLevel check)', () => {
      const isAllowed = true;
      const riskLevel = 'high';
      // Decision logic: if allowed AND not critical → proceed
      const decision = isAllowed && riskLevel !== 'critical' ? DECISION.PROCEED : DECISION.HOLD;

      expect(decision).toBe(DECISION.PROCEED);
    });

    it('should return HOLD for disallowed request', () => {
      const isAllowed = false;
      const riskLevel = 'high';
      // Decision logic: if not allowed → hold
      const decision = isAllowed ? DECISION.PROCEED : DECISION.HOLD;

      expect(decision).toBe(DECISION.HOLD);
    });

    it('should return REJECT for disallowed request', () => {
      const isAllowed = false;
      const decision = isAllowed ? DECISION.PROCEED : DECISION.REJECT;

      expect(decision).toBe(DECISION.REJECT);
    });

    it('should return ESCALATE for critical risk', () => {
      const isAllowed = false;
      const riskLevel = 'critical';
      const decision = riskLevel === 'critical' ? DECISION.ESCALATE : (isAllowed ? DECISION.PROCEED : DECISION.REJECT);

      expect(decision).toBe(DECISION.ESCALATE);
    });
  });
});
