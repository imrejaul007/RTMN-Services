/**
 * @hojai/create — deploy command.
 *
 * `npx hojai deploy` ships a scaffolded project to a runnable URL.
 *
 * v1.1 supports 3 modes:
 *   1) local   — start the production backend + frontend on free ports,
 *                bind to localhost, write `.hojai/deploy.json` with the URLs.
 *   2) preview — generate a single-file `dist/preview.html` that bundles the
 *                UI inline (useful for sharing screenshots without running
 *                the server). Backend is NOT started.
 *   3) remote  — POST the project to hojai-cloud (HOJAI_CLOUD_URL) which
 *                provisions a per-tenant runtime and returns the public URL
 *                (`https://<name>.hojai.app`). Falls back to the v1.0 stub
 *                (prints the target URL + instructions) when HOJAI_CLOUD_URL
 *                is not set.
 *
 * For mode detection we read `.hojai/manifest.json`. If absent, we error
 * out — `npx hojai deploy` must run from inside a scaffolded project.
 */

import { promises as fs } from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import kleur from 'kleur';

const DEPLOY_MODES = ['local', 'preview', 'remote'];

async function loadManifest(projectDir) {
  const p = path.join(projectDir, '.hojai', 'manifest.json');
  try { return JSON.parse(await fs.readFile(p, 'utf8')); }
  catch { return null; }
}

async function findFreePort(preferred) {
  // Try the preferred port first, then walk up to 50 above
  const tryPort = (port) => new Promise((resolve) => {
    const srv = net.createServer();
    srv.once('error', () => resolve(null));
    srv.once('listening', () => srv.close(() => resolve(port)));
    srv.listen(port, '127.0.0.1');
  });
  for (let p = preferred; p < preferred + 50; p++) {
    const got = await tryPort(p);
    if (got) return got;
  }
  // Fallback: random ephemeral port
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.unref();
    srv.on('error', reject);
    srv.listen(0, '127.0.0.1', () => {
      const { port } = srv.address();
      srv.close(() => resolve(port));
    });
  });
}

async function writeDeployRecord(projectDir, record) {
  const hojaiDir = path.join(projectDir, '.hojai');
  await fs.mkdir(hojaiDir, { recursive: true });
  await fs.writeFile(
    path.join(hojaiDir, 'deploy.json'),
    JSON.stringify(record, null, 2) + '\n'
  );
}

function spawnDetached(command, args, cwd, env = {}) {
  const child = spawn(command, args, {
    cwd, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...env }
  });
  child.stdout.on('data', () => {});  // drain
  child.stderr.on('data', () => {});  // drain
  child.unref();
  return child.pid;
}

async function buildPreview(projectDir, manifest) {
  // Bundle the frontend public/* into a single HTML file with inline CSS + JS.
  const frontendPublic = path.join(projectDir, 'apps', 'frontend', 'public');
  let indexHtml = '';
  try { indexHtml = await fs.readFile(path.join(frontendPublic, 'index.html'), 'utf8'); }
  catch {
    return { ok: false, error: `no frontend at apps/frontend/public/index.html — cannot preview` };
  }

  // Inline CSS
  let css = '';
  try { css = await fs.readFile(path.join(frontendPublic, 'style.css'), 'utf8'); }
  catch {}
  if (css) indexHtml = indexHtml.replace(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi, '<style>' + css + '</style>');

  // Inline JS
  let js = '';
  try { js = await fs.readFile(path.join(frontendPublic, 'app.js'), 'utf8'); }
  catch {}
  if (js) indexHtml = indexHtml.replace(/<script[^>]+src=["'][^"']*app\.js["'][^>]*><\/script>/gi, '<script>' + js + '</script>');

  // Add a banner
  const banner = `<!--
  HOJAI Foundry preview — ${manifest.name} (${manifest.template})
  Built ${new Date().toISOString()}
  Mode: preview (no backend running)
-->
`;
  indexHtml = banner + indexHtml;

  // Write to dist/preview.html
  const distDir = path.join(projectDir, 'dist');
  await fs.mkdir(distDir, { recursive: true });
  const previewPath = path.join(distDir, 'preview.html');
  await fs.writeFile(previewPath, indexHtml);

  return { ok: true, path: previewPath };
}

export async function runDeploy({ projectDir = process.cwd(), flags = {} } = {}) {
  // 1. Confirm this is a HOJAI project
  const manifest = await loadManifest(projectDir);
  if (!manifest) {
    const msg = "no .hojai/manifest.json found in " + projectDir + ". Run npx hojai deploy from inside a scaffolded project.";
    console.log(kleur.red('✖ ') + msg);
    throw new Error(msg);
  }

  // 2. Pick mode
  let mode = flags.mode;
  if (!mode) {
    if (flags.yes) { mode = 'local'; }
    else {
      const prompts = (await import('prompts')).default;
      const r = await prompts({
        type: 'select',
        name: 'mode',
        message: `Deploy ${kleur.bold(manifest.name)} — pick a mode:`,
        choices: [
          { title: `${kleur.green('local')}    — run backend + frontend on localhost`, value: 'local' },
          { title: `${kleur.yellow('preview')}  — bundle UI into a single dist/preview.html`, value: 'preview' },
          { title: remoteChoiceTitle(manifest.name), value: 'remote' }
        ]
      });
      if (!r.mode) { console.log(kleur.red('✖ cancelled')); throw new Error('cancelled'); }
      mode = r.mode;
    }
  }
  if (!DEPLOY_MODES.includes(mode)) {
    const msg = `unknown mode: "${mode}". available: ${DEPLOY_MODES.join(', ')}`;
    console.log(kleur.red('✖ ') + msg);
    throw new Error(msg);
  }

  console.log('');
  console.log(kleur.cyan('▸ Deploying ') + kleur.bold(manifest.name) + kleur.cyan(` in ${mode} mode…`));

  // 3. Dispatch
  let record;
  if (mode === 'local') {
    record = await deployLocal(projectDir, manifest);
  } else if (mode === 'preview') {
    record = await deployPreview(projectDir, manifest);
  } else {
    record = await deployRemote(projectDir, manifest);
  }

  // 4. Persist
  await writeDeployRecord(projectDir, record);

  // 5. Done
  console.log('');
  console.log(kleur.green().bold('✔ Deployed ') + kleur.bold(manifest.name));
  if (record.backendUrl) console.log(kleur.gray('  backend:  ') + kleur.cyan(record.backendUrl));
  if (record.frontendUrl) console.log(kleur.gray('  frontend: ') + kleur.cyan(record.frontendUrl));
  if (record.previewPath) console.log(kleur.gray('  preview:  ') + kleur.cyan(record.previewPath));
  if (record.targetUrl) console.log(kleur.gray('  target:   ') + kleur.cyan(record.targetUrl));
  console.log(kleur.gray('  record:   ') + kleur.gray('.hojai/deploy.json'));
  console.log('');
  return record;
}

async function deployLocal(projectDir, manifest) {
  const backendPort = await findFreePort(4100);
  const frontendPort = await findFreePort(3100);
  console.log(kleur.gray(`  ports: backend=${backendPort} frontend=${frontendPort}`));

  // Start backend
  const backendDir = path.join(projectDir, 'apps', 'backend');
  const backendCmd = 'node';
  const backendArgs = ['src/index.js'];
  const backendEnv = { PORT: String(backendPort) };
  try {
    await fs.access(path.join(backendDir, 'src', 'index.js'));
  } catch {
    throw new Error(`no backend at ${backendDir}/src/index.js`);
  }
  const backendPid = spawnDetached(backendCmd, backendArgs, backendDir, backendEnv);

  // Start frontend (the frontend server reads its own port or uses 3000; we pass it explicitly)
  const frontendDir = path.join(projectDir, 'apps', 'frontend');
  try {
    await fs.access(path.join(frontendDir, 'server.js'));
    const frontendPid = spawnDetached('node', ['server.js'], frontendDir, {
      PORT: String(frontendPort),
      BACKEND_URL: `http://localhost:${backendPort}`
    });
    return {
      mode: 'local',
      backendUrl: `http://localhost:${backendPort}`,
      frontendUrl: `http://localhost:${frontendPort}`,
      backendPid, frontendPid,
      ts: new Date().toISOString()
    };
  } catch {
    // No frontend server — only backend
    return {
      mode: 'local',
      backendUrl: `http://localhost:${backendPort}`,
      frontendUrl: null,
      backendPid,
      ts: new Date().toISOString(),
      note: 'no apps/frontend/server.js — backend only'
    };
  }
}

async function deployPreview(projectDir, manifest) {
  const result = await buildPreview(projectDir, manifest);
  if (!result.ok) throw new Error(result.error);
  return {
    mode: 'preview',
    previewPath: result.path,
    ts: new Date().toISOString()
  };
}

/**
 * Build the project file map to ship to hojai-cloud.
 *
 * Walks the project directory and produces `{ "apps/backend/src/index.js": "...", ... }`
 * for every text file. We use a `safeRead` helper that skips node_modules,
 * .git, dist, and binary files. The file count is bounded by `MAX_FILES`
 * and each file by `MAX_FILE_BYTES` — both configurable via env.
 */
async function buildProjectFiles(projectDir) {
  const MAX_FILES = parseInt(process.env.HOJAI_DEPLOY_MAX_FILES || '500');
  const MAX_FILE_BYTES = parseInt(process.env.HOJAI_DEPLOY_MAX_FILE_BYTES || '262144'); // 256 KiB
  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.next', '.hojai']);
  const BINARY_EXT = /\.(png|jpe?g|gif|webp|ico|svg|woff2?|ttf|eot|mp[34]|mov|webm|pdf|zip|tar|gz|wasm|map)$/i;

  const files = {};
  const stack = [''];
  let count = 0;
  while (stack.length && count < MAX_FILES) {
    const rel = stack.pop();
    const full = path.join(projectDir, rel || '.');
    let stat;
    try { stat = await fs.stat(full); } catch { continue; }
    if (stat.isDirectory()) {
      const entries = await fs.readdir(full);
      for (const e of entries) {
        if (SKIP_DIRS.has(e)) continue;
        stack.push(rel ? `${rel}/${e}` : e);
      }
      continue;
    }
    if (!stat.isFile()) continue;
    if (rel.match(BINARY_EXT)) continue;
    if (stat.size > MAX_FILE_BYTES) continue;
    files[rel] = await fs.readFile(full, 'utf8');
    count++;
  }
  return files;
}

function remoteChoiceTitle(name) {
  const cloudUrl = process.env.HOJAI_CLOUD_URL;
  if (cloudUrl) {
    return `${kleur.cyan('remote')}   — push to hojai-cloud, get https://${name}.hojai.app`;
  }
  return `${kleur.cyan('remote')}   — print target URL ${name}.hojai.app (stub: set HOJAI_CLOUD_URL for real deploy)`;
}

async function deployRemote(projectDir, manifest) {
  const cloudUrl = process.env.HOJAI_CLOUD_URL;
  const apiKey = process.env.HOJAI_API_KEY;
  const targetUrl = `https://${manifest.name}.hojai.app`;

  // Stub path: no HOJAI_CLOUD_URL set — print the URL the deployment WOULD
  // use and a hint about the env var. (v1.0 behavior, kept for back-compat.)
  if (!cloudUrl) {
    console.log(kleur.yellow('  ⚠ HOJAI_CLOUD_URL is not set — using v1.0 stub'));
    console.log(kleur.gray('    to enable real remote deploys, run with:'));
    console.log(kleur.gray(`      HOJAI_CLOUD_URL=https://cloud.hojai.app HOJAI_API_KEY=… npx hojai deploy --mode=remote`));
    return {
      mode: 'remote',
      targetUrl,
      status: 'pending',
      ts: new Date().toISOString(),
      note: 'v1.0 stub — set HOJAI_CLOUD_URL to enable real deploys'
    };
  }

  // Real path: build the file map and POST to hojai-cloud.
  console.log(kleur.gray('  ▸ collecting project files…'));
  const files = await buildProjectFiles(projectDir);
  const fileCount = Object.keys(files).length;
  console.log(kleur.gray(`    ${fileCount} file(s) ready (max ${process.env.HOJAI_DEPLOY_MAX_FILES || 500})`));

  console.log(kleur.gray(`  ▸ pushing to ${cloudUrl}/api/v1/deploy …`));
  const headers = { 'Content-Type': 'application/json' };
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), parseInt(process.env.HOJAI_DEPLOY_TIMEOUT_MS || '60000'));

  let res;
  try {
    res = await fetch(`${cloudUrl.replace(/\/$/, '')}/api/v1/deploy`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: manifest.name,
        type: manifest.template,
        manifest,
        runtime: 'node-express',
        files
      }),
      signal: ctrl.signal
    });
  } catch (e) {
    clearTimeout(timeout);
    const msg = e.name === 'AbortError'
      ? `hojai-cloud did not respond within ${process.env.HOJAI_DEPLOY_TIMEOUT_MS || 60000}ms`
      : `could not reach hojai-cloud at ${cloudUrl}: ${e.message}`;
    console.log(kleur.red('  ✖ ') + msg);
    throw new Error(msg);
  }
  clearTimeout(timeout);

  const text = await res.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}

  if (!res.ok) {
    const errMsg = body?.error || `hojai-cloud returned ${res.status}`;
    console.log(kleur.red('  ✖ ') + errMsg);
    if (res.status === 401) console.log(kleur.gray('    hint: set HOJAI_API_KEY to match hojai-cloud\'s HOJAI_API_KEY'));
    if (res.status === 403) console.log(kleur.gray('    hint: HOJAI_API_KEY is wrong'));
    if (res.status === 503) console.log(kleur.gray('    hint: hojai-cloud port range is exhausted — see HOJAI_CLOUD_PORT_RANGE_END'));
    throw new Error(errMsg);
  }

  console.log(kleur.green('  ✔ live at ') + kleur.cyan(body.url));
  console.log(kleur.gray(`    projectId:    ${body.projectId}`));
  console.log(kleur.gray(`    deploymentId: ${body.deploymentId}`));
  console.log(kleur.gray(`    port:         ${body.port}`));

  return {
    mode: 'remote',
    targetUrl: body.url,
    status: body.status,
    projectId: body.projectId,
    deploymentId: body.deploymentId,
    port: body.port,
    backendUrl: body.url,
    ts: new Date().toISOString(),
    cloudUrl,
    fileCount
  };
}
