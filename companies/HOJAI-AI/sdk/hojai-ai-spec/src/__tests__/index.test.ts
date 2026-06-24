/**
 * Tests for @hojai/ai-spec
 *
 * Covers: Zod schema validation, file write/read roundtrip, package.json
 * introspection, template rendering.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  ManifestSchema, CapabilitySchema,
  parseManifest, parseCapability, validateManifestData, validateCapabilityData,
  renderFor, writeProjectContext, readProjectContext, isHojaiProject,
  generateManifestFromPackageJson, generateCapabilityFromManifest, generateAndWrite
} from '../index.js';

// ─── Schema tests ─────────────────────────────────────────────

test('ManifestSchema accepts a valid manifest', () => {
  const m = {
    schemaVersion: '1.0.0',
    projectId: 'p-1',
    name: 'TradeFlow',
    type: 'b2b',
    region: 'me',
    languages: ['en', 'ar'],
    hojaiVersion: '1.0.0',
    createdAt: '2026-06-24',
    agents: [],
    integrations: ['foundation', 'sutar']
  };
  const parsed = ManifestSchema.parse(m);
  assert.equal(parsed.name, 'TradeFlow');
  assert.equal(parsed.type, 'b2b');
  assert.deepEqual(parsed.languages, ['en', 'ar']);
});

test('ManifestSchema rejects invalid type', () => {
  const m = {
    schemaVersion: '1.0.0', projectId: 'p-1', name: 'X', type: 'NOT-A-TYPE',
    languages: ['en'], hojaiVersion: '1.0.0', createdAt: 't',
    agents: [], integrations: []
  };
  assert.throws(() => ManifestSchema.parse(m));
});

test('ManifestSchema rejects empty languages', () => {
  const m = {
    schemaVersion: '1.0.0', projectId: 'p-1', name: 'X', type: 'other',
    languages: [], hojaiVersion: '1.0.0', createdAt: 't',
    agents: [], integrations: []
  };
  assert.throws(() => ManifestSchema.parse(m));
});

test('CapabilitySchema accepts a valid capability', () => {
  const c = {
    schemaVersion: '1.0.0', projectId: 'p-1', name: 'X',
    capabilities: [{ id: 'hojai.sales', name: 'Sales', tier: 'business', type: 'offer' }],
    languages: ['en']
  };
  const parsed = CapabilitySchema.parse(c);
  assert.equal(parsed.capabilities[0].id, 'hojai.sales');
});

// ─── Validator tests ──────────────────────────────────────────

test('validateManifestData returns friendly errors', () => {
  const result = validateManifestData({ name: 'X' }); // missing many fields
  assert.equal(result.valid, false);
  assert.ok(result.errors.length > 0);
  assert.ok(result.errors.some(e => e.path === 'schemaVersion' || e.path === 'projectId'));
});

// ─── Render tests ─────────────────────────────────────────────

test('renderFor produces a valid hojai.ai.md for marketplace', () => {
  const md = renderFor({
    manifest: {
      schemaVersion: '1.0.0', projectId: 'p-1', name: 'TradeFlow',
      description: 'B2B trade',
      type: 'marketplace', region: 'me', languages: ['en', 'ar'],
      hojaiVersion: '1.0.0', createdAt: 't',
      agents: [{ role: 'CEO', purpose: 'Orchestrator.' }],
      integrations: ['foundation', 'sutar', 'commerce']
    },
    capability: {
      schemaVersion: '1.0.0', projectId: 'p-1', name: 'TradeFlow',
      capabilities: [{ id: 'hojai.orchestration', name: 'Orchestration', tier: 'core', type: 'offer' }],
      languages: ['en', 'ar']
    }
  });
  assert.ok(md.includes('# HOJAI Project: TradeFlow'), 'has title');
  assert.ok(md.includes('multi-vendor marketplace'), 'has marketplace preamble');
  assert.ok(md.includes('SUTAR Agents'), 'has agents section');
  assert.ok(md.includes('@hojai/foundation'), 'lists integrations');
  assert.ok(md.includes('Nexha Federation'), 'has Nexha section');
  assert.ok(md.includes('Conventions'), 'has conventions section');
});

test('renderFor handles SDK type with no preamble', () => {
  const md = renderFor({
    manifest: {
      schemaVersion: '1.0.0', projectId: 'p-1', name: '@hojai/foo',
      type: 'sdk', languages: ['en'], hojaiVersion: '1.0.0', createdAt: 't',
      agents: [], integrations: []
    },
    capability: { schemaVersion: '1.0.0', projectId: 'p-1', name: 'foo', capabilities: [] }
  });
  assert.ok(md.includes('# HOJAI Project: @hojai/foo'));
  // SDK should still render without the marketplace preamble
  assert.ok(!md.includes('multi-vendor marketplace'));
});

// ─── Write + read roundtrip ────────────────────────────────────

test('writeProjectContext writes 3 files and readProjectContext roundtrips', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-ai-spec-'));
  try {
    const manifest = {
      schemaVersion: '1.0.0' as const, projectId: 'p-1', name: 'TestProj',
      type: 'crm' as const, region: 'us-east' as const, languages: ['en'] as ('en')[],
      hojaiVersion: '1.0.0', createdAt: '2026-06-24T00:00:00.000Z',
      agents: [{ role: 'Sales', purpose: 'CRM' }],
      integrations: ['foundation', 'sutar']
    };
    const capability = {
      schemaVersion: '1.0.0' as const, projectId: 'p-1', name: 'TestProj',
      capabilities: [{ id: 'hojai.sales', name: 'Sales', tier: 'business' as const, type: 'offer' as const }],
      languages: ['en'] as ('en')[]
    };
    const written = await writeProjectContext(dir, manifest, capability);
    assert.equal(written.aiMdPath, path.join(dir, 'hojai.ai.md'));
    assert.equal(written.manifestPath, path.join(dir, '.hojai', 'manifest.json'));
    assert.equal(written.capabilityPath, path.join(dir, '.hojai', 'capability.json'));

    // Files exist
    for (const p of Object.values(written)) {
      const stat = await fs.stat(p);
      assert.ok(stat.size > 0);
    }

    // Roundtrip
    const read = await readProjectContext(dir);
    assert.equal(read.manifest.name, 'TestProj');
    assert.equal(read.capability.capabilities[0].id, 'hojai.sales');
    assert.ok(read.aiMdPath.endsWith('hojai.ai.md'));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('isHojaiProject detects existing project', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-ai-spec-'));
  try {
    assert.equal(await isHojaiProject(dir), false, 'empty dir is not a HOJAI project');
    await fs.mkdir(path.join(dir, '.hojai'), { recursive: true });
    await fs.writeFile(path.join(dir, '.hojai', 'manifest.json'), '{}');
    assert.equal(await isHojaiProject(dir), true, 'dir with .hojai/manifest.json is');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

// ─── Introspect tests ─────────────────────────────────────────

test('generateManifestFromPackageJson detects @hojai/* integrations', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-ai-spec-'));
  try {
    await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({
      name: 'maya-marketplace',
      description: 'A B2B marketplace for cotton textiles',
      keywords: ['marketplace', 'b2b'],
      dependencies: { '@hojai/foundation': '^1.0.0', '@hojai/sutar': '^1.0.0', '@hojai/nexha': '^1.0.0' },
      scripts: { dev: 'node index.js', test: 'node --test' }
    }));
    const manifest = await generateManifestFromPackageJson(dir);
    assert.equal(manifest.name, 'maya-marketplace');
    assert.equal(manifest.type, 'marketplace', 'detects type from keywords');
    assert.deepEqual(manifest.integrations.sort(), ['foundation', 'nexha', 'sutar']);
    assert.equal(manifest.scripts?.dev, 'node index.js');
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('generateCapabilityFromManifest maps agents to capabilities', () => {
  const cap = generateCapabilityFromManifest({
    schemaVersion: '1.0.0', projectId: 'p-1', name: 'X', type: 'company',
    region: 'global', languages: ['en'], hojaiVersion: '1.0.0', createdAt: 't',
    agents: [
      { role: 'CEO', purpose: 'Orchestrator' },
      { role: 'Sales', purpose: 'CRM' },
      { role: 'HR', purpose: 'Workforce' }
    ],
    integrations: []
  });
  assert.equal(cap.capabilities.length, 3);
  assert.ok(cap.capabilities.some(c => c.id === 'hojai.orchestration' && c.tier === 'core'));
  assert.ok(cap.capabilities.some(c => c.id === 'hojai.sales' && c.tier === 'business'));
  assert.ok(cap.capabilities.some(c => c.id === 'hojai.hr' && c.tier === 'business'));
});

test('generateAndWrite end-to-end: package.json → 3 files', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-ai-spec-'));
  try {
    await fs.writeFile(path.join(dir, 'package.json'), JSON.stringify({
      name: 'maya-store',
      description: 'A B2B store for fashion',
      keywords: ['b2b', 'fashion'],
      dependencies: { '@hojai/foundation': '^1.0.0', '@hojai/commerce': '^1.0.0' }
    }));
    const { manifest, capability } = await generateAndWrite(dir);
    assert.equal(manifest.name, 'maya-store');
    assert.ok(capability.capabilities.length > 0);
    // Files exist
    assert.ok((await fs.stat(path.join(dir, 'hojai.ai.md'))).isFile());
    assert.ok((await fs.stat(path.join(dir, '.hojai', 'manifest.json'))).isFile());
    assert.ok((await fs.stat(path.join(dir, '.hojai', 'capability.json'))).isFile());
    // AI md is non-empty
    const ai = await fs.readFile(path.join(dir, 'hojai.ai.md'), 'utf-8');
    assert.ok(ai.includes('maya-store'));
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
});

// ─── parseManifest + parseCapability (roundtrip raw JSON) ────

test('parseManifest parses + validates a raw JSON string', () => {
  const raw = JSON.stringify({
    schemaVersion: '1.0.0', projectId: 'p-1', name: 'X', type: 'erp',
    region: 'us-east', languages: ['en'], hojaiVersion: '1.0.0',
    createdAt: 't', agents: [], integrations: []
  });
  const m = parseManifest(raw);
  assert.equal(m.type, 'erp');
});

test('validateCapabilityData returns ok for valid input', () => {
  const result = validateCapabilityData({
    schemaVersion: '1.0.0', projectId: 'p-1', name: 'X',
    capabilities: [{ id: 'hojai.sales', name: 'S', tier: 'business', type: 'offer' }]
  });
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});
