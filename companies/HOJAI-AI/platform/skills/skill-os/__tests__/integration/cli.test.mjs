/**
 * SkillOS — CLI integration tests
 *
 * Spawns the `bin/hojai-skill.js` CLI as a child process against a running
 * SkillOS instance and asserts on stdout, stderr, and exit code.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';

const SVC_DIR = resolve(import.meta.dirname, '..', '..');
const CLI = resolve(SVC_DIR, 'bin', 'hojai-skill.js');

process.env.SKILLOS_REQUIRE_AUTH = 'false';
process.env.SKILLOS_NO_LISTEN = '1';
process.env.NODE_ENV = 'test';
process.env.HOJAI_DATA_DIR = `/tmp/hojai-skillos-cli-${Date.now()}`;

let server;
let port;

async function startService() {
  const mod = await import('file://' + resolve(SVC_DIR, 'src/index.js'));
  await new Promise((resolve) => {
    server = mod.app.listen(0, () => {
      port = server.address().port;
      resolve();
    });
  });
  await new Promise((r) => setTimeout(r, 200));
  process.env.HOJAI_SKILLOS_URL = `http://localhost:${port}`;
}

async function stopService() {
  if (server) await new Promise((r) => server.close(r));
}

function run(args, opts = {}) {
  return new Promise((resolve) => {
    const proc = spawn('node', [CLI, ...args], {
      env: { ...process.env, ...(opts.env || {}) },
      timeout: 10000,
    });
    let stdout = '';
    let stderr = '';
    proc.stdout.on('data', (d) => stdout += d.toString());
    proc.stderr.on('data', (d) => stderr += d.toString());
    proc.on('close', (code) => resolve({ code, stdout, stderr }));
    proc.on('error', (e) => resolve({ code: 1, stdout, stderr: e.message }));
  });
}

test('hojai-skill CLI — boot', async (t) => {
  await startService();
  t.after(async () => { await stopService(); });

  await t.test('--version prints version and exits 0', async () => {
    const r = await run(['--version']);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /hojai-skill v/);
  });

  await t.test('--help prints usage and exits 0', async () => {
    const r = await run(['--help']);
    assert.equal(r.code, 0);
    assert.match(r.stdout, /Usage:/);
    assert.match(r.stdout, /search/);
    assert.match(r.stdout, /publish/);
    assert.match(r.stdout, /install/);
  });

  await t.test('unknown command exits 2', async () => {
    const r = await run(['nonexistent']);
    assert.equal(r.code, 2);
    assert.match(r.stderr, /unknown command/);
  });
});

test('hojai-skill CLI — read commands', async (t) => {
  await startService();
  t.after(async () => { await stopService(); });

  await t.test('search returns JSON with results array', async () => {
    const r = await run(['search', 'reasoning']);
    assert.equal(r.code, 0);
    const out = JSON.parse(r.stdout);
    assert.ok(out.results);
    assert.ok(out.results.length >= 1);
  });

  await t.test('search without query returns all', async () => {
    const r = await run(['search']);
    assert.equal(r.code, 0);
    const out = JSON.parse(r.stdout);
    assert.ok(out.results.length >= 1);
  });

  await t.test('discover --type=agent-template filters', async () => {
    const r = await run(['discover', '--type=agent-template']);
    assert.equal(r.code, 0);
    const out = JSON.parse(r.stdout);
    assert.ok(out.assets.length >= 1);
    for (const a of out.assets) assert.equal(a.assetType, 'agent-template');
  });

  await t.test('info <id> returns asset', async () => {
    const r = await run(['info', 'ast-agent-salesbot']);
    assert.equal(r.code, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.id, 'ast-agent-salesbot');
    assert.equal(out.assetType, 'agent-template');
  });

  await t.test('info without id exits 2', async () => {
    const r = await run(['info']);
    assert.equal(r.code, 2);
  });

  await t.test('payout --publisher=X returns payout record', async () => {
    const r = await run(['payout', '--publisher=hojai']);
    assert.equal(r.code, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.publisherId, 'hojai');
    assert.ok(typeof out.payoutAmount === 'number');
  });

  await t.test('payout without --publisher exits 2', async () => {
    const r = await run(['payout']);
    assert.equal(r.code, 2);
  });

  await t.test('audit returns entries', async () => {
    const r = await run(['audit', '--limit=5']);
    assert.equal(r.code, 0);
    const out = JSON.parse(r.stdout);
    assert.ok(out.entries);
  });
});

test('hojai-skill CLI — write commands', async (t) => {
  await startService();
  t.after(async () => { await stopService(); });

  let assetId;

  await t.test('publish reads manifest and posts to /api/assets', async () => {
    const r = await run(['publish', resolve(SVC_DIR, 'tests/fixtures/sample-asset.json')]);
    assert.equal(r.code, 0, `publish failed: ${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.equal(out.assetType, 'skill');
    assert.equal(out.name, 'Sample Test Asset');
    assetId = out.id;
  });

  await t.test('install --tenant=X creates install', async () => {
    const r = await run(['install', assetId, '--tenant=cli-test']);
    assert.equal(r.code, 0, `install failed: ${r.stderr}`);
    const out = JSON.parse(r.stdout);
    assert.equal(out.assetId, assetId);
  });

  await t.test('install without --tenant exits 2', async () => {
    const r = await run(['install', 'ast-agent-salesbot']);
    assert.equal(r.code, 2);
  });

  await t.test('list-installed --tenant=X returns installs', async () => {
    const r = await run(['list-installed', '--tenant=cli-test']);
    assert.equal(r.code, 0);
    const out = JSON.parse(r.stdout);
    assert.ok(out.installs.length >= 1);
  });

  await t.test('list-installed without --tenant exits 2', async () => {
    const r = await run(['list-installed']);
    assert.equal(r.code, 2);
  });

  await t.test('certify --level=verified updates asset', async () => {
    const r = await run(['certify', assetId, '--level=verified', '--certifiedBy=cli']);
    assert.equal(r.code, 0, `certify failed: ${r.stderr}`);
  });

  await t.test('deprecate marks asset deprecated', async () => {
    const r = await run(['deprecate', assetId, '--reason=cli-test']);
    assert.equal(r.code, 0);
  });

  await t.test('test <id> --input=... runs the skill', async () => {
    // The assetId was created via publish with assetType=skill. The test
    // route now also resolves asset ids of type=skill.
    const r = await run(['test', assetId, '--input={"x":1}']);
    assert.equal(r.code, 0, `test failed: ${r.stderr}`);
  });
});

test('hojai-skill CLI — version pin/rollback/history', async (t) => {
  await startService();
  t.after(async () => { await stopService(); });

  let assetId;
  let installId;

  await t.test('setup: publish and install', async () => {
    const r = await run(['publish', resolve(SVC_DIR, 'tests/fixtures/sample-asset.json')]);
    assetId = JSON.parse(r.stdout).id;
    const ins = await run(['install', assetId, '--tenant=cli-pin']);
    installId = JSON.parse(ins.stdout).installId;
  });

  await t.test('history returns version timeline', async () => {
    const r = await run(['history', installId]);
    assert.equal(r.code, 0);
    const out = JSON.parse(r.stdout);
    assert.ok(out.history);
    assert.equal(out.history[0].action, 'install');
  });

  await t.test('pin prevents upgrades', async () => {
    const r = await run(['pin', installId]);
    assert.equal(r.code, 0);
  });

  await t.test('rollback on a pinned single-version install returns 409', async () => {
    const r = await run(['rollback', installId]);
    // No previous version → NO_PREVIOUS_VERSION (the error code is what we check)
    assert.equal(r.code, 1);
    // The CLI prints "error [409]: <message>"; the message contains the reason
    assert.match(r.stderr, /NO_PREVIOUS_VERSION|no previous version/);
  });
});

test('hojai-skill CLI — openapi dumps the spec', async (t) => {
  await startService();
  t.after(async () => { await stopService(); });

  await t.test('openapi returns valid OpenAPI 3.0', async () => {
    const r = await run(['openapi']);
    assert.equal(r.code, 0);
    const out = JSON.parse(r.stdout);
    assert.equal(out.openapi, '3.0.3');
    assert.ok(out.paths);
  });
});
