/**
 * Tests for `npx hojai add` (agent + integration subcommands).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';

import { renderTemplate, buildVars } from '../src/render.js';
import { writeManifest } from '../src/manifest.js';
import { runAdd } from '../src/add.js';

const FOUNDRY_ROOT = path.resolve(new URL('..', import.meta.url).pathname, '..', '..');
const STARTERS_DIR = path.join(FOUNDRY_ROOT, 'starters');

async function mkTmpProject(template = 'marketplace', name = 'add-test-app') {
  const dir = path.join(os.tmpdir(), `hojai-add-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
  await fs.mkdir(dir, { recursive: true });
  const starterPath = path.join(STARTERS_DIR, template, 'template');
  const vars = buildVars({ name, template, agents: ['Sales'], region: 'us-east', languages: ['en'] });
  const files = await renderTemplate({ templateDir: starterPath, targetDir: dir, vars });
  await writeManifest({ targetDir: dir, name, template, agents: ['Sales'], region: 'us-east', languages: ['en'], files });
  return dir;
}

test('add: errors when no manifest exists', async () => {
  const dir = path.join(os.tmpdir(), `hojai-add-nomanifest-${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    await assert.rejects(
      () => runAdd({ args: ['agent', 'qa'] }),
      /no \.hojai\/manifest\.json/
    );
  } finally {
    process.chdir(cwd);
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('add agent: appends function + registry entry + updates manifest', async () => {
  const dir = await mkTmpProject('hotel', 'agent-app');
  const cwd = process.cwd();
  const agentsFile = path.join(dir, 'apps', 'backend', 'src', 'agents', 'index.js');
  const before = await fs.readFile(agentsFile, 'utf8');
  process.chdir(dir);
  try {
    const result = await runAdd({ args: ['agent', 'quality-assurance', '--desc', 'Reviews all deliveries.'] });
    assert.equal(result.added, true);
    // Title-case keeps spaces; camelCase strips them for the function name.
    assert.equal(result.agent, 'Quality Assurance');
    assert.equal(result.key, 'qualityAssurance');
    const after = await fs.readFile(agentsFile, 'utf8');
    // Hotel starter uses the BaseAgent + createAgentRegistry() pattern,
    // so the new agent registers via a `*Strategy` function.
    assert.ok(after.includes('function qualityAssuranceStrategy'), 'function inserted');
    assert.ok(after.includes('"Quality Assurance"'), 'agent name registered');
    assert.ok(after.includes('Reviews all deliveries.'), 'description included');
    // Manifest updated
    const manifest = JSON.parse(await fs.readFile(path.join(dir, '.hojai', 'manifest.json'), 'utf8'));
    assert.ok(manifest.agents.includes('Quality Assurance'), 'manifest.agents includes new agent');
    // Capability updated
    const cap = JSON.parse(await fs.readFile(path.join(dir, '.hojai', 'capability.json'), 'utf8'));
    assert.ok(cap.capabilities.some(c => c.id === 'hojai.qualityAssurance'), 'capability entry added');
    // bigger file than before
    assert.ok(after.length > before.length, 'file grew');
  } finally {
    process.chdir(cwd);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});

test('add agent: is idempotent (re-run is a no-op)', async () => {
  const dir = await mkTmpProject('hotel', 'idem-app');
  const cwd = process.cwd();
  const agentsFile = path.join(dir, 'apps', 'backend', 'src', 'agents', 'index.js');
  process.chdir(dir);
  try {
    await runAdd({ args: ['agent', 'concierge'] });
    const first = await fs.readFile(agentsFile, 'utf8');
    const result = await runAdd({ args: ['agent', 'concierge'] });
    assert.equal(result.added, false);
    assert.equal(result.reason, 'already-exists');
    const second = await fs.readFile(agentsFile, 'utf8');
    assert.equal(second, first, 'file unchanged on re-run');
  } finally {
    process.chdir(cwd);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});

test('add integration: writes route file + mounts in index.js', async () => {
  const dir = await mkTmpProject('hotel', 'integ-app');
  const cwd = process.cwd();
  const routeFile = path.join(dir, 'apps', 'backend', 'src', 'routes', 'payments.js');
  const indexFile = path.join(dir, 'apps', 'backend', 'src', 'index.js');
  process.chdir(dir);
  try {
    const result = await runAdd({ args: ['integration', 'payments'] });
    assert.equal(result.added, true);
    assert.equal(result.route, '/api/payments');
    // Route file exists and is non-empty
    const routeContent = await fs.readFile(routeFile, 'utf8');
    assert.ok(routeContent.includes('Router()'));
    assert.ok(routeContent.includes('payments'));
    // index.js has the import + mount
    const indexSrc = await fs.readFile(indexFile, 'utf8');
    assert.ok(indexSrc.includes("paymentsRoutes"), 'import added');
    assert.ok(indexSrc.includes("/api/payments'"), 'mount added');
  } finally {
    process.chdir(cwd);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});

test('add integration: is idempotent', async () => {
  const dir = await mkTmpProject('hotel', 'idem-integ-app');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const first = await runAdd({ args: ['integration', 'shipping'] });
    assert.equal(first.added, true);
    const second = await runAdd({ args: ['integration', 'shipping'] });
    assert.equal(second.added, false);
    assert.equal(second.reason, 'already-exists');
  } finally {
    process.chdir(cwd);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});

test('add help: prints usage when called with no args', async () => {
  const result = await runAdd({ args: [] });
  // Help doesn't return anything specific; just verify no throw.
  assert.equal(result, undefined);
});
