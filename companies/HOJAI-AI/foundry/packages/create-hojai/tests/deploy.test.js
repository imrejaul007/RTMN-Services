/**
 * Tests for `npx hojai deploy`.
 *
 * Covers:
 *   • preview mode (bundles UI into dist/preview.html)
 *   • local mode (boots backend on a free port; writes deploy.json)
 *   • remote mode — v1.0 stub (no HOJAI_CLOUD_URL → prints target URL)
 *   • remote mode — v1.1 real (HOJAI_CLOUD_URL set → POSTs to hojai-cloud)
 *   • remote mode — error handling (hojai-cloud returns non-2xx)
 *   • remote mode — error handling (network unreachable)
 *   • error when no .hojai/manifest.json exists
 */

import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';

import { renderTemplate, buildVars } from '../src/render.js';
import { writeManifest } from '../src/manifest.js';
import { runDeploy } from '../src/deploy.js';

const FOUNDRY_ROOT = path.resolve(new URL('..', import.meta.url).pathname, '..', '..');
const STARTERS_DIR = path.join(FOUNDRY_ROOT, 'starters');

// ── Stash/restore for env + fetch so tests can't leak state ────────────────
const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_FETCH = globalThis.fetch;

afterEach(() => {
  // Restore env (delete any keys we added; restore original values)
  for (const k of Object.keys(process.env)) {
    if (!(k in ORIGINAL_ENV)) delete process.env[k];
  }
  for (const [k, v] of Object.entries(ORIGINAL_ENV)) {
    process.env[k] = v;
  }
  globalThis.fetch = ORIGINAL_FETCH;
});

async function mkTmpProject(template = 'marketplace', name = 'tmp-deploy-test') {
  const dir = path.join(os.tmpdir(), `hojai-deploy-${Date.now()}-${Math.random().toString(36).slice(2,8)}`);
  await fs.mkdir(dir, { recursive: true });
  const starterPath = path.join(STARTERS_DIR, template, 'template');
  const vars = buildVars({
    name, template, agents: ['Sales'], region: 'us-east', languages: ['en']
  });
  await renderTemplate({ templateDir: starterPath, targetDir: dir, vars });
  await writeManifest({ targetDir: dir, name, template, agents: ['Sales'], region: 'us-east', languages: ['en'], files: [] });
  return dir;
}

async function portListening(port) {
  return new Promise((resolve) => {
    const s = net.createConnection({ host: '127.0.0.1', port });
    s.once('connect', () => { s.end(); resolve(true); });
    s.once('error', (e) => resolve('ERR:' + e.code));
  });
}

test('deploy: error when no manifest exists', async () => {
  const dir = path.join(os.tmpdir(), `hojai-deploy-nomanifest-${Date.now()}`);
  await fs.mkdir(dir, { recursive: true });
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    await assert.rejects(() => runDeploy({ flags: { yes: true, mode: 'preview' } }));
  } finally {
    process.chdir(cwd);
    await fs.rm(dir, { recursive: true, force: true });
  }
});

test('deploy: preview mode writes dist/preview.html with inlined CSS + JS', async () => {
  const dir = await mkTmpProject('marketplace', 'preview-app');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const record = await runDeploy({ flags: { yes: true, mode: 'preview' } });
    assert.equal(record.mode, 'preview');
    assert.ok(record.previewPath, 'previewPath is set');
    assert.ok(record.ts, 'timestamp is set');
    const html = await fs.readFile(record.previewPath, 'utf8');
    assert.ok(html.includes('<style>'), 'CSS inlined as <style>');
    assert.ok(html.includes('<script>'), 'JS inlined as <script>');
    assert.ok(html.includes('HOJAI Foundry preview'), 'banner present');
    const deployJson = JSON.parse(await fs.readFile(path.join(dir, '.hojai', 'deploy.json'), 'utf8'));
    assert.equal(deployJson.mode, 'preview');
    assert.equal(deployJson.previewPath, record.previewPath);
  } finally {
    process.chdir(cwd);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});

test('deploy: remote mode (no HOJAI_CLOUD_URL) prints v1.0 stub target URL', async () => {
  delete process.env.HOJAI_CLOUD_URL;
  const dir = await mkTmpProject('hotel', 'remote-app');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const record = await runDeploy({ flags: { yes: true, mode: 'remote' } });
    assert.equal(record.mode, 'remote');
    assert.equal(record.targetUrl, 'https://remote-app.hojai.app');
    assert.equal(record.status, 'pending');
    assert.match(record.note, /v1\.0 stub/);
    const deployJson = JSON.parse(await fs.readFile(path.join(dir, '.hojai', 'deploy.json'), 'utf8'));
    assert.equal(deployJson.mode, 'remote');
  } finally {
    process.chdir(cwd);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});

test('deploy: local mode picks a free port, spawns backend + frontend, writes deploy.json', async () => {
  const dir = await mkTmpProject('hotel', 'local-app');
  const cwd = process.cwd();
  process.chdir(dir);
  let backendPid = null;
  let frontendPid = null;
  try {
    const record = await runDeploy({ flags: { yes: true, mode: 'local' } });
    backendPid = record.backendPid;
    frontendPid = record.frontendPid;
    assert.equal(record.mode, 'local');
    assert.ok(record.backendUrl, 'backendUrl set');
    assert.ok(record.backendUrl.startsWith('http://localhost:'), 'backend URL is localhost');
    const port = Number(record.backendUrl.split(':').pop());
    assert.ok(port > 0, 'port is a positive integer');
    assert.ok(record.backendPid > 0, 'backendPid is positive');
    assert.ok(record.frontendPid > 0, 'frontendPid is positive (hotel starter has apps/frontend/server.js)');
    assert.ok(record.frontendUrl.startsWith('http://localhost:'), 'frontend URL is localhost');
    const deployJson = JSON.parse(await fs.readFile(path.join(dir, '.hojai', 'deploy.json'), 'utf8'));
    assert.equal(deployJson.mode, 'local');
    assert.equal(deployJson.backendUrl, record.backendUrl);
    assert.equal(deployJson.frontendUrl, record.frontendUrl);
    assert.equal(deployJson.backendPid, record.backendPid);
    assert.ok(deployJson.ts, 'timestamp set');
  } finally {
    process.chdir(cwd);
    if (backendPid) { try { process.kill(backendPid, 'SIGTERM'); } catch {} }
    if (frontendPid) { try { process.kill(frontendPid, 'SIGTERM'); } catch {} }
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});

// ── v1.1 remote mode: real POST to hojai-cloud (mocked fetch) ───────────────

/**
 * Helper: install a fetch mock that captures the request and returns a
 * canned response. Returns the captured-request array.
 */
function mockFetch(response) {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url: String(url), init });
    return {
      ok: response.ok !== false,
      status: response.status || 200,
      text: async () => response.body ? JSON.stringify(response.body) : ''
    };
  };
  return calls;
}

test('deploy: remote mode POSTs project to HOJAI_CLOUD_URL and returns live URL', async () => {
  process.env.HOJAI_CLOUD_URL = 'https://cloud.hojai.app';
  process.env.HOJAI_API_KEY = 'test-key-xyz';
  const calls = mockFetch({
    status: 201,
    body: { projectId: 'p-1', deploymentId: 'd-1', url: 'https://remote-v11.hojai.app', status: 'live', port: 8801 }
  });

  const dir = await mkTmpProject('hotel', 'remote-v11');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    const record = await runDeploy({ flags: { yes: true, mode: 'remote' } });
    assert.equal(record.mode, 'remote');
    assert.equal(record.targetUrl, 'https://remote-v11.hojai.app');
    assert.equal(record.status, 'live');
    assert.equal(record.projectId, 'p-1');
    assert.equal(record.deploymentId, 'd-1');
    assert.equal(record.port, 8801);
    assert.equal(record.backendUrl, 'https://remote-v11.hojai.app');
    assert.ok(record.cloudUrl, 'cloudUrl is recorded');
    assert.ok(record.fileCount > 0, 'at least one file was shipped');

    // The fetch was called once, at the right URL, with the right shape
    assert.equal(calls.length, 1);
    const c = calls[0];
    assert.equal(c.url, 'https://cloud.hojai.app/api/v1/deploy');
    assert.equal(c.init.method, 'POST');
    assert.equal(c.init.headers['Content-Type'], 'application/json');
    assert.equal(c.init.headers['Authorization'], 'Bearer test-key-xyz');
    const body = JSON.parse(c.init.body);
    assert.equal(body.name, 'remote-v11');
    assert.equal(body.runtime, 'node-express');
    assert.equal(body.manifest.name, 'remote-v11');
    assert.ok(body.files, 'files included');
    assert.ok(body.files['apps/backend/src/index.js'], 'backend source included');

    // The .hojai/deploy.json should reflect the real deploy
    const deployJson = JSON.parse(await fs.readFile(path.join(dir, '.hojai', 'deploy.json'), 'utf8'));
    assert.equal(deployJson.mode, 'remote');
    assert.equal(deployJson.status, 'live');
    assert.equal(deployJson.projectId, 'p-1');
  } finally {
    process.chdir(cwd);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});

test('deploy: remote mode strips trailing slash from HOJAI_CLOUD_URL', async () => {
  process.env.HOJAI_CLOUD_URL = 'https://cloud.hojai.app/';
  const calls = mockFetch({
    status: 201,
    body: { projectId: 'p-2', deploymentId: 'd-2', url: 'https://trim.hojai.app', status: 'live', port: 8802 }
  });

  const dir = await mkTmpProject('hotel', 'trim');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    await runDeploy({ flags: { yes: true, mode: 'remote' } });
    assert.equal(calls.length, 1);
    // Critical: no double slash
    assert.equal(calls[0].url, 'https://cloud.hojai.app/api/v1/deploy');
  } finally {
    process.chdir(cwd);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});

test('deploy: remote mode surfaces non-2xx response with status and body', async () => {
  process.env.HOJAI_CLOUD_URL = 'https://cloud.hojai.app';
  mockFetch({ ok: false, status: 503, body: { error: 'no free ports in range' } });

  const dir = await mkTmpProject('hotel', 'failing');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    await assert.rejects(
      () => runDeploy({ flags: { yes: true, mode: 'remote' } }),
      /no free ports/
    );
  } finally {
    process.chdir(cwd);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});

test('deploy: remote mode surfaces network error', async () => {
  process.env.HOJAI_CLOUD_URL = 'https://nonexistent.hojai.app';
  globalThis.fetch = async () => {
    const e = new Error('fetch failed');
    e.cause = { code: 'ENOTFOUND' };
    throw e;
  };

  const dir = await mkTmpProject('hotel', 'netfail');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    await assert.rejects(
      () => runDeploy({ flags: { yes: true, mode: 'remote' } }),
      /could not reach hojai-cloud/
    );
  } finally {
    process.chdir(cwd);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});

test('deploy: remote mode sends Authorization header only when HOJAI_API_KEY set', async () => {
  process.env.HOJAI_CLOUD_URL = 'https://cloud.hojai.app';
  delete process.env.HOJAI_API_KEY;
  const calls = mockFetch({
    status: 201,
    body: { projectId: 'p-3', deploymentId: 'd-3', url: 'https://nokey.hojai.app', status: 'live', port: 8803 }
  });

  const dir = await mkTmpProject('hotel', 'nokey');
  const cwd = process.cwd();
  process.chdir(dir);
  try {
    await runDeploy({ flags: { yes: true, mode: 'remote' } });
    assert.equal(calls[0].init.headers['Authorization'], undefined,
      'no Authorization header when HOJAI_API_KEY is unset');
  } finally {
    process.chdir(cwd);
    try { await fs.rm(dir, { recursive: true, force: true }); } catch {}
  }
});
