/**
 * SkillOS — Certification unit tests
 *
 * Tests the 5-level certification model:
 *   community → verified → enterprise → government → hojai-certified
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CERT_LEVELS,
  isValidLevel,
  defaultCertification,
  normalizeCertification,
} from '../../src/services/certification.js';

test('skill-os certification — levels', async (t) => {
  await t.test('all 5 levels are present', () => {
    assert.equal(CERT_LEVELS.length, 5);
    assert.ok(CERT_LEVELS.includes('community'));
    assert.ok(CERT_LEVELS.includes('verified'));
    assert.ok(CERT_LEVELS.includes('enterprise'));
    assert.ok(CERT_LEVELS.includes('government'));
    assert.ok(CERT_LEVELS.includes('hojai-certified'));
  });

  await t.test('isValidLevel accepts valid levels', () => {
    for (const level of CERT_LEVELS) {
      assert.equal(isValidLevel(level), true);
    }
  });

  await t.test('isValidLevel rejects invalid levels', () => {
    assert.equal(isValidLevel('gold'), false);
    assert.equal(isValidLevel('platinum'), false);
    assert.equal(isValidLevel('community-plus'), false);
  });

  await t.test('defaultCertification is community', () => {
    const c = defaultCertification();
    assert.equal(c.level, 'community');
    assert.equal(c.certifiedAt, null);
    assert.equal(c.certifiedBy, null);
  });
});

test('skill-os certification — normalize', async (t) => {
  await t.test('normalize with no input returns defaults', () => {
    const c = normalizeCertification();
    assert.equal(c.level, 'community');
  });

  await t.test('normalize with valid level stamps certifiedAt', () => {
    const c = normalizeCertification({ level: 'enterprise', certifiedBy: 'hojai' });
    assert.equal(c.level, 'enterprise');
    assert.equal(c.certifiedBy, 'hojai');
    assert.ok(c.certifiedAt); // auto-stamped
  });

  await t.test('normalize community leaves certifiedAt null', () => {
    const c = normalizeCertification({ level: 'community' });
    assert.equal(c.certifiedAt, null);
  });

  await t.test('normalize rejects invalid level', () => {
    assert.throws(() => normalizeCertification({ level: 'platinum' }), /invalid certification level/);
  });

  await t.test('normalize hojai-certified works', () => {
    const c = normalizeCertification({ level: 'hojai-certified', certifiedBy: 'hojai-board' });
    assert.equal(c.level, 'hojai-certified');
    assert.equal(c.certifiedBy, 'hojai-board');
  });
});
