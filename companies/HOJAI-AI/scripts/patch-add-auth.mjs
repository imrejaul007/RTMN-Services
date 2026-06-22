#!/usr/bin/env node
/**
 * patch-add-auth.js — Bulk-add requireAuth to all unprotected mutating routes
 *
 * For every service flagged by audit-auth.js, this script:
 *   1. Inserts `const { requireAuth } = require('@rtmn/shared/auth');` (or
 *      `import { requireAuth } from '@rtmn/shared/auth';` for ESM) near the
 *      top of the file, immediately after express setup but before route
 *      declarations.
 *   2. Rewrites each unprotected `app.<method>(<path>, handler)` into
 *      `app.<method>(<path>, requireAuth, handler)`.
 *
 * Idempotent: re-running on a clean file is a no-op.
 *
 * Usage:
 *   node scripts/patch-add-auth.js                  # patch all services
 *   node scripts/patch-add-auth.js --service=<rel>  # patch one service
 *   node scripts/patch-add-auth.js --dry-run        # report only, no edits
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const ARGS = process.argv.slice(2);
const SERVICE_ARG = ARGS.find(a => a.startsWith('--service='))?.split('=')[1];
const DRY_RUN = ARGS.includes('--dry-run');

const SCAN_DIRS = ['products', 'platform', 'sutar-os', 'blr-ai-marketplace/services'];

const PUBLIC_PATH_PATTERNS = [
  /^\/health/, /^\/ready/, /^\/$/,
  /^\/auth\/register/, /^\/auth\/login/, /^\/auth\/forgot/,
];
const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];
const AUTH_NAMES = ['requireAuth','requireAdmin','requireRole','authMiddleware','internalAuth','requireInternal','industryAuth','adminOnly','verifyToken'];

function isPublic(p) { return PUBLIC_PATH_PATTERNS.some(re => re.test(p)); }

function findServices() {
  const out = [];
  for (const dir of SCAN_DIRS) {
    const full = path.join(ROOT, dir);
    if (!fs.existsSync(full)) continue;
    walk(full, out);
  }
  return out;
}

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    if (['tests','test','__tests__','docs','scripts','data','dist','node_modules'].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.isFile() && (e.name === 'index.js' || e.name === 'index.ts')) {
      out.push({ path: p, rel: path.relative(ROOT, p) });
    }
  }
}

function detectModuleSystem(src) {
  // If file uses `import` statements at top → ESM. Otherwise CommonJS.
  return /^import\s/m.test(src) ? 'esm' : 'cjs';
}

function patchService(svc) {
  const src = fs.readFileSync(svc.path, 'utf8');
  const moduleSystem = detectModuleSystem(src);
  const routeRegex = /\bapp\.(post|put|patch|delete)\s*\(\s*(['"`])([^'"`]+)\2/g;

  // Identify unprotected routes and their line offsets
  const unprotected = [];
  let m;
  while ((m = routeRegex.exec(src)) !== null) {
    const method = m[1];
    const routePath = m[3];
    const idx = m.index;
    if (isPublic(routePath)) continue;
    const after = src.slice(idx, idx + 800);
    const hasAuth = AUTH_NAMES.some(n => new RegExp(`\\b${n}\\b`).test(after));
    if (!hasAuth) {
      unprotected.push({ method, routePath, idx });
    }
  }

  if (unprotected.length === 0) return { changed: false, count: 0 };

  // Patch each unprotected route by inserting `requireAuth,` right after
  // the closing quote of the path. We splice from end to start so earlier
  // offsets remain valid.
  let patched = src;
  for (let i = unprotected.length - 1; i >= 0; i--) {
    const u = unprotected[i];
    // Find the closing quote of the path. m2[0] matches
    //   app.post('/api/prioritize'
    // so the closing quote is the LAST char of m2[0].
    const after = patched.slice(u.idx);
    const m2 = after.match(new RegExp(`^app\\.${u.method}\\s*\\(\\s*(['"\`])[^'"\`]+(['"\`])`));
    if (!m2) continue;
    const closeQuoteIdx = u.idx + m2[0].length - 1;
    // We need to insert "requireAuth, " AFTER the comma that separates the
    // path from the handler. Look for: closing-quote + optional whitespace + comma.
    const afterClose = patched.slice(closeQuoteIdx + 1);
    const wsAndComma = afterClose.match(/^(\s*)(,)/);
    if (!wsAndComma) {
      // No comma immediately after — likely multi-line declaration. Skip.
      continue;
    }
    const wsLen = wsAndComma[1].length;
    const commaEnd = closeQuoteIdx + 1 + wsLen + 1; // position right AFTER the comma
    // Insert "requireAuth, " right after the comma
    patched = patched.slice(0, commaEnd) + 'requireAuth, ' + patched.slice(commaEnd);
  }

  // Insert requireAuth import/require if missing
  if (moduleSystem === 'esm') {
    if (!/from\s+['"]@rtmn\/shared\/auth['"]/.test(patched)) {
      // Find a good spot: after express import line, or at top
      const exprImport = /^import\s+express\s+from\s+['"]express['"];?\s*$/m;
      if (exprImport.test(patched)) {
        patched = patched.replace(exprImport, (line) => `${line}\nimport { requireAuth } from '@rtmn/shared/auth';`);
      } else {
        patched = `import { requireAuth } from '@rtmn/shared/auth';\n` + patched;
      }
    }
  } else {
    if (!/require\(['"]@rtmn\/shared\/auth['"]\)/.test(patched)) {
      // Find a good spot: after express require line
      const exprReq = /^const\s+express\s*=\s*require\(['"]express['"]\);?\s*$/m;
      if (exprReq.test(patched)) {
        patched = patched.replace(exprReq, (line) => `${line}\nconst { requireAuth } = require('@rtmn/shared/auth');`);
      } else {
        patched = `const { requireAuth } = require('@rtmn/shared/auth');\n` + patched;
      }
    }
  }

  if (!DRY_RUN) fs.writeFileSync(svc.path, patched, 'utf8');
  return { changed: true, count: unprotected.length };
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

  let totalChanged = 0, totalRoutes = 0, filesChanged = 0;
  for (const svc of services) {
    if (!fs.existsSync(svc.path)) continue;
    const r = patchService(svc);
    if (r.changed) {
      totalChanged++;
      filesChanged++;
      totalRoutes += r.count;
      console.log(`  ✅ ${svc.rel} — added requireAuth to ${r.count} route(s)${DRY_RUN ? ' (dry-run)' : ''}`);
    }
  }

  console.log(`\n=== Patch Summary ===`);
  console.log(`Files patched: ${filesChanged}`);
  console.log(`Routes patched: ${totalRoutes}`);
  if (DRY_RUN) console.log('(dry-run — no files were modified)');
}

main();
