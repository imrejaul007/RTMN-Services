#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import http from 'http';
import { setTimeout as sleep } from 'timers/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');

// NOTE 2026-06-21: Foundation services (corpid, twinos, memoryos, goalos, policyos, skillos, flowos)
// were moved to _deprecated-foundation/ as part of the genie-os/platform dedup cleanup.
// The canonical versions live in companies/HOJAI-AI/platform/* and are started via
// companies/HOJAI-AI/start-all.sh / start-twins.sh.
//
// To start a specific canonical foundation service:
//   cd companies/HOJAI-AI/platform/<area>/<service>
//   PORT=<port> node src/index.js
//
// This script is preserved as a no-op for backward compatibility with any
// tooling that still calls `node start-foundation.js`.

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

console.log('⚠️  start-foundation.js is deprecated (2026-06-21).');
console.log('    Foundation services now live in companies/HOJAI-AI/platform/*');
console.log('    and are managed by companies/HOJAI-AI/start-all.sh.');
console.log('');

// Check canonical foundation ports and report status
const CANONICAL = [
  { name: 'corpid-service',     port: 4702, path: 'companies/HOJAI-AI/platform/identity/corpid-service' },
  { name: 'memory-os',          port: 4703, path: 'companies/HOJAI-AI/platform/memory/memory-os' },
  { name: 'twinos-hub',         port: 4705, path: 'companies/HOJAI-AI/platform/twins/twinos-hub' },
  { name: 'goal-os',            port: 4242, path: 'companies/HOJAI-AI/platform/flow/goal-os' },
  { name: 'flow-orchestrator',  port: 4244, path: 'companies/HOJAI-AI/platform/flow/flow-orchestrator' },
  { name: 'policy-os',          port: 4254, path: 'companies/HOJAI-AI/platform/flow/policy-os' },
  { name: 'skill-os',           port: 4743, path: 'companies/HOJAI-AI/platform/skills/skill-os' },
];

for (const svc of CANONICAL) {
  const up = await checkPort(svc.port);
  console.log(`  ${up ? '✅' : '❌'} ${svc.name.padEnd(20)} :${svc.port}  ${up ? 'healthy' : 'down'}`);
}
console.log('');
console.log('Canonical foundation: no action taken. Use start-all.sh or start individual services.');
