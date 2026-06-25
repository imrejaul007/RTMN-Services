#!/usr/bin/env node
/**
 * Dev orchestrator: starts backend (4001) and frontend (3000) in one process.
 * Use Ctrl+C to stop both. This is what `npm run dev` invokes.
 */

import { spawn } from 'node:child_process';

const procs = [];

const CYAN = (s) => `\x1b[36m\x1b[1m${s}\x1b[0m`;
const GRAY = (s) => `\x1b[90m${s}\x1b[0m`;
const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const COLOR = { backend: '\x1b[32m', frontend: '\x1b[36m', reset: '\x1b[0m' };

function start(name, cmd, args, color, port) {
  const proc = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], env: process.env });
  procs.push(proc);
  const c = COLOR[color] || '';
  const tag = `${c}[${name}]\x1b[0m`;
  const prefix = (data) => data.toString().split('\n').filter(Boolean).map(l => `${tag} ${l}`).join('\n');
  proc.stdout.on('data', d => process.stdout.write(prefix(d) + '\n'));
  proc.stderr.on('data', d => process.stderr.write(prefix(d) + '\n'));
  proc.on('exit', code => {
    if (code !== 0 && code !== null) console.error(`${tag} exited with code ${code}`);
  });
  setTimeout(() => console.log(`${tag} listening on http://localhost:${port}`), 1200);
}

console.log(CYAN('► {{PROJECT_TITLE}} — dev mode'));
console.log(GRAY('  backend:  http://localhost:4001'));
console.log(GRAY('  frontend: http://localhost:3000'));
console.log(GRAY('  press Ctrl+C to stop\n'));

start('backend',  'node', ['apps/backend/src/index.js'], 'backend', 4001);
start('frontend', 'node', ['apps/frontend/server.js'],   'frontend', 3000);

const shutdown = () => {
  console.log(GRAY('\nshutting down…'));
  for (const p of procs) try { p.kill('SIGTERM'); } catch {}
  setTimeout(() => process.exit(0), 300);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
