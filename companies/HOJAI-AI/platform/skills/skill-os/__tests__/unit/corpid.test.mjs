/**
 * SkillOS — CorpID wrapper unit tests
 *
 * In test mode (`SKILLOS_REQUIRE_AUTH=false`), the wrapper uses a dev
 * fallback that trusts ownerId strings.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

// Force dev mode for these tests
process.env.SKILLOS_REQUIRE_AUTH = 'false';
process.env.SKILLOS_NO_CORPID = '1';

const { resolveOwner, ownerExists, resolveOwners, config } = await import('../../src/services/corpid.js');

test('skill-os corpid — dev fallback', async (t) => {
  await t.test('returns a stub record for any id', async () => {
    const r = await resolveOwner('user-123');
    assert.equal(r.id, 'user-123');
    assert.equal(r.exists, true);
    assert.equal(r.source, 'dev-fallback');
  });

  await t.test('returns null id for null/undefined', async () => {
    const r1 = await resolveOwner(null);
    const r2 = await resolveOwner(undefined);
    assert.equal(r1.id, null);
    assert.equal(r1.exists, false);
    assert.equal(r2.id, null);
  });

  await t.test('ownerExists returns true for any id in dev mode', async () => {
    assert.equal(await ownerExists('u-1'), true);
  });

  await t.test('resolveOwners returns array of records', async () => {
    const list = await resolveOwners(['u-1', 'u-2']);
    assert.equal(list.length, 2);
    assert.equal(list[0].id, 'u-1');
  });

  await t.test('expectedType overrides default', async () => {
    const r = await resolveOwner('agent-1', { expectedType: 'agent' });
    assert.equal(r.type, 'agent');
  });

  await t.test('config exposes CorpID URL', () => {
    assert.ok(typeof config.CORPID_URL === 'string');
    assert.match(config.CORPID_URL, /^https?:\/\//);
    assert.equal(config.SKIP_CORPID, true);
  });
});
