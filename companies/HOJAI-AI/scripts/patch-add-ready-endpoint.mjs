#!/usr/bin/env node
/**
 * patch-add-ready-endpoint.mjs — Add /ready endpoint to services missing it
 *
 * For every service that calls `.listen()` but has no `/ready` route,
 * insert a basic /ready handler right before the listen() call.
 *
 * Idempotent.
 *
 * Usage:
 *   node scripts/patch-add-ready-endpoint.mjs [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');

const SCAN_DIRS = ['products', 'platform', 'sutar-os', 'blr-ai-marketplace/services'];
const SKIP_DIRS = new Set(['node_modules', 'tests', 'docs', 'scripts', 'data', 'dist', 'infrastructure']);

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && (e.name === 'index.js' || e.name === 'index.ts')) {
      out.push(p);
    }
  }
}

const READY_HANDLER_CJS = `
// Readiness probe — returns 200 once the server is accepting requests
app.get('/ready', (_req, res) => {
  res.json({ ready: true, timestamp: new Date().toISOString() });
});
`;

const READY_HANDLER_ESM = READY_HANDLER_CJS; // same syntax

function patchFile(file) {
  const src = fs.readFileSync(file, 'utf8');

  if (!/\.listen\s*\(/.test(src)) return { changed: false, reason: 'no-listen' };
  if (/['"`]\/ready['"`]/.test(src) && /app\.(get|post)\s*\(\s*['"`]\/ready['"`]/.test(src)) {
    return { changed: false, reason: 'already-has-ready' };
  }

  const isEsm = /^import\s/m.test(src);
  const handler = isEsm ? READY_HANDLER_ESM : READY_HANDLER_CJS;

  // Insert the /ready handler right before the listen() call
  // Find the line with `.listen(` and insert handler before it
  const listenRegex = /(\s*)(?:const\s+\w+\s*=\s*)?(?:app|server)\.listen\s*\(/;
  let patched;
  if (listenRegex.test(src)) {
    patched = src.replace(listenRegex, (match, indent) => handler + '\n' + indent + match.trimStart());
  } else {
    return { changed: false, reason: 'no-app-listen-pattern' };
  }

  if (!DRY_RUN) fs.writeFileSync(file, patched, 'utf8');
  return { changed: true };
}

function main() {
  const files = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, files);
  }

  let patched = 0;
  const skipped = { 'no-listen': 0, 'already-has-ready': 0, 'no-app-listen-pattern': 0 };
  for (const f of files) {
    const r = patchFile(f);
    if (r.changed) {
      patched++;
      console.log(`  ✅ ${path.relative(ROOT, f)}`);
    } else {
      skipped[r.reason] = (skipped[r.reason] || 0) + 1;
    }
  }
  console.log(`\n=== Patch Summary ===`);
  console.log(`Files patched: ${patched}`);
  console.log(`Skipped: ${JSON.stringify(skipped)}`);
  if (DRY_RUN) console.log('(dry-run — no files were modified)');
}

main();