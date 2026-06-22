/**
 * sutar-contract-os — event-bus wiring tests (ADR-0009 Phase 2).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { emit, getBus, shutdown, _setBusForTesting, _getBusForTesting } from '../../src/services/events.js';

function makeStubBus() {
  const calls: Array<{ type: string; payload: unknown; opts: unknown }> = [];
  return {
    calls,
    serviceName: 'sutar-contract-os',
    publishAsync(type: string, payload: unknown, opts: unknown) { calls.push({ type, payload, opts }); },
    async publish(type: string, payload: unknown, opts: unknown) { calls.push({ type, payload, opts }); },
    async subscribe() { return {}; },
    async connect() {},
    async quit() {},
  };
}

describe('sutar-contract-os events — singleton + naming', () => {
  beforeEach(() => { _setBusForTesting(null); delete process.env.SERVICE_NAME; });
  afterEach(() => { _setBusForTesting(null); delete process.env.SERVICE_NAME; });

  it('uses default service name sutar-contract-os', () => {
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sutar-contract-os');
  });

  it('honors SERVICE_NAME env override', () => {
    process.env.SERVICE_NAME = 'sutar-contract-canary';
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sutar-contract-canary');
  });

  it('shutdown() resets the bus', async () => {
    const stub = makeStubBus();
    _setBusForTesting(stub);
    emit(null, 'contract.created', {});
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

describe('sutar-contract-os events — emit() payload + tenant', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('emits with null tenant when req is null', () => {
    emit(null, 'contract.created', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBeNull();
  });

  it('captures tenantId from req.tenant.companyId', () => {
    emit({ tenant: { companyId: 'co-ct' } }, 'contract.created', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBe('co-ct');
  });

  it('uses empty object when payload is omitted', () => {
    emit(null, 'contract.created');
    expect(stub.calls[0].payload).toEqual({});
  });

  it('preserves the full payload object', () => {
    const payload = { contractId: 'c-1', type: 'NDA', title: 'My NDA' };
    emit(null, 'contract.created', payload);
    expect(stub.calls[0].payload).toEqual(payload);
  });
});

describe('sutar-contract-os events — domain event schemas', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('contract.created carries contractId + type + partyCount', () => {
    emit(null, 'contract.created', { contractId: 'c-1', type: 'NDA', title: 'My NDA', partyCount: 2, value: 1000, currency: 'INR' });
    expect(stub.calls[0].type).toBe('contract.created');
    expect((stub.calls[0].payload as Record<string, unknown>).partyCount).toBe(2);
  });

  it('contract.signed carries contractId + partyEmail + newStatus', () => {
    emit(null, 'contract.signed', { contractId: 'c-2', partyId: 'p-1', partyEmail: 'a@b.com', newStatus: 'active', fullySigned: true });
    expect(stub.calls[0].type).toBe('contract.signed');
    expect((stub.calls[0].payload as Record<string, unknown>).fullySigned).toBe(true);
  });

  it('contract.terminated carries contractId', () => {
    emit(null, 'contract.terminated', { contractId: 'c-3', previousStatus: 'active' });
    expect(stub.calls[0].type).toBe('contract.terminated');
    expect((stub.calls[0].payload as Record<string, unknown>).contractId).toBe('c-3');
  });
});

describe('sutar-contract-os events — multi-emit', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('records 7 emits in order', () => {
    for (let i = 0; i < 7; i++) emit(null, 'contract.created', { i });
    expect(stub.calls.length).toBe(7);
    expect(stub.calls.map((c) => (c.payload as Record<string, unknown>).i)).toEqual([0,1,2,3,4,5,6]);
  });

  it('every event has a tenantId field (null or string)', () => {
    emit(null, 'contract.created', {});
    emit({ tenant: { companyId: 'co-y' } }, 'contract.signed', {});
    for (const c of stub.calls) {
      const tid = (c.opts as { tenantId: unknown }).tenantId;
      expect(tid === null || typeof tid === 'string').toBe(true);
    }
  });
});