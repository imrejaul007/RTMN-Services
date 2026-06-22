/**
 * sutar-negotiation-engine — event-bus wiring tests (ADR-0009 Phase 2).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { emit, getBus, shutdown, _setBusForTesting, _getBusForTesting } from '../../src/services/events.js';

function makeStubBus() {
  const calls: Array<{ type: string; payload: unknown; opts: unknown }> = [];
  return {
    calls,
    serviceName: 'sutar-negotiation-engine',
    publishAsync(type: string, payload: unknown, opts: unknown) { calls.push({ type, payload, opts }); },
    async publish(type: string, payload: unknown, opts: unknown) { calls.push({ type, payload, opts }); },
    async subscribe() { return {}; },
    async connect() {},
    async quit() {},
  };
}

describe('sutar-negotiation-engine events — singleton + naming', () => {
  beforeEach(() => { _setBusForTesting(null); delete process.env.SERVICE_NAME; });
  afterEach(() => { _setBusForTesting(null); delete process.env.SERVICE_NAME; });

  it('uses default service name sutar-negotiation-engine', () => {
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sutar-negotiation-engine');
  });

  it('honors SERVICE_NAME env override', () => {
    process.env.SERVICE_NAME = 'sutar-negotiation-canary';
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sutar-negotiation-canary');
  });

  it('shutdown() resets the bus', async () => {
    const stub = makeStubBus();
    _setBusForTesting(stub);
    emit(null, 'negotiation.started', {});
    expect(_getBusForTesting()).not.toBeNull();
    await shutdown();
    expect(_getBusForTesting()).toBeNull();
  });

  it('shutdown() is safe to call twice', async () => {
    await shutdown();
    await shutdown();
    expect(_getBusForTesting()).toBeNull();
  });
});

describe('sutar-negotiation-engine events — emit() payload + tenant', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('emits with null tenant when req is null', () => {
    emit(null, 'negotiation.started', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBeNull();
  });

  it('captures tenantId from req.tenant.companyId', () => {
    emit({ tenant: { companyId: 'co-99' } }, 'negotiation.started', {});
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBe('co-99');
  });

  it('uses empty object when payload is omitted', () => {
    emit(null, 'negotiation.started');
    expect(stub.calls[0].payload).toEqual({});
  });

  it('preserves the full payload object', () => {
    const payload = { negotiationId: 'n-1', buyerId: 'b-1', sellerId: 's-1' };
    emit(null, 'negotiation.started', payload);
    expect(stub.calls[0].payload).toEqual(payload);
  });
});

describe('sutar-negotiation-engine events — domain event schemas', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('negotiation.started carries negotiationId + buyerId + sellerId', () => {
    emit(null, 'negotiation.started', { negotiationId: 'n-1', buyerId: 'b-1', sellerId: 's-1', productOrService: 'wheat' });
    expect(stub.calls[0].type).toBe('negotiation.started');
    expect((stub.calls[0].payload as Record<string, unknown>).productOrService).toBe('wheat');
  });

  it('negotiation.accepted carries negotiationId + partyId', () => {
    emit(null, 'negotiation.accepted', { negotiationId: 'n-2', partyId: 'p-1' });
    expect(stub.calls[0].type).toBe('negotiation.accepted');
    expect((stub.calls[0].payload as Record<string, unknown>).partyId).toBe('p-1');
  });

  it('negotiation.cancelled carries performedBy + reason', () => {
    emit(null, 'negotiation.cancelled', { negotiationId: 'n-3', performedBy: 'u-1', reason: 'timeout' });
    expect(stub.calls[0].type).toBe('negotiation.cancelled');
    expect((stub.calls[0].payload as Record<string, unknown>).reason).toBe('timeout');
  });
});

describe('sutar-negotiation-engine events — multi-emit', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => { stub = makeStubBus(); _setBusForTesting(stub); });
  afterEach(() => { _setBusForTesting(null); });

  it('records 8 emits in order', () => {
    for (let i = 0; i < 8; i++) emit(null, 'negotiation.started', { i });
    expect(stub.calls.length).toBe(8);
    expect(stub.calls.map((c) => (c.payload as Record<string, unknown>).i)).toEqual([0,1,2,3,4,5,6,7]);
  });

  it('every event has a tenantId field (null or string)', () => {
    emit(null, 'negotiation.started', {});
    emit({ tenant: { companyId: 'co-y' } }, 'negotiation.accepted', {});
    for (const c of stub.calls) {
      const tid = (c.opts as { tenantId: unknown }).tenantId;
      expect(tid === null || typeof tid === 'string').toBe(true);
    }
  });
});