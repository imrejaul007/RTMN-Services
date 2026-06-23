/**
 * SkillOS — Enhancement (packs, deps, agents) unit tests
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLibrary, resolveDependencies, planPackInstall, buildEnhancement,
  PACK_INSTALL_BEHAVIORS,
} from '../../src/services/enhancement.js';

test('skill-os enhancement — buildLibrary', async (t) => {
  await t.test('creates a private library', () => {
    const lib = buildLibrary({ ownerId: 'u-1', name: 'My Sales' });
    assert.equal(lib.ownerId, 'u-1');
    assert.equal(lib.name, 'My Sales');
    assert.equal(lib.visibility, 'private');
    assert.equal(lib.ownerType, 'human');
    assert.deepEqual(lib.skillIds, []);
  });

  await t.test('rejects missing fields', () => {
    assert.throws(() => buildLibrary({}), /ownerId required|name required/);
  });

  await t.test('rejects invalid visibility', () => {
    assert.throws(() => buildLibrary({ ownerId: 'u', name: 'n', visibility: 'weird' }), /invalid visibility/);
  });
});

test('skill-os enhancement — resolveDependencies', async (t) => {
  await t.test('returns input ids when no deps', async () => {
    const getAsset = async (id) => id === 'a' ? { id: 'a' } : null;
    const getDeps = async () => [];
    const r = await resolveDependencies(['a'], getAsset, getDeps);
    assert.deepEqual(r.resolved, ['a']);
    assert.deepEqual(r.missing, []);
  });

  await t.test('recursively resolves dependencies', async () => {
    const assets = { a: { id: 'a' }, b: { id: 'b' }, c: { id: 'c' } };
    const deps = { a: ['b'], b: ['c'], c: [] };
    const getAsset = async (id) => assets[id] || null;
    const getDeps = async (id) => deps[id] || [];
    const r = await resolveDependencies(['a'], getAsset, getDeps);
    assert.deepEqual(r.resolved.sort(), ['a', 'b', 'c']);
  });

  await t.test('handles missing deps in the missing array', async () => {
    const getAsset = async (id) => id === 'a' ? { id: 'a' } : null;
    const getDeps = async (id) => id === 'a' ? ['b'] : [];
    const r = await resolveDependencies(['a'], getAsset, getDeps);
    assert.deepEqual(r.resolved, ['a']);
    assert.deepEqual(r.missing, ['b']);
  });
});

test('skill-os enhancement — planPackInstall', async (t) => {
  await t.test('atomic behavior fails on missing deps', async () => {
    const pack = { assetType: 'pack', memberAssetIds: ['a'], installBehavior: 'atomic' };
    const getAsset = async (id) => id === 'a' ? { id: 'a' } : null;
    const getDeps = async () => ['missing-1'];
    await assert.rejects(planPackInstall(pack, getAsset, getDeps), /atomic pack install failed/);
  });

  await t.test('best-effort behavior proceeds with missing', async () => {
    const pack = { assetType: 'pack', memberAssetIds: ['a'], installBehavior: 'best-effort' };
    const getAsset = async (id) => id === 'a' ? { id: 'a' } : null;
    const getDeps = async () => ['missing-1'];
    const r = await planPackInstall(pack, getAsset, getDeps);
    assert.deepEqual(r.toInstall, ['a']);
    assert.deepEqual(r.missing, ['missing-1']);
  });

  await t.test('rejects non-pack asset', async () => {
    const pack = { assetType: 'skill', memberAssetIds: [] };
    const getAsset = async () => null;
    const getDeps = async () => [];
    await assert.rejects(planPackInstall(pack, getAsset, getDeps), /not a pack/);
  });
});

test('skill-os enhancement — buildEnhancement', async (t) => {
  await t.test('builds an enhancement record', () => {
    const e = buildEnhancement({
      agentId: 'agt-1', libraryId: 'lib-1', skillIds: ['sk-1', 'sk-2'],
      installedBy: 'u-1', tenantId: 't-1',
    });
    assert.equal(e.agentId, 'agt-1');
    assert.equal(e.status, 'active');
    assert.equal(e.skillIds.length, 2);
  });

  await t.test('rejects empty skillIds', () => {
    assert.throws(() => buildEnhancement({ agentId: 'a', skillIds: [], installedBy: 'u' }), /skillIds/);
  });

  await t.test('PACK_INSTALL_BEHAVIORS has 2 values', () => {
    assert.equal(PACK_INSTALL_BEHAVIORS.length, 2);
  });
});
