/**
 * sutar-decision-engine — event-bus wiring tests (ADR-0009 Phase 2).
 *
 * These tests verify that the events helper wires publishAsync calls with
 * the correct service name, type prefix, payload, and tenantId. We
 * stub the lazy-singleton bus directly (no Redis, no real ioredis).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { emit, getBus, shutdown, _setBusForTesting, _getBusForTesting } from '../../src/services/events.js';

function makeStubBus(overrides: Record<string, unknown> = {}) {
  const calls: Array<{ type: string; payload: unknown; opts: unknown }> = [];
  return {
    calls,
    serviceName: 'sutar-decision-engine',
    publishAsync(type: string, payload: unknown, opts: unknown) {
      calls.push({ type, payload, opts });
    },
    async publish(type: string, payload: unknown, opts: unknown) {
      calls.push({ type, payload, opts });
    },
    async subscribe() { return {}; },
    async connect() {},
    async quit() {},
    ...overrides,
  };
}

describe('sutar-decision-engine events — singleton + naming', () => {
  beforeEach(() => {
    _setBusForTesting(null);
    delete process.env.SERVICE_NAME;
  });

  afterEach(() => {
    _setBusForTesting(null);
    delete process.env.SERVICE_NAME;
  });

  it('is lazy: bus is null until first getBus()/emit()', () => {
    expect(_getBusForTesting()).toBeNull();
  });

  it('creates the bus on first emit()', () => {
    const stub = makeStubBus();
    _setBusForTesting(stub);
    emit(null, 'decision.made', { id: 'd-1' });
    expect(_getBusForTesting()).toBe(stub);
    expect(stub.calls.length).toBe(1);
  });

  it('returns the same bus instance on every getBus()', () => {
    _setBusForTesting(null);
    const a = getBus();
    const b = getBus();
    expect(a).toBe(b);
  });

  it('uses default service name sutar-decision-engine when SERVICE_NAME unset', () => {
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sutar-decision-engine');
  });

  it('honors SERVICE_NAME env override', () => {
    process.env.SERVICE_NAME = 'sutar-decision-engine-canary';
    _setBusForTesting(null);
    const bus = getBus();
    expect(bus.serviceName).toBe('sutar-decision-engine-canary');
  });

  it('shutdown() sets bus back to null', async () => {
    const stub = makeStubBus();
    _setBusForTesting(stub);
    emit(null, 'decision.made', {});
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
    _setBusForTesting({
      async quit() { throw new Error('boom'); },
    } as never);
    await expect(shutdown()).resolves.toBeUndefined();
    expect(_getBusForTesting()).toBeNull();
  });
});

describe('sutar-decision-engine events — emit() payload + tenant', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => {
    stub = makeStubBus();
    _setBusForTesting(stub);
  });
  afterEach(() => {
    _setBusForTesting(null);
  });

  it('emits with null tenant when req is null', () => {
    emit(null, 'decision.made', { id: 'd-1' });
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBeNull();
  });

  it('emits with null tenant when req is undefined', () => {
    emit(undefined, 'decision.made', { id: 'd-2' });
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBeNull();
  });

  it('emits with null tenant when req has no tenant', () => {
    emit({}, 'decision.made', { id: 'd-3' });
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBeNull();
  });

  it('captures tenantId from req.tenant.companyId', () => {
    emit({ tenant: { companyId: 'co-42' } }, 'decision.made', { id: 'd-4' });
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBe('co-42');
  });

  it('falls back to null when req.tenant exists but companyId is null', () => {
    emit({ tenant: { companyId: null } }, 'decision.made', { id: 'd-5' });
    expect((stub.calls[0].opts as { tenantId: unknown }).tenantId).toBeNull();
  });

  it('preserves the full payload object as-is', () => {
    const payload = {
      decisionId: 'd-6',
      outcome: 'approved',
      riskScore: 87.5,
      metadata: { nested: { key: 'value' } },
    };
    emit(null, 'decision.made', payload);
    expect(stub.calls[0].payload).toEqual(payload);
  });

  it('uses empty object when payload is omitted', () => {
    emit(null, 'decision.made');
    expect(stub.calls[0].payload).toEqual({});
  });
});

describe('sutar-decision-engine events — domain event schemas', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => {
    stub = makeStubBus();
    _setBusForTesting(stub);
  });
  afterEach(() => {
    _setBusForTesting(null);
  });

  it('decision.made carries decisionId + outcome + riskLevel', () => {
    emit(null, 'decision.made', {
      decisionId: 'd-7',
      decisionType: 'LOAN',
      outcome: 'approved',
      riskLevel: 'LOW',
      riskScore: 12,
      confidence: 0.92,
      policyId: 'pol-loan-1',
      processingTimeMs: 42,
    });
    const ev = stub.calls[0];
    expect(ev.type).toBe('decision.made');
    expect((ev.payload as Record<string, unknown>).outcome).toBe('approved');
    expect((ev.payload as Record<string, unknown>).decisionType).toBe('LOAN');
    expect((ev.payload as Record<string, unknown>).riskLevel).toBe('LOW');
  });

  it('decision.options.ranked carries winnerId + count + weights', () => {
    emit(null, 'decision.options.ranked', {
      winnerId: 'opt-A',
      winnerScore: 92,
      confidence: 0.85,
      optionCount: 3,
      weights: { cost: 0.4, time: 0.3, risk: 0.2, trust: 0.1 },
    });
    const ev = stub.calls[0];
    expect(ev.type).toBe('decision.options.ranked');
    expect((ev.payload as Record<string, unknown>).optionCount).toBe(3);
    expect((ev.payload as Record<string, unknown>).weights).toEqual({ cost: 0.4, time: 0.3, risk: 0.2, trust: 0.1 });
  });

  it('decision.risk.assessed carries riskLevel + riskScore', () => {
    emit(null, 'decision.risk.assessed', { riskLevel: 'CRITICAL', riskScore: 95 });
    expect(stub.calls[0].type).toBe('decision.risk.assessed');
    expect((stub.calls[0].payload as Record<string, unknown>).riskLevel).toBe('CRITICAL');
    expect((stub.calls[0].payload as Record<string, unknown>).riskScore).toBe(95);
  });
});

describe('sutar-decision-engine events — multi-emit', () => {
  let stub: ReturnType<typeof makeStubBus>;
  beforeEach(() => {
    stub = makeStubBus();
    _setBusForTesting(stub);
  });
  afterEach(() => {
    _setBusForTesting(null);
  });

  it('records every emit in order', () => {
    for (let i = 0; i < 5; i++) {
      emit(null, 'decision.made', { i });
    }
    expect(stub.calls.length).toBe(5);
    expect(stub.calls.map((c) => (c.payload as Record<string, unknown>).i)).toEqual([0, 1, 2, 3, 4]);
  });

  it('different event types can be mixed in the same session', () => {
    emit(null, 'decision.made', { id: 'd' });
    emit(null, 'decision.options.ranked', { id: 'r' });
    emit(null, 'decision.risk.assessed', { id: 'ra' });
    expect(stub.calls.map((c) => c.type)).toEqual([
      'decision.made',
      'decision.options.ranked',
      'decision.risk.assessed',
    ]);
  });

  it('every event has an opts.tenantId field (null or string)', () => {
    emit(null, 'decision.made', {});
    emit({ tenant: { companyId: 'co-x' } }, 'decision.made', {});
    emit({}, 'decision.made', {});
    for (const c of stub.calls) {
      expect(c.opts).toBeDefined();
      const tenantId = (c.opts as { tenantId: unknown }).tenantId;
      expect(tenantId === null || typeof tenantId === 'string').toBe(true);
    }
  });

  it('captures source via req.tenant.source', () => {
    emit({ tenant: { companyId: 'co-y', source: 'auth-middleware' } }, 'decision.made', {});
    const opts = stub.calls[0].opts as Record<string, unknown>;
    // We only forward tenantId in opts — source is in req.tenant but
    // not in the publishAsync opts. Document this behavior here.
    expect(opts.tenantId).toBe('co-y');
    expect(opts.source).toBeUndefined();
  });
});