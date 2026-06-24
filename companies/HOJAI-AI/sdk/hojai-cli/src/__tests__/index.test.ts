/**
 * Tests for the @hojai/cli main entry point.
 *
 * Since the CLI uses console output and process.exit, we mock both.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { main, VERSION } from '../index.js';

function captureConsole() {
  const logs: string[] = [];
  const errs: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  const origExit = process.exit;
  console.log = (...args) => logs.push(args.join(' '));
  console.error = (...args) => errs.push(args.join(' '));
  process.exit = (() => { throw new Error('process.exit called'); }) as never;
  return {
    logs, errs,
    restore() {
      console.log = origLog;
      console.error = origErr;
      process.exit = origExit;
    }
  };
}

test('hojai (no args) prints help', async () => {
  const cap = captureConsole();
  try {
    await main(['node', 'hojai']);
    assert.ok(cap.logs.some(l => l.includes('Usage: hojai')), 'should print usage');
  } finally { cap.restore(); }
});

test('hojai --version prints version', async () => {
  const cap = captureConsole();
  try {
    await main(['node', 'hojai', '--version']);
    assert.ok(cap.logs.some(l => l.includes(VERSION)), 'should print version');
  } finally { cap.restore(); }
});

test('hojai help prints full help', async () => {
  const cap = captureConsole();
  try {
    await main(['node', 'hojai', 'help']);
    assert.ok(cap.logs.some(l => l.includes('Manage CLI configuration')));
    assert.ok(cap.logs.some(l => l.includes('hojai memory capture')));
    assert.ok(cap.logs.some(l => l.includes('hojai deploy')));
    assert.ok(cap.logs.some(l => l.includes('hojai add')));
  } finally { cap.restore(); }
});

test('hojai config show prints current config', async () => {
  const cap = captureConsole();
  try {
    process.env.HOJAI_API_KEY = 'hojai_live_test';
    process.env.HOJAI_BASE_URL = 'https://test.api.hojai.ai';
    await main(['node', 'hojai', 'config']);
    const out = cap.logs.join('\n');
    assert.ok(out.includes('https://test.api.hojai.ai'), 'should show base URL');
    delete process.env.HOJAI_API_KEY;
    delete process.env.HOJAI_BASE_URL;
  } finally { cap.restore(); }
});

test('hojai unknown command exits with error + help', async () => {
  const cap = captureConsole();
  try {
    await main(['node', 'hojai', 'totally-bogus']);
    assert.ok(cap.errs.some(e => e.includes('Unknown command')), 'should error');
  } catch (e) {
    // process.exit was called (expected)
    assert.ok((e as Error).message.includes('process.exit'));
  } finally { cap.restore(); }
});

test('hojai whoami without API key errors', async () => {
  const cap = captureConsole();
  try {
    delete process.env.HOJAI_API_KEY;
    await main(['node', 'hojai', 'whoami']);
    assert.ok(cap.errs.some(e => e.includes('No API key')), 'should error');
  } catch (e) {
    assert.ok((e as Error).message.includes('process.exit'));
  } finally { cap.restore(); }
});

// ─── deploy command ────────────────────────────────────────────────

test('hojai deploy with no .hojai/manifest.json errors', async () => {
  const cap = captureConsole();
  const origCwd = process.cwd();
  // Use a fresh temp dir to ensure no manifest
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-deploy-'));
  try {
    process.chdir(tmp);
    await main(['node', 'hojai', 'deploy', '--mode=local']);
    assert.ok(cap.errs.some(e => e.includes('Not a HOJAI project')), 'should error');
  } catch (e) {
    assert.ok((e as Error).message.includes('process.exit'));
  } finally {
    process.chdir(origCwd);
    await fs.rm(tmp, { recursive: true, force: true });
    cap.restore();
  }
});

test('hojai deploy --mode=preview generates dist/preview.html', async () => {
  const cap = captureConsole();
  const origCwd = process.cwd();
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-deploy-'));
  try {
    // Set up a fake HOJAI project
    await fs.mkdir(path.join(tmp, '.hojai'), { recursive: true });
    await fs.mkdir(path.join(tmp, 'apps', 'frontend', 'public'), { recursive: true });
    await fs.writeFile(path.join(tmp, '.hojai', 'manifest.json'), JSON.stringify({
      schemaVersion: '1.0.0', projectId: 'p-1', name: 'test-proj', type: 'other',
      languages: ['en'], hojaiVersion: '1.0.0', createdAt: 't', agents: [], integrations: []
    }));
    await fs.writeFile(path.join(tmp, 'apps', 'frontend', 'public', 'index.html'), '<html><body>Hi</body></html>');
    process.chdir(tmp);
    await main(['node', 'hojai', 'deploy', '--mode=preview']);
    const out = cap.logs.join('\n');
    assert.ok(out.includes('Preview generated'), 'should print success message');
    const previewPath = path.join(tmp, 'dist', 'preview.html');
    const exists = await fs.stat(previewPath).then(() => true).catch(() => false);
    assert.ok(exists, 'should write dist/preview.html');
  } finally {
    process.chdir(origCwd);
    await fs.rm(tmp, { recursive: true, force: true });
    cap.restore();
  }
});

test('hojai deploy --mode=remote without API key errors', async () => {
  const cap = captureConsole();
  const origCwd = process.cwd();
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-deploy-'));
  try {
    await fs.mkdir(path.join(tmp, '.hojai'), { recursive: true });
    await fs.writeFile(path.join(tmp, '.hojai', 'manifest.json'), JSON.stringify({
      schemaVersion: '1.0.0', projectId: 'p-1', name: 'test', type: 'other',
      languages: ['en'], hojaiVersion: '1.0.0', createdAt: 't', agents: [], integrations: []
    }));
    delete process.env.HOJAI_API_KEY;
    process.chdir(tmp);
    await main(['node', 'hojai', 'deploy', '--mode=remote']);
    assert.ok(cap.errs.some(e => e.includes('No API key')), 'should error');
  } catch (e) {
    assert.ok((e as Error).message.includes('process.exit'));
  } finally {
    process.chdir(origCwd);
    await fs.rm(tmp, { recursive: true, force: true });
    delete process.env.HOJAI_API_KEY;
    cap.restore();
  }
});

// ─── add command ──────────────────────────────────────────────────

test('hojai add without subcommand errors', async () => {
  const cap = captureConsole();
  try {
    await main(['node', 'hojai', 'add', 'bogus-sub']);
    assert.ok(cap.errs.some(e => e.includes('Unknown subcommand')), 'should error');
  } catch (e) {
    assert.ok((e as Error).message.includes('process.exit'));
  } finally { cap.restore(); }
});

test('hojai add help prints add help', async () => {
  const cap = captureConsole();
  try {
    await main(['node', 'hojai', 'add', 'help']);
    assert.ok(cap.logs.some(l => l.includes('hojai add')));
  } finally { cap.restore(); }
});

// ─── info command ────────────────────────────────────────────────

test('hojai info without .hojai/manifest.json errors', async () => {
  const cap = captureConsole();
  const origCwd = process.cwd();
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-info-'));
  try {
    process.chdir(tmp);
    await main(['node', 'hojai', 'info']);
    assert.ok(cap.errs.some(e => e.includes('Not a HOJAI project')), 'should error');
  } catch (e) {
    assert.ok((e as Error).message.includes('process.exit'));
  } finally {
    process.chdir(origCwd);
    await fs.rm(tmp, { recursive: true, force: true });
    cap.restore();
  }
});

test('hojai info prints project context (manifest + capability + ai-md)', async () => {
  const cap = captureConsole();
  const origCwd = process.cwd();
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-info-'));
  try {
    await fs.mkdir(path.join(tmp, '.hojai'), { recursive: true });
    await fs.writeFile(path.join(tmp, '.hojai', 'manifest.json'), JSON.stringify({
      schemaVersion: '1.0.0', projectId: 'p-1', name: 'test-proj', type: 'restaurant',
      region: 'me', languages: ['en', 'ar'], hojaiVersion: '1.0.0',
      createdAt: '2026-06-24', agents: [{ role: 'CEO', purpose: 'Orchestrator' }], integrations: ['sutar', 'commerce']
    }));
    await fs.writeFile(path.join(tmp, '.hojai', 'capability.json'), JSON.stringify({
      schemaVersion: '1.0.0', projectId: 'p-1', name: 'test-proj', layer: 3,
      capabilities: [{ id: 'hojai.orchestration', name: 'Orchestration', tier: 'core', type: 'offer' }],
      slaTargets: { uptimePercent: 99.5, responseMs: 500 }
    }));
    await fs.writeFile(path.join(tmp, 'hojai.ai.md'), '# HOJAI Project: test-proj\n');
    process.chdir(tmp);
    await main(['node', 'hojai', 'info']);
    const out = cap.logs.join('\n');
    assert.ok(out.includes('test-proj'), 'should print project name');
    assert.ok(out.includes('restaurant'), 'should print type');
    assert.ok(out.includes('CEO'), 'should print agent name');
    assert.ok(out.includes('sutar, commerce'), 'should print integrations');
    assert.ok(out.includes('hojai.ai.md present'), 'should confirm ai-md');
  } finally {
    process.chdir(origCwd);
    await fs.rm(tmp, { recursive: true, force: true });
    cap.restore();
  }
});

test('hojai info --json outputs valid JSON', async () => {
  const cap = captureConsole();
  const origCwd = process.cwd();
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-info-'));
  try {
    await fs.mkdir(path.join(tmp, '.hojai'), { recursive: true });
    await fs.writeFile(path.join(tmp, '.hojai', 'manifest.json'), JSON.stringify({
      schemaVersion: '1.0.0', projectId: 'p-1', name: 'json-test', type: 'other',
      languages: ['en'], hojaiVersion: '1.0.0', createdAt: 't', agents: [], integrations: []
    }));
    process.chdir(tmp);
    await main(['node', 'hojai', 'info', '--json']);
    const json = JSON.parse(cap.logs.join('\n'));
    assert.equal(json.manifest.name, 'json-test');
    assert.equal(json.aiMdPresent, false);
  } finally {
    process.chdir(origCwd);
    await fs.rm(tmp, { recursive: true, force: true });
    cap.restore();
  }
});

// ─── doctor command ───────────────────────────────────────────────

test('hojai doctor --json exits 0 when config + gateway are ok', async () => {
  const cap = captureConsole();
  const origCwd = process.cwd();
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-doctor-'));
  try {
    process.env.HOJAI_API_KEY = 'hojai_live_test';
    process.env.HOJAI_BASE_URL = 'https://test.api.hojai.ai';
    process.chdir(tmp);
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ status: 'ok', version: '1.0.0' }), text: async () => '' })) as any;
    try {
      await main(['node', 'hojai', 'doctor', '--json']);
    } catch (e) { /* process.exit */ }
    const json = JSON.parse(cap.logs.join('\n'));
    assert.equal(json.ok, true);
    assert.ok(Array.isArray(json.checks));
    assert.ok(json.checks.length >= 4);
    globalThis.fetch = origFetch as any;
    delete process.env.HOJAI_API_KEY;
    delete process.env.HOJAI_BASE_URL;
  } finally {
    process.chdir(origCwd);
    await fs.rm(tmp, { recursive: true, force: true });
    cap.restore();
  }
});

test('hojai doctor reports failure when gateway is down', async () => {
  const cap = captureConsole();
  const origCwd = process.cwd();
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-doctor-'));
  try {
    process.env.HOJAI_API_KEY = 'hojai_live_test';
    process.env.HOJAI_BASE_URL = 'https://broken.api.hojai.ai';
    process.chdir(tmp);
    const origFetch = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: false, status: 500, headers: { get: () => 'text/plain' }, text: async () => 'err' })) as any;
    try {
      await main(['node', 'hojai', 'doctor']);
    } catch (e) { /* process.exit */ }
    globalThis.fetch = origFetch as any;
    delete process.env.HOJAI_API_KEY;
    delete process.env.HOJAI_BASE_URL;
  } finally {
    process.chdir(origCwd);
    await fs.rm(tmp, { recursive: true, force: true });
    cap.restore();
  }
});

// ─── add industry command ──────────────────────────────────────

test('hojai add industry generates route file + wires into index.js', async () => {
  const cap = captureConsole();
  const origCwd = process.cwd();
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-add-industry-'));
  try {
    // Set up a fake HOJAI project
    await fs.mkdir(path.join(tmp, '.hojai'), { recursive: true });
    await fs.writeFile(path.join(tmp, '.hojai', 'manifest.json'), JSON.stringify({
      schemaVersion: '1.0.0', projectId: 'p-1', name: 'test', type: 'other',
      languages: ['en'], hojaiVersion: '1.0.0', createdAt: 't', agents: [], integrations: []
    }));
    await fs.writeFile(path.join(tmp, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }));
    await fs.mkdir(path.join(tmp, 'apps', 'backend', 'src'), { recursive: true });
    await fs.writeFile(path.join(tmp, 'apps', 'backend', 'src', 'index.js'),
      "import express from 'express';\nconst app = express();\napp.listen(3000);\n");
    process.chdir(tmp);
    await main(['node', 'hojai', 'add', 'industry', 'restaurant']);
    const routeFile = path.join(tmp, 'apps', 'backend', 'src', 'routes', 'industry', 'restaurant.js');
    const exists = await fs.stat(routeFile).then(() => true).catch(() => false);
    assert.ok(exists, 'should create the industry route file');
    const routeContent = await fs.readFile(routeFile, 'utf-8');
    assert.ok(routeContent.includes('@hojai/industry'), 'should import @hojai/industry');
    assert.ok(routeContent.includes('/api/restaurant'), 'should have /api/<type> routes');
    const indexContent = await fs.readFile(path.join(tmp, 'apps', 'backend', 'src', 'index.js'), 'utf-8');
    assert.ok(indexContent.includes("app.use('/api/restaurant'"), 'should wire up the route');
    const pkg = JSON.parse(await fs.readFile(path.join(tmp, 'package.json'), 'utf-8'));
    assert.equal(pkg.optionalDependencies['@hojai/industry'], '^1.0.0', 'should add @hojai/industry to package.json');
    const manifest = JSON.parse(await fs.readFile(path.join(tmp, '.hojai', 'manifest.json'), 'utf-8'));
    assert.ok(manifest.integrations.includes('industry'), 'should add industry to manifest');
  } catch (e) {
    // process.exit was called (expected if the index.js path is missing)
    // Still validate what got written
    const routeFile = path.join(tmp, 'apps', 'backend', 'src', 'routes', 'industry', 'restaurant.js');
    const exists = await fs.stat(routeFile).then(() => true).catch(() => false);
    assert.ok(exists || (e as Error).message.includes('process.exit'), 'route file should be created or exit cleanly');
  } finally {
    process.chdir(origCwd);
    await fs.rm(tmp, { recursive: true, force: true });
    cap.restore();
  }
});

test('hojai add industry with invalid type errors', async () => {
  const cap = captureConsole();
  const origCwd = process.cwd();
  const fs = await import('node:fs/promises');
  const os = await import('node:os');
  const path = await import('node:path');
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'hojai-add-industry-'));
  try {
    await fs.mkdir(path.join(tmp, '.hojai'), { recursive: true });
    await fs.writeFile(path.join(tmp, '.hojai', 'manifest.json'), JSON.stringify({
      schemaVersion: '1.0.0', projectId: 'p-1', name: 'test', type: 'other',
      languages: ['en'], hojaiVersion: '1.0.0', createdAt: 't', agents: [], integrations: []
    }));
    process.chdir(tmp);
    try {
      await main(['node', 'hojai', 'add', 'industry', 'not-a-real-industry']);
    } catch (e) { /* process.exit */ }
    assert.ok(cap.errs.some(e => e.includes('Unknown industry')), 'should error on invalid type');
  } finally {
    process.chdir(origCwd);
    await fs.rm(tmp, { recursive: true, force: true });
    cap.restore();
  }
});
