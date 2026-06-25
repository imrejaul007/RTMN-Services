#!/usr/bin/env node
/**
 * Pos Test — dev orchestrator.
 *
 * Spawns the backend (4001) and frontend (3000) in one process.
 * Hit Ctrl-C to stop both.
 */

const { spawn } = require('node:child_process');

const CYAN = (s) => '\x1b[36m' + s + '\x1b[0m';
const GRAY = (s) => '\x1b[90m' + s + '\x1b[0m';
const GREEN = (s) => '\x1b[32m' + s + '\x1b[0m';

const procs = [];
function start(label, script) {
  console.log(CYAN('[start]') + ' ' + label);
  const p = spawn(process.execPath, [script], { stdio: 'inherit' });
  procs.push(p);
  p.on('exit', (code) => console.log(GRAY('[exit]') + ' ' + label + ' code=' + code));
}

start('backend  :4001', 'apps/backend/src/index.js');
start('frontend :3000', 'apps/frontend/server.js');

console.log(GREEN('\nDev stack running. Ctrl-C to stop.\n'));
console.log('  → http://localhost:3000  (frontend)');
console.log('  → http://localhost:4001  (backend)\n');

process.on('SIGINT', () => { procs.forEach(p => p.kill('SIGINT')); process.exit(0); });
process.on('SIGTERM', () => { procs.forEach(p => p.kill('SIGTERM')); process.exit(0); });
