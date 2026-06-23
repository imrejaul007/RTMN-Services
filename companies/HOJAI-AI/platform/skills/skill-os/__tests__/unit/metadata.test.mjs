/**
 * SkillOS — Metadata + validation unit tests
 *
 * Tests the rich-metadata model (20+ fields), the validators, and
 * backfill of defaults for legacy records.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaultMetadata,
  fillMetadata,
  validateMetadata,
  ASSET_TYPES,
  VISIBILITY,
  OWNER_TYPES,
} from '../../src/services/metadata.js';

test('skill-os metadata — defaults and backfill', async (t) => {
  await t.test('defaultMetadata returns all 20+ fields', () => {
    const m = defaultMetadata();
    const expected = [
      'creatorId', 'publisher', 'ownerType', 'ownerId',
      'inputSchema', 'outputSchema', 'requiredModels', 'requiredPermissions',
      'supportedLanguages', 'supportedIndustries', 'license', 'pricingModel',
      'price', 'currency', 'certification', 'compliance', 'visibility',
      'visibilityOrg', 'tenantId', 'status', 'deprecatedAt', 'sunsetAt',
      'replacement', 'avgExecutionMs', 'accuracyScore', 'totalDownloads',
      'totalExecutions', 'totalRevenue', 'featured', 'trending',
    ];
    for (const k of expected) {
      assert.ok(k in m, `missing field: ${k}`);
    }
  });

  await t.test('asset types include the 5 we ship + 5 we plan', () => {
    assert.ok(ASSET_TYPES.includes('skill'));
    assert.ok(ASSET_TYPES.includes('agent-template'));
    assert.ok(ASSET_TYPES.includes('workflow-template'));
    assert.ok(ASSET_TYPES.includes('prompt-pack'));
    assert.ok(ASSET_TYPES.includes('knowledge-pack'));
    assert.ok(ASSET_TYPES.includes('tool-connector'));
    assert.ok(ASSET_TYPES.includes('model-adapter'));
    assert.ok(ASSET_TYPES.includes('automation-pack'));
    assert.ok(ASSET_TYPES.includes('industry-pack'));
    assert.ok(ASSET_TYPES.includes('enterprise-pack'));
    assert.equal(ASSET_TYPES.length, 11);
  });

  await t.test('visibility levels are public / private / org-only', () => {
    assert.deepEqual([...VISIBILITY].sort(), ['org-only', 'private', 'public']);
  });

  await t.test('owner types include human / agent / organization / personal', () => {
    assert.deepEqual([...OWNER_TYPES].sort(), ['agent', 'human', 'organization', 'personal']);
  });

  await t.test('fillMetadata adds missing fields to legacy record', () => {
    const legacy = { id: 'a1', name: 'Old', category: 'business' };
    const filled = fillMetadata(legacy);
    assert.equal(filled.id, 'a1');
    assert.equal(filled.name, 'Old');
    assert.equal(filled.publisher, null);
    assert.equal(filled.pricingModel, 'free');
    assert.equal(filled.price, 0);
    assert.equal(filled.visibility, 'public');
    assert.equal(filled.status, 'active');
    assert.equal(filled.tenantId, null);
  });

  await t.test('fillMetadata preserves existing fields (no overwrite)', () => {
    const asset = { id: 'a1', publisher: 'Microsoft', pricingModel: 'one-time', price: 99 };
    const filled = fillMetadata(asset);
    assert.equal(filled.publisher, 'Microsoft');
    assert.equal(filled.pricingModel, 'one-time');
    assert.equal(filled.price, 99);
  });

  await t.test('fillMetadata normalizes nested certification and compliance', () => {
    const asset = { id: 'a1' };
    const filled = fillMetadata(asset);
    assert.equal(filled.certification.level, 'community');
    assert.equal(filled.compliance.gdpr, false);
    assert.equal(filled.compliance.hipaa, false);
  });
});

test('skill-os metadata — validation', async (t) => {
  await t.test('valid assetType passes', () => {
    assert.doesNotThrow(() => validateMetadata({ assetType: 'skill' }));
    assert.doesNotThrow(() => validateMetadata({ assetType: 'agent-template' }));
  });

  await t.test('invalid assetType throws', () => {
    assert.throws(() => validateMetadata({ assetType: 'bogus' }), /invalid assetType/);
  });

  await t.test('valid visibility passes', () => {
    assert.doesNotThrow(() => validateMetadata({ visibility: 'public' }));
    assert.doesNotThrow(() => validateMetadata({ visibility: 'private' }));
    assert.doesNotThrow(() => validateMetadata({ visibility: 'org-only' }));
  });

  await t.test('invalid visibility throws', () => {
    assert.throws(() => validateMetadata({ visibility: 'all-the-world' }), /invalid visibility/);
  });

  await t.test('valid ownerType passes', () => {
    assert.doesNotThrow(() => validateMetadata({ ownerType: 'human' }));
    assert.doesNotThrow(() => validateMetadata({ ownerType: 'agent' }));
    assert.doesNotThrow(() => validateMetadata({ ownerType: 'organization' }));
    assert.doesNotThrow(() => validateMetadata({ ownerType: 'personal' }));
  });

  await t.test('negative price throws', () => {
    assert.throws(() => validateMetadata({ price: -1 }), /non-negative/);
  });

  await t.test('non-numeric price throws', () => {
    assert.throws(() => validateMetadata({ price: 'free' }), /non-negative/);
  });

  await t.test('invalid pricingModel throws', () => {
    assert.throws(() => validateMetadata({ pricingModel: 'monthly-forever' }), /invalid pricingModel/);
  });

  await t.test('supportedLanguages must be array', () => {
    assert.throws(() => validateMetadata({ supportedLanguages: 'en,es' }), /must be an array/);
  });

  await t.test('requiredModels must be array', () => {
    assert.throws(() => validateMetadata({ requiredModels: 'gpt-4' }), /must be an array/);
  });
});
