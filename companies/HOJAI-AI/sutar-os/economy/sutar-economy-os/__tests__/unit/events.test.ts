/**
 * sutar-economy-os — event-bus wiring tests (ADR-0009 Phase 2).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { emit, getBus, shutdown, _setBusForTesting, _getBusForTesting } from '../../src/services/events.js';

function makeStubBus() {
  const calls: Array<{ type: string; payload: unknown; opts: unknown }> = [];
  return {
    calls,
    serviceName: 'sutar-economy-os',
    publishAsync(type: string, payload: unknown, opts: unknown) { calls.push({ type, payload, opts }); },
    async publish(type: string, payload: unknown, opts: unknown) { calls.push({ type, payload, opts }); },
    async subscribe() { return {}; },
    async connect() {},
    async quit() {},
  };
}

describe('sutar-economy-os events — singleton + naming', () => {
  beforeEach(() => { _setBusForTesting(null); delete process.env.SERVICE_NAME; });
  afterEach(() => { _setBusForTesting(null); delete process.env.SERVICE_NAME; });

  it('uses default service name sutar-economy-os', () => {
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sutar-economy-os');
  });

  it('honors SERVICE_NAME env override', () => {
    process.env.SERVICE_NAME = 'sutar-economy-canary';
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sutar-economy-canary');
  });

  it('shutdown() resets the bus', async () => {
    const stub = makeStubBus();
    _setBusForTesting(stub);
    emit(null, 'karma.earned', {});
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

describe('sutar-economy-os events — emit() payload + tenant', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('emits with null tenant when req is null', () => {
    emit(null, 'karma.earned', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBeNull();
  });

  it('captures tenantId from req.tenant.companyId', () => {
    emit({ tenant: { companyId: 'co-eco' } }, 'karma.earned', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBe('co-eco');
  });

  it('uses empty object when payload is omitted', () => {
    emit(null, 'karma.earned');
    expect(stub.calls[0].payload).toEqual({});
  });

  it('preserves the full payload object', () => {
    const payload = { entityId: 'e-1', entityType: 'user', action: 'helpful_review', points: 50 };
    emit(null, 'karma.earned', payload);
    expect(stub.calls[0].payload).toEqual(payload);
  });
});

describe('sutar-economy-os events — domain event schemas', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('karma.earned carries entityId + entityType + action + points', () => {
    emit(null, 'karma.earned', { entityId: 'e-1', entityType: 'user', action: 'helpful_review', points: 50, reason: 'thx' });
    expect(stub.calls[0].type).toBe('karma.earned');
    expect((stub.calls[0].payload as Record<string, unknown>).action).toBe('helpful_review');
    expect((stub.calls[0].payload as Record<string, unknown>).points).toBe(50);
  });

  it('karma.spent carries entityId + points + reason', () => {
    emit(null, 'karma.spent', { entityId: 'e-2', points: 25, reason: 'redeem' });
    expect(stub.calls[0].type).toBe('karma.spent');
    expect((stub.calls[0].payload as Record<string, unknown>).reason).toBe('redeem');
  });

  it('transaction.created carries transactionId + amount + currency', () => {
    emit(null, 'transaction.created', { transactionId: 'tx-1', entityId: 'e-3', type: 'transfer', amount: 100, currency: 'USD' });
    expect(stub.calls[0].type).toBe('transaction.created');
    expect((stub.calls[0].payload as Record<string, unknown>).currency).toBe('USD');
  });

  it('transaction.status.updated carries transactionId + status', () => {
    emit(null, 'transaction.status.updated', { transactionId: 'tx-2', status: 'completed', failureReason: null });
    expect(stub.calls[0].type).toBe('transaction.status.updated');
    expect((stub.calls[0].payload as Record<string, unknown>).status).toBe('completed');
  });
});

describe('sutar-economy-os events — multi-emit', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('records 10 emits in order', () => {
    for (let i = 0; i < 10; i++) emit(null, 'karma.earned', { i });
    expect(stub.calls.length).toBe(10);
    expect(stub.calls.map((c) => (c.payload as Record<string, unknown>).i)).toEqual([0,1,2,3,4,5,6,7,8,9]);
  });

  it('every event has a tenantId field (null or string)', () => {
    emit(null, 'karma.earned', {});
    emit({ tenant: { companyId: 'co-y' } }, 'transaction.created', {});
    for (const c of stub.calls) {
      const tid = (c.opts as { tenantId: unknown }).tenantId;
      expect(tid === null || typeof tid === 'string').toBe(true);
    }
  });
});