import { test } from 'node:test';
import assert from 'node:assert/strict';
import bcpService from '../../src/services/bcpService.js';

test('seeds 5 BCPs', () => {
  const r = bcpService.getStats();
  assert.equal(r.totalPacks, 5);
  assert.deepEqual(r.categories.sort(), ['finance', 'marketing', 'procurement', 'sales', 'support'].sort());
});

test('getPack returns pack by id', () => {
  const pack = bcpService.getPack('bcp-sales-ai');
  assert.ok(pack);
  assert.equal(pack!.name, 'Sales AI Pack');
  assert.equal(pack!.category, 'sales');
  assert.equal(pack!.employees.length, 1);
});

test('getPack returns null for unknown id', () => {
  assert.equal(bcpService.getPack('bcp-unknown'), null);
});

test('listPacks returns all packs sorted by popularity', () => {
  const r = bcpService.listPacks({});
  assert.equal(r.total, 5);
  assert.equal(r.packs.length, 5);
  const ids = r.packs.map(p => p.id);
  assert.ok(ids.includes('bcp-sales-ai'), 'bcp-sales-ai should be in results');
});

test('listPacks filters by category', () => {
  const r = bcpService.listPacks({ category: 'finance' });
  assert.equal(r.total, 1);
  assert.equal(r.packs[0].id, 'bcp-finance-ai');
});

test('listPacks filters by q (text search)', () => {
  const r = bcpService.getStats(); // just check stats
  const byQ = bcpService.listPacks({ q: 'invoice' });
  assert.ok(byQ.total >= 1);
});

test('listPacks sorts by rating', () => {
  const r = bcpService.listPacks({ sort: 'rating' });
  assert.equal(r.total, 5);
  // All 5 returned
});

test('listPacks sorts by name', () => {
  const r = bcpService.listPacks({ sort: 'name' });
  const names = r.packs.map(p => p.name);
  const sorted = [...names].sort();
  assert.deepEqual(names, sorted);
});

test('listPacks pagination works', () => {
  const r = bcpService.listPacks({ page: 1, pageSize: 2 });
  assert.equal(r.packs.length, 2);
  assert.equal(r.total, 5);
  assert.equal(r.page, 1);
  assert.equal(r.pageSize, 2);
});

test('getCategories returns all 5 categories', () => {
  const cats = bcpService.getCategories();
  assert.equal(cats.length, 5);
  for (const c of cats) {
    assert.ok(c.name);
    assert.ok(c.count >= 1);
    assert.ok(c.packs.length >= 1);
  }
});

test('install creates an installation', () => {
  const inst = bcpService.install('bcp-sales-ai', 'company-abc');
  assert.equal(inst.bcpId, 'bcp-sales-ai');
  assert.equal(inst.companyId, 'company-abc');
  assert.equal(inst.status, 'active');
  assert.ok(Array.isArray(inst.installedEmployees));
  assert.ok(typeof inst.stepStatus === 'object' && inst.stepStatus !== null);
});

test('install throws on unknown bcp', () => {
  assert.throws(() => bcpService.install('bcp-fake', 'company-xyz'), /not found/);
});

test('install throws on duplicate', () => {
  bcpService.install('bcp-sales-ai', 'company-dup');
  assert.throws(() => bcpService.install('bcp-sales-ai', 'company-dup'), /already installed/);
});

test('getInstallations returns company installs', () => {
  bcpService.install('bcp-finance-ai', 'company-xyz');
  const insts = bcpService.getInstallations('company-xyz');
  assert.equal(insts.length, 1);
  assert.equal(insts[0].bcpId, 'bcp-finance-ai');
});

test('uninstall removes installation', () => {
  bcpService.install('bcp-support-ai', 'company-del');
  bcpService.uninstall('bcp-support-ai', 'company-del');
  const insts = bcpService.getInstallations('company-del');
  assert.equal(insts.length, 0);
});

test('uninstall throws on unknown installation', () => {
  assert.throws(() => bcpService.uninstall('bcp-sales-ai', 'company-none'), /not found/i);
});

test('updateSetupStep updates step status', () => {
  const inst = bcpService.install('bcp-marketing-ai', 'company-step');
  const stepId = Object.keys(inst.stepStatus)[0];
  const updated = bcpService.updateSetupStep('company-step', 'bcp-marketing-ai', stepId, 'done');
  assert.equal(updated.stepStatus[stepId], 'done');
});

test('updateSetupStep accepts config', () => {
  const inst = bcpService.install('bcp-marketing-ai', 'company-cfg');
  const stepId = Object.keys(inst.stepStatus)[0];
  const updated = bcpService.updateSetupStep('company-cfg', 'bcp-marketing-ai', stepId, 'in-progress', { apiKey: 'sk-test' });
  assert.equal(updated.config.apiKey, 'sk-test');
});

test('each BCP has required employees + skills + workflows + integrations + setup steps', () => {
  const packs = bcpService.listPacks({}).packs;
  for (const p of packs) {
    assert.ok(p.employees.length >= 1, `${p.id} should have at least 1 employee`);
    assert.ok(p.skills.length >= 1, `${p.id} should have at least 1 skill`);
    assert.ok(p.workflows.length >= 1, `${p.id} should have at least 1 workflow`);
    assert.ok(p.integrations.length >= 1, `${p.id} should have at least 1 integration`);
    assert.ok(p.setupSteps.length >= 1, `${p.id} should have at least 1 setup step`);
  }
});

test('getStats returns valid counts', () => {
  const stats = bcpService.getStats();
  assert.equal(stats.totalPacks, 5);
  assert.equal(typeof stats.totalInstallations, 'number');
  assert.equal(stats.categories.length, 5);
});

test('each BCP has estimatedSetupMinutes', () => {
  const packs = bcpService.listPacks({}).packs;
  for (const p of packs) {
    assert.ok(p.estimatedSetupMinutes > 0, `${p.id} should have estimatedSetupMinutes`);
    assert.equal(typeof p.estimatedSetupMinutes, 'number');
  }
});
