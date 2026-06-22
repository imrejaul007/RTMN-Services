/**
 * sada-os — event-bus wiring tests (ADR-0009 Phase 2).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { emit, getBus, shutdown, _setBusForTesting, _getBusForTesting } from '../../src/services/events.js';

function makeStubBus() {
  const calls: Array<{ type: string; payload: unknown; opts: unknown }> = [];
  return {
    calls,
    serviceName: 'sada-os',
    publishAsync(type: string, payload: unknown, opts: unknown) { calls.push({ type, payload, opts }); },
    async publish(type: string, payload: unknown, opts: unknown) { calls.push({ type, payload, opts }); },
    async subscribe() { return {}; },
    async connect() {},
    async quit() {},
  };
}

describe('sada-os events — singleton + naming', () => {
  beforeEach(() => { _setBusForTesting(null); delete process.env.SERVICE_NAME; });
  afterEach(() => { _setBusForTesting(null); delete process.env.SERVICE_NAME; });

  it('uses default service name sada-os', () => {
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sada-os');
  });

  it('honors SERVICE_NAME env override', () => {
    process.env.SERVICE_NAME = 'sada-os-canary';
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sada-os-canary');
  });

  it('shutdown() resets the bus', async () => {
    const stub = makeStubBus();
    _setBusForTesting(stub);
    emit(null, 'sada.trust.activity', {});
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
  });
});

describe('sada-os events — emit() payload + tenant', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('emits with null tenant when req is null', () => {
    emit(null, 'sada.trust.activity', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBeNull();
  });

  it('captures tenantId from req.tenant.companyId', () => {
    emit({ tenant: { companyId: 'co-sa' } }, 'sada.trust.activity', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBe('co-sa');
  });

  it('uses empty object when payload is omitted', () => {
    emit(null, 'sada.trust.activity');
    expect(stub.calls[0].payload).toEqual({});
  });

  it('preserves the full payload object', () => {
    const payload = { entityId: 'e-1', success: true, overallScore: 85, riskLevel: 'LOW', amount: 100 };
    emit(null, 'sada.trust.activity', payload);
    expect(stub.calls[0].payload).toEqual(payload);
  });
});

describe('sada-os events — domain event schemas', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('sada.trust.activity carries entityId + overallScore + riskLevel', () => {
    emit(null, 'sada.trust.activity', { entityId: 'e-1', success: true, overallScore: 92, riskLevel: 'LOW', amount: 500 });
    expect(stub.calls[0].type).toBe('sada.trust.activity');
    expect((stub.calls[0].payload as Record<string, unknown>).overallScore).toBe(92);
    expect((stub.calls[0].payload as Record<string, unknown>).riskLevel).toBe('LOW');
  });
});

describe('sada-os events — multi-emit', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('records 6 emits in order', () => {
    for (let i = 0; i < 6; i++) emit(null, 'sada.trust.activity', { i });
    expect(stub.calls.length).toBe(6);
    expect(stub.calls.map((c) => (c.payload as Record<string, unknown>).i)).toEqual([0,1,2,3,4,5]);
  });

  it('every event has a tenantId field (null or string)', () => {
    emit(null, 'sada.trust.activity', {});
    emit({ tenant: { companyId: 'co-y' } }, 'sada.trust.activity', {});
    for (const c of stub.calls) {
      const tid = (c.opts as { tenantId: unknown }).tenantId;
      expect(tid === null || typeof tid === 'string').toBe(true);
    }
  });
});