/**
 * SkillOS — Tenancy unit tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  tenantScope, filterByTenant, stampTenant, isValidTenantId, GLOBAL,
} from '../../src/services/tenancy.js';

test('skill-os tenancy — tenantScope', async (t) => {
  await t.test('falls back to global when no tenant info', () => {
    const s = tenantScope({});
    assert.equal(s.tenantId, GLOBAL);
    assert.equal(s.isGlobal, true);
  });

  await t.test('extracts from req.tenant.companyId (auth context)', () => {
    const s = tenantScope({ tenant: { companyId: 'acme' } });
    assert.equal(s.tenantId, 'acme');
    assert.equal(s.isGlobal, false);
  });

  await t.test('extracts from body when no auth', () => {
    const s = tenantScope({ body: { tenantId: 'from-body' } });
    assert.equal(s.tenantId, 'from-body');
    assert.equal(s.isGlobal, false);
  });

  await t.test('extracts from query for GETs', () => {
    const s = tenantScope({ method: 'GET', query: { tenantId: 'q-tenant' } });
    assert.equal(s.tenantId, 'q-tenant');
  });

  await t.test('does NOT extract from query for non-GETs (security)', () => {
    const s = tenantScope({ method: 'POST', query: { tenantId: 'q-tenant' } });
    // Falls through to body or global
    assert.equal(s.tenantId, GLOBAL);
  });

  await t.test('auth wins over body', () => {
    const s = tenantScope({ tenant: { companyId: 'auth' }, body: { tenantId: 'body' } });
    assert.equal(s.tenantId, 'auth');
  });
});

test('skill-os tenancy — filterByTenant', async (t) => {
  await t.test('global scope sees all records', () => {
    const records = [
      { id: 'a', tenantId: 't1' },
      { id: 'b', tenantId: 't2' },
      { id: 'c' }, // no tenantId
    ];
    const s = { tenantId: GLOBAL, isGlobal: true };
    const filtered = filterByTenant(records, s);
    assert.equal(filtered.length, 3);
  });

  await t.test('tenant scope sees own + global records', () => {
    const records = [
      { id: 'a', tenantId: 't1' },
      { id: 'b', tenantId: 't2' },
      { id: 'c' }, // global
      { id: 'd', tenantId: 't1' },
    ];
    const s = { tenantId: 't1', isGlobal: false };
    const filtered = filterByTenant(records, s);
    assert.equal(filtered.length, 3);
    assert.deepEqual(filtered.map((r) => r.id), ['a', 'c', 'd']);
  });

  await t.test('returns input unchanged if not array', () => {
    assert.equal(filterByTenant(null, { tenantId: 't1', isGlobal: false }), null);
    assert.equal(filterByTenant(undefined, { tenantId: 't1', isGlobal: false }), undefined);
  });
});

test('skill-os tenancy — stampTenant', async (t) => {
  await t.test('stamps tenantId on a record', () => {
    const rec = { id: 'a' };
    const s = { tenantId: 'acme', isGlobal: false };
    const stamped = stampTenant(rec, s);
    assert.equal(stamped.tenantId, 'acme');
  });

  await t.test('does not stamp for global scope', () => {
    const rec = { id: 'a' };
    const s = { tenantId: GLOBAL, isGlobal: true };
    const stamped = stampTenant(rec, s);
    assert.equal(stamped.tenantId, undefined);
  });

  await t.test('returns null/undefined unchanged', () => {
    assert.equal(stampTenant(null, { tenantId: 'x', isGlobal: false }), null);
    assert.equal(stampTenant(undefined, { tenantId: 'x', isGlobal: false }), undefined);
  });
});

test('skill-os tenancy — isValidTenantId', async (t) => {
  await t.test('accepts non-empty strings', () => {
    assert.equal(isValidTenantId('acme'), true);
    assert.equal(isValidTenantId('a'), true);
    assert.equal(isValidTenantId('t-with-dashes_underscores.123'), true);
  });

  await t.test('rejects empty / non-string / too long', () => {
    assert.equal(isValidTenantId(''), false);
    assert.equal(isValidTenantId(null), false);
    assert.equal(isValidTenantId(123), false);
    assert.equal(isValidTenantId('a'.repeat(200)), false);
  });
});
