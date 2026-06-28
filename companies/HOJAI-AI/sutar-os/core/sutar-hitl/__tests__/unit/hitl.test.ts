/**
 * SUTAR OS — HITL Service Tests
 */
import { describe, it, expect, beforeEach } from 'vitest';

describe('HITL — Priority Determination', () => {
  function determinePriority(value, riskScore, urgency) {
    if (urgency === 'critical') return 'critical';
    if (urgency === 'high') return 'high';
    if (value > 100000 || riskScore > 0.8) return 'high';
    if (value > 50000 || riskScore > 0.5) return 'medium';
    return 'low';
  }

  it('returns critical for critical urgency', () => {
    expect(determinePriority(100, 0.1, 'critical')).toBe('critical');
    expect(determinePriority(10, 0.01, 'critical')).toBe('critical');
  });

  it('returns high for high urgency', () => {
    expect(determinePriority(100, 0.1, 'high')).toBe('high');
  });

  it('returns high for high value', () => {
    expect(determinePriority(150000, 0.3, 'medium')).toBe('high');
  });

  it('returns high for high risk score', () => {
    expect(determinePriority(10000, 0.85, 'medium')).toBe('high');
  });

  it('returns medium for medium-high value', () => {
    expect(determinePriority(60000, 0.3, 'medium')).toBe('medium');
  });

  it('returns medium for medium risk score', () => {
    expect(determinePriority(10000, 0.55, 'medium')).toBe('medium');
  });

  it('returns low by default', () => {
    expect(determinePriority(5000, 0.2, 'medium')).toBe('low');
    expect(determinePriority(100, 0.1, 'low')).toBe('low');
  });
});

describe('HITL — Auto-Approve Thresholds', () => {
  const THRESHOLDS = {
    value_usd: 1000,
    risk_score: 0.2,
    contract_value: 5000,
    data_access_level: 'internal',
  };

  function shouldAutoApprove(params) {
    return (
      params.value < THRESHOLDS.value_usd &&
      params.riskScore < THRESHOLDS.risk_score &&
      (params.dataAccessLevel || 'internal') === 'internal'
    );
  }

  it('auto-approves low-value low-risk internal actions', () => {
    expect(shouldAutoApprove({ value: 500, riskScore: 0.1, dataAccessLevel: 'internal' })).toBe(true);
  });

  it('does not auto-approve high value', () => {
    expect(shouldAutoApprove({ value: 2000, riskScore: 0.1, dataAccessLevel: 'internal' })).toBe(false);
  });

  it('does not auto-approve high risk', () => {
    expect(shouldAutoApprove({ value: 500, riskScore: 0.5, dataAccessLevel: 'internal' })).toBe(false);
  });

  it('does not auto-approve external data access', () => {
    expect(shouldAutoApprove({ value: 500, riskScore: 0.1, dataAccessLevel: 'external' })).toBe(false);
  });

  it('does not auto-approve at exact threshold', () => {
    expect(shouldAutoApprove({ value: 1000, riskScore: 0.1, dataAccessLevel: 'internal' })).toBe(false);
  });

  it('does not auto-approve at risk threshold', () => {
    expect(shouldAutoApprove({ value: 500, riskScore: 0.2, dataAccessLevel: 'internal' })).toBe(false);
  });
});

describe('HITL — Gate Lifecycle', () => {
  function createGate(params) {
    return {
      gateId: 'gate-1',
      status: params.value < 1000 && params.riskScore < 0.2 ? 'auto_approved' : 'pending',
      priority: params.urgency === 'critical' ? 'critical' : params.value > 100000 ? 'high' : 'low',
      ...params,
    };
  }

  function approveGate(gate) {
    if (gate.status !== 'pending') throw new Error(`Gate is not pending: ${gate.status}`);
    return { ...gate, status: 'approved', approvedAt: new Date().toISOString() };
  }

  function rejectGate(gate, reason) {
    if (gate.status !== 'pending') throw new Error(`Gate is not pending: ${gate.status}`);
    return { ...gate, status: 'rejected', rejectedAt: new Date().toISOString(), rejectionReason: reason };
  }

  it('auto-approves below thresholds', () => {
    const gate = createGate({ value: 500, riskScore: 0.1 });
    expect(gate.status).toBe('auto_approved');
  });

  it('marks above-threshold as pending', () => {
    const gate = createGate({ value: 5000, riskScore: 0.1 });
    expect(gate.status).toBe('pending');
  });

  it('transitions pending to approved', () => {
    const gate = createGate({ value: 5000, riskScore: 0.3 });
    const approved = approveGate(gate);
    expect(approved.status).toBe('approved');
    expect(approved.approvedAt).toBeDefined();
  });

  it('transitions pending to rejected', () => {
    const gate = createGate({ value: 5000, riskScore: 0.3 });
    const rejected = rejectGate(gate, 'Budget exceeded');
    expect(rejected.status).toBe('rejected');
    expect(rejected.rejectionReason).toBe('Budget exceeded');
  });

  it('does not approve already approved gate', () => {
    const gate = createGate({ value: 500, riskScore: 0.1 });
    expect(() => approveGate(gate)).toThrow('Gate is not pending: auto_approved');
  });

  it('does not reject already rejected gate', () => {
    const gate = { ...createGate({ value: 5000, riskScore: 0.3 }), status: 'rejected' };
    expect(() => rejectGate(gate, 'reason')).toThrow('Gate is not pending: rejected');
  });
});

describe('HITL — Escalation', () => {
  function escalateGate(gate, toApprover) {
    if (gate.status !== 'pending') throw new Error('Gate is not pending');
    return { ...gate, status: 'escalated', escalatedTo: toApprover, escalatedAt: new Date().toISOString() };
  }

  it('escalates pending gate', () => {
    const gate = { status: 'pending', gateId: 'gate-1' };
    const escalated = escalateGate(gate, 'senior_manager');
    expect(escalated.status).toBe('escalated');
    expect(escalated.escalatedTo).toBe('senior_manager');
  });

  it('does not escalate approved gate', () => {
    const gate = { status: 'approved', gateId: 'gate-1' };
    expect(() => escalateGate(gate, 'senior')).toThrow('Gate is not pending');
  });
});

describe('HITL — Override Authorization', () => {
  function overrideGate(gate, params) {
    const allowedRoles = ['admin', 'security_officer', 'compliance_officer'];
    if (!allowedRoles.includes(params.role)) {
      return { error: 'Insufficient role', required: allowedRoles };
    }
    return { ...gate, status: 'approved', overridden: true, decidedBy: params.overrideBy };
  }

  it('allows admin to override', () => {
    const gate = { status: 'rejected', gateId: 'gate-1' };
    const result = overrideGate(gate, { role: 'admin', overrideBy: 'admin@co.com' });
    expect(result.status).toBe('approved');
    expect(result.overridden).toBe(true);
  });

  it('allows security_officer to override', () => {
    const gate = { status: 'rejected', gateId: 'gate-1' };
    const result = overrideGate(gate, { role: 'security_officer', overrideBy: 'so@co.com' });
    expect(result.status).toBe('approved');
  });

  it('allows compliance_officer to override', () => {
    const gate = { status: 'rejected', gateId: 'gate-1' };
    const result = overrideGate(gate, { role: 'compliance_officer', overrideBy: 'co@co.com' });
    expect(result.status).toBe('approved');
  });

  it('denies regular user override', () => {
    const gate = { status: 'rejected', gateId: 'gate-1' };
    const result = overrideGate(gate, { role: 'user', overrideBy: 'user@co.com' });
    expect(result.error).toBe('Insufficient role');
  });

  it('denies unknown role override', () => {
    const gate = { status: 'rejected', gateId: 'gate-1' };
    const result = overrideGate(gate, { role: 'guest', overrideBy: 'guest@co.com' });
    expect(result.error).toBe('Insufficient role');
  });
});

describe('HITL — Delegation', () => {
  function delegateGate(gate, toApprover) {
    return { ...gate, currentApprover: toApprover };
  }

  it('changes current approver on delegation', () => {
    const gate = { currentApprover: 'manager@co.com', gateId: 'gate-1' };
    const delegated = delegateGate(gate, 'director@co.com');
    expect(delegated.currentApprover).toBe('director@co.com');
  });
});

describe('HITL — SLA Calculation', () => {
  function timeToDecideHours(createdAt, decidedAt) {
    return Math.round((new Date(decidedAt).getTime() - new Date(createdAt).getTime()) / (1000 * 60 * 60));
  }

  it('calculates hours to decision', () => {
    const created = '2026-06-27T10:00:00.000Z';
    const decided = '2026-06-27T14:30:00.000Z';
    expect(timeToDecideHours(created, decided)).toBe(5);
  });

  it('rounds to nearest hour', () => {
    const created = '2026-06-27T10:00:00.000Z';
    const decided = '2026-06-27T10:29:00.000Z';
    expect(timeToDecideHours(created, decided)).toBe(0);
  });
});

describe('HITL — Audit Event Shape', () => {
  function logAuditEvent(params) {
    return {
      id: 'evt-1',
      timestamp: new Date().toISOString(),
      actor: params.actor,
      actorType: params.actorType || 'unknown',
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      outcome: params.outcome,
      metadata: params.metadata || {},
    };
  }

  it('creates approval audit event', () => {
    const evt = logAuditEvent({
      actor: 'manager@co.com',
      actorType: 'human',
      action: 'gate_approved',
      resource: 'hitl_gate',
      resourceId: 'gate-1',
      outcome: 'success',
      metadata: { value: 50000, action: 'contract_sign' },
    });
    expect(evt.actor).toBe('manager@co.com');
    expect(evt.actorType).toBe('human');
    expect(evt.action).toBe('gate_approved');
    expect(evt.metadata.value).toBe(50000);
  });

  it('creates rejection audit event', () => {
    const evt = logAuditEvent({
      actor: 'manager@co.com',
      actorType: 'human',
      action: 'gate_rejected',
      resource: 'hitl_gate',
      resourceId: 'gate-1',
      outcome: 'success',
      metadata: { reason: 'Budget exceeded' },
    });
    expect(evt.action).toBe('gate_rejected');
    expect(evt.metadata.reason).toBe('Budget exceeded');
  });

  it('creates override denial audit event', () => {
    const evt = logAuditEvent({
      actor: 'user@co.com',
      actorType: 'human',
      action: 'gate_override_denied',
      resource: 'hitl_gate',
      resourceId: 'gate-1',
      outcome: 'failure',
      metadata: { attemptedRole: 'user' },
    });
    expect(evt.action).toBe('gate_override_denied');
    expect(evt.outcome).toBe('failure');
  });
});