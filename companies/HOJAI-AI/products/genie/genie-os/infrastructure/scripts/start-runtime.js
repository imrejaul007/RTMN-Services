#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import { setTimeout as sleep } from 'timers/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

const SERVICES = [
  { name: 'genie', path: 'runtime/genie', port: 7100 },
  { name: 'sutar', path: 'runtime/sutar', port: 7200 },
  { name: 'agentos', path: 'runtime/agentos', port: 7300 },
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

console.log('Starting AI runtime services...');
for (const svc of SERVICES) {
  if (await checkPort(svc.port)) { console.log(`  ⏭  ${svc.name}`); continue; }
  const out = fs.openSync(path.join(LOGS_DIR, `${svc.name}.log`), 'a');
  // Inherit the parent env but provide defaults for required vars so the
  // services can boot in dev without an .env file. In production these
  // must be set explicitly (the services call requireEnv() which fails
  // fast in production mode).
  const env = {
    ...process.env,
    INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN,
    JWT_SECRET: process.env.JWT_SECRET,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai',
  };
  if (!env.INTERNAL_SERVICE_TOKEN || !env.JWT_SECRET) {
    console.error(`  ❌ ${svc.name}: INTERNAL_SERVICE_TOKEN and JWT_SECRET must be set in .env`);
    process.exit(1);
  }
  const c = spawn('node', ['src/index.js'], { cwd: path.join(ROOT, svc.path), env, stdio: ['ignore', out, out], detached: true });
  c.unref();
  fs.writeFileSync(path.join(PIDS_DIR, `${svc.name}.pid`), String(c.pid));
  process.stdout.write(`  ⏳ ${svc.name}...`);
  const ok = await waitFor(svc.port);
  console.log(`\r  ${ok ? '✅' : '❌'} ${svc.name}                    `);
}
console.log('AI runtime ready.\n');
