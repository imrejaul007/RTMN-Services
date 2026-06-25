#!/usr/bin/env node
/**
 * Starts all 23 specialized Genie services that live in the parent folder.
 *
 * These are siblings of genie-os, not inside it. They share the parent
 * INTERNAL_SERVICE_TOKEN and JWT_SECRET so genie runtime can call them.
 *
 * Each service is started with its own PORT (from its source code) and
 * logs go to genie-os/logs/specialists/<name>.log
 *
 * If a port is already in use (e.g. by a TwinOS service), the script
 * logs a warning and moves on. Port conflicts should be fixed in the
 * genie service itself, not by skipping it here.
 */
import { spawn } from 'child_process';
import { setTimeout as sleep } from 'timers/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..', '..'); // genie-os/.. = products/
const GENIE_OS_ROOT = path.join(ROOT, '..');          // not used, but documents location

// Load .env from genie-os so INTERNAL_SERVICE_TOKEN, JWT_SECRET are available
const envPath = path.join(__dirname, '..', '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf-8').split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// 23 specialist services — order is just alphabetical
const SPECIALISTS = [
  'genie-briefing-service',
  'genie-calendar-service',
  'genie-companion-service',
  'genie-consultant-agent',
  'genie-creation-os',
  'genie-device-integration',
  'genie-execution-engine',
  'genie-gateway',
  'genie-learning-os',
  'genie-life-gps',
  'genie-life-university',
  'genie-listening-modes',
  'genie-memory-graph',
  'genie-memory-inbox',
  'genie-money-os',
  'genie-relationship-os',
  'genie-serendipity-service',
  'genie-shopping-agent',
  'genie-smart-forgetting-service',
  'genie-thinking-engine',
  'genie-universal-search',
  'genie-wake-word-service',
  'genie-wellness-os',
];

const PIDS_DIR = path.join(__dirname, '..', '..', 'logs', 'pids', 'specialists');
const LOGS_DIR = path.join(__dirname, '..', '..', 'logs', 'specialists');
if (!fs.existsSync(PIDS_DIR)) fs.mkdirSync(PIDS_DIR, { recursive: true });
if (!fs.existsSync(LOGS_DIR)) fs.mkdirSync(LOGS_DIR, { recursive: true });

async function checkPort(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/health`, { timeout: 1000 }, () => resolve(true));
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
  });
}

async function waitFor(port, max = 8000) {
  const s = Date.now();
  while (Date.now() - s < max) { if (await checkPort(port)) return true; await sleep(400); }
  return false;
}

function readPort(srcPath) {
  try {
    const src = fs.readFileSync(srcPath, 'utf-8');
    // Try patterns: "PORT = 4728", "const PORT = ... || 4728", "const PORT = process.env.X || 4728"
    const m = src.match(/PORT\s*=\s*[^|]*\|\|\s*(\d{4})/) ||
              src.match(/PORT\s*=\s*(\d{4})\s*;/) ||
              src.match(/PORT\s*=\s*process\.env\.[A-Z_]+\s*\|\|\s*(\d{4})/);
    return m ? parseInt(m[1], 10) : null;
  } catch { return null; }
}

async function main() {
  console.log(`\n🚀 Starting ${SPECIALISTS.length} Genie specialists from ${ROOT}\n`);

  let started = 0;
  let alreadyRunning = 0;
  let failed = 0;

  for (const name of SPECIALISTS) {
    const svcPath = path.join(ROOT, name);
    const indexFile = path.join(svcPath, 'src', 'index.js');
    if (!fs.existsSync(indexFile)) {
      console.log(`  ⏭  ${name.padEnd(30)}  (no src/index.js — skipped)`);
      continue;
    }
    const port = readPort(indexFile);
    if (!port) {
      console.log(`  ⚠️  ${name.padEnd(30)}  (no PORT found in src/index.js)`);
      continue;
    }

    if (await checkPort(port)) {
      console.log(`  ⏭  ${name.padEnd(30)}  :${port}  (already running)`);
      alreadyRunning++;
      continue;
    }

    const logFile = path.join(LOGS_DIR, `${name}.log`);
    const pidFile = path.join(PIDS_DIR, `${name}.pid`);
    const out = fs.openSync(logFile, 'a');
    const err = fs.openSync(logFile, 'a');
    const env = {
      ...process.env,
      INTERNAL_SERVICE_TOKEN: process.env.INTERNAL_SERVICE_TOKEN,
      JWT_SECRET: process.env.JWT_SECRET,
      MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/hojai',
    };
    if (!env.INTERNAL_SERVICE_TOKEN || !env.JWT_SECRET) {
      console.error(`  ❌ ${name}: INTERNAL_SERVICE_TOKEN and JWT_SECRET must be set in .env`);
      process.exit(1);
    }
    const c = spawn('node', ['src/index.js'], {
      cwd: svcPath, env, stdio: ['ignore', out, err], detached: true,
    });
    c.unref();
    fs.writeFileSync(pidFile, String(c.pid));
    process.stdout.write(`  ⏳ ${name.padEnd(30)}  :${port}  starting...`);
    const ok = await waitFor(port);
    if (ok) {
      console.log(`\r  ✅ ${name.padEnd(30)}  :${port}  healthy                `);
      started++;
    } else {
      console.log(`\r  ❌ ${name.padEnd(30)}  :${port}  (not responding — check logs/specialists/${name}.log)`);
      failed++;
    }
  }

  console.log(`\n📊 ${started} started, ${alreadyRunning} already running, ${failed} failed\n`);
  if (failed > 0) {
    console.log('💡 To debug: tail genie-os/logs/specialists/<name>.log');
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
