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
