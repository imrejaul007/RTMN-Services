#!/usr/bin/env node
/**
 * patch-add-genie-auth.mjs
 *
 * Adds `requireAuth` as a global middleware to Genie services that don't have it.
 *
 * Strategy:
 *   1. Skip files that already have requireAuth or customAuth
 *   2. Add `import { requireAuth } from '@rtmn/shared/auth';` after the @rtmn/shared import block
 *   3. Add `app.use(requireAuth);` after `app.use(express.json())` (or any non-trivial middleware)
 *
 * Usage:
 *   node scripts/patch-add-genie-auth.mjs            # apply
 *   node scripts/patch-add-genie-auth.mjs --dry-run  # preview
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOTS = [
  'products/genie',
  'products/ai-workspace',
  'products/bizora',
  'products/founder-os',
  'products/hib',
  'products/razo',
  'platform/flow/industry-twin',
  'platform/flow/journey-intelligence',
];
const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.cache', 'data', 'docs', 'scripts', 'tests', 'test', '__tests__', '_deprecated-foundation']);

const AUTH_IMPORT = "import { requireAuth } from '@rtmn/shared/auth';";
const AUTH_USE = 'app.use(requireAuth);';

const dryRun = process.argv.includes('--dry-run');

let scanned = 0, modified = 0, skipped = 0;

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(path.join(dir, entry.name));
    } else if (entry.isFile()) {
      if (/\.(js|ts)$/.test(entry.name)) yield path.join(dir, entry.name);
    }
  }
}

function patchFile(filepath) {
  scanned++;
  let src = fs.readFileSync(filepath, 'utf8');

  // Skip if already has requireAuth or customAuth
  if (src.includes('requireAuth') || src.includes('customAuth')) {
    skipped++;
    return;
  }

  // Must have app.use to be a service entry point
  if (!/app\.use\s*\(/.test(src)) {
    skipped++;
    return;
  }

  let patched = src;

  // 1) Add import — after the last @rtmn/shared/... import
  const importRe = /^import\s+.*from\s+['"]@rtmn\/shared\/[^'"]+['"];?\s*$/gm;
  let lastImportEnd = 0;
  let m;
  while ((m = importRe.exec(patched)) !== null) {
    lastImportEnd = m.index + m[0].length;
  }
  if (lastImportEnd > 0) {
    patched = patched.slice(0, lastImportEnd) + '\n' + AUTH_IMPORT + patched.slice(lastImportEnd);
  } else {
    // Insert after the first import line
    const firstImport = patched.match(/^import\s.*$/m);
    if (firstImport) {
      const idx = firstImport.index + firstImport[0].length;
      patched = patched.slice(0, idx) + '\n' + AUTH_IMPORT + patched.slice(idx);
    } else {
      patched = AUTH_IMPORT + '\n' + patched;
    }
  }

  // 2) Add app.use(requireAuth) after express.json()
  // Find the last `app.use(express.json(...))` or first non-trivial middleware
  const expressJsonRe = /app\.use\(\s*express\.json\s*\([^)]*\)\s*\);?\s*\n/g;
  let lastJsonEnd = 0;
  let jm;
  while ((jm = expressJsonRe.exec(patched)) !== null) {
    lastJsonEnd = jm.index + jm[0].length;
  }
  if (lastJsonEnd > 0) {
    // Detect indent of the line we just found
    const lineStart = patched.lastIndexOf('\n', lastJsonEnd - 1) + 1;
    const indent = patched.slice(lineStart, lastJsonEnd).match(/^\s*/)[0];
    patched = patched.slice(0, lastJsonEnd) + '\n' + indent + AUTH_USE + patched.slice(lastJsonEnd);
  } else {
    // Fallback: add after the first app.use call
    const firstAppUse = patched.match(/^app\.use\([^)]*\);?\s*$/m);
    if (firstAppUse) {
      const idx = firstAppUse.index + firstAppUse[0].length;
      const indent = firstAppUse[0].match(/^\s*/)[0];
      patched = patched.slice(0, idx) + '\n' + indent + AUTH_USE + patched.slice(idx);
    } else {
      skipped++;
      return;
    }
  }

  if (patched === src) {
    skipped++;
    return;
  }

  if (dryRun) {
    console.log(`[dry-run] would patch: ${filepath}`);
  } else {
    fs.writeFileSync(filepath, patched, 'utf8');
  }
  modified++;
}

for (const root of ROOTS) {
  const absRoot = path.resolve(root);
  if (!fs.existsSync(absRoot)) continue;
  for (const filepath of walk(absRoot)) {
    patchFile(filepath);
  }
}

console.log(`\n=== Genie Auth Patch Summary ===`);
console.log(`Scanned:  ${scanned}`);
console.log(`Modified: ${modified}`);
console.log(`Skipped:  ${skipped}`);
console.log(dryRun ? '(dry run)' : '(files written)');
