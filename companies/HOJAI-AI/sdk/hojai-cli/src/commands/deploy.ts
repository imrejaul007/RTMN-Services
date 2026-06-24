/**
 * `hojai deploy` — ship the current project to a runnable URL.
 *
 * Subcommands:
 *   hojai deploy                  # auto-detect: local if .hojai/manifest.json exists
 *   hojai deploy --mode=local     # start the project's backend on a free port
 *   hojai deploy --mode=preview   # generate dist/preview.html for sharing
 *   hojai deploy --mode=remote   # POST to HOJAI Cloud, print <name>.hojai.app URL
 *
 * Reads .hojai/manifest.json to identify the project. Errors if not a
 * HOJAI project.
 */

import { promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import * as net from 'node:net';
import * as path from 'node:path';
import { request } from '../foundation-config.js';
import { printError, printInfo, printSuccess, printTable, header } from '../output.js';

const MODES = ['local', 'preview', 'remote'] as const;
type Mode = typeof MODES[number];

interface DeployOptions {
  mode: Mode;
  cwd: string;
  port?: number;
}

function readFlag(args: string[], flag: string): string | undefined {
  // Search for both `--flag value` and `--flag=value` forms.
  const eqForm = `${flag}=`;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === flag) {
      const next = args[i + 1];
      return (next && !next.startsWith('--')) ? next : 'true';
    }
    if (a.startsWith(eqForm)) return a.slice(eqForm.length);
  }
  return undefined;
}

async function loadManifest(cwd: string): Promise<any> {
  const p = path.join(cwd, '.hojai', 'manifest.json');
  if (!existsSync(p)) {
    printError('Not a HOJAI project (no .hojai/manifest.json). Run: hojai ai-spec generate');
    process.exit(1);
  }
  return JSON.parse(await fs.readFile(p, 'utf-8'));
}

async function findFreePort(preferred: number): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolve(findFreePort(preferred + 1)));
    server.listen(preferred, () => {
      const port = (server.address() as net.AddressInfo).port;
      server.close(() => resolve(port));
    });
  });
}

async function deployLocal(opts: DeployOptions): Promise<void> {
  const { cwd } = opts;
  const pkgPath = path.join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    printError('No package.json found in current directory.');
    process.exit(1);
  }
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
  const devScript = pkg.scripts?.start || pkg.scripts?.dev;
  if (!devScript) {
    printError('No "start" or "dev" script in package.json.');
    process.exit(1);
  }

  // Find a free port
  const preferred = Number(opts.port ?? process.env.PORT ?? 4001);
  const port = await findFreePort(preferred);
  printInfo(`Starting ${devScript} on port ${port}…`);

  // Spawn the dev server
  const { spawn } = await import('node:child_process');
  const child = spawn(devScript, { cwd, shell: true, env: { ...process.env, PORT: String(port) }, stdio: 'inherit' });

  // Write deploy.json so the user knows how to reach it
  const deployJson = {
    mode: 'local',
    startedAt: new Date().toISOString(),
    port,
    pid: child.pid,
    manifest: { name: pkg.name, type: pkg.description }
  };
  await fs.writeFile(path.join(cwd, '.hojai', 'deploy.json'), JSON.stringify(deployJson, null, 2) + '\n');

  printSuccess(`Local deploy running on http://localhost:${port}`);
  printInfo(`PID ${child.pid} — stop with: kill ${child.pid}`);
  printInfo(`Deploy state written to .hojai/deploy.json`);

  // Detach so the CLI exits but the server keeps running
  child.unref();
  // Give it 1s to print its startup messages
  await new Promise(r => setTimeout(r, 1000));
}

async function deployPreview(opts: DeployOptions): Promise<void> {
  const { cwd } = opts;
  const manifest = await loadManifest(cwd);
  // Find a static HTML entry
  const candidates = [
    'apps/frontend/public/index.html',
    'apps/frontend/index.html',
    'public/index.html',
    'dist/index.html'
  ];
  let html: string | null = null;
  let usedPath: string | null = null;
  for (const c of candidates) {
    const p = path.join(cwd, c);
    if (existsSync(p)) {
      html = await fs.readFile(p, 'utf-8');
      usedPath = c;
      break;
    }
  }
  if (!html) {
    printError('No static HTML found. Preview mode needs apps/frontend/public/index.html or similar.');
    process.exit(1);
  }

  // Inline a tiny banner at the top
  const banner = `<!-- hojai deploy preview — ${manifest.name} (${manifest.type}) — ${new Date().toISOString()} -->\n`;
  const out = banner + html;
  const distDir = path.join(cwd, 'dist');
  await fs.mkdir(distDir, { recursive: true });
  const outPath = path.join(distDir, 'preview.html');
  await fs.writeFile(outPath, out);

  printSuccess(`Preview generated: ${outPath}`);
  printInfo(`Open: file://${outPath}`);
  printInfo(`Backend is NOT started in preview mode — interactions will not work.`);
}

async function deployRemote(opts: DeployOptions): Promise<void> {
  const { cwd } = opts;
  const manifest = await loadManifest(cwd);
  const config = await import('../config.js').then(m => m.loadConfig({}));
  if (!config.apiKey) {
    printError('No API key configured. Run: hojai config set --api-key <key>');
    process.exit(1);
  }

  // Build a deploy payload
  const pkgPath = path.join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    printError('No package.json in current directory.');
    process.exit(1);
  }
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));

  header(`Remote deploy — ${pkg.name}`);
  printInfo(`POSTing project to HOJAI Cloud…`);

  try {
    const res = await request<{ projectId: string; url: string; deploymentId: string; status: string }>(config, 'POST', '/api/v1/deploy', {
      name: pkg.name,
      type: manifest.type,
      manifest,
      runtime: 'node-express'
    });
    printSuccess(`Deployed to ${res.url}`);
    printTable(
      [
        { key: 'projectId', value: res.projectId },
        { key: 'deploymentId', value: res.deploymentId },
        { key: 'url', value: res.url },
        { key: 'status', value: res.status }
      ],
      ['key', 'value']
    );
  } catch (e) {
    // v1.0 fallback: if /api/v1/deploy doesn't exist, print instructions
    printInfo(`(${(e as Error).message.split(':')[0]}) — printing v1.0 stub instructions:`);
    console.log('');
    console.log(`  Project: ${pkg.name}`);
    console.log(`  Type: ${manifest.type}`);
    console.log(`  Region: ${manifest.region}`);
    console.log(`  URL (would-be): https://${pkg.name}.hojai.app`);
    console.log('');
    printInfo('Real remote deploy is stubbed in v1.0. The deploy endpoint will be wired in v1.1.');
  }
}

export async function runDeploy(args: string[]): Promise<void> {
  const cwd = process.cwd();
  const json = args.includes('--json');
  const modeArg = readFlag(args, '--mode') as Mode | undefined;
  const port = readFlag(args, '--port') ? Number(readFlag(args, '--port')) : undefined;

  if (args[0] === 'help' || args.includes('--help') || args.includes('-h')) {
    header('hojai deploy — ship a HOJAI project to a runnable URL');
    console.log(`
Modes:
  local     Start the project's backend on a free port (default)
  preview   Generate dist/preview.html for sharing
  remote    POST to HOJAI Cloud, print <name>.hojai.app URL

Examples:
  hojai deploy                       # local
  hojai deploy --mode=preview
  hojai deploy --mode=remote
  hojai deploy --mode=local --port=5000
`);
    return;
  }

  // Default: local if no .hojai/manifest.json doesn't error out, else local
  const mode: Mode = modeArg ?? 'local';
  if (!MODES.includes(mode)) {
    printError(`Unknown mode: ${mode}. Use one of: ${MODES.join(', ')}`);
    process.exit(1);
  }

  if (json && mode === 'local') {
    // For JSON mode, just print what we'd do — no actual spawn
    console.log(JSON.stringify({ mode: 'local', would: 'spawn-dev-server' }));
    return;
  }

  const opts: DeployOptions = { mode, cwd, port };
  if (mode === 'local')      await deployLocal(opts);
  else if (mode === 'preview') await deployPreview(opts);
  else if (mode === 'remote') await deployRemote(opts);
}
