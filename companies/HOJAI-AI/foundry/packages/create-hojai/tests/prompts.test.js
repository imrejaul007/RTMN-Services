/**
 * Tests for the @hojai/create CLI.
 *
 * Covers:
 *   • prompts catalogue
 *   • template/region lookups
 *   • name validation
 *   • render + token replacement
 *   • manifest generation
 *   • end-to-end scaffolding into a temp dir
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import {
  TEMPLATES, AGENT_PRESETS, REGIONS, LANGUAGES,
  templateByValue, presetAgentsFor, regionByValue, isValidName
} from '../src/prompts.js';
import { renderTemplate, buildVars } from '../src/render.js';
import { writeManifest } from '../src/manifest.js';

// ── prompts catalogue ──────────────────────────────────────────────────

test('TEMPLATES contains all 9 starter kits', () => {
  const values = TEMPLATES.map(t => t.value);
  assert.deepEqual(values.sort(), ['b2b', 'company', 'crm', 'erp', 'hotel', 'logistics', 'marketplace', 'pos', 'restaurant']);
});

test('every template has an emoji, name, and description', () => {
  for (const t of TEMPLATES) {
    assert.ok(t.emoji, `template ${t.value} missing emoji`);
    assert.ok(t.name, `template ${t.value} missing name`);
    assert.ok(t.description, `template ${t.value} missing description`);
  }
});

test('AGENT_PRESETS has a preset for every template', () => {
  for (const t of TEMPLATES) {
    const preset = AGENT_PRESETS[t.value];
    assert.ok(Array.isArray(preset) && preset.length > 0, `template ${t.value} missing agent preset`);
  }
});

test('REGIONS has 6 entries spanning all major continents', () => {
  assert.equal(REGIONS.length, 6);
  const values = REGIONS.map(r => r.value);
  for (const v of ['us-east', 'us-west', 'eu-west', 'ap-south', 'ap-south-east', 'me']) assert.ok(values.includes(v));
});

test('LANGUAGES includes the major 9 languages', () => {
  const values = LANGUAGES.map(l => l.value);
  for (const v of ['en', 'ar', 'hi', 'es', 'fr', 'de', 'pt', 'zh', 'ja']) assert.ok(values.includes(v));
});

// ── lookups ────────────────────────────────────────────────────────────

test('templateByValue returns a value or null', () => {
  assert.equal(templateByValue('marketplace').value, 'marketplace');
  assert.equal(templateByValue('b2b').value, 'b2b');
  assert.equal(templateByValue('nope'), null);
});

test('presetAgentsFor returns marketplace preset by default', () => {
  assert.deepEqual(presetAgentsFor('unknown-template'), AGENT_PRESETS.marketplace);
});

test('regionByValue returns the right region or default to first', () => {
  assert.equal(regionByValue('me').name, 'Middle East (Dubai)');
  assert.equal(regionByValue('nope').name, REGIONS[0].name);
});

// ── name validation ────────────────────────────────────────────────────

test('isValidName accepts lowercase-hyphen names', () => {
  assert.ok(isValidName('tradeflow'));
  assert.ok(isValidName('my-app-2'));
});

test('isValidName rejects invalid names', () => {
  assert.equal(isValidName('Tradeflow'), false);  // uppercase
  assert.equal(isValidName('-leading-hyphen'), false);
  assert.equal(isValidName('a'), false);            // too short
  assert.equal(isValidName('a'.repeat(41)), false); // too long
  assert.equal(isValidName('has space'), false);
  assert.equal(isValidName('123-numbers'), false); // must start with letter
  assert.equal(isValidName(''), false);
  assert.equal(isValidName(null), false);
  assert.equal(isValidName(undefined), false);
});

// ── buildVars / render ────────────────────────────────────────────────

test('buildVars produces a complete token map', () => {
  const v = buildVars({ name: 'tradeflow', template: 'marketplace', agents: ['CEO', 'Sales'], region: 'me', languages: ['en', 'ar'] });
  assert.equal(v.PROJECT_NAME, 'tradeflow');
  assert.equal(v.PROJECT_TITLE, 'Tradeflow');
  assert.equal(v.TEMPLATE, 'marketplace');
  assert.equal(v.AGENTS_COMMA, 'CEO, Sales');
  assert.equal(v.REGION, 'me');
  assert.equal(v.LANGUAGES_COMMA, 'en, ar');
  assert.equal(v.PRIMARY_LANGUAGE, 'en');
  assert.match(v.CREATED_AT, /^\d{4}-\d{2}-\d{2}$/);
});

test('buildVars JSON-encodes arrays for use in JSON-style placeholders', () => {
  const v = buildVars({ name: 'x', template: 't', agents: ['A', 'B'], region: 'r', languages: ['en'] });
  assert.equal(v.AGENTS_JSON, '["A","B"]');
  assert.equal(v.LANGUAGES_JSON, '["en"]');
});

test('renderTemplate walks a directory and replaces tokens', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-test-'));
  const tplDir = path.join(tmp, 'tpl');
  await fs.mkdir(path.join(tplDir, 'sub'), { recursive: true });
  await fs.writeFile(path.join(tplDir, 'a.txt'), 'name={{PROJECT_NAME}} region={{REGION}}');
  await fs.writeFile(path.join(tplDir, 'sub', 'b.txt'), 'title={{PROJECT_TITLE}}');
  await fs.writeFile(path.join(tplDir, '_gitignore'), 'node_modules/');

  const target = path.join(tmp, 'out');
  const vars = { PROJECT_NAME: 'foo', PROJECT_TITLE: 'Foo', REGION: 'me' };
  const files = await renderTemplate({ templateDir: tplDir, targetDir: target, vars });

  assert.deepEqual(files.sort(), ['.gitignore', 'a.txt', 'sub/b.txt']);
  assert.equal(await fs.readFile(path.join(target, 'a.txt'), 'utf8'), 'name=foo region=me');
  assert.equal(await fs.readFile(path.join(target, 'sub', 'b.txt'), 'utf8'), 'title=Foo');
  assert.equal(await fs.readFile(path.join(target, '.gitignore'), 'utf8'), 'node_modules/');
});

test('renderTemplate leaves unknown {{TOKENS}} intact', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-test-'));
  const tplDir = path.join(tmp, 'tpl');
  await fs.mkdir(tplDir, { recursive: true });
  await fs.writeFile(path.join(tplDir, 'a.txt'), 'known={{PROJECT_NAME}} unknown={{MYSTERY}}');
  const target = path.join(tmp, 'out');
  await renderTemplate({ templateDir: tplDir, targetDir: target, vars: { PROJECT_NAME: 'x' } });
  assert.equal(await fs.readFile(path.join(target, 'a.txt'), 'utf8'), 'known=x unknown={{MYSTERY}}');
});

test('renderTemplate skips node_modules and dist', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-test-'));
  const tplDir = path.join(tmp, 'tpl');
  await fs.mkdir(path.join(tplDir, 'node_modules'), { recursive: true });
  await fs.mkdir(path.join(tplDir, 'dist'), { recursive: true });
  await fs.writeFile(path.join(tplDir, 'a.txt'), 'ok');
  await fs.writeFile(path.join(tplDir, 'node_modules', 'skip.js'), 'skip me');
  await fs.writeFile(path.join(tplDir, 'dist', 'skip.js'), 'skip me');
  const target = path.join(tmp, 'out');
  const files = await renderTemplate({ templateDir: tplDir, targetDir: target, vars: {} });
  assert.deepEqual(files, ['a.txt']);
});

// ── writeManifest ─────────────────────────────────────────────────────

test('writeManifest writes manifest.json + capability.json with correct shape', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-test-'));
  const { projectId, hash } = await writeManifest({
    targetDir: tmp,
    name: 'myapp',
    template: 'marketplace',
    agents: ['CEO', 'Sales'],
    region: 'us-east',
    languages: ['en'],
    files: ['a.txt', 'b.txt']
  });
  assert.ok(projectId);
  assert.match(hash, /^[a-f0-9]{16}$/);

  const manifest = JSON.parse(await fs.readFile(path.join(tmp, '.hojai', 'manifest.json'), 'utf8'));
  const capability = JSON.parse(await fs.readFile(path.join(tmp, '.hojai', 'capability.json'), 'utf8'));

  assert.equal(manifest.name, 'myapp');
  assert.equal(manifest.template, 'marketplace');
  assert.equal(manifest.region, 'us-east');
  assert.deepEqual(manifest.agents, ['CEO', 'Sales']);
  assert.equal(manifest.primaryLanguage, 'en');
  assert.equal(manifest.schemaVersion, '1.0.0');
  assert.ok(manifest.nexha.enabled);
  assert.deepEqual(manifest.sdkDependencies.length, 8);

  assert.equal(capability.name, 'myapp');
  assert.equal(capability.layer, 2);
  assert.equal(capability.regions[0], 'us-east');
  assert.equal(capability.slaTargets.uptimePercent, 99.5);
  assert.equal(capability.capabilities.length, 2);
  assert.equal(capability.capabilities[0].id, 'hojai.orchestration');
  assert.equal(capability.capabilities[1].id, 'hojai.sales');
});
