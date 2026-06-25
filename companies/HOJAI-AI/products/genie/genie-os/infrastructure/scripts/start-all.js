#!/usr/bin/env node
/**
 * Starts only the services that genie-os OWNS:
 *   - Foundation (7 services)
 *   - AI Runtime (3 services)
 *   - Thin client proxies (3)
 *   - Web frontend
 *
 * The product backends (DO, Nexha, Salar) live in their own repos
 * and are NOT started here. Start them separately.
 */
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

// Load .env
const envPath = path.join(ROOT, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// NOTE 2026-06-21: Foundation services (corpid, twinos, memoryos, goalos, policyos, skillos, flowos)
// were moved to _deprecated-foundation/ as part of the genie-os/platform dedup cleanup.
// They are no longer started from here. The canonical versions live in
// companies/HOJAI-AI/platform/* and are managed by companies/HOJAI-AI/start-all.sh.
const SERVICES = [
  // AI Runtime
  { name: 'genie',            path: 'runtime/genie',           port: process.env.GENIE_PORT || 7100 },
  { name: 'sutar',            path: 'runtime/sutar',           port: process.env.SUTAR_PORT || 7200 },
  { name: 'agentos',          path: 'runtime/agentos',         port: process.env.AGENTOS_PORT || 7300 },
  { name: 'planning-engine',  path: 'runtime/planning-engine', port: process.env.PLANNING_ENGINE_PORT || 7301 },
  // Thin clients (proxy to external repos)
  { name: 'do-client',     path: 'products/do-client',     port: process.env.DO_CLIENT_PORT || 8000 },
  { name: 'nexha-client',  path: 'products/nexha-client',  port: process.env.NEXHA_CLIENT_PORT || 8100 },
  { name: 'salar-client',  path: 'products/salar-client',  port: process.env.SALAR_CLIENT_PORT || 8200 },
  // Frontend
  { name: 'web',        path: 'frontend/web',          port: process.env.WEB_PORT || 3000 },
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

async function start() {
  console.log('\n🚀 Starting HOJAI AI brain (genie-os)...\n');
  console.log('Owns: AI Runtime (4) + Clients (3) + Web (1) = 8 services');
  console.log('Foundation services are started separately via companies/HOJAI-AI/start-all.sh\n');

  for (const svc of SERVICES) {
    if (await checkPort(svc.port)) {
      console.log(`  ⏭  ${svc.name.padEnd(15)} :${svc.port}  (already running)`);
      continue;
    }
    const fullPath = path.join(ROOT, svc.path);
    const logFile = path.join(LOGS_DIR, `${svc.name}.log`);
    const pidFile = path.join(PIDS_DIR, `${svc.name}.pid`);
    const out = fs.openSync(logFile, 'a');
    const entrypoint = svc.name === 'web' ? 'server.js' : 'src/index.js';
    const child = spawn('node', [entrypoint], {
      cwd: fullPath,
      env: { ...process.env },
      stdio: ['ignore', out, out],
      detached: true,
    });
    child.unref();
    fs.writeFileSync(pidFile, String(child.pid));
    process.stdout.write(`  ⏳ ${svc.name.padEnd(15)} :${svc.port}  starting...`);
    const ok = await waitFor(svc.port, 15000);
    console.log(`\r  ${ok ? '✅' : '❌'} ${svc.name.padEnd(15)} :${svc.port}  ${ok ? 'healthy' : 'timeout (see logs)'}`);
  }

  console.log('\n🎉 genie-os started!\n');
  console.log('Web UI:       http://localhost:' + (process.env.WEB_PORT || 3000));
  console.log('Genie API:    http://localhost:' + (process.env.GENIE_PORT || 7100));
  console.log('Sutar API:    http://localhost:' + (process.env.SUTAR_PORT || 7200));

  // ROOT is now RTMN/companies/HOJAI-AI/products/genie/genie-os
  // To get back to RTMN: ../../../..
  const RTMN = path.join(ROOT, '..', '..', '..', '..', '..');

  console.log('\nExternal product repos (run separately):');
  console.log('  DO app:    cd ' + path.join(RTMN, 'companies/do-app') + ' && npm run dev:backend');
  console.log('  Nexha:     cd ' + path.join(RTMN, 'companies/Nexha/commerce-identity') + ' && npm run dev');
  console.log('  Salar:     cd ' + path.join(RTMN, 'companies/HOJAI-AI/salar') + ' && npm start');

  console.log('\nOptional: Start the 23 specialized Genie services from this same location:');
  console.log('  cd ' + path.join(ROOT, '..', 'genie-gateway') + ' && npm start');
  console.log('  cd ' + path.join(ROOT, '..', 'genie-shopping-agent') + ' && npm start');
  console.log('  cd ' + path.join(ROOT, '..', 'genie-briefing-service') + ' && npm start');
  console.log('  ... (20 more)');
  console.log('');
}

start().catch(e => { console.error(e); process.exit(1); });
