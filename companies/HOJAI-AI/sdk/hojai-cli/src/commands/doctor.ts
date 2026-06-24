/**
 * `hojai doctor` — diagnostic health check.
 *
 * Verifies that the local environment is set up correctly for working
 * with the HOJAI ecosystem. Checks:
 *   1. Config (apiKey + baseUrl present)
 *   2. Gateway reachable (GET /health)
 *   3. Auth valid (probes /whoami-equivalent endpoint)
 *   4. .hojai/ files valid (manifest, capability, ai-md)
 *   5. Required dependencies (@hojai/* packages installed)
 *
 * Exits with code 0 if all checks pass, 1 if any check fails.
 *
 * Useful for:
 *   - First-time setup
 *   - CI pre-flight
 *   - "Why isn't this working?" debugging
 */

import { existsSync } from 'node:fs';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { request } from '../foundation-config.js';
import { loadConfig } from '../config.js';
import { printError, printInfo, printSuccess, printWarn, printTable } from '../output.js';

interface Check {
  name: string;
  status: 'ok' | 'warn' | 'fail';
  detail: string;
}

async function checkConfig(): Promise<Check> {
  const cfg = loadConfig();
  if (!cfg.apiKey) {
    return { name: 'Config: API key', status: 'fail', detail: 'No API key. Run: hojai config set --api-key <key>' };
  }
  if (!cfg.baseUrl || cfg.baseUrl === 'https://api.hojai.ai') {
    return { name: 'Config: API key + baseUrl', status: 'ok', detail: `key=${cfg.apiKey.slice(0, 8)}..., baseUrl=${cfg.baseUrl}` };
  }
  return { name: 'Config: API key + baseUrl', status: 'ok', detail: `key=${cfg.apiKey.slice(0, 8)}..., baseUrl=${cfg.baseUrl}` };
}

async function checkGateway(cfg: ReturnType<typeof loadConfig>): Promise<Check> {
  try {
    const start = Date.now();
    const res = await request<{ status?: string; version?: string }>(cfg, 'GET', '/health', undefined, { timeout: 5000 });
    const ms = Date.now() - start;
    return { name: 'Gateway reachable', status: 'ok', detail: `${res.status || 'ok'} in ${ms}ms${res.version ? ` (v${res.version})` : ''}` };
  } catch (e) {
    return { name: 'Gateway reachable', status: 'fail', detail: (e as Error).message };
  }
}

async function checkAuth(cfg: ReturnType<typeof loadConfig>): Promise<Check> {
  if (!cfg.apiKey) return { name: 'Auth valid', status: 'fail', detail: 'No API key to test' };
  try {
    // Probe a small authenticated endpoint
    const res = await request<{ user?: { id: string } }>(cfg, 'GET', '/api/v1/whoami', undefined, { timeout: 5000 });
    return { name: 'Auth valid', status: 'ok', detail: `user=${res.user?.id || 'authenticated'}` };
  } catch (e) {
    return { name: 'Auth valid', status: 'warn', detail: 'No /whoami endpoint (ok if your gateway is older)' };
  }
}

async function checkHojaiProject(cwd: string): Promise<Check[]> {
  const checks: Check[] = [];
  const manifestPath = path.join(cwd, '.hojai', 'manifest.json');
  if (!existsSync(manifestPath)) {
    checks.push({ name: 'HOJAI project: manifest.json', status: 'warn', detail: 'No .hojai/manifest.json (this is fine if you\'re not in a project)' });
    checks.push({ name: 'HOJAI project: capability.json', status: 'warn', detail: '—' });
    checks.push({ name: 'HOJAI project: hojai.ai.md', status: 'warn', detail: '—' });
    return checks;
  }
  try {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    if (!manifest.schemaVersion || !manifest.projectId) {
      checks.push({ name: 'HOJAI project: manifest.json', status: 'fail', detail: 'Missing required fields' });
    } else {
      checks.push({ name: 'HOJAI project: manifest.json', status: 'ok', detail: `${manifest.name} (v${manifest.schemaVersion})` });
    }
  } catch (e) {
    checks.push({ name: 'HOJAI project: manifest.json', status: 'fail', detail: (e as Error).message });
  }
  const capPath = path.join(cwd, '.hojai', 'capability.json');
  if (existsSync(capPath)) {
    try {
      JSON.parse(await fs.readFile(capPath, 'utf-8'));
      checks.push({ name: 'HOJAI project: capability.json', status: 'ok', detail: 'parses cleanly' });
    } catch (e) {
      checks.push({ name: 'HOJAI project: capability.json', status: 'fail', detail: (e as Error).message });
    }
  } else {
    checks.push({ name: 'HOJAI project: capability.json', status: 'warn', detail: 'missing — run `hojai ai-spec generate`' });
  }
  if (existsSync(path.join(cwd, 'hojai.ai.md'))) {
    checks.push({ name: 'HOJAI project: hojai.ai.md', status: 'ok', detail: 'present' });
  } else {
    checks.push({ name: 'HOJAI project: hojai.ai.md', status: 'warn', detail: 'missing — run `hojai ai-spec generate`' });
  }
  return checks;
}

async function checkDeps(cwd: string): Promise<Check> {
  const pkgPath = path.join(cwd, 'package.json');
  if (!existsSync(pkgPath)) {
    return { name: 'Deps: @hojai/* installed', status: 'warn', detail: 'No package.json' };
  }
  try {
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    const hojaiDeps: string[] = [];
    for (const depType of ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies']) {
      const deps = pkg[depType] || {};
      for (const name of Object.keys(deps)) {
        if (name.startsWith('@hojai/')) hojaiDeps.push(name);
      }
    }
    if (hojaiDeps.length === 0) {
      return { name: 'Deps: @hojai/* installed', status: 'warn', detail: 'no @hojai/* packages declared' };
    }
    // Check node_modules
    const missing: string[] = [];
    for (const name of hojaiDeps) {
      if (!existsSync(path.join(cwd, 'node_modules', name))) missing.push(name);
    }
    if (missing.length > 0) {
      return { name: 'Deps: @hojai/* installed', status: 'fail', detail: `missing: ${missing.join(', ')} — run \`npm install\`` };
    }
    return { name: 'Deps: @hojai/* installed', status: 'ok', detail: `${hojaiDeps.length} packages: ${hojaiDeps.slice(0, 3).join(', ')}${hojaiDeps.length > 3 ? ', …' : ''}` };
  } catch (e) {
    return { name: 'Deps: @hojai/* installed', status: 'fail', detail: (e as Error).message };
  }
}

export async function runDoctor(args: string[]): Promise<void> {
  const json = args.includes('--json');
  const cwd = process.cwd();
  const cfg = loadConfig();

  const checks: Check[] = [];
  checks.push(await checkConfig());
  checks.push(await checkGateway(cfg));
  checks.push(await checkAuth(cfg));
  checks.push(...(await checkHojaiProject(cwd)));
  checks.push(await checkDeps(cwd));

  if (json) {
    console.log(JSON.stringify({ ok: checks.every(c => c.status !== 'fail'), checks }, null, 2));
    process.exit(checks.some(c => c.status === 'fail') ? 1 : 0);
  }

  // Human mode
  console.log('');
  printInfo(`Running ${checks.length} health checks…`);
  console.log('');

  for (const c of checks) {
    const icon = c.status === 'ok' ? '✓' : c.status === 'warn' ? '!' : '✗';
    const tag = c.status === 'ok' ? printSuccess : c.status === 'warn' ? printWarn : printError;
    tag(`${icon} ${c.name}: ${c.detail}`);
  }
  console.log('');

  // Group counts
  const ok = checks.filter(c => c.status === 'ok').length;
  const warn = checks.filter(c => c.status === 'warn').length;
  const fail = checks.filter(c => c.status === 'fail').length;
  const summary = `${ok} ok, ${warn} warn, ${fail} fail`;
  if (fail > 0) {
    printError(`Doctor: ${summary}`);
    printInfo('Fix the failures above, then run: hojai doctor');
    process.exit(1);
  } else if (warn > 0) {
    printWarn(`Doctor: ${summary} (warnings only)`);
  } else {
    printSuccess(`Doctor: ${summary} — all healthy`);
  }
}
