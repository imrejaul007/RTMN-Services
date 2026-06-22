/**
 * Skill OS — events helper unit tests (ADR-0009 Phase 2).
 *
 * Uses Node's built-in test runner (node:test) so no extra deps needed.
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
    serviceName: 'skill-os',
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

test('skill-os events — singleton + naming', async (t) => {
  t.after(() => resetBus());

  await t.test('default service name is skill-os', () => {
    resetBus();
    delete process.env.SERVICE_NAME;
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({}, 'skill.registered', { id: 's1' });
    assert.equal(bus.calls.length, 1);
    assert.equal(bus.calls[0].type, 'skill.registered');
    assert.equal(bus.serviceName, 'skill-os');
  });

  await t.test('honors SERVICE_NAME env override', () => {
    resetBus();
    process.env.SERVICE_NAME = 'skill-os-canary';
    const bus = makeStubBus();
    bus.serviceName = 'skill-os-canary';
    _setBusForTesting(bus);
    emit({}, 'skill.registered', { id: 's2' });
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

test('skill-os events — emit() payload + tenant', async (t) => {
  t.after(() => resetBus());

  await t.test('emits with payload as second arg', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    const payload = { skillId: 's100', capability: 'negotiate', level: 5 };
    emit({}, 'skill.registered', payload);
    assert.equal(bus.calls.length, 1);
    assert.deepEqual(bus.calls[0].payload, payload);
  });

  await t.test('emits with null tenantId when no req.tenant', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({}, 'skill.registered', { id: 's-noauth' });
    assert.equal(bus.calls[0].opts.tenantId, null);
  });

  await t.test('emits with null tenantId when req has no tenant', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({ tenant: null }, 'skill.registered', { id: 's1' });
    assert.equal(bus.calls[0].opts.tenantId, null);
  });

  await t.test('emits with tenantId from req.tenant.companyId', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit(
      { tenant: { companyId: 'skill-tenant', source: 'header' } },
      'skill.registered',
      { id: 's-tenant' },
    );
    assert.equal(bus.calls[0].opts.tenantId, 'skill-tenant');
  });

  await t.test('emits with null tenantId when req.tenant has no companyId', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({ tenant: { source: 'header' } }, 'skill.registered', { id: 's1' });
    assert.equal(bus.calls[0].opts.tenantId, null);
  });

  await t.test('default payload is {}', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({}, 'skill.ping');
    assert.deepEqual(bus.calls[0].payload, {});
  });
});

test('skill-os events — domain event schemas', async (t) => {
  t.after(() => resetBus());

  await t.test('typical skill.registered event has required fields', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    const req = { tenant: { companyId: 'tenant-7' } };
    emit(req, 'skill.registered', {
      skillId: 'sk-201',
      capability: 'price-optimization',
      level: 8,
      ownerType: 'agent',
      ownerId: 'agt-9',
    });
    const c = bus.calls[0];
    assert.equal(c.type, 'skill.registered');
    assert.equal(c.opts.tenantId, 'tenant-7');
    assert.equal(c.payload.skillId, 'sk-201');
    assert.equal(c.payload.capability, 'price-optimization');
    assert.equal(c.payload.level, 8);
  });

  await t.test('typical skill.invoked event has required fields', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({ tenant: { companyId: 'tenant-8' } }, 'skill.invoked', {
      skillId: 'sk-201',
      agentId: 'agt-9',
      durationMs: 124,
      outcome: 'success',
    });
    const c = bus.calls[0];
    assert.equal(c.type, 'skill.invoked');
    assert.equal(c.opts.tenantId, 'tenant-8');
    assert.equal(c.payload.outcome, 'success');
    assert.equal(c.payload.durationMs, 124);
  });
});

test('skill-os events — multi-emit', async (t) => {
  t.after(() => resetBus());

  await t.test('captures multiple emits in order', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    const req = { tenant: { companyId: 'multi-skill' } };
    emit(req, 'skill.registered', { id: 's1' });
    emit(req, 'skill.invoked', { id: 's1', outcome: 'success' });
    emit(req, 'skill.unregistered', { id: 's1' });
    assert.equal(bus.calls.length, 3);
    assert.deepEqual(
      bus.calls.map((c) => c.type),
      ['skill.registered', 'skill.invoked', 'skill.unregistered'],
    );
    assert.ok(bus.calls.every((c) => c.opts.tenantId === 'multi-skill'));
  });

  await t.test('different tenants get isolated tenantIds', () => {
    resetBus();
    const bus = makeStubBus();
    _setBusForTesting(bus);
    emit({ tenant: { companyId: 'tenant-X' } }, 'skill.registered', { id: 'sX' });
    emit({ tenant: { companyId: 'tenant-Y' } }, 'skill.registered', { id: 'sY' });
    assert.equal(bus.calls[0].opts.tenantId, 'tenant-X');
    assert.equal(bus.calls[1].opts.tenantId, 'tenant-Y');
    assert.equal(bus.calls[0].payload.id, 'sX');
    assert.equal(bus.calls[1].payload.id, 'sY');
  });
});
