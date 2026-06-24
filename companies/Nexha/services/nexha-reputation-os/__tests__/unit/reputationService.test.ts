/**
 * nexha-reputation-os — Reputation service unit tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import reputationService from '../../src/services/reputationService.js';

describe('Reputation Service — base state', () => {
  beforeEach(() => {
    reputationService.reset();
  });

  it('seeds demo subjects on first call', () => {
    const count = reputationService.seedDemo();
    expect(count).toBeGreaterThan(0);
    const stats = reputationService.getFederationStats();
    expect(stats.totalSubjects).toBe(count);
  });

  it('does not double-seed', () => {
    reputationService.seedDemo();
    const first = reputationService.getFederationStats().totalSubjects;
    reputationService.seedDemo();
    expect(reputationService.getFederationStats().totalSubjects).toBe(first);
  });

  it('seeds with different ACI scores (maya is platinum, tax advisor is below average)', () => {
    reputationService.seedDemo();
    const maya = reputationService.get('nexha-maya-collective');
    const tax = reputationService.get('service-tax-advisor');
    expect(maya).toBeTruthy();
    expect(tax).toBeTruthy();
    // Maya has many success + endorsements + verifications → very high ACI
    expect(maya!.aci).toBeGreaterThan(900);
    // Tax has failures + dispute + risk → below neutral (500)
    expect(tax!.aci).toBeLessThan(500);
  });
});

describe('Reputation Service — ingest + recompute', () => {
  beforeEach(() => {
    reputationService.reset();
  });

  it('ingests a transaction success signal and increases ACI', () => {
    const before = reputationService.get('test-subject')?.aci ?? 500;
    reputationService.ingest('test-subject', 'agent', {
      kind: 'transaction_success', weight: 1, occurredAt: new Date().toISOString()
    });
    const after = reputationService.get('test-subject');
    expect(after).toBeTruthy();
    expect(after!.aci).toBeGreaterThan(before);
  });

  it('transaction failure decreases ACI', () => {
    const before = reputationService.get('test-subject')?.aci ?? 500;
    reputationService.ingest('test-subject', 'merchant', {
      kind: 'transaction_failure', weight: 1, occurredAt: new Date().toISOString()
    });
    const after = reputationService.get('test-subject')!.aci;
    expect(after).toBeLessThan(before);
  });

  it('risk_event_critical drops ACI significantly', () => {
    reputationService.ingest('risky-actor', 'user', {
      kind: 'risk_event_critical', weight: 1, occurredAt: new Date().toISOString()
    });
    expect(reputationService.get('risky-actor')!.aci).toBeLessThan(450);
  });

  it('verification_kyc boosts into a higher band', () => {
    reputationService.ingest('verified-actor', 'nexha', {
      kind: 'verification_kyc', weight: 1, verifierId: 'v-1', occurredAt: new Date().toISOString()
    });
    const score = reputationService.get('verified-actor')!;
    expect(score.aci).toBeGreaterThanOrEqual(550);
    expect(score.band).not.toBe('iron');
  });

  it('composite signals produce balanced score', () => {
    // 5 successes + 1 failure + 1 dispute_against + 1 verification_business
    const now = new Date().toISOString();
    reputationService.ingest('balanced', 'agent', { kind: 'transaction_success', weight: 1, occurredAt: now });
    reputationService.ingest('balanced', 'agent', { kind: 'transaction_success', weight: 1, occurredAt: now });
    reputationService.ingest('balanced', 'agent', { kind: 'transaction_success', weight: 1, occurredAt: now });
    reputationService.ingest('balanced', 'agent', { kind: 'transaction_success', weight: 1, occurredAt: now });
    reputationService.ingest('balanced', 'agent', { kind: 'transaction_success', weight: 1, occurredAt: now });
    reputationService.ingest('balanced', 'agent', { kind: 'transaction_failure', weight: 1, occurredAt: now });
    reputationService.ingest('balanced', 'agent', { kind: 'dispute_resolved_against', weight: 1, occurredAt: now });
    reputationService.ingest('balanced', 'agent', { kind: 'verification_business', weight: 1, verifierId: 'v', occurredAt: now });
    const score = reputationService.get('balanced')!;
    // Should be slightly above 500 (net positive)
    expect(score.aci).toBeGreaterThan(500);
    expect(score.aci).toBeLessThan(700);
  });
});

describe('Reputation Service — bands', () => {
  beforeEach(() => {
    reputationService.reset();
  });

  it('derives platinum band for ACI >= 900', () => {
    const now = new Date().toISOString();
    // 100 successful transactions to push high
    for (let i = 0; i < 100; i++) {
      reputationService.ingest('platinum-actor', 'nexha', {
        kind: 'transaction_success', weight: 1, occurredAt: now
      });
    }
    reputationService.ingest('platinum-actor', 'nexha', {
      kind: 'verification_kyc', weight: 1, verifierId: 'v', occurredAt: now
    });
    reputationService.ingest('platinum-actor', 'nexha', {
      kind: 'verification_business', weight: 1, verifierId: 'v', occurredAt: now
    });
    const score = reputationService.get('platinum-actor')!;
    expect(score.band).toBe('platinum');
  });

  it('derives restricted band for ACI < 300', () => {
    const now = new Date().toISOString();
    reputationService.ingest('restricted-actor', 'user', {
      kind: 'risk_event_critical', weight: 5, occurredAt: now
    });
    reputationService.ingest('restricted-actor', 'user', {
      kind: 'dispute_resolved_against', weight: 5, occurredAt: now
    });
    const score = reputationService.get('restricted-actor')!;
    expect(score.band).toBe('restricted');
    expect(score.aci).toBeLessThan(300);
  });

  it('starts at bronze for new subjects (500 = bronze)', () => {
    reputationService.ingest('newcomer', 'agent', {
      kind: 'endorsement_received', weight: 1, endorserId: 'v', occurredAt: new Date().toISOString()
    });
    const score = reputationService.get('newcomer')!;
    // 500 base + 8 endorsement = 508 → still bronze (< silver=700)
    expect(score.band).toBe('bronze');
  });
});

describe('Reputation Service — queries + signals', () => {
  beforeEach(() => {
    reputationService.reset();
    reputationService.seedDemo();
  });

  it('queries all scores sorted by ACI desc', () => {
    const result = reputationService.query({});
    expect(result.total).toBeGreaterThan(0);
    for (let i = 1; i < result.scores.length; i++) {
      expect(result.scores[i - 1].aci).toBeGreaterThanOrEqual(result.scores[i].aci);
    }
  });

  it('filters by subjectType', () => {
    const result = reputationService.query({ subjectType: 'agent' });
    for (const s of result.scores) {
      expect(s.subjectType).toBe('agent');
    }
  });

  it('filters by band', () => {
    const result = reputationService.query({ band: 'gold' });
    for (const s of result.scores) {
      expect(s.band).toBe('gold');
    }
  });

  it('filters by minAci', () => {
    const result = reputationService.query({ minAci: 700 });
    for (const s of result.scores) {
      expect(s.aci).toBeGreaterThanOrEqual(700);
    }
  });

  it('paginates with limit + offset', () => {
    const all = reputationService.query({});
    const page1 = reputationService.query({ limit: 2, offset: 0 });
    const page2 = reputationService.query({ limit: 2, offset: 2 });
    expect(page1.scores.length).toBe(2);
    expect(page2.scores.length).toBeGreaterThan(0);
    // Different subjects
    const page1Ids = page1.scores.map((s) => s.subjectId);
    const page2Ids = page2.scores.map((s) => s.subjectId);
    expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
  });

  it('retrieves signals for a subject', () => {
    const sigs = reputationService.getSignals('nexha-maya-collective');
    expect(sigs.length).toBeGreaterThan(0);
  });

  it('filters signals by kind', () => {
    const successes = reputationService.getSignalsByKind('nexha-maya-collective', 'transaction_success');
    expect(successes.length).toBeGreaterThan(0);
    for (const s of successes) {
      expect(s.kind).toBe('transaction_success');
    }
  });
});

describe('Reputation Service — federation stats', () => {
  beforeEach(() => {
    reputationService.reset();
    reputationService.seedDemo();
  });

  it('computes federation-wide aggregate stats', () => {
    const stats = reputationService.getFederationStats();
    expect(stats.totalSubjects).toBeGreaterThan(0);
    expect(stats.totalSignals).toBeGreaterThan(0);
    expect(stats.averageAci).toBeGreaterThan(0);
    expect(stats.averageAci).toBeLessThanOrEqual(1000);
    expect(stats.topPerformers.length).toBeGreaterThan(0);
  });

  it('groups by band correctly', () => {
    const stats = reputationService.getFederationStats();
    const totalFromBands = Object.values(stats.byBand).reduce((s, n) => s + n, 0);
    expect(totalFromBands).toBe(stats.totalSubjects);
  });

  it('groups by subject type correctly', () => {
    const stats = reputationService.getFederationStats();
    const totalFromTypes = Object.values(stats.bySubjectType).reduce((s, n) => s + n, 0);
    expect(totalFromTypes).toBe(stats.totalSubjects);
  });
});

describe('Reputation Service — versioning + idempotency', () => {
  beforeEach(() => {
    reputationService.reset();
  });

  it('increments version on each ingest', () => {
    const s1 = reputationService.ingest('v-test', 'agent', {
      kind: 'transaction_success', weight: 1, occurredAt: new Date().toISOString()
    });
    const s2 = reputationService.ingest('v-test', 'agent', {
      kind: 'transaction_success', weight: 1, occurredAt: new Date().toISOString()
    });
    expect(s2.version).toBeGreaterThan(s1.version);
  });

  it('updates signalCount after ingest', () => {
    reputationService.ingest('count-test', 'agent', {
      kind: 'transaction_success', weight: 1, occurredAt: new Date().toISOString()
    });
    expect(reputationService.get('count-test')!.signalCount).toBe(1);
    reputationService.ingest('count-test', 'agent', {
      kind: 'transaction_success', weight: 1, occurredAt: new Date().toISOString()
    });
    expect(reputationService.get('count-test')!.signalCount).toBe(2);
  });
});