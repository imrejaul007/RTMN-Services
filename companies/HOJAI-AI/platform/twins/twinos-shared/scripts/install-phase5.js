#!/usr/bin/env node
/**
 * Phase 5 batch installer (v3 — safe).
 *
 * This installer NEVER touches any import/require statement. Instead:
 *   1. It appends a single new `import { installPhase5 } from '@rtmn/twinos-shared';`
 *      statement at the top of the file (after the existing imports).
 *   2. It inserts a wiring block right BEFORE `app.listen(...)`.
 *   3. It is idempotent — re-running is a no-op.
 *
 * Usage:
 *   node scripts/install-phase5.js <twin-dir> <twinType> <storeVar> [optsJson]
 */

import fs from 'node:fs';
import path from 'node:path';

const [, , twinDir, twinType, storeVar, optsRaw = '{}'] = process.argv;
if (!twinDir || !twinType || !storeVar) {
  console.error('usage: install-phase5.js <twin-dir> <twinType> <storeVar> [optsJson]');
  process.exit(2);
}
const opts = JSON.parse(optsRaw);
const targetFile = path.join(twinDir, 'src', 'index.js');
if (!fs.existsSync(targetFile)) {
  console.error(`Not found: ${targetFile}`);
  process.exit(2);
}

let src = fs.readFileSync(targetFile, 'utf8');
const original = src;

if (src.includes('installPhase5(app')) {
  console.log(`SKIP ${twinDir} — already wired`);
  process.exit(0);
}

const isCJS = /^const\s*\{[^}]+\}\s*=\s*require\(['"]@rtmn\/twinos-shared['"]\)/m.test(src);

// ---- Detect if we already have @rtmn/twinos-shared as a module we can extend -
const hasSharedImport = /(?:^|\n)import\s*\{[^}]*\}\s*from\s*['"]@rtmn\/twinos-shared['"]/.test(src);
const hasSharedRequire = /(?:^|\n)const\s*\{[^}]*\}\s*=\s*require\(['"]@rtmn\/twinos-shared['"]\)/.test(src);

// ---- Build the installPhase5 import / require -----------------------------
let importStatement;
if (isCJS) {
  // If CJS already pulls from @rtmn/twinos-shared via destructured require,
  // just add installPhase5 to that same line by editing the require.
  if (hasSharedRequire) {
    importStatement = null; // we'll edit in place below
  } else {
    importStatement = `const { installPhase5 } = require('@rtmn/twinos-shared');`;
  }
} else {
  if (hasSharedImport) {
    importStatement = null;
  } else {
    importStatement = `import { installPhase5 } from '@rtmn/twinos-shared';`;
  }
}

// Edit existing require in-place for CJS so we keep it on a single tidy line.
if (isCJS && hasSharedRequire) {
  // Find the longest existing `const { ... } = require('@rtmn/twinos-shared');` and add installPhase5
  src = src.replace(
    /(const\s*\{)([^}]*)(\}\s*=\s*require\(['"]@rtmn\/twinos-shared['"]\)\s*;?)/,
    (match, open, body, close) => {
      if (/\binstallPhase5\b/.test(body)) return match;
      const names = body.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
      if (!names.includes('installPhase5')) names.push('installPhase5');
      return `${open}\n  ${names.join(',\n  ')}\n${close}`;
    }
  );
}

// ---- Inject the import statement at the top if needed ----------------------
if (importStatement) {
  // No existing @rtmn/twinos-shared import — inject a new top-level import.
  // Find the end of the first import block (last `import ... from ...;` or require(...) ; )
  // We insert the new import after the LAST import line, before the first
  // non-import line (which is usually `const app = express()`).
  const lines = src.split('\n');
  let lastImportIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (/^import\s/.test(t) || /^const\s*\{[^}]*\}\s*=\s*require\(/.test(t)) {
      lastImportIdx = i;
    } else if (t === '' || t.startsWith('//') || t.startsWith('/*')) {
      // blank/comment — keep scanning
      continue;
    } else {
      // First non-import, non-blank, non-comment line — stop here.
      break;
    }
  }
  if (lastImportIdx === -1) {
    // No imports at all — prepend
    src = `${importStatement}\n${src}`;
  } else {
    lines.splice(lastImportIdx + 1, 0, importStatement);
    src = lines.join('\n');
  }
} else {
  // We DO have an existing @rtmn/twinos-shared import. Add `installPhase5`
  // to its destructured body if not already present.
  // ESM destructured import with multi-line body:
  //   import {
  //     a, b, c
  //   } from '@rtmn/twinos-shared';
  // CJS destructured require:
  //   const { a, b, c } = require('@rtmn/twinos-shared');
  if (isCJS) {
    // already handled above by the in-place edit
  } else {
    // ESM — find the body between { ... } for the @rtmn/twinos-shared import.
    src = src.replace(
      /(import\s*\{)([^}]*)(\}\s*from\s*['"]@rtmn\/twinos-shared['"]\s*;)/,
      (match, open, body, close) => {
        const names = body.split(/[\s,]+/).map(s => s.trim()).filter(Boolean);
        if (names.includes('installPhase5')) return match;
        names.push('installPhase5');
        return `${open}\n  ${names.join(',\n  ')}\n${close}`;
      }
    );
  }
}

// ---- Build the wiring block ------------------------------------------------
const lines = [];
lines.push('');
lines.push('// ============ PHASE 5 (lifecycle + merge + SSE + /ready) ============');
lines.push('const phase5Cleanup = installPhase5(app, {');
// Don't reference SERVICE_NAME directly — some twins declare it after this
// point. Pass the service name through globalThis or fall back to env.
lines.push("  serviceName: (typeof SERVICE_NAME !== 'undefined' && SERVICE_NAME) || process.env.SERVICE_NAME || 'twin',");
lines.push(`  twinType: '${twinType}',`);
lines.push(`  store: typeof ${storeVar} !== 'undefined' ? ${storeVar} : null,`);
lines.push(`  version: process.env.SERVICE_VERSION || '2.0.0',`);
if (opts.statsExpr) lines.push(`  stats: () => ({ count: ${opts.statsExpr} }),`);
if (opts.sse) lines.push('  sse: { enabled: true },');
lines.push('});');
const wiring = lines.join('\n');

// ---- Insert wiring before app.listen(...) but AFTER notFoundHandler/errorHandler ---
// Tricky: Phase 5 endpoints should be matched BEFORE the catch-all 404 handler,
// so we insert wiring immediately before `app.use(notFoundHandler)` or
// `app.use(errorHandler)` if present, otherwise just before app.listen.
const notFoundRe = /^app\.use\(\s*notFoundHandler\s*\)\s*;?$/m;
const errorRe    = /^app\.use\(\s*errorHandler\s*\)\s*;?$/m;
const listenRe   = /(const\s+server\s*=\s*)?app\.listen\s*\(/;
if (!listenRe.test(src)) {
  console.error(`No app.listen() in ${targetFile}`);
  process.exit(2);
}
if (notFoundRe.test(src)) {
  src = src.replace(notFoundRe, `${wiring}\n$&`);
} else if (listenRe.test(src)) {
  src = src.replace(listenRe, (match) => `${wiring}\n${match}`);
} else {
  console.error(`No app.listen() in ${targetFile}`);
  process.exit(2);
}

// ---- Wrap installGracefulShutdown to chain phase5Cleanup if present -------
const gsRe = /(installGracefulShutdown\s*\(\s*server\s*)([,)])/;
if (gsRe.test(src)) {
  // existing call already passes args? Just inject phase5Cleanup as first arg.
  src = src.replace(gsRe, (match, before, tail) => {
    if (match.includes('phase5Cleanup')) return match;
    return `${before.trimEnd()}, phase5Cleanup${tail}`;
  });
} else {
  // No installGracefulShutdown — append one
  src = src.replace(/(\bapp\.listen\([^;]*?\)\s*;?)/,
    (_m, listenCall) => `${listenCall}\ninstallGracefulShutdown(server, phase5Cleanup);`);
}

if (src === original) {
  console.log(`NO-OP ${twinDir}`);
  process.exit(0);
}

fs.writeFileSync(targetFile, src);
console.log(`OK ${twinDir} — Phase 5 wired (twinType=${twinType}, store=${storeVar}, sse=${!!opts.sse}, cjs=${isCJS})`);
