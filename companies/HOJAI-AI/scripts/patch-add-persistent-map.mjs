#!/usr/bin/env node
/**
 * patch-add-persistent-map.mjs — Bulk-migrate `new Map()` to `new PersistentMap()`
 *
 * For every service's src/index.{js,ts}, this script:
 *   1. Inserts `const { PersistentMap } = require(...)` (CJS) or
 *      `import { PersistentMap } from ...` (ESM) after the express import.
 *   2. Replaces every `new Map()` with `new PersistentMap('collection-name', { serviceName: '...' })`.
 *   3. Infers the service name from the file path (e.g., `platform/twins/buyer-twin` → `buyer-twin`).
 *
 * Idempotent: re-running on a clean file is a no-op.
 *
 * Usage:
 *   node scripts/patch-add-persistent-map.mjs                 # all services
 *   node scripts/patch-add-persistent-map.mjs --dry-run       # report only
 *   node scripts/patch-add-persistent-map.mjs --service=<rel> # one service
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ARGS = process.argv.slice(2);
const DRY_RUN = ARGS.includes('--dry-run');
const SERVICE_ARG = ARGS.find(a => a.startsWith('--service='))?.split('=')[1];

const SCAN_DIRS = ['products', 'platform', 'sutar-os', 'blr-ai-marketplace/services'];
const SKIP_DIRS = new Set(['node_modules', 'tests', 'test', '__tests__', 'docs', 'scripts', 'data', 'dist', 'infrastructure']);

function findServices() {
  const out = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, out, dir);
  }
  return out;
}

function walk(dir, out, topDir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name) || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out, topDir);
    else if (e.isFile() && (e.name === 'index.js' || e.name === 'index.ts')) {
      out.push({ path: p, rel: path.relative(ROOT, p) });
    }
  }
}

function detectModuleSystem(src) {
  return /^import\s/m.test(src) ? 'esm' : 'cjs';
}

function inferServiceName(filePath) {
  // From a path like .../products/genie/genie-companion-service/src/index.js
  // → "genie-companion-service"
  const parts = filePath.split(path.sep);
  const srcIdx = parts.lastIndexOf('src');
  if (srcIdx > 0) return parts[srcIdx - 1];
  return parts[parts.length - 2];
}

function patchFile(file) {
  const src = fs.readFileSync(file, 'utf8');
  const moduleSystem = detectModuleSystem(src);

  // Skip if already using PersistentMap
  if (/PersistentMap|PersistentStore/.test(src)) {
    return { changed: false, reason: 'already-uses-persistent' };
  }

  // Skip if no new Map()
  if (!/new Map\s*\(/.test(src)) {
    return { changed: false, reason: 'no-new-map' };
  }

  const serviceName = inferServiceName(file);
  let patched = src;

  // 1. Insert import/require after express import
  if (moduleSystem === 'esm') {
    if (!/from\s+['"]@rtmn\/shared\/lib\/persistent-map['"]/.test(patched)) {
      const exprImport = /^import\s+express\b[^;]*;?\s*$/m;
      if (exprImport.test(patched)) {
        patched = patched.replace(exprImport, (line) =>
          `${line}\nimport { PersistentMap } from '@rtmn/shared/lib/persistent-map';`
        );
      } else {
        patched = `import { PersistentMap } from '@rtmn/shared/lib/persistent-map';\n` + patched;
      }
    }
  } else {
    if (!/require\(['"]@rtmn\/shared\/lib\/persistent-map['"]\)/.test(patched)) {
      const exprReq = /^const\s+express\s*=\s*require\(['"]express['"]\);?\s*$/m;
      if (exprReq.test(patched)) {
        patched = patched.replace(exprReq, (line) =>
          `${line}\nconst { PersistentMap } = require('@rtmn/shared/lib/persistent-map');`
        );
      } else {
        patched = `const { PersistentMap } = require('@rtmn/shared/lib/persistent-map');\n` + patched;
      }
    }
  }

  // 2. Replace each `new Map()` with `new PersistentMap('name', { serviceName })`.
  // The regex matches `new Map(` (consuming the open paren AND any close-paren
  // if it's the empty `new Map()` form), so we always emit a balanced pair.
  let counter = 0;
  patched = patched.replace(
    /(\b(?:const|let|var)\s+(\w+)\s*=\s*)?new\s+Map\s*\(\s*\)/g,
    (match, decl, varName) => {
      counter++;
      // Determine collection name from variable name or fall back to "collection-N"
      let collName;
      if (varName) {
        // Convert camelCase / snake_case to kebab-case
        collName = varName
          .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
          .replace(/_/g, '-')
          .toLowerCase();
      } else {
        collName = `collection-${counter}`;
      }
      // Original matched the full `new Map()` — emit balanced parens.
      return `${decl || ''}new PersistentMap('${collName}', { serviceName: '${serviceName}' })`;
    }
  );

  if (!DRY_RUN) fs.writeFileSync(file, patched, 'utf8');
  return { changed: true, count: counter, serviceName };
}

function main() {
  let services;
  if (SERVICE_ARG) {
    services = [{ path: path.resolve(ROOT, SERVICE_ARG), rel: SERVICE_ARG }];
  } else {
    services = findServices();
  }

  if (services.length === 0) {
    console.error('No services found.');
    process.exit(2);
  }

  let patched = 0, totalMaps = 0;
  const skipped = { 'already-uses-persistent': 0, 'no-new-map': 0 };

  for (const svc of services) {
    if (!fs.existsSync(svc.path)) continue;
    const r = patchFile(svc.path);
    if (r.changed) {
      patched++;
      totalMaps += r.count;
      console.log(`  ✅ ${svc.rel} — ${r.count} Map(s) → PersistentMap (serviceName: ${r.serviceName})${DRY_RUN ? ' (dry-run)' : ''}`);
    } else {
      skipped[r.reason] = (skipped[r.reason] || 0) + 1;
    }
  }

  console.log(`\n=== Patch Summary ===`);
  console.log(`Files patched: ${patched}`);
  console.log(`Maps migrated: ${totalMaps}`);
  console.log(`Skipped: already-uses-persistent=${skipped['already-uses-persistent']}, no-new-map=${skipped['no-new-map']}`);
  if (DRY_RUN) console.log('(dry-run — no files were modified)');
}

main();