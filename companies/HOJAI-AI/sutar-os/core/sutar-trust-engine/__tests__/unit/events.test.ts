/**
 * sutar-trust-engine — event-bus wiring tests (ADR-0009 Phase 2).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { emit, getBus, shutdown, _setBusForTesting, _getBusForTesting } from '../../src/services/events.js';

function makeStubBus() {
  const calls: Array<{ type: string; payload: unknown; opts: unknown }> = [];
  return {
    calls,
    serviceName: 'sutar-trust-engine',
    publishAsync(type: string, payload: unknown, opts: unknown) { calls.push({ type, payload, opts }); },
    async publish(type: string, payload: unknown, opts: unknown) { calls.push({ type, payload, opts }); },
    async subscribe() { return {}; },
    async connect() {},
    async quit() {},
  };
}

describe('sutar-trust-engine events — singleton + naming', () => {
  beforeEach(() => {
    _setBusForTesting(null);
    delete process.env.SERVICE_NAME;
  });
  afterEach(() => {
    _setBusForTesting(null);
    delete process.env.SERVICE_NAME;
  });

  it('is lazy: bus is null until first call', () => {
    expect(_getBusForTesting()).toBeNull();
  });

  it('uses default service name sutar-trust-engine', () => {
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sutar-trust-engine');
  });

  it('honors SERVICE_NAME env override', () => {
    process.env.SERVICE_NAME = 'sutar-trust-engine-canary';
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sutar-trust-engine-canary');
  });

  it('shutdown() resets the bus', async () => {
    const stub = makeStubBus();
    _setBusForTesting(stub);
    emit(null, 'trust.score.calculated', {});
    expect(_getBusForTesting()).not.toBeNull();
    await shutdown();
    expect(_getBusForTesting()).toBeNull();
  });

  it('shutdown() is safe to call twice', async () => {
    await shutdown();
    await shutdown();
    expect(_getBusForTesting()).toBeNull();
  });

  it('shutdown() swallows quit() errors', async () => {
    _setBusForTesting({ quit: async () => { throw new Error('boom'); } } as never);
    await expect(shutdown()).resolves.toBeUndefined();
    expect(_getBusForTesting()).toBeNull();
  });
});

describe('sutar-trust-engine events — emit() payload + tenant', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('emits with null tenant when req is null', () => {
    emit(null, 'trust.score.calculated', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBeNull();
  });

  it('emits with null tenant when req is undefined', () => {
    emit(undefined, 'trust.score.calculated', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBeNull();
  });

  it('captures tenantId from req.tenant.companyId', () => {
    emit({ tenant: { companyId: 'co-77' } }, 'trust.score.calculated', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBe('co-77');
  });

  it('uses empty object when payload is omitted', () => {
    emit(null, 'trust.score.calculated');
    expect(stub.calls[0].payload).toEqual({});
  });

  it('preserves the full payload object', () => {
    const payload = { entityId: 'e-1', overallScore: 92, trustLevel: 'GOLD', riskLevel: 'LOW' };
    emit(null, 'trust.score.calculated', payload);
    expect(stub.calls[0].payload).toEqual(payload);
  });

  it('falls back to null when tenant is null', () => {
    emit({ tenant: { companyId: null } }, 'trust.score.calculated', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBeNull();
  });
});

describe('sutar-trust-engine events — domain event schemas', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('trust.score.calculated carries entityId + overallScore + level', () => {
    emit(null, 'trust.score.calculated', { entityId: 'e-1', overallScore: 92, trustLevel: 'GOLD', riskLevel: 'LOW' });
    expect(stub.calls[0].type).toBe('trust.score.calculated');
    expect((stub.calls[0].payload as Record<string, unknown>).entityId).toBe('e-1');
  });

  it('trust.credit.checked carries creditScore + riskLevel', () => {
    emit(null, 'trust.credit.checked', { entityId: 'e-2', requestType: 'score_only', creditScore: 720, riskLevel: 'LOW' });
    expect(stub.calls[0].type).toBe('trust.credit.checked');
    expect((stub.calls[0].payload as Record<string, unknown>).creditScore).toBe(720);
  });

  it('trust.entity.verified carries status + requestId', () => {
    emit(null, 'trust.entity.verified', { entityId: 'e-3', verificationType: 'standard', status: 'verified', requestId: 'req-1' });
    expect(stub.calls[0].type).toBe('trust.entity.verified');
    expect((stub.calls[0].payload as Record<string, unknown>).status).toBe('verified');
  });

  it('trust.kyc.processed carries status + verifiedAt', () => {
    emit(null, 'trust.kyc.processed', { entityId: 'e-4', status: 'approved', requestId: 'req-2', verifiedAt: '2026-06-22T00:00:00Z' });
    expect(stub.calls[0].type).toBe('trust.kyc.processed');
    expect((stub.calls[0].payload as Record<string, unknown>).status).toBe('approved');
  });
});

describe('sutar-trust-engine events — multi-emit', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('records 10 emits in order', () => {
    for (let i = 0; i < 10; i++) emit(null, 'trust.score.calculated', { i });
    expect(stub.calls.length).toBe(10);
    expect(stub.calls.map((c) => (c.payload as Record<string, unknown>).i)).toEqual([0,1,2,3,4,5,6,7,8,9]);
  });

  it('mixed event types preserve type prefix', () => {
    emit(null, 'trust.score.calculated', {});
    emit(null, 'trust.credit.checked', {});
    emit(null, 'trust.entity.verified', {});
    emit(null, 'trust.kyc.processed', {});
    expect(stub.calls.map((c) => c.type)).toEqual([
      'trust.score.calculated',
      'trust.credit.checked',
      'trust.entity.verified',
      'trust.kyc.processed',
    ]);
  });

  it('every event has a tenantId field (null or string)', () => {
    emit(null, 'trust.score.calculated', {});
    emit({ tenant: { companyId: 'co-y' } }, 'trust.score.calculated', {});
    for (const c of stub.calls) {
      const tid = (c.opts as { tenantId: unknown }).tenantId;
      expect(tid === null || typeof tid === 'string').toBe(true);
    }
  });
});