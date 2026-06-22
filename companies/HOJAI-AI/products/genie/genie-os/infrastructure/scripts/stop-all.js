#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', '..');
const PIDS_DIR = path.join(ROOT, 'logs', 'pids');

if (!fs.existsSync(PIDS_DIR)) {
  console.log('No PIDs to stop.');
  process.exit(0);
}

const pidFiles = fs.readdirSync(PIDS_DIR);
let stopped = 0;

for (const pf of pidFiles) {
  const pid = parseInt(fs.readFileSync(path.join(PIDS_DIR, pf), 'utf-8'), 10);
  try {
    process.kill(pid, 'SIGTERM');
    console.log(`  ✓ Stopped ${pf.replace('.pid', '')} (PID ${pid})`);
    stopped++;
  } catch (e) {
    console.log(`  ⏭  ${pf.replace('.pid', '')} not running`);
  }
  fs.unlinkSync(path.join(PIDS_DIR, pf));
}

console.log(`\n🛑 Stopped ${stopped} services.\n`);
