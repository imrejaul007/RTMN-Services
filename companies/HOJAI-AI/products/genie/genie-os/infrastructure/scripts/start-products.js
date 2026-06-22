#!/usr/bin/env node
/**
 * Starts the thin client proxies that forward to external product repos.
 * Requires the external services to be running independently.
 */
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import { setTimeout as sleep } from 'timers/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const SERVICES = [
  { name: 'do-client',    path: 'products/do-client',    port: process.env.DO_CLIENT_PORT || 8000 },
  { name: 'nexha-client', path: 'products/nexha-client', port: process.env.NEXHA_CLIENT_PORT || 8100 },
  { name: 'salar-client', path: 'products/salar-client', port: process.env.SALAR_CLIENT_PORT || 8200 },
];

const PIDS_DIR = path.join(ROOT, 'logs', 'pids');
const LOGS_DIR = path.join(ROOT, 'logs');
if (!fs.existsSync(PIDS_DIR)) fs.mkdirSync(PIDS_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, { timeout: 1000 }, () => resolve(true));
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitFor(port, max = 10000) {
  const s = Date.now();
  while (Date.now() - s < max) { if (await checkPort(port)) return true; await sleep(500); }
  return false;
}

console.log('Starting thin client proxies...');
for (const svc of SERVICES) {
  if (await checkPort(svc.port)) { console.log(`  ⏭  ${svc.name}`); continue; }
  const out = fs.openSync(path.join(LOGS_DIR, `${svc.name}.log`), 'a');
  const env = {
    ...process.env,
    INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN || 'hojai-internal-service-token-change-me',
    JWT_SECRET: process.env.JWT_SECRET || 'hojai-development-secret-min-32-chars-please-change-in-production-xyz',
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai',
  };
  const c = spawn('node', ['src/index.js'], { cwd: path.join(ROOT, svc.path), env, stdio: ['ignore', out, out], detached: true });
  c.unref();
  fs.writeFileSync(path.join(PIDS_DIR, `${svc.name}.pid`), String(c.pid));
  process.stdout.write(`  ⏳ ${svc.name}...`);
  const ok = await waitFor(svc.port);
  console.log(`\r  ${ok ? '✅' : '❌'} ${svc.name}                    `);
}
console.log('Clients ready.\n');
console.log('Make sure the upstream services are also running:');
console.log(`  DO:     ${process.env.DO_BACKEND_URL || 'http://localhost:3001'}`);
console.log(`  Nexha:  ${process.env.NEXHA_URL || 'http://localhost:8000'}`);
console.log(`  Salar:  ${process.env.SALAR_URL || 'http://localhost:8200'}\n`);
