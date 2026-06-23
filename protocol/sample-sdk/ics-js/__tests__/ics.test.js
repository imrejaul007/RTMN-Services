/**
 * Tests for ICS (Industry Compliance Schema) v0.1.0 validator.
 *
 * Pure node:test — no dependencies.
 *
 * Run with:  node --test __tests__/ics.test.js
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  validate,
  rollupFrameworkStatus,
} from '../ics.js';

// ---------- helpers ----------

function makeValidDoc(overrides = {}) {
  return {
    schemaVersion: '0.1.0',
    subjectType: 'industry_tenant_instance',
    subjectId: 'ti_abc123',
    tenantId: 't_xyz',
    industry: 'healthcare',
    jurisdiction: {
      country: 'US',
      region: 'CA',
    },
    frameworks: [
      {
        id: 'HIPAA',
        version: '2013-01-25',
        status: 'COMPLIANT',
        lastAssessedAt: '2026-01-15T00:00:00Z',
        nextAssessmentDue: '2026-07-15T00:00:00Z',
        controls: [
          { controlId: '164.312(a)(1)', name: 'Access Control', status: 'COMPLIANT' },
          { controlId: '164.312(b)', name: 'Audit Controls', status: 'COMPLIANT' },
        ],
      },
    ],
    dataResidency: ['US'],
    isolationRequirements: {
      minimumLevel: 'DEDICATED',
      kmsProvider: 'aws-kms',
    },
    auditTrail: {
      enabled: true,
      retentionDays: 2555,
      immutable: true,
      sinkUrl: 'https://audit.example.com/hipaa',
    },
    updatedAt: '2026-01-15T12:00:00Z',
    updatedBy: 'auditor@example.com',
    ...overrides,
  };
}

// ---------- valid docs ----------

test('valid HIPAA doc passes', () => {
  const result = validate(makeValidDoc());
  assert.equal(result.ok, true);
});

test('valid PCI-DSS + GDPR doc passes', () => {
  const doc = makeValidDoc({
    industry: 'retail',
    jurisdiction: { country: 'DE' },
    frameworks: [
      {
        id: 'PCI-DSS',
        version: '4.0',
        status: 'COMPLIANT',
        lastAssessedAt: '2026-02-01T00:00:00Z',
        nextAssessmentDue: '2026-08-01T00:00:00Z',
        controls: [
          { controlId: '3.5.1', name: 'PAN encryption', status: 'COMPLIANT' },
        ],
      },
      {
        id: 'GDPR',
        version: '2016-04-27',
        status: 'PARTIAL',
        lastAssessedAt: '2026-02-01T00:00:00Z',
        nextAssessmentDue: '2026-08-01T00:00:00Z',
        controls: [
          { controlId: 'Art.32', name: 'Security of processing', status: 'PARTIAL' },
        ],
      },
    ],
    dataResidency: ['EU'],
    isolationRequirements: {
      minimumLevel: 'ISOLATED',
      kmsProvider: 'gcp-kms',
    },
  });
  const result = validate(doc);
  assert.equal(result.ok, true);
});

// ---------- missing required fields ----------

test('missing top-level fields caught', () => {
  const result = validate({});
  assert.equal(result.ok, false);
  assert.ok(result.errors.length > 0);
  for (const f of [
    'schemaVersion', 'subjectType', 'subjectId', 'tenantId', 'industry',
    'jurisdiction', 'frameworks', 'dataResidency',
    'isolationRequirements', 'auditTrail', 'updatedAt', 'updatedBy',
  ]) {
    assert.ok(
      result.errors.some((e) => e.includes(f)),
      `expected error mentioning "${f}", got: ${result.errors.join('; ')}`,
    );
  }
});

test('null doc rejected', () => {
  const result = validate(null);
  assert.equal(result.ok, false);
  assert.ok(result.errors[0].includes('object'));
});

test('string doc rejected', () => {
  const result = validate('hello');
  assert.equal(result.ok, false);
  assert.ok(result.errors[0].includes('object'));
});

// ---------- schemaVersion ----------

test('schemaVersion wrong pattern rejected', () => {
  const result = validate(makeValidDoc({ schemaVersion: '1.0.0' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('schemaVersion')));
});

test('schemaVersion 0.2.0 rejected (only 0.1.x accepted)', () => {
  const result = validate(makeValidDoc({ schemaVersion: '0.2.0' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('schemaVersion')));
});

test('schemaVersion 0.1.5 accepted', () => {
  const result = validate(makeValidDoc({ schemaVersion: '0.1.5' }));
  assert.equal(result.ok, true);
});

// ---------- subjectType ----------

test('invalid subjectType rejected', () => {
  const result = validate(makeValidDoc({ subjectType: 'company' }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('subjectType')));
});

// ---------- jurisdiction.country ----------

test('lowercase country rejected', () => {
  const result = validate(makeValidDoc({ jurisdiction: { country: 'us' } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('country')));
});

test('three-letter country rejected', () => {
  const result = validate(makeValidDoc({ jurisdiction: { country: 'USA' } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('country')));
});

test('empty country rejected', () => {
  const result = validate(makeValidDoc({ jurisdiction: { country: '' } }));
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('country')));
});

test('valid 2-letter country accepted', () => {
  const result = validate(makeValidDoc({ jurisdiction: { country: 'IN' } }));
  assert.equal(result.ok, true);
});

// ---------- framework ----------

test('framework missing id rejected', () => {
  const doc = makeValidDoc();
  doc.frameworks[0].id = undefined;
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('frameworks[0].id')));
});

test('framework invalid status rejected', () => {
  const doc = makeValidDoc();
  doc.frameworks[0].status = 'OK';
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('frameworks[0].status')));
});

test('framework lastAssessedAt not ISO-8601 rejected', () => {
  const doc = makeValidDoc();
  doc.frameworks[0].lastAssessedAt = 'yesterday';
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('lastAssessedAt')));
});

test('framework nextAssessmentDue not ISO-8601 rejected', () => {
  const doc = makeValidDoc();
  doc.frameworks[0].nextAssessmentDue = 'tomorrow';
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('nextAssessmentDue')));
});

test('framework control missing controlId rejected', () => {
  const doc = makeValidDoc();
  doc.frameworks[0].controls[0].controlId = undefined;
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('controlId')));
});

test('framework control missing name rejected', () => {
  const doc = makeValidDoc();
  doc.frameworks[0].controls[0].name = undefined;
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('.name')));
});

test('framework control invalid status rejected', () => {
  const doc = makeValidDoc();
  doc.frameworks[0].controls[0].status = 'GREEN';
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('controls[0].status')));
});

test('framework control status NOT_APPLICABLE accepted', () => {
  const doc = makeValidDoc();
  doc.frameworks[0].controls[0].status = 'NOT_APPLICABLE';
  const result = validate(doc);
  assert.equal(result.ok, true);
});

// ---------- isolationRequirements ----------

test('invalid isolation level rejected', () => {
  const doc = makeValidDoc();
  doc.isolationRequirements.minimumLevel = 'PUBLIC';
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('minimumLevel')));
});

test('SHARED isolation level accepted', () => {
  const doc = makeValidDoc();
  doc.isolationRequirements.minimumLevel = 'SHARED';
  const result = validate(doc);
  assert.equal(result.ok, true);
});

test('invalid KMS provider rejected', () => {
  const doc = makeValidDoc();
  doc.isolationRequirements.kmsProvider = 'my-vault';
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('kmsProvider')));
});

test('all 5 allowed KMS providers accepted', () => {
  for (const p of ['aws-kms', 'gcp-kms', 'azure-kv', 'hashicorp-vault', 'customer-managed']) {
    const doc = makeValidDoc();
    doc.isolationRequirements.kmsProvider = p;
    const result = validate(doc);
    assert.equal(result.ok, true, `expected ${p} to validate`);
  }
});

// ---------- auditTrail ----------

test('auditTrail.enabled not boolean rejected', () => {
  const doc = makeValidDoc();
  doc.auditTrail.enabled = 'yes';
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('auditTrail.enabled')));
});

test('auditTrail.retentionDays negative rejected', () => {
  const doc = makeValidDoc();
  doc.auditTrail.retentionDays = -1;
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('retentionDays')));
});

test('auditTrail.retentionDays non-number rejected', () => {
  const doc = makeValidDoc();
  doc.auditTrail.retentionDays = 'forever';
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('retentionDays')));
});

test('auditTrail.immutable not boolean rejected', () => {
  const doc = makeValidDoc();
  doc.auditTrail.immutable = 1;
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('auditTrail.immutable')));
});

test('auditTrail.sinkUrl not URL rejected', () => {
  const doc = makeValidDoc();
  doc.auditTrail.sinkUrl = 'not-a-url';
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('sinkUrl')));
});

test('auditTrail.sinkUrl ftp rejected', () => {
  const doc = makeValidDoc();
  doc.auditTrail.sinkUrl = 'ftp://audit.example.com';
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('sinkUrl')));
});

test('auditTrail.sinkUrl https accepted', () => {
  const doc = makeValidDoc();
  doc.auditTrail.sinkUrl = 'https://audit.example.com/x';
  const result = validate(doc);
  assert.equal(result.ok, true);
});

// ---------- updatedAt ----------

test('updatedAt not ISO-8601 rejected', () => {
  const doc = makeValidDoc();
  doc.updatedAt = 'soon';
  const result = validate(doc);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes('updatedAt')));
});

// ---------- multiple errors accumulated ----------

test('multiple errors reported at once', () => {
  const result = validate({
    schemaVersion: 'bad',
    subjectType: 'wrong',
    tenantId: 't_x',
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.length >= 3, `expected 3+ errors, got ${result.errors.length}`);
});

// ---------- rollupFrameworkStatus ----------

test('rollup: all COMPLIANT → COMPLIANT', () => {
  const fw = { controls: [{ status: 'COMPLIANT' }, { status: 'COMPLIANT' }] };
  assert.equal(rollupFrameworkStatus(fw), 'COMPLIANT');
});

test('rollup: any NON_COMPLIANT → NON_COMPLIANT', () => {
  const fw = { controls: [{ status: 'COMPLIANT' }, { status: 'NON_COMPLIANT' }] };
  assert.equal(rollupFrameworkStatus(fw), 'NON_COMPLIANT');
});

test('rollup: NON_COMPLIANT + COMPLIANT → NON_COMPLIANT', () => {
  const fw = { controls: [{ status: 'NON_COMPLIANT' }, { status: 'COMPLIANT' }] };
  assert.equal(rollupFrameworkStatus(fw), 'NON_COMPLIANT');
});

test('rollup: some PARTIAL → PARTIAL', () => {
  const fw = { controls: [{ status: 'COMPLIANT' }, { status: 'PARTIAL' }] };
  assert.equal(rollupFrameworkStatus(fw), 'PARTIAL');
});

test('rollup: empty controls → NOT_ASSESSED', () => {
  assert.equal(rollupFrameworkStatus({ controls: [] }), 'NOT_ASSESSED');
});

test('rollup: missing controls → NOT_ASSESSED', () => {
  assert.equal(rollupFrameworkStatus({}), 'NOT_ASSESSED');
});

test('rollup: null framework → NOT_ASSESSED', () => {
  assert.equal(rollupFrameworkStatus(null), 'NOT_ASSESSED');
});

test('rollup: mixed COMPLIANT + NOT_APPLICABLE → COMPLIANT', () => {
  const fw = { controls: [{ status: 'COMPLIANT' }, { status: 'NOT_APPLICABLE' }] };
  assert.equal(rollupFrameworkStatus(fw), 'COMPLIANT');
});

test('rollup: only NOT_APPLICABLE → COMPLIANT', () => {
  const fw = { controls: [{ status: 'NOT_APPLICABLE' }, { status: 'NOT_APPLICABLE' }] };
  assert.equal(rollupFrameworkStatus(fw), 'COMPLIANT');
});

test('rollup: NOT_APPLICABLE + PARTIAL → PARTIAL', () => {
  const fw = { controls: [{ status: 'NOT_APPLICABLE' }, { status: 'PARTIAL' }] };
  assert.equal(rollupFrameworkStatus(fw), 'PARTIAL');
});

// ---------- round-trip ----------

test('valid doc round-trips: validate(rollup(build())) OK', () => {
  const doc = makeValidDoc();
  // Use rollup to confirm doc's framework status is consistent
  for (const fw of doc.frameworks) {
    fw.status = rollupFrameworkStatus(fw);
  }
  const result = validate(doc);
  assert.equal(result.ok, true);
});
