/**
 * SUTAR OS — Compliance Service Tests
 */
import { describe, it, expect } from 'vitest';

describe('Compliance — Audit Event Shape', () => {
  function logAuditEvent(params) {
    return {
      id: 'evt-1',
      timestamp: new Date().toISOString(),
      actor: params.actor || 'system',
      actorType: params.actorType || 'agent',
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      outcome: params.outcome || 'success',
      metadata: params.metadata || {},
      dataCategory: params.dataCategory || 'general',
      piiInvolved: params.piiInvolved || false,
      gdprRelevant: params.gdprRelevant || false,
      jurisdiction: params.jurisdiction || 'EU',
    };
  }

  it('creates audit event with required fields', () => {
    const evt = logAuditEvent({ action: 'contract_signed', resource: 'contract', resourceId: 'c-1' });
    expect(evt.actor).toBe('system');
    expect(evt.action).toBe('contract_signed');
    expect(evt.resource).toBe('contract');
    expect(evt.resourceId).toBe('c-1');
    expect(evt.outcome).toBe('success');
  });

  it('marks GDPR-relevant events', () => {
    const evt = logAuditEvent({ action: 'pii_accessed', resource: 'customer_data', gdprRelevant: true, piiInvolved: true });
    expect(evt.gdprRelevant).toBe(true);
    expect(evt.piiInvolved).toBe(true);
  });

  it('sets actor type correctly', () => {
    const humanEvt = logAuditEvent({ actorType: 'human', action: 'gate_approved' });
    const agentEvt = logAuditEvent({ actorType: 'agent', action: 'negotiation_started' });
    expect(humanEvt.actorType).toBe('human');
    expect(agentEvt.actorType).toBe('agent');
  });
});

describe('Compliance — GDPR Data Subject', () => {
  function registerDataSubject(params) {
    return {
      subjectId: params.subjectId || 'sub-1',
      email: params.email,
      fullName: params.fullName,
      registeredAt: new Date().toISOString(),
      gdprConsent: false,
      erasureRequested: false,
      erasureCompletedAt: null,
      dataCategories: params.dataCategories || [],
      controller: 'SUTAR OS',
    };
  }

  it('creates data subject with defaults', () => {
    const subject = registerDataSubject({ email: 'user@example.com', fullName: 'John Doe' });
    expect(subject.email).toBe('user@example.com');
    expect(subject.gdprConsent).toBe(false);
    expect(subject.erasureRequested).toBe(false);
    expect(subject.controller).toBe('SUTAR OS');
  });

  it('sets data categories', () => {
    const subject = registerDataSubject({ email: 'u@e.com', dataCategories: ['contact', 'transactions'] });
    expect(subject.dataCategories).toContain('contact');
    expect(subject.dataCategories).toContain('transactions');
  });
});

describe('Compliance — Consent Management', () => {
  function checkConsent(records, subjectId, purpose) {
    const filtered = records.filter(c => c.subjectId === subjectId && c.purpose === purpose);
    if (!filtered.length) return { granted: false, reason: 'no_consent_record' };
    const latest = filtered.sort((a, b) => b.timestamp.localeCompare(a.timestamp))[0];
    return { granted: latest.granted, consentId: latest.consentId, timestamp: latest.timestamp };
  }

  it('returns false when no consent record exists', () => {
    const result = checkConsent([], 'sub-1', 'marketing');
    expect(result.granted).toBe(false);
    expect(result.reason).toBe('no_consent_record');
  });

  it('returns latest consent for subject and purpose', () => {
    const records = [
      { subjectId: 'sub-1', purpose: 'marketing', granted: false, timestamp: '2026-01-01', consentId: 'c-1' },
      { subjectId: 'sub-1', purpose: 'marketing', granted: true, timestamp: '2026-06-01', consentId: 'c-2' },
    ];
    const result = checkConsent(records, 'sub-1', 'marketing');
    expect(result.granted).toBe(true);
    expect(result.consentId).toBe('c-2');
  });
});

describe('Compliance — Data Retention', () => {
  function applyRetentionPolicy(policy, auditLog) {
    const cutoff = Date.now() - policy.retentionDays * 24 * 60 * 60 * 1000;
    const oldEvents = auditLog.filter(e => e.dataCategory === policy.dataType && new Date(e.timestamp).getTime() < cutoff);
    return {
      policyId: policy.policyId,
      dataType: policy.dataType,
      totalEvents: auditLog.length,
      eventsBeforeCutoff: oldEvents.length,
      retentionDays: policy.retentionDays,
      purgeRecommended: oldEvents.length > 0,
    };
  }

  it('recommends purge when old events exist', () => {
    const policy = { policyId: 'p-1', dataType: 'login_events', retentionDays: 90 };
    const oldEvent = { dataCategory: 'login_events', timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString() };
    const result = applyRetentionPolicy(policy, [oldEvent]);
    expect(result.purgeRecommended).toBe(true);
    expect(result.eventsBeforeCutoff).toBe(1);
  });

  it('does not recommend purge when all events are recent', () => {
    const policy = { policyId: 'p-1', dataType: 'login_events', retentionDays: 90 };
    const recentEvent = { dataCategory: 'login_events', timestamp: new Date().toISOString() };
    const result = applyRetentionPolicy(policy, [recentEvent]);
    expect(result.purgeRecommended).toBe(false);
    expect(result.eventsBeforeCutoff).toBe(0);
  });
});

describe('Compliance — Access Review', () => {
  function generateAccessReview(events) {
    const actors = {};
    for (const evt of events.slice(-100)) {
      if (!actors[evt.actor]) actors[evt.actor] = { actor: evt.actor, actions: 0, resources: new Set() };
      actors[evt.actor].actions++;
      actors[evt.actor].resources.add(evt.resource);
    }
    return {
      totalActors: Object.keys(actors).length,
      actors: Object.values(actors).map(a => ({ ...a, resources: a.resources.size })),
    };
  }

  it('counts actors from events', () => {
    const events = [
      { actor: 'agent-1', resource: 'contract' },
      { actor: 'agent-1', resource: 'contract' },
      { actor: 'agent-2', resource: 'negotiation' },
    ];
    const review = generateAccessReview(events);
    expect(review.totalActors).toBe(2);
  });

  it('counts actions per actor', () => {
    const events = [
      { actor: 'agent-1', resource: 'a' },
      { actor: 'agent-1', resource: 'b' },
      { actor: 'agent-1', resource: 'c' },
      { actor: 'agent-2', resource: 'd' },
    ];
    const review = generateAccessReview(events);
    const a1 = review.actors.find(a => a.actor === 'agent-1');
    expect(a1.actions).toBe(3);
  });
});

describe('Compliance — IP Hashing', () => {
  function hashIp(ip) {
    if (!ip) return null;
    let hash = 0;
    for (let i = 0; i < ip.length; i++) {
      hash = ((hash << 5) - hash) + ip.charCodeAt(i);
      hash |= 0;
    }
    return 'hash_' + Math.abs(hash).toString(16);
  }

  it('hashes IP address', () => {
    const hashed = hashIp('192.168.1.1');
    expect(hashed).toMatch(/^hash_[0-9a-f]+$/);
  });

  it('returns null for empty IP', () => {
    expect(hashIp('')).toBeNull();
    expect(hashIp(null)).toBeNull();
    expect(hashIp(undefined)).toBeNull();
  });

  it('produces consistent hash for same IP', () => {
    const h1 = hashIp('10.0.0.1');
    const h2 = hashIp('10.0.0.1');
    expect(h1).toBe(h2);
  });

  it('produces different hash for different IPs', () => {
    const h1 = hashIp('10.0.0.1');
    const h2 = hashIp('10.0.0.2');
    expect(h1).not.toBe(h2);
  });
});