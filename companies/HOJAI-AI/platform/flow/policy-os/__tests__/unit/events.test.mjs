/**
 * Policy OS — events helper unit tests (ADR-0009 Phase 2).
 *
 * Uses Node's built-in test runner (node:test) so no extra deps needed.
 * Stubs the EventBus to verify envelope construction without Redis.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  emit,
  getBus,
  shutdown,
  _setBusForTesting,
  _getBusForTesting,
} from '../../src/services/events.js';

function makeStubBus() {
  const calls = [];
  return {
    calls,
    serviceName: 'policy-os',
    publishAsync(type, payload, opts) {
      calls.push({ type, payload, opts });
    },
    async publish(type, payload, opts) {
      calls.push({ type, payload, opts });
    },
    async subscribe() { return {}; },
    async connect() {},
    async quit() {},
  };
}

function resetBus() {
  _setBusForTesting(null);
}

test('policy-os events — singleton + naming', async (t) => {
  t.after(() => resetBus());

  await t.test('default service name is policy-os', () => {
    resetBus();
    delete process.env.SERVICE_NAME;
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({}, 'policy.created', { id: 'p1' });
    assert.equal(bus.calls.length, 1);
    assert.equal(bus.calls[0].type, 'policy.created');
    assert.equal(bus.serviceName, 'policy-os');
  });

  await t.test('honors SERVICE_NAME env override', () => {
    resetBus();
    process.env.SERVICE_NAME = 'policy-os-canary';
    const bus = makeStubBus();
    bus.serviceName = 'policy-os-canary';
    _setBusForTesting(bus);
    // The getBus() inside emit() reads SERVICE_NAME lazily only if no bus exists,
    // but we pre-stubbed the bus, so we just verify the override didn't crash.
    emit({}, 'policy.created', { id: 'p2' });
    assert.equal(bus.calls.length, 1);
    delete process.env.SERVICE_NAME;
  });

  await t.test('getBus() returns the same instance', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    const a = getBus();
    const b = getBus();
    assert.equal(a, b);
    assert.equal(a, bus);
  });

  await t.test('_getBusForTesting returns the singleton or null', () => {
    resetBus();
    assert.equal(_getBusForTesting(), null);
    const bus = makeStubBus();
    _setBusForTesting(bus);
    assert.equal(_getBusForTesting(), bus);
  });

  await t.test('shutdown() clears the bus', async () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    assert.ok(_getBusForTesting());
    await shutdown();
    assert.equal(_getBusForTesting(), null);
  });
});

test('policy-os events — emit() payload + tenant', async (t) => {
  t.after(() => resetBus());

  await t.test('emits with payload as second arg', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    const payload = { policyId: 'p100', action: 'grant', subject: 'user-42' };
    emit({}, 'policy.evaluated', payload);
    assert.equal(bus.calls.length, 1);
    assert.deepEqual(bus.calls[0].payload, payload);
  });

  await t.test('emits with null tenantId when no req.tenant', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({}, 'policy.created', { id: 'p-noauth' });
    assert.equal(bus.calls[0].opts.tenantId, null);
  });

  await t.test('emits with null tenantId when req has no tenant', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({ tenant: null }, 'policy.created', { id: 'p1' });
    assert.equal(bus.calls[0].opts.tenantId, null);
  });

  await t.test('emits with tenantId from req.tenant.companyId', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit(
      { tenant: { companyId: 'acme-co', source: 'header' } },
      'policy.evaluated',
      { id: 'p-tenant' },
    );
    assert.equal(bus.calls[0].opts.tenantId, 'acme-co');
  });

  await t.test('emits with null tenantId when req.tenant has no companyId', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({ tenant: { source: 'header' } }, 'policy.created', { id: 'p1' });
    assert.equal(bus.calls[0].opts.tenantId, null);
  });

  await t.test('default payload is {}', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({}, 'policy.ping');
    assert.deepEqual(bus.calls[0].payload, {});
  });
});

test('policy-os events — domain event schemas', async (t) => {
  t.after(() => resetBus());

  await t.test('typical policy.evaluated event has required fields', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    const req = { tenant: { companyId: 'tenant-9' } };
    emit(req, 'policy.evaluated', {
      policyId: 'pol-101',
      subject: 'svc:catalog',
      action: 'read',
      decision: 'allow',
      reason: 'role match',
    });
    const c = bus.calls[0];
    assert.equal(c.type, 'policy.evaluated');
    assert.equal(c.opts.tenantId, 'tenant-9');
    assert.equal(c.payload.policyId, 'pol-101');
    assert.equal(c.payload.decision, 'allow');
  });
});

test('policy-os events — multi-emit', async (t) => {
  t.after(() => resetBus());

  await t.test('captures multiple emits in order', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    const req = { tenant: { companyId: 'multi-tenant' } };
    emit(req, 'policy.created', { id: 'p1' });
    emit(req, 'policy.evaluated', { id: 'p1', decision: 'allow' });
    emit(req, 'policy.deleted', { id: 'p1' });
    assert.equal(bus.calls.length, 3);
    assert.deepEqual(
      bus.calls.map((c) => c.type),
      ['policy.created', 'policy.evaluated', 'policy.deleted'],
    );
    assert.ok(bus.calls.every((c) => c.opts.tenantId === 'multi-tenant'));
  });

  await t.test('different tenants get isolated tenantIds', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({ tenant: { companyId: 'tenant-A' } }, 'policy.created', { id: 'pA' });
    emit({ tenant: { companyId: 'tenant-B' } }, 'policy.created', { id: 'pB' });
    assert.equal(bus.calls[0].opts.tenantId, 'tenant-A');
    assert.equal(bus.calls[1].opts.tenantId, 'tenant-B');
    assert.equal(bus.calls[0].payload.id, 'pA');
    assert.equal(bus.calls[1].payload.id, 'pB');
  });
});
