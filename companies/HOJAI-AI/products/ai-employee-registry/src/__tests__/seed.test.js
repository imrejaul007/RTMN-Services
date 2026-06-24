/**
 * Tests for AI Employee Registry.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { SEED_EMPLOYEES } = require('../seed-data.js');
const { buildCapabilityMap } = require('../agentos-sync.js');

// ─── Seed data validation ─────────────────────────────────────────────

test('SEED_EMPLOYEES contains exactly 16 employees', () => {
  assert.equal(SEED_EMPLOYEES.length, 16);
});

test('SEED_EMPLOYEES has 13 vision-genie agents', () => {
  const vision = SEED_EMPLOYEES.filter((e) => e.visionAgent);
  assert.equal(vision.length, 13);
});

test('13 vision agents cover all expected roles', () => {
  const vision = SEED_EMPLOYEES.filter((e) => e.visionAgent);
  const roles = vision.map((e) => e.visionRole).sort();
  const expected = [
    'automation', 'companion', 'consultant', 'creator', 'finance', 'founder',
    'health', 'memory', 'planner', 'research', 'shopping', 'teacher', 'travel'
  ].sort();
  assert.deepEqual(roles, expected);
});

test('3 new employees (Budgeting, Legal, Localization) are NOT vision agents', () => {
  const newOnes = SEED_EMPLOYEES.filter((e) =>
    ['genie-budgeting', 'genie-legal', 'genie-localization'].includes(e.slug)
  );
  assert.equal(newOnes.length, 3);
  for (const e of newOnes) {
    assert.equal(e.visionAgent, false);
  }
});

test('Every employee has required fields', () => {
  for (const emp of SEED_EMPLOYEES) {
    assert.ok(emp.id, `missing id: ${emp.name}`);
    assert.ok(emp.slug, `missing slug: ${emp.id}`);
    assert.ok(emp.name, `missing name: ${emp.id}`);
    assert.ok(emp.description, `missing description: ${emp.id}`);
    assert.ok(emp.category, `missing category: ${emp.id}`);
    assert.ok(Array.isArray(emp.capabilities), `capabilities not array: ${emp.id}`);
    assert.ok(emp.status, `missing status: ${emp.id}`);
    assert.ok(emp.pricing, `missing pricing: ${emp.id}`);
  }
});

test('All slugs are unique', () => {
  const slugs = SEED_EMPLOYEES.map((e) => e.slug);
  assert.equal(new Set(slugs).size, slugs.length);
});

test('Research and Travel are marked as not yet built', () => {
  const research = SEED_EMPLOYEES.find((e) => e.slug === 'genie-research');
  const travel = SEED_EMPLOYEES.find((e) => e.slug === 'genie-travel');
  assert.equal(research.serviceUrl, null);
  assert.equal(travel.serviceUrl, null);
  assert.equal(research.status, 'planned');
  assert.equal(travel.status, 'planned');
});

test('11 of 13 vision agents are available, 2 are planned', () => {
  const vision = SEED_EMPLOYEES.filter((e) => e.visionAgent);
  const available = vision.filter((e) => e.status === 'available').length;
  const planned = vision.filter((e) => e.status === 'planned').length;
  assert.equal(available, 11);
  assert.equal(planned, 2);
});

// ─── Capability map ────────────────────────────────────────────────────

test('buildCapabilityMap groups employees by capability', () => {
  const map = buildCapabilityMap(SEED_EMPLOYEES);
  assert.ok(Array.isArray(map));
  assert.ok(map.length > 0);

  // Every capability should have at least one provider
  for (const entry of map) {
    assert.ok(entry.capability);
    assert.ok(entry.providerCount >= 1);
    assert.ok(Array.isArray(entry.providers));
  }
});

test('buildCapabilityMap sorts entries by capability name', () => {
  const map = buildCapabilityMap(SEED_EMPLOYEES);
  for (let i = 1; i < map.length; i++) {
    assert.ok(map[i - 1].capability.localeCompare(map[i].capability) <= 0);
  }
});

test('buildCapabilityMap ranks providers by rating', () => {
  const map = buildCapabilityMap(SEED_EMPLOYEES);
  // Find a capability with multiple providers
  const multi = map.find((m) => m.providerCount > 1);
  if (multi) {
    for (let i = 1; i < multi.providers.length; i++) {
      assert.ok(
        (multi.providers[i - 1].rating || 0) >= (multi.providers[i].rating || 0)
      );
    }
  }
});

test('buildCapabilityMap handles employees with no capabilities gracefully', () => {
  const map = buildCapabilityMap([
    { id: 'a', slug: 'a', name: 'A', capabilities: ['foo'] },
    { id: 'b', slug: 'b', name: 'B' /* no capabilities field */ }
  ]);
  // Should include 'foo' from employee A
  const foo = map.find((m) => m.capability === 'foo');
  assert.ok(foo);
  assert.equal(foo.providerCount, 1);
});

// ─── Slug mapping ──────────────────────────────────────────────────────

test('All vision-genie slugs use genie- prefix', () => {
  const vision = SEED_EMPLOYEES.filter((e) => e.visionAgent);
  for (const e of vision) {
    assert.ok(e.slug.startsWith('genie-'), `vision agent slug should start with genie-: ${e.slug}`);
  }
});