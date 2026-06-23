/**
 * SkillOS — Governance unit tests
 *
 * Tests the deprecation lifecycle, compliance fields, and audit event builder.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ASSET_STATUSES,
  COMPLIANCE_FRAMEWORKS,
  isValidStatus,
  defaultCompliance,
  buildAuditEvent,
  buildDeprecation,
} from '../../src/services/governance.js';

test('skill-os governance — status lifecycle', async (t) => {
  await t.test('asset lifecycle is draft → active → deprecated → sunset → retired', () => {
    assert.deepEqual(ASSET_STATUSES, ['draft', 'active', 'deprecated', 'sunset', 'retired']);
  });

  await t.test('isValidStatus accepts all 5', () => {
    for (const s of ASSET_STATUSES) {
      assert.equal(isValidStatus(s), true);
    }
  });

  await t.test('isValidStatus rejects unknown', () => {
    assert.equal(isValidStatus('archived'), false);
    assert.equal(isValidStatus('live'), false);
  });
});

test('skill-os governance — compliance', async (t) => {
  await t.test('all 6 compliance frameworks are tracked', () => {
    assert.equal(COMPLIANCE_FRAMEWORKS.length, 6);
    for (const f of ['gdpr', 'soc2', 'hipaa', 'pci', 'iso27001', 'fedramp']) {
      assert.ok(COMPLIANCE_FRAMEWORKS.includes(f));
    }
  });

  await t.test('default compliance is all-false', () => {
    const c = defaultCompliance();
    for (const f of COMPLIANCE_FRAMEWORKS) {
      assert.equal(c[f], false);
    }
  });
});

test('skill-os governance — audit event builder', async (t) => {
  await t.test('builds an audit event with all fields', () => {
    const e = buildAuditEvent({
      actor: 'user-1', action: 'asset.installed', resourceType: 'asset',
      resourceId: 'ast-1', tenantId: 't-1', payload: { version: '1.0.0' },
    });
    assert.equal(e.actor, 'user-1');
    assert.equal(e.action, 'asset.installed');
    assert.equal(e.resourceType, 'asset');
    assert.equal(e.resourceId, 'ast-1');
    assert.equal(e.tenantId, 't-1');
    assert.equal(e.payload.version, '1.0.0');
    assert.ok(e.id.startsWith('aud-'));
    assert.ok(e.timestamp);
  });

  await t.test('builds with defaults', () => {
    const e = buildAuditEvent({ action: 'asset.deleted', resourceId: 'ast-x' });
    assert.equal(e.actor, 'anonymous');
    assert.equal(e.resourceType, 'asset');
    assert.deepEqual(e.payload, {});
    assert.equal(e.tenantId, null);
  });
});

test('skill-os governance — deprecation', async (t) => {
  await t.test('default sunset is 90 days from now', () => {
    const dep = buildDeprecation({});
    assert.equal(dep.status, 'deprecated');
    assert.ok(dep.deprecatedAt);
    const sunsetDate = new Date(dep.sunsetAt);
    const days = Math.round((sunsetDate - new Date(dep.deprecatedAt)) / (24 * 60 * 60 * 1000));
    assert.ok(days >= 89 && days <= 91, `sunset should be ~90 days, got ${days}`);
  });

  await t.test('custom sunset and replacement', () => {
    const dep = buildDeprecation({ sunsetAt: '2027-01-01T00:00:00Z', replacement: 'ast-v2', reason: 'moved to v2' });
    assert.equal(dep.sunsetAt, '2027-01-01T00:00:00Z');
    assert.equal(dep.replacement, 'ast-v2');
    assert.equal(dep.reason, 'moved to v2');
  });
});
