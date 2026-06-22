#!/usr/bin/env node
/**
 * patch-add-require-env.js — Add requireEnv() for PORT to all services
 *
 * For every service's src/index.{js,ts} that listens on a PORT, this
 * script ensures that `requireEnv(['PORT'])` is called early, before
 * the listen() call.
 *
 * Idempotent: re-running on a clean file is a no-op.
 *
 * Usage:
 *   node scripts/patch-add-require-env.js [--dry-run]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');

const SCAN_DIRS = ['products', 'platform', 'sutar-os', 'blr-ai-marketplace/services', 'shared'];
const SKIP_DIRS = new Set(['node_modules', 'tests', 'test', '__tests__', 'docs', 'scripts', 'data', 'dist', '.git']);

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

function detectModuleSystem(src) {
  return /^import\s/m.test(src) ? 'esm' : 'cjs';
}

function patchFile(file) {
  const src = fs.readFileSync(file, 'utf8');

  // Skip if file doesn't use express
  if (!/express\s*\(/.test(src) && !/require\(['"]express['"]\)/.test(src) && !/from\s+['"]express['"]/.test(src)) {
    return { changed: false, reason: 'not-express' };
  }

  // Skip if file doesn't listen on a port
  if (!/\.listen\s*\(/.test(src)) {
    return { changed: false, reason: 'no-listen' };
  }

  // Skip if already imports requireEnv
  if (/requireEnv|validateEnv/.test(src)) {
    return { changed: false, reason: 'already-has' };
  }

  const moduleSystem = detectModuleSystem(src);
  let patched = src;

  if (moduleSystem === 'esm') {
    // Add import after the first express import
    const exprImport = /^import\s+express\b[^;]*;?\s*$/m;
    if (exprImport.test(patched)) {
      patched = patched.replace(exprImport, (line) => `${line}\nimport { requireEnv } from '@rtmn/shared/lib/env';`);
    } else {
      patched = `import { requireEnv } from '@rtmn/shared/lib/env';\n` + patched;
    }
  } else {
    const exprReq = /^const\s+express\s*=\s*require\(['"]express['"]\);?\s*$/m;
    if (exprReq.test(patched)) {
      patched = patched.replace(exprReq, (line) => `${line}\nconst { requireEnv } = require('@rtmn/shared/lib/env');`);
    } else {
      patched = `const { requireEnv } = require('@rtmn/shared/lib/env');\n` + patched;
    }
  }

  // Add requireEnv(['PORT']) call right after express() invocation
  // Look for `const app = express()` and add after it
  const appDecl = /^(\s*const\s+app\s*=\s*express\([^)]*\)\s*;?)\s*$/m;
  if (appDecl.test(patched)) {
    patched = patched.replace(appDecl, (line) => `${line}\n\n// Validate required env at startup\nrequireEnv(['PORT'], { allowDev: true });`);
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

  let patched = 0, skipped = { 'not-express': 0, 'no-listen': 0, 'already-has': 0 };
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
  console.log(`Skipped: not-express=${skipped['not-express']}, no-listen=${skipped['no-listen']}, already-has=${skipped['already-has']}`);
  if (DRY_RUN) console.log('(dry-run — no files were modified)');
}

main();
