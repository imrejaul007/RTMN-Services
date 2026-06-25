import { execSync } from 'child_process';
import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

export function findRuntimeDir(): string {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  // CLI is at cli/dist/index.js → runtime is 2 dirs up
  const candidate = resolve(__dirname, '../..');
  if (existsSync(resolve(candidate, 'docker-compose.yml'))) return candidate;
  // Fallback: look upward from cwd
  let dir = process.cwd();
  for (let i = 0; i < 5; i++) {
    if (existsSync(resolve(dir, 'docker-compose.yml'))) return dir;
    dir = resolve(dir, '..');
  }
  return resolve(__dirname, '../..');
}

export function loadEnv(runtimeDir: string): Record<string, string> {
  const envPath = resolve(runtimeDir, '.env');
  if (existsSync(envPath)) {
    dotenv.config({ path: envPath });
  }
  return process.env as Record<string, string>;
}

export function exec(cmd: string, cwd?: string): string {
  try {
    return execSync(cmd, {
      encoding: 'utf-8',
      cwd: cwd ?? process.cwd(),
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch (err: unknown) {
    const error = err as { stderr?: string };
    throw new Error(error.stderr ?? String(err));
  }
}

export function execQuiet(cmd: string, cwd?: string): boolean {
  try {
    exec(cmd, cwd);
    return true;
  } catch {
    return false;
  }
}

export function getDockerCommand(): string {
  return execQuiet('docker compose version') ? 'docker compose' : 'docker-compose';
}

export function serviceHealth(runtimeDir: string, port: number, path = '/health'): { status: string; latency?: number; code?: number } {
  try {
    const { execSync } = require('child_process') as typeof import('child_process');
    const start = Date.now();
    const out = execSync(`curl -sf --max-time 3 http://localhost:${port}${path}`, { encoding: 'utf-8' });
    const latency = Date.now() - start;
    return { status: 'healthy', latency, code: 200 };
  } catch (err: unknown) {
    const error = err as { status?: number };
    return { status: 'down', code: error.status ?? 0 };
  }
}
